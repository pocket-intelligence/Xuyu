import OpenAI from 'openai';

/**
 * 创建 OpenAI 客户端
 */
export function createOpenAIClient(baseURL: string, apiKey: string): OpenAI {
    return new OpenAI({
        apiKey: apiKey,
        baseURL: baseURL,
        dangerouslyAllowBrowser: true,
        // defaultModel: systemConfig.llmModelName,
    });
}