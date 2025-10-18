import { AppDataSource } from '../database/dataSource';
import { AgentStepLog } from '../entities/AgentStepLog';

export class AgentStepLogRepository {
    private repository = AppDataSource.getRepository(AgentStepLog);

    /**
     * 创建步骤日志
     */
    async create(data: {
        sessionRecordId: number;
        stepName: string;
        inputData?: any;
        modelName?: string;
    }): Promise<AgentStepLog> {
        const log = this.repository.create({
            sessionRecordId: data.sessionRecordId,
            stepName: data.stepName,
            status: 'running',
            inputData: data.inputData ? JSON.stringify(data.inputData) : null,
            modelName: data.modelName || null,
            inputTokens: 0,
            outputTokens: 0,
        });
        return await this.repository.save(log);
    }

    /**
     * 更新步骤执行结果
     */
    async updateStepResult(
        logId: number,
        data: {
            status: 'success' | 'failed' | 'skipped';
            outputResult?: string;
            inputTokens?: number;
            outputTokens?: number;
            duration?: number;
            errorMessage?: string;
            executionLog?: string;
        }
    ): Promise<void> {
        await this.repository.update(logId, {
            ...data,
            completedAt: new Date(),
        });
    }

    /**
     * 根据会话ID获取所有步骤日志
     */
    async findBySessionRecordId(sessionRecordId: number): Promise<AgentStepLog[]> {
        return await this.repository.find({
            where: { sessionRecordId },
            order: { createdAt: 'ASC' },
        });
    }

    /**
     * 获取最近的步骤日志
     */
    async findLatestBySessionRecordId(sessionRecordId: number): Promise<AgentStepLog | null> {
        return await this.repository.findOne({
            where: { sessionRecordId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * 删除会话的所有日志
     */
    async deleteBySessionRecordId(sessionRecordId: number): Promise<void> {
        await this.repository.delete({ sessionRecordId });
    }
}

export const agentStepLogRepository = new AgentStepLogRepository();
