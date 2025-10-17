import { readConfig } from '../configManager';
import { createOpenAIClient } from '../agent/llm';

export interface ResearchResult {
    details: string;
    query: string;
    results: Array<{
        title: string;
        url: string;
    }>;
    report: string;
}

export class AgentService {
    /**
     * 执行研究任务
     * @param topic 研究主题
     * @param onProgress 进度回调函数
     */
    static async conductResearch(
        topic: string,
        onProgress: (step: number, data: any) => void
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
            onProgress(0, { message: '正在分析研究主题...' });
            const detailsPrompt = `你是一个研究助手。请就"${topic}"这个主题，向用户提出3-5个关键问题，以帮助你更好地进行研究。`;

            const detailsResponse = await client.chat.completions.create({
                model: model,
                messages: [
                    { role: "system", content: "你是一个研究助手。" },
                    { role: "user", content: detailsPrompt },
                ],
            });

            const details = detailsResponse.choices[0].message.content?.trim() || '';
            onProgress(0, { details });

            // 步骤2: 构建查询
            onProgress(1, { message: '正在生成搜索关键词...' });
            const queryPrompt = `请根据研究主题"${topic}"和补充细节"${details}"，生成3-5个适合学术搜索的英文关键词。`;

            const queryResponse = await client.chat.completions.create({
                model: model,
                messages: [{ role: "user", content: queryPrompt }],
            });

            const query = queryResponse.choices[0].message.content?.trim().replace(/\n/g, " ") || '';
            onProgress(1, { query });

            // 步骤3: 搜索（这里模拟搜索结果）
            onProgress(2, { message: '正在搜索相关资料...' });
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
            onProgress(2, { results: mockResults });

            // 步骤4: 生成报告
            onProgress(3, { message: '正在生成研究报告...' });
            const reportPrompt = `
请根据以下信息撰写一份简短研究报告。

主题：${topic}
细节：${details}
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

            const report = reportResponse.choices[0].message.content?.trim() || '';
            onProgress(3, { report });

            return {
                details,
                query,
                results: mockResults,
                report
            };
        } catch (error: any) {
            console.error('研究过程中出现错误:', error);
            throw new Error(`研究失败: ${error.message || '未知错误'}`);
        }
    }
}