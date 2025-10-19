# 智能体异常处理机制修复文档

## 问题描述

当 LLM API 调用失败（如内容审核失败，返回 400 错误）时，智能体流程没有正确终止，而是继续执行后续步骤。

### 错误日志示例

```
[IPC] 提交用户输入失败: BadRequestError: 400 Input data may contain inappropriate content.
    at APIError.generate (C:\Users\xiaoshuyui\github_repo\deep-research\.webpack\main\index.js:77015:20)
    ...
{
  status: 400,
  error: {
    code: 'data_inspection_failed',
    message: 'Input data may contain inappropriate content.',
    type: 'data_inspection_failed'
  }
}
```

## 根本原因分析

### 1. 深度报告节点缺失

在 `sessionManager.ts` 的 `executeNextStep` 函数中，步骤列表是硬编码的，只包含基础的 7 个步骤：

```typescript
const steps = [
    { name: 'askDetails', needsInput: false },
    { name: 'userReviewDetails', needsInput: true },
    { name: 'buildQuery', needsInput: false },
    { name: 'userChooseFormat', needsInput: true },
    { name: 'search', needsInput: false },
    { name: 'extractContent', needsInput: false },
    { name: 'writeReport', needsInput: false },  // ❌ 缺少深度报告的 4 个节点
];
```

当用户选择"深度报告"时，工作流会尝试执行 `coarseRead`、`craftOutline`、`fillOutline`、`generateCharts` 这 4 个节点，但它们没有在步骤列表中定义，也没有对应的导入和执行逻辑。

### 2. 异常处理机制不完善

虽然在 `sessionManager.ts` 中已添加了 try-catch 块，但：

- **深度报告节点无法被执行**：因为缺少导入和分支逻辑
- **会话状态未正确标记**：异常发生时需要调用 `AgentSessionService.failSession()`
- **会话资源未清理**：需要使用 `sessions.delete(sessionId)` 清理内存

### 3. 任务列表未动态更新

初始化会话时，`task_list` 只包含基础任务，当用户选择"深度报告"后，没有动态添加额外的任务项，导致前端进度显示不完整。

## 解决方案

### 修改 1: 动态步骤列表（支持深度报告）

**文件**: `src/agent/sessionManager.ts`

**位置**: `executeNextStep` 函数，第 107-124 行

```typescript
// 定义执行顺序（根据输出格式动态调整）
const isDeepReport = state.output_format === "深度报告";
const steps = [
    { name: 'askDetails', needsInput: false },
    { name: 'userReviewDetails', needsInput: true },
    { name: 'buildQuery', needsInput: false },
    { name: 'userChooseFormat', needsInput: true },
    { name: 'search', needsInput: false },
    { name: 'extractContent', needsInput: false },
    // 深度报告专用节点
    ...(isDeepReport ? [
        { name: 'coarseRead', needsInput: false },
        { name: 'craftOutline', needsInput: false },
        { name: 'fillOutline', needsInput: false },
        { name: 'generateCharts', needsInput: false },
    ] : []),
    { name: 'writeReport', needsInput: false },
];
```

**改进点**:
- ✅ 根据 `output_format` 动态决定是否包含深度报告节点
- ✅ 使用扩展运算符 `...` 优雅地插入额外步骤

### 修改 2: 添加深度报告节点执行逻辑

**文件**: `src/agent/sessionManager.ts`

**位置**: `executeNextStep` 函数，第 189-219 行

```typescript
// 执行对应的节点函数
let result: any = {};
if (foundStep.name === 'askDetails') {
    const { askDetails } = await import('./agent');
    result = await askDetails(session.state);
} else if (foundStep.name === 'buildQuery') {
    const { buildQuery } = await import('./agent');
    result = await buildQuery(session.state);
} else if (foundStep.name === 'search') {
    const { searchSearxng } = await import('./agent');
    result = await searchSearxng(session.state);
} else if (foundStep.name === 'extractContent') {
    const { extractPageContent } = await import('./agent');
    result = await extractPageContent(session.state);
} else if (foundStep.name === 'coarseRead') {
    const { coarseRead } = await import('./node_other');
    result = await coarseRead(session.state);
} else if (foundStep.name === 'craftOutline') {
    const { craftOutline } = await import('./node_other');
    result = await craftOutline(session.state);
} else if (foundStep.name === 'fillOutline') {
    const { fillOutline } = await import('./node_other');
    result = await fillOutline(session.state);
} else if (foundStep.name === 'generateCharts') {
    const { generateCharts } = await import('./node_other');
    result = await generateCharts(session.state);
} else if (foundStep.name === 'writeReport') {
    const { writeReport } = await import('./agent');
    result = await writeReport(session.state);
}
```

**改进点**:
- ✅ 为每个深度报告节点添加导入和执行分支
- ✅ 使用动态导入 `await import()` 减少初始加载时间

### 修改 3: 更新步骤信息映射

**文件**: `src/agent/sessionManager.ts`

**位置**: 第 19-31 行

```typescript
const STEP_INFO: Record<string, { title: string; description: string }> = {
    askDetails: { title: "生成研究细节", description: "正在生成研究细节建议..." },
    userReviewDetails: { title: "等待用户审查", description: "请审查研究细节..." },
    buildQuery: { title: "构建查询", description: "正在生成搜索关键词..." },
    userChooseFormat: { title: "等待用户选择", description: "请选择输出格式..." },
    search: { title: "执行搜索", description: "正在搜索相关资料..." },
    extractContent: { title: "提取页面内容", description: "正在使用 Playwright 抽取页面内容..." },
    coarseRead: { title: "粗读材料", description: "正在粗读搜索材料并提取关键信息..." },
    craftOutline: { title: "生成报告大纲", description: "正在生成报告大纲..." },
    fillOutline: { title: "填充报告内容", description: "正在逐章填充报告内容..." },
    generateCharts: { title: "生成数据图表", description: "正在使用 AI 生成数据可视化图表..." },
    writeReport: { title: "生成报告", description: "正在生成研究报告..." },
};
```

**改进点**:
- ✅ 为深度报告节点添加用户友好的进度信息
- ✅ 使用中文描述，符合产品定位

### 修改 4: 动态更新任务列表

**文件**: `src/agent/sessionManager.ts`

**位置**: `submitUserInput` 函数，第 302-324 行

```typescript
} else if (currentStep === 'userChooseFormat') {
    result = input.output_format || '深度报告';
    session.state.output_format = result as any;

    // 如果选择深度报告，动态添加额外的任务
    if (result === '深度报告') {
        const deepReportTasks = [
            { name: "coarseRead", description: "粗读材料" },
            { name: "craftOutline", description: "生成报告大纲" },
            { name: "fillOutline", description: "填充报告内容" },
            { name: "generateCharts", description: "生成数据图表" },
        ];
        
        // 在 writeReport 之前插入这些任务
        const writeReportIndex = session.state.task_list.findIndex(t => t.name === 'writeReport');
        if (writeReportIndex !== -1) {
            session.state.task_list = [
                ...session.state.task_list.slice(0, writeReportIndex),
                ...deepReportTasks,
                ...session.state.task_list.slice(writeReportIndex)
            ];
            console.log('[SessionManager] 已添加深度报告任务');
        }
    }

    // 更新会话的输出格式
    if (session.state.session_id) {
        await AgentSessionService.updateOutputFormat(session.state.session_id, result);
    }
}
```

**改进点**:
- ✅ 当用户选择"深度报告"时，自动在 `task_list` 中插入额外任务
- ✅ 在 `writeReport` 之前正确插入，保持逻辑顺序
- ✅ 前端可以通过 `state.task_list` 显示完整的进度条

### 修改 5: 异常终止机制（已存在）

**文件**: `src/agent/sessionManager.ts`

**位置**: `executeNextStep` 函数，第 234-250 行

```typescript
} catch (error: any) {
    console.error(`[SessionManager] 执行 ${foundStep.name} 失败:`, error);
    
    // 更新会话状态为失败
    if (session.state.session_id) {
        await AgentSessionService.failSession(
            session.state.session_id,
            error.message || '执行失败'
        );
    }
    
    // 销毁会话
    sessions.delete(sessionId);
    
    // 重新抛出错误，让前端能捕获
    throw error;
}
```

**位置**: `submitUserInput` 函数，第 358-374 行

```typescript
} catch (error: any) {
    console.error(`[SessionManager] 继续执行失败:`, error);
    
    // 更新会话状态为失败
    if (session.state.session_id) {
        await AgentSessionService.failSession(
            session.state.session_id,
            error.message || '执行失败'
        );
    }
    
    // 销毁会话
    sessions.delete(sessionId);
    
    // 重新抛出错误
    throw error;
}
```

**机制说明**:
1. **捕获所有异常**: 包括 LLM API 错误、网络错误、代码逻辑错误
2. **标记会话失败**: 调用 `AgentSessionService.failSession()` 更新数据库状态
3. **清理内存资源**: 使用 `sessions.delete()` 移除会话对象
4. **传递错误给前端**: 重新抛出错误，让 IPC 层和前端能够捕获并显示

## 错误处理链路

### 完整的异常传递路径

```
LLM API 错误 (400)
    ↓
节点函数抛出异常 (coarseRead/fillOutline/等)
    ↓
executeNextStep 的 catch 块捕获
    ├─ 标记会话失败 (AgentSessionService.failSession)
    ├─ 清理内存 (sessions.delete)
    └─ 重新抛出错误
    ↓
IPC 处理器 catch 块捕获
    └─ 返回 { success: false, message: error.message }
    ↓
前端 catch 块捕获
    ├─ 显示错误消息 (message.error)
    ├─ 重置 loading 状态
    └─ 清理执行标记 (isProcessingRef.current = false)
```

### 前端错误处理（已存在）

**文件**: `renderer/src/pages/DeepResearch/index.tsx`

```typescript
try {
    const resumeResult = await window.electronAPI.invoke('submit-user-input', {
        sessionId,
        input
    });

    if (!resumeResult.success) {
        throw new Error(resumeResult.message || '恢复失败');
    }
    
    // ... 处理成功情况
} catch (error: any) {
    console.error('[前端] 恢复会话失败:', error);
    message.error('恢复会话失败: ' + error.message);
    setStepDescription('恢复会话失败');
    setLoading(false);
    isProcessingRef.current = false;
}
```

## 测试验证

### 测试场景 1: 内容审核失败

**操作步骤**:
1. 输入包含敏感内容的主题（如政治、暴力相关）
2. 选择"深度报告"输出格式
3. 等待 LLM 返回 400 错误

**预期结果**:
- ✅ 会话状态被标记为 `failed`
- ✅ 会话从内存中清理
- ✅ 前端显示错误消息："恢复会话失败: Input data may contain inappropriate content."
- ✅ 用户可以重新发起研究

### 测试场景 2: 网络错误

**操作步骤**:
1. 断开网络连接
2. 启动研究任务

**预期结果**:
- ✅ 捕获网络错误
- ✅ 会话标记为失败
- ✅ 前端显示清晰的错误提示

### 测试场景 3: 深度报告正常流程

**操作步骤**:
1. 输入正常主题
2. 选择"深度报告"
3. 等待完整流程执行

**预期结果**:
- ✅ 正确执行所有 11 个步骤（7 个基础 + 4 个深度报告）
- ✅ 进度信息显示正确
- ✅ 最终生成完整的深度报告

## 技术要点总结

### 1. 动态工作流

- 使用 `output_format` 状态动态决定执行路径
- 扩展运算符 `...` 优雅地合并步骤列表
- 动态 import 延迟加载节点函数

### 2. 异常安全性

- **多层 try-catch**: 节点函数 → sessionManager → IPC → 前端
- **资源清理**: 确保会话内存和数据库状态一致
- **错误传播**: 保留原始错误信息，便于调试

### 3. 用户体验

- **及时反馈**: 通过 `message.error()` 立即通知用户
- **状态重置**: 确保用户可以重新发起任务
- **进度可视化**: 任务列表动态更新，显示完整进度

## 相关文件

- `src/agent/sessionManager.ts` - 会话管理和异常处理核心逻辑
- `src/agent/agent.ts` - 工作流定义和基础节点
- `src/agent/node_other.ts` - 深度报告专用节点
- `src/services/AgentSessionService.ts` - 数据库会话状态管理
- `renderer/src/pages/DeepResearch/index.tsx` - 前端错误处理和用户反馈

## 最佳实践

### 异常处理的黄金法则

1. **就近捕获**: 在最了解上下文的地方处理错误
2. **清理资源**: 无论成功失败，都要清理资源
3. **传播错误**: 让上层有机会记录和响应
4. **用户友好**: 将技术错误转换为可理解的消息
5. **可追踪性**: 保留完整的错误堆栈和日志

### 状态管理的关键点

1. **单一数据源**: 会话状态在内存和数据库保持同步
2. **原子操作**: 状态更新要么全部成功，要么全部失败
3. **防御编程**: 始终检查空值和边界情况
4. **幂等性**: 同一操作多次执行结果一致

## 总结

通过本次修复，智能体异常处理机制已经完善：

1. ✅ **深度报告节点完整集成**: 所有 4 个额外节点都能正确执行
2. ✅ **异常自动终止**: LLM 错误、网络错误等都能被正确捕获和处理
3. ✅ **会话状态一致性**: 内存和数据库状态保持同步
4. ✅ **用户体验优化**: 清晰的错误提示和状态重置
5. ✅ **代码健壮性**: 多层防御，优雅降级

**核心改进**: 从"硬编码步骤列表"升级为"动态工作流引擎"，支持根据用户选择灵活调整执行路径，同时保证异常安全性。
