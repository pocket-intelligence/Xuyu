import { app, checkpointer, ResearchState } from "./agent";
import { createOpenAIClient } from "./llm";
import { readConfig } from "../configManager";

export type ProgressCallback = (
    step: number,
    data: any,
    stepInfo?: { title: string; description: string }
) => void;

export interface Session {
    threadId: string;
    state: typeof ResearchState.State;
    lastUpdated: number;
}

// 会话存储（内存中）
const sessions = new Map<string, Session>();

// 步骤信息映射
const STEP_INFO: Record<string, { title: string; description: string }> = {
    askDetails: { title: "生成研究细节", description: "正在生成研究细节建议..." },
    userReviewDetails: { title: "等待用户审查", description: "请审查研究细节..." },
    buildQuery: { title: "构建查询", description: "正在生成搜索关键词..." },
    userChooseFormat: { title: "等待用户选择", description: "请选择输出格式..." },
    search: { title: "执行搜索", description: "正在搜索相关资料..." },
    writeReport: { title: "生成报告", description: "正在生成研究报告..." },
};

/**
 * 创建新的研究会话
 */
export async function createSession(topic: string): Promise<string> {
    const threadId = `thread_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log(`[SessionManager] 创建会话: ${threadId}, 主题: ${topic}`);

    // 读取配置
    const config = readConfig();

    // 创建初始状态
    const initialState: Partial<typeof ResearchState.State> = {
        topic,
        task_list: [
            { name: "askDetails", description: "生成研究细节建议" },
            { name: "userReviewDetails", description: "用户审查研究细节" },
            { name: "buildQuery", description: "构建搜索查询" },
            { name: "userChooseFormat", description: "用户选择输出格式" },
            { name: "search", description: "执行搜索" },
            { name: "writeReport", description: "生成研究报告" },
        ],
        finished_tasks: [],
        llm_client: createOpenAIClient(config.llmApiUrl, config.llmApiKey),
        llm_model: config.llmModelName || "deepseek-v3.1",
        output_format: "直接问答",
        report: null,
        input_tokens: 0,
        output_tokens: 0,
    };

    // 保存会话
    sessions.set(threadId, {
        threadId,
        state: initialState as typeof ResearchState.State,
        lastUpdated: Date.now(),
    });

    return threadId;
}

/**
 * 执行下一个步骤（不使用 interrupt，自己控制流程）
 */
export async function executeNextStep(
    sessionId: string,
    progressCallback?: ProgressCallback
): Promise<{
    completed: boolean;
    needsInput: boolean;
    inputPrompt?: any;
    state: typeof ResearchState.State;
}> {
    const session = sessions.get(sessionId);
    if (!session) {
        throw new Error(`会话不存在: ${sessionId}`);
    }

    console.log(`[SessionManager] 执行下一步骤: ${sessionId}`);

    // 确保 llm_client 已初始化
    const configData = readConfig();
    if (!session.state.llm_client) {
        session.state.llm_client = createOpenAIClient(configData.llmApiUrl, configData.llmApiKey);
    }

    const state = session.state;
    const finishedTaskNames = state.finished_tasks.map(t => t.name);

    // 定义执行顺序
    const steps = [
        { name: 'askDetails', needsInput: false },
        { name: 'userReviewDetails', needsInput: true },
        { name: 'buildQuery', needsInput: false },
        { name: 'userChooseFormat', needsInput: true },
        { name: 'search', needsInput: false },
        { name: 'writeReport', needsInput: false },
    ];

    // 找到下一个需要执行的步骤
    let foundStep: typeof steps[0] | null = null;
    for (const step of steps) {
        if (!finishedTaskNames.includes(step.name)) {
            foundStep = step;
            break;
        }
    }

    if (!foundStep) {
        // 所有步骤都完成
        console.log(`[SessionManager] 所有步骤完成`);
        return {
            completed: true,
            needsInput: false,
            state: session.state
        };
    }

    console.log(`[SessionManager] 下一步: ${foundStep.name}`);

    // 如果是需要用户输入的步骤，检查是否有前置数据
    if (foundStep.needsInput) {
        // 获取前一步的结果
        let promptData: any = {};
        if (foundStep.name === 'userReviewDetails') {
            const askDetailsResult = state.finished_tasks.find(t => t.name === 'askDetails');
            if (askDetailsResult) {
                promptData = {
                    question: askDetailsResult.result,
                    prompt: "是否修改研究细节或主题？如果满意请直接继续，否则请提供新的细节。"
                };
            }
        } else if (foundStep.name === 'userChooseFormat') {
            const buildQueryResult = state.finished_tasks.find(t => t.name === 'buildQuery');
            if (buildQueryResult) {
                promptData = {
                    query: buildQueryResult.result,
                    prompt: "请选择输出格式",
                    options: ["直接问答", "深度报告", "结构化输出"]
                };
            }
        }

        // 返回，等待用户输入
        return {
            completed: false,
            needsInput: true,
            inputPrompt: promptData,
            state: session.state
        };
    }

    // 执行不需要用户输入的步骤
    try {
        // 发送进度回调
        if (progressCallback) {
            const stepInfo = STEP_INFO[foundStep.name] || {
                title: foundStep.name,
                description: `正在执行 ${foundStep.name}...`
            };
            progressCallback(finishedTaskNames.length, { nodeName: foundStep.name }, stepInfo);
        }

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
        } else if (foundStep.name === 'writeReport') {
            const { writeReport } = await import('./agent');
            result = await writeReport(session.state);
        }

        // 更新状态
        session.state = { ...session.state, ...result };
        session.lastUpdated = Date.now();

        // 再次调用 executeNextStep 继续下一步（递归调用）
        return await executeNextStep(sessionId, progressCallback);
    } catch (error: any) {
        console.error(`[SessionManager] 执行 ${foundStep.name} 失败:`, error);
        throw error;
    }
}

/**
 * 提交用户输入并继续执行
 */
export async function submitUserInput(
    sessionId: string,
    input: any,
    progressCallback?: ProgressCallback
): Promise<{
    completed: boolean;
    needsInput: boolean;
    inputPrompt?: any;
    state: typeof ResearchState.State;
}> {
    const session = sessions.get(sessionId);
    if (!session) {
        throw new Error(`会话不存在: ${sessionId}`);
    }

    console.log(`[SessionManager] 提交用户输入: ${sessionId}`, input);

    // 确保 llm_client 已初始化
    const configData = readConfig();
    if (!session.state.llm_client) {
        session.state.llm_client = createOpenAIClient(configData.llmApiUrl, configData.llmApiKey);
    }

    const finishedTaskNames = session.state.finished_tasks.map(t => t.name);

    // 找到当前需要用户输入的步骤
    let currentStep = '';
    if (!finishedTaskNames.includes('userReviewDetails')) {
        currentStep = 'userReviewDetails';
    } else if (!finishedTaskNames.includes('userChooseFormat')) {
        currentStep = 'userChooseFormat';
    }

    if (!currentStep) {
        throw new Error('当前没有需要用户输入的步骤');
    }

    // 处理用户输入
    let result = '';
    if (currentStep === 'userReviewDetails') {
        const askDetailsResult = session.state.finished_tasks.find(t => t.name === 'askDetails');
        result = input.details || askDetailsResult?.result || '';
    } else if (currentStep === 'userChooseFormat') {
        result = input.output_format || '深度报告';
        session.state.output_format = result as any;
    }

    // 保存结果
    session.state.finished_tasks = [
        ...session.state.finished_tasks,
        { name: currentStep, result }
    ];
    session.lastUpdated = Date.now();

    console.log(`[SessionManager] 用户输入已保存: ${currentStep}`);

    // 继续执行下一步
    return await executeNextStep(sessionId, progressCallback);
}

/**
 * 获取会话状态
 */
export function getSession(sessionId: string): Session | undefined {
    return sessions.get(sessionId);
}

/**
 * 销毁会话
 */
export function destroySession(sessionId: string): boolean {
    console.log(`[SessionManager] 销毁会话: ${sessionId}`);
    return sessions.delete(sessionId);
}
