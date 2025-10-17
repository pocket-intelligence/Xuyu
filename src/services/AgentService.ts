import {
    createSession,
    executeNextStep,
    submitUserInput,
    destroySession as destroySessionManager,
    ProgressCallback
} from "../agent/sessionManager";

/**
 * 智能体服务层 - 提供统一的接口给 Electron IPC 调用
 */
export class AgentService {
    /**
     * 创建研究会话
     */
    static async createResearchSession(topic: string): Promise<string> {
        console.log(`[AgentService] 创建研究会话，主题: ${topic}`);
        return await createSession(topic);
    }

    /**
     * 执行下一步
     */
    static async executeNextStep(
        sessionId: string,
        progressCallback?: ProgressCallback
    ): Promise<{
        completed: boolean;
        needsInput: boolean;
        inputPrompt?: any;
        state: any;
    }> {
        console.log(`[AgentService] 执行下一步，会话ID: ${sessionId}`);
        return await executeNextStep(sessionId, progressCallback);
    }

    /**
     * 提交用户输入
     */
    static async submitUserInput(
        sessionId: string,
        input: any,
        progressCallback?: ProgressCallback
    ): Promise<{
        completed: boolean;
        needsInput: boolean;
        inputPrompt?: any;
        state: any;
    }> {
        console.log(`[AgentService] 提交用户输入，会话ID: ${sessionId}`, input);
        return await submitUserInput(sessionId, input, progressCallback);
    }

    /**
     * 销毁会话
     */
    static async destroySession(sessionId: string): Promise<boolean> {
        console.log(`[AgentService] 销毁会话，会话ID: ${sessionId}`);
        return destroySessionManager(sessionId);
    }
}
