import { AppDataSource } from '../database/dataSource';
import { AgentSession } from '../entities/AgentSession';

export class AgentSessionRepository {
    private repository = AppDataSource.getRepository(AgentSession);

    /**
     * 创建新的会话记录
     */
    async create(data: {
        sessionId: string;
        topic: string;
        outputFormat?: string;
    }): Promise<AgentSession> {
        const session = this.repository.create({
            sessionId: data.sessionId,
            topic: data.topic,
            outputFormat: data.outputFormat || '深度报告',
            status: 'running',
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            finishedTasks: JSON.stringify([]),
        });
        return await this.repository.save(session);
    }

    /**
     * 根据sessionId查找
     */
    async findBySessionId(sessionId: string): Promise<AgentSession | null> {
        return await this.repository.findOne({ where: { sessionId } });
    }

    /**
     * 更新会话信息
     */
    async update(sessionId: string, data: Partial<AgentSession>): Promise<void> {
        await this.repository.update({ sessionId }, data);
    }

    /**
     * 更新Token统计
     */
    async updateTokens(sessionId: string, inputTokens: number, outputTokens: number): Promise<void> {
        const session = await this.findBySessionId(sessionId);
        if (session) {
            const newInputTokens = session.inputTokens + inputTokens;
            const newOutputTokens = session.outputTokens + outputTokens;
            await this.repository.update(
                { sessionId },
                {
                    inputTokens: newInputTokens,
                    outputTokens: newOutputTokens,
                    totalTokens: newInputTokens + newOutputTokens,
                }
            );
        }
    }

    /**
     * 更新已完成任务列表
     */
    async updateFinishedTasks(sessionId: string, finishedTasks: Array<{ name: string; result: string }>): Promise<void> {
        await this.repository.update(
            { sessionId },
            { finishedTasks: JSON.stringify(finishedTasks) }
        );
    }

    /**
     * 标记会话完成
     */
    async markCompleted(sessionId: string, finalReport?: string): Promise<void> {
        await this.repository.update(
            { sessionId },
            {
                status: 'completed',
                completedAt: new Date(),
                finalReport: finalReport || null,
            }
        );
    }

    /**
     * 标记会话失败
     */
    async markFailed(sessionId: string, errorMessage: string): Promise<void> {
        await this.repository.update(
            { sessionId },
            {
                status: 'failed',
                completedAt: new Date(),
                errorMessage,
            }
        );
    }

    /**
     * 获取所有会话列表
     */
    async findAll(limit = 50, offset = 0): Promise<AgentSession[]> {
        return await this.repository.find({
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });
    }

    /**
     * 删除会话
     */
    async delete(sessionId: string): Promise<void> {
        await this.repository.delete({ sessionId });
    }
}

export const agentSessionRepository = new AgentSessionRepository();
