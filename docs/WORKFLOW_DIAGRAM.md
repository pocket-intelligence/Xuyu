# 深度研究工作流程图

## 完整流程图

```mermaid
graph TD
    START([开始]) --> askDetails[askDetails<br/>生成研究细节建议]
    askDetails --> userReviewDetails{userReviewDetails<br/>用户审查细节}
    userReviewDetails --> buildQuery[buildQuery<br/>生成搜索关键词]
    buildQuery --> userChooseFormat{userChooseFormat<br/>用户选择输出格式}
    userChooseFormat --> search[search<br/>执行搜索]
    search --> extractContent[extractContent<br/>抽取页面内容]
    
    extractContent --> routeDecision{输出格式?}
    
    routeDecision -->|深度报告| coarseRead[coarseRead<br/>粗读与主题抽取]
    coarseRead --> craftOutline[craftOutline<br/>生成报告大纲]
    craftOutline --> fillOutline[fillOutline<br/>逐章填充内容]
    fillOutline --> writeReportEnhanced[writeReport<br/>增强模式润色]
    
    routeDecision -->|直接问答<br/>结构化输出| writeReportFast[writeReport<br/>快速模式生成]
    
    writeReportEnhanced --> END([结束])
    writeReportFast --> END
    
    style START fill:#e1f5e1
    style END fill:#ffe1e1
    style userReviewDetails fill:#fff4e1
    style userChooseFormat fill:#fff4e1
    style routeDecision fill:#e1f0ff
    style coarseRead fill:#f0e1ff
    style craftOutline fill:#f0e1ff
    style fillOutline fill:#f0e1ff
    style writeReportEnhanced fill:#e1ffe1
    style writeReportFast fill:#e1ffe1
```

## 深度报告流程详解

```mermaid
graph LR
    subgraph 数据准备
    A[提取的页面内容] --> B[extractContent结果]
    end
    
    subgraph 深度分析
    B --> C[coarseRead<br/>粗读分析]
    C --> D[topics<br/>main_findings<br/>evidence_refs<br/>numeric_candidates<br/>reading_notes]
    end
    
    subgraph 大纲设计
    D --> E[craftOutline<br/>生成大纲]
    E --> F[title<br/>structure<br/>writing_style]
    end
    
    subgraph 内容填充
    F --> G[fillOutline<br/>逐章生成]
    G --> H[章节1内容<br/>章节2内容<br/>章节N内容]
    end
    
    subgraph 最终润色
    H --> I[writeReport<br/>增强模式]
    I --> J[完整Markdown报告<br/>+引言<br/>+总结建议<br/>+参考来源]
    end
    
    style A fill:#e8f4f8
    style D fill:#f0e1ff
    style F fill:#ffe1f0
    style H fill:#fff4e1
    style J fill:#e1ffe1
```

## 节点数据流

```mermaid
sequenceDiagram
    participant User as 用户
    participant System as 系统
    participant LLM as 大模型
    
    User->>System: 1. 输入主题
    System->>LLM: askDetails: 生成研究建议
    LLM-->>System: 返回研究问题
    System->>User: 2. 展示研究问题
    User->>System: 3. 确认/修改细节
    
    System->>LLM: buildQuery: 生成关键词
    LLM-->>System: 返回关键词数组
    System->>User: 4. 展示关键词
    User->>System: 5. 选择输出格式
    
    alt 选择深度报告
        System->>System: search: 搜索关键词
        System->>System: extractContent: 抽取页面
        System->>LLM: coarseRead: 粗读材料
        LLM-->>System: 返回主题和发现
        System->>LLM: craftOutline: 生成大纲
        LLM-->>System: 返回报告结构
        
        loop 遍历每个章节
            System->>LLM: fillOutline: 生成章节内容
            LLM-->>System: 返回章节正文
        end
        
        System->>LLM: writeReport(增强): 最终润色
        LLM-->>System: 返回完整报告
    else 选择快速报告
        System->>System: search: 搜索关键词
        System->>System: extractContent: 抽取页面
        System->>LLM: writeReport(快速): 直接生成
        LLM-->>System: 返回报告
    end
    
    System->>User: 6. 展示最终报告
```

## 状态机视图

```mermaid
stateDiagram-v2
    [*] --> Initializing: 开始研究
    Initializing --> AskingDetails: 创建会话
    AskingDetails --> WaitingUserReview: 生成建议
    WaitingUserReview --> BuildingQuery: 用户确认
    BuildingQuery --> WaitingFormatChoice: 生成关键词
    WaitingFormatChoice --> Searching: 用户选择格式
    Searching --> Extracting: 搜索完成
    Extracting --> Routing: 抽取完成
    
    Routing --> FastReport: 快速模式
    FastReport --> Completed: 报告生成
    
    Routing --> CoarseReading: 深度模式
    CoarseReading --> CraftingOutline: 粗读完成
    CraftingOutline --> FillingOutline: 大纲完成
    FillingOutline --> EnhancedReport: 填充完成
    EnhancedReport --> Completed: 报告生成
    
    Completed --> [*]
    
    note right of Routing
        根据output_format决定
        - 深度报告: CoarseReading
        - 其他: FastReport
    end note
    
    note right of FillingOutline
        逐章生成内容
        每章单独调用LLM
    end note
```

## Token 消耗对比

```mermaid
graph TD
    subgraph 快速报告流程
    A1[extractContent] --> B1[writeReport快速]
    B1 --> C1[总消耗: ~1500 tokens]
    end
    
    subgraph 深度报告流程
    A2[extractContent] --> B2[coarseRead<br/>~800 tokens]
    B2 --> C2[craftOutline<br/>~600 tokens]
    C2 --> D2[fillOutline<br/>~2000 tokens<br/>多章节累加]
    D2 --> E2[writeReport增强<br/>~1000 tokens]
    E2 --> F2[总消耗: ~4500+ tokens]
    end
    
    style C1 fill:#e1ffe1
    style F2 fill:#ffe1e1
```

## 关键决策点

### 1. 路由决策（routeAfterExtract）

```typescript
if (output_format === "深度报告") {
    → coarseRead  // 启动深度分析流程
} else {
    → writeReport // 直接快速生成
}
```

### 2. writeReport 智能模式

```typescript
if (存在 fillOutline 和 craftOutline 结果) {
    → 使用增强版 prompt（利用章节内容和大纲）
} else {
    → 使用快速版 prompt（直接从提取内容生成）
}
```

## 时间估算

| 阶段           | 快速模式  | 深度模式         |
| -------------- | --------- | ---------------- |
| askDetails     | ~5秒      | ~5秒             |
| buildQuery     | ~3秒      | ~3秒             |
| search         | ~10秒     | ~10秒            |
| extractContent | ~20秒     | ~20秒            |
| coarseRead     | -         | ~8秒             |
| craftOutline   | -         | ~6秒             |
| fillOutline    | -         | ~30秒（5章×6秒） |
| writeReport    | ~10秒     | ~10秒            |
| **总计**       | **~48秒** | **~92秒**        |
