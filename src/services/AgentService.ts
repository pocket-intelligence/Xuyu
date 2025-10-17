import { readConfig } from '../configManager';
import { createOpenAIClient } from '../agent/llm';

// 定义标准化的输出格式
export interface ResearchOutput {
    type: string;  // 动态类型，不写死枚举
    content: any;
    metadata?: Record<string, any>;
}

export interface ResearchResult {
    details: ResearchOutput;
    query: ResearchOutput;
    results: ResearchOutput;
    report: ResearchOutput;
}

// 定义步骤信息接口
interface StepInfo {
    title: string;
    description: string;
}

export class AgentService {
    /**
     * 执行研究任务
     * @param topic 研究主题
     * @param onProgress 进度回调函数
     */
    static async conductResearch(
        topic: string,
        onProgress: (step: number, data: ResearchOutput, stepInfo?: StepInfo) => void
    ): Promise<ResearchResult> {
        try {
            // 读取配置
            const config = readConfig();

            // 检查语言模型配置
            if (!config || !config.llmApiUrl || !config.llmApiKey) {
                throw new Error('语言模型配置不完整，请先在系统配置中设置语言模型参数');
            }

            // 检查多模态模型配置（可选）
            const hasMultimodalConfig = config.multimodalApiUrl && config.multimodalApiKey;

            // 创建OpenAI客户端
            const client = createOpenAIClient(config.llmApiUrl, config.llmApiKey);
            const model = config.llmModelName || 'deepseek-v3.1';

            // 步骤1: 询问细节
            const detailsStepInfo: StepInfo = {
                title: "询问细节",
                description: "了解研究需求"
            };

            onProgress(0, {
                type: "text",
                content: '正在分析研究主题...'
            }, detailsStepInfo);

            const detailsPrompt = `你是一个研究助手。请就"${topic}"这个主题，向用户提出3-5个关键问题，以帮助你更好地进行研究。`;

            const detailsResponse = await client.chat.completions.create({
                model: model,
                messages: [
                    { role: "system", content: "你是一个研究助手。" },
                    { role: "user", content: detailsPrompt },
                ],
            });

            const detailsContent = detailsResponse.choices[0].message.content?.trim() || '';
            const detailsOutput: ResearchOutput = {
                type: "text",
                content: detailsContent,
                metadata: {
                    prompt: detailsPrompt,
                    tokens: {
                        input: detailsResponse.usage?.prompt_tokens ?? 0,
                        output: detailsResponse.usage?.completion_tokens ?? 0
                    }
                }
            };

            onProgress(0, detailsOutput, detailsStepInfo);

            // 步骤2: 构建查询
            const queryStepInfo: StepInfo = {
                title: "构建查询",
                description: "生成搜索关键词"
            };

            onProgress(1, {
                type: "text",
                content: '正在生成搜索关键词...'
            }, queryStepInfo);

            const queryPrompt = `请根据研究主题"${topic}"和补充细节"${detailsContent}"，生成3-5个适合学术搜索的英文关键词。`;

            const queryResponse = await client.chat.completions.create({
                model: model,
                messages: [{ role: "user", content: queryPrompt }],
            });

            const queryContent = queryResponse.choices[0].message.content?.trim().replace(/\n/g, " ") || '';
            const queryOutput: ResearchOutput = {
                type: "text",
                content: queryContent,
                metadata: {
                    prompt: queryPrompt,
                    tokens: {
                        input: queryResponse.usage?.prompt_tokens ?? 0,
                        output: queryResponse.usage?.completion_tokens ?? 0
                    }
                }
            };

            onProgress(1, queryOutput, queryStepInfo);

            // 步骤3: 搜索（这里模拟搜索结果）
            const searchStepInfo: StepInfo = {
                title: "执行搜索",
                description: "获取相关资料"
            };

            onProgress(2, {
                type: "text",
                content: '正在搜索相关资料...'
            }, searchStepInfo);

            // 实际应用中这里会调用SearxNG或其他搜索引擎
            const mockResults = [
                {
                    title: `${topic}研究综述`,
                    url: 'https://example.com/research-overview',
                },
                {
                    title: `${topic}的最新进展`,
                    url: 'https://example.com/latest-developments',
                },
                {
                    title: `${topic}应用案例分析`,
                    url: 'https://example.com/case-studies',
                }
            ];

            const resultsOutput: ResearchOutput = {
                type: "selection",
                content: mockResults,
                metadata: {
                    count: mockResults.length
                }
            };

            onProgress(2, resultsOutput, searchStepInfo);

            // 步骤4: 生成报告
            const reportStepInfo: StepInfo = {
                title: "生成报告",
                description: "撰写研究报告"
            };

            onProgress(3, {
                type: "text",
                content: '正在生成研究报告...'
            }, reportStepInfo);

            const reportPrompt = `
请根据以下信息撰写一份简短研究报告。

主题：${topic}
细节：${detailsContent}
搜索结果：
${mockResults.map((r, i) => `${i + 1}. ${r.title} (${r.url})`).join('\n')}

要求：
- 用简洁、逻辑清晰的中文撰写
- 概述研究现状、趋势和潜在方向
`;

            const reportResponse = await client.chat.completions.create({
                model: model,
                messages: [{ role: "user", content: reportPrompt }],
            });

            const reportContent = reportResponse.choices[0].message.content?.trim() || '';
            const reportOutput: ResearchOutput = {
                type: "markdown",
                content: reportContent,
                metadata: {
                    prompt: reportPrompt,
                    tokens: {
                        input: reportResponse.usage?.prompt_tokens ?? 0,
                        output: reportResponse.usage?.completion_tokens ?? 0
                    }
                }
            };

            onProgress(3, reportOutput, reportStepInfo);

            return {
                details: detailsOutput,
                query: queryOutput,
                results: resultsOutput,
                report: reportOutput
            };
        } catch (error: any) {
            console.error('研究过程中出现错误:', error);
            throw new Error(`研究失败: ${error.message || '未知错误'}`);
        }
    }
}