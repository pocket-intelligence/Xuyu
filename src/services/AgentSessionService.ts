import { agentSessionRepository } from '../repositories/AgentSessionRepository';
import { agentStepLogRepository } from '../repositories/AgentStepLogRepository';
import { AgentSession } from '../entities/AgentSession';
import { AgentStepLog } from '../entities/AgentStepLog';

/**
 * 智能体会话服务
 * 负责记录和管理智能体的运行日志
 */
export class AgentSessionService {
    /**
     * 开始新的会话
     */
    static async startSession(sessionId: string, topic: string): Promise<AgentSession> {
        console.log(`[AgentSessionService] 开始记录会话: ${sessionId}, 主题: ${topic}`);
        return await agentSessionRepository.create({
            sessionId,
            topic,
        });
    }

    /**
     * 开始记录步骤执行
     */
    static async startStep(
        sessionId: string,
        stepName: string,
        inputData?: any,
        modelName?: string
    ): Promise<AgentStepLog | null> {
        const session = await agentSessionRepository.findBySessionId(sessionId);
        if (!session) {
            console.error(`[AgentSessionService] 会话不存在: ${sessionId}`);
            return null;
        }

        console.log(`[AgentSessionService] 开始记录步骤: ${stepName}`);
        return await agentStepLogRepository.create({
            sessionRecordId: session.id,
            stepName,
            inputData,
            modelName,
        });
    }

    /**
     * 完成步骤执行
     */
    static async completeStep(
        logId: number,
        outputResult: string,
        inputTokens = 0,
        outputTokens = 0,
        duration?: number,
        executionLog?: string
    ): Promise<void> {
        console.log(`[AgentSessionService] 完成步骤记录: logId=${logId}, tokens=${inputTokens}/${outputTokens}`);
        await agentStepLogRepository.updateStepResult(logId, {
            status: 'success',
            outputResult,
            inputTokens,
            outputTokens,
            duration,
            executionLog,
        });
    }

    /**
     * 标记步骤失败
     */
    static async failStep(
        logId: number,
        errorMessage: string,
        duration?: number
    ): Promise<void> {
        console.log(`[AgentSessionService] 步骤执行失败: logId=${logId}`);
        await agentStepLogRepository.updateStepResult(logId, {
            status: 'failed',
            errorMessage,
            duration,
        });
    }

    /**
     * 标记步骤跳过
     */
    static async skipStep(
        logId: number,
        reason: string
    ): Promise<void> {
        console.log(`[AgentSessionService] 跳过步骤: logId=${logId}, 原因: ${reason}`);
        await agentStepLogRepository.updateStepResult(logId, {
            status: 'skipped',
            executionLog: reason,
        });
    }

    /**
     * 更新会话Token统计
     */
    static async updateTokens(sessionId: string, inputTokens: number, outputTokens: number): Promise<void> {
        if (inputTokens > 0 || outputTokens > 0) {
            await agentSessionRepository.updateTokens(sessionId, inputTokens, outputTokens);
        }
    }

    /**
     * 更新已完成任务列表
     */
    static async updateFinishedTasks(
        sessionId: string,
        finishedTasks: Array<{ name: string; result: string }>
    ): Promise<void> {
        await agentSessionRepository.updateFinishedTasks(sessionId, finishedTasks);
    }

    /**
     * 更新输出格式
     */
    static async updateOutputFormat(sessionId: string, outputFormat: string): Promise<void> {
        await agentSessionRepository.update(sessionId, { outputFormat });
    }

    /**
     * 完成会话
     */
    static async completeSession(sessionId: string, finalReport?: string): Promise<void> {
        console.log(`[AgentSessionService] 完成会话: ${sessionId}`);
        await agentSessionRepository.markCompleted(sessionId, finalReport);
    }

    /**
     * 标记会话失败
     */
    static async failSession(sessionId: string, errorMessage: string): Promise<void> {
        console.log(`[AgentSessionService] 会话失败: ${sessionId}, 错误: ${errorMessage}`);
        await agentSessionRepository.markFailed(sessionId, errorMessage);
    }

    /**
     * 获取会话详情
     */
    static async getSessionDetail(sessionId: string): Promise<{
        session: AgentSession | null;
        steps: AgentStepLog[];
    }> {
        const session = await agentSessionRepository.findBySessionId(sessionId);
        if (!session) {
            return { session: null, steps: [] };
        }

        const steps = await agentStepLogRepository.findBySessionRecordId(session.id);
        return { session, steps };
    }

    /**
     * 获取会话列表
     */
    static async getSessionList(limit = 50, offset = 0): Promise<AgentSession[]> {
        return await agentSessionRepository.findAll(limit, offset);
    }

    /**
     * 删除会话
     */
    static async deleteSession(sessionId: string): Promise<void> {
        const session = await agentSessionRepository.findBySessionId(sessionId);
        if (session) {
            await agentStepLogRepository.deleteBySessionRecordId(session.id);
            await agentSessionRepository.delete(sessionId);
        }
    }
}
