# 深度报告功能实现总结

## 🎯 实现目标

优化深度研究报告的生成流程，通过多阶段处理提升报告质量和结构化程度。

## 📊 架构设计

### 核心思想

**不是替换，而是融合！** 保留原有 `writeReport` 节点作为统一的报告生成器，让它能够智能识别是否经过深度分析流程，从而采用不同的生成策略。

### 流程对比

#### 快速报告流程（直接问答/结构化输出）
```
extractContent → writeReport(快速模式) → END
```
- 一次性生成
- 适合简单问答和结构化数据输出
- Token 消耗少，速度快

#### 深度报告流程（深度报告）
```
extractContent → coarseRead → craftOutline → fillOutline → writeReport(增强模式) → END
```
- 分阶段处理，质量更高
- 结构化、引用清晰
- 适合需要深入研究的场景

## 🔧 技术实现

### 1. 新增节点（node_other.ts）

#### coarseRead（粗读节点）
**功能**：对提取的内容进行快速阅读和主题抽取

**输出 JSON 结构**：
```json
{
  "topics": ["主题1", "主题2", ...],           // 5个以内
  "main_findings": ["发现1", "发现2", ...],    // 3-8条
  "evidence_refs": [                           // 最多10条
    {"title": "标题", "url": "链接"}
  ],
  "numeric_candidates": [                      // 可量化数据
    {"label": "标签", "value": "值", "unit": "单位", "hint": "提示"}
  ],
  "reading_notes": ["注意点1", "注意点2", ...]  // 3-5条
}
```

#### craftOutline（生成大纲节点）
**功能**：基于粗读结果生成结构化的报告大纲

**输出 JSON 结构**：
```json
{
  "title": "报告标题",
  "structure": [
    {
      "id": "sec1",
      "heading": "第一章 标题",
      "purpose": "本章目的",
      "key_points": ["要点1", "要点2"],
      "preferred_sources": [{"title": "...", "url": "..."}]
    }
  ],
  "writing_style": "学术/简洁/行业白皮书"
}
```
- 3-6个章节
- 每章2-4个要点
- 可能包含图表类型建议

#### fillOutline（逐章填充节点）
**功能**：根据大纲逐章生成内容

**处理方式**：
- 对每个章节单独请求 LLM
- 基于证据池生成2-3段落
- 每段150-250字
- 段落末尾标注【来源: 标题】
- 适当位置建议图表类型

**输出 JSON 结构**：
```json
[
  {
    "id": "sec1",
    "heading": "第一章 标题",
    "purpose": "章节目的",
    "content": "Markdown格式的章节内容\n\n【来源: XXX】"
  }
]
```

### 2. 改进 writeReport 节点（agent.ts）

**智能模式切换**：
- 检测是否存在 `fillOutline` 和 `craftOutline` 结果
- 如果存在 → 使用增强版 prompt（深度模式）
- 如果不存在 → 使用原有 prompt（快速模式）

**增强版特性**：
- 利用已生成的章节内容和大纲
- 进行最终的连贯性优化和润色
- 添加引言和总结建议
- 自动补充参考来源

### 3. 条件路由（agent.ts）

```typescript
function routeAfterExtract(state: typeof ResearchState.State): string {
    if (state.output_format === "深度报告") {
        return "coarseRead";  // 走深度流程
    }
    return "writeReport";     // 直接生成报告
}
```

### 4. 工作流图（ResearchGraph）

```
START
  ↓
askDetails
  ↓
userReviewDetails
  ↓
buildQuery
  ↓
userChooseFormat
  ↓
search
  ↓
extractContent
  ↓
[条件路由]
  ↓                    ↓
coarseRead        writeReport(快速)
  ↓                    ↓
craftOutline         END
  ↓
fillOutline
  ↓
writeReport(增强)
  ↓
END
```

## 📁 文件修改清单

### 后端
1. **src/agent/node_other.ts** (新建)
   - `coarseRead` 函数
   - `craftOutline` 函数
   - `fillOutline` 函数

2. **src/agent/agent.ts** (修改)
   - 导入新节点函数
   - 改进 `writeReport` 函数（增加智能模式识别）
   - 添加 `routeAfterExtract` 路由函数
   - 更新 `ResearchGraph` 工作流

### 前端
3. **renderer/src/pages/DeepResearch/index.tsx** (修改)
   - 更新 `STEP_TITLES` 映射，添加新节点

4. **renderer/src/pages/SearchRecords/index.tsx** (修改)
   - 更新 `STEP_NAMES` 映射，添加新节点

## ✨ 关键优化点

### 1. 统一的报告生成器
- ✅ 保留 `writeReport` 作为唯一的最终报告生成节点
- ✅ 避免代码重复，提高可维护性
- ✅ 所有格式（直接问答/深度报告/结构化输出）最终都用同一个节点

### 2. 智能适配
- ✅ `writeReport` 能够识别前置处理结果
- ✅ 根据是否有深度分析数据自动切换 prompt
- ✅ 增强模式下利用粗读、大纲、章节内容进行润色

### 3. 分阶段质量控制
- ✅ 粗读：快速提取关键信息
- ✅ 大纲：规划报告结构
- ✅ 填充：逐章生成内容（可单独重试）
- ✅ 润色：最终连贯性优化

### 4. Token 优化
- ✅ 提取内容时限制长度（2000字符）
- ✅ 粗读时限制输入（8000字符）
- ✅ 逐章填充避免一次性处理大量内容
- ✅ 节流控制（每章间隔800ms）

## 📈 性能对比

| 指标         | 快速报告    | 深度报告         |
| ------------ | ----------- | ---------------- |
| LLM 调用次数 | 1次         | 4+ 章节数        |
| Token 消耗   | 低          | 中高             |
| 生成时间     | 快（~10秒） | 较慢（~1-2分钟） |
| 报告质量     | 基础        | 高               |
| 结构化程度   | 中          | 高               |
| 引用清晰度   | 中          | 高               |

## 🔍 使用建议

### 选择"直接问答"当：
- 需要快速回答简单问题
- 300字以内的简短答案
- 不需要详细引用

### 选择"结构化输出"当：
- 需要 JSON 格式的结构化数据
- 用于程序化处理
- 包含 title、summary、trends、recommendations

### 选择"深度报告"当：
- 需要全面的研究报告
- 要求清晰的章节结构
- 需要详细的引用来源
- 可能包含量化数据和图表建议
- 时间允许（1-2分钟生成时间）

## 🚀 未来优化方向

1. **并行化处理**
   - fillOutline 的多个章节可以并行调用 LLM

2. **缓存机制**
   - 粗读结果可缓存复用
   - 大纲可提供用户修改功能

3. **图表生成**
   - 根据 numeric_candidates 自动生成图表
   - 集成 ECharts 或其他可视化库

4. **引用管理**
   - 更规范的引用格式（如 APA、MLA）
   - 自动去重和排序

5. **质量评估**
   - 报告质量自动评分
   - 引用覆盖率检查

## 🎓 总结

本次实现成功将深度报告生成功能融合到现有系统中，**关键在于没有简单替换原有节点，而是增强了 `writeReport` 的能力**，使其能够智能识别并利用前置的深度分析结果。这种设计：

1. ✅ 保持了系统的简洁性（只有一个最终报告生成节点）
2. ✅ 提供了灵活性（快速/深度两种模式）
3. ✅ 提升了报告质量（分阶段处理）
4. ✅ 保留了向后兼容性（原有流程不受影响）

这正是软件设计中"开闭原则"的体现：**对扩展开放，对修改封闭**。
