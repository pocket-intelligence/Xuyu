import { readConfig } from '../configManager';
import { app, ResearchState } from '../agent/agent';
import { createOpenAIClient } from '../agent/llm';

// 定义标准化的输出格式
export interface ResearchOutput {
    type: string;  // 动态类型，不写死枚举
    content: any;
    metadata?: Record<string, any>;
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
    ): Promise<any> {
        try {
            // 读取配置
            const config = readConfig();

            // 检查语言模型配置
            if (!config || !config.llmApiUrl || !config.llmApiKey) {
                throw new Error('语言模型配置不完整，请先在系统配置中设置语言模型参数');
            }

            // 初始化状态 - 参考测试代码中的初始化方式
            const initialState = {
                topic: topic,
                details: "",
                query: "",
                results: [] as string[],
                report: "",
                input_tokens: 0,
                output_tokens: 0,
                llm_client: createOpenAIClient(config.llmApiUrl, config.llmApiKey),
                llm_model: config.llmModelName || "deepseek-v3.1"
            };

            // 定义步骤映射
            const stepMapping: Record<string, { index: number; info: StepInfo }> = {
                "askDetails": {
                    index: 0,
                    info: {
                        title: "询问细节",
                        description: "了解研究需求"
                    }
                },
                "buildQuery": {
                    index: 1,
                    info: {
                        title: "构建查询",
                        description: "生成搜索关键词"
                    }
                },
                "search": {
                    index: 2,
                    info: {
                        title: "执行搜索",
                        description: "获取相关资料"
                    }
                },
                "writeReport": {
                    index: 3,
                    info: {
                        title: "生成报告",
                        description: "撰写研究报告"
                    }
                }
            };

            // 执行研究任务
            const result = await app.invoke(initialState);

            // 发送每个步骤的结果
            // 步骤1: 询问细节
            if (result.details) {
                const { index, info } = stepMapping["askDetails"];
                onProgress(index, {
                    type: "text",
                    content: result.details
                }, info);
            }

            // 步骤2: 构建查询
            if (result.query) {
                const { index, info } = stepMapping["buildQuery"];
                onProgress(index, {
                    type: "text",
                    content: result.query
                }, info);
            }

            // 步骤3: 搜索结果
            if (result.results && result.results.length > 0) {
                const { index, info } = stepMapping["search"];
                onProgress(index, {
                    type: "selection",
                    content: result.results.map((r: string, i: number) => ({
                        title: `搜索结果 ${i + 1}`,
                        url: "#",
                        content: r
                    }))
                }, info);
            }

            // 步骤4: 生成报告
            if (result.report) {
                const { index, info } = stepMapping["writeReport"];
                onProgress(index, {
                    type: "markdown",
                    content: result.report
                }, info);
            }

            return result;
        } catch (error: any) {
            console.error('研究过程中出现错误:', error);
            throw new Error(`研究失败: ${error.message || '未知错误'}`);
        }
    }
}