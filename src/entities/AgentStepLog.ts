import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AgentSession } from './AgentSession';

/**
 * 智能体步骤执行日志表
 * 记录每个步骤的执行详情和LLM调用信息
 */
@Entity('agent_step_logs')
export class AgentStepLog {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'int', comment: '关联的会话ID' })
    sessionRecordId!: number;

    @ManyToOne(() => AgentSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'session_record_id' })
    session!: AgentSession;

    @Column({ type: 'varchar', length: 100, comment: '步骤名称' })
    stepName!: string;

    @Column({ type: 'varchar', length: 50, comment: '步骤状态: running/success/failed/skipped' })
    status!: string;

    @Column({ type: 'text', nullable: true, comment: '步骤输入数据 (JSON)' })
    inputData!: string;

    @Column({ type: 'text', nullable: true, comment: '步骤输出结果' })
    outputResult!: string;

    @Column({ type: 'int', default: 0, comment: 'LLM输入Token数' })
    inputTokens!: number;

    @Column({ type: 'int', default: 0, comment: 'LLM输出Token数' })
    outputTokens!: number;

    @Column({ type: 'varchar', length: 100, nullable: true, comment: '使用的模型名称' })
    modelName!: string;

    @Column({ type: 'int', nullable: true, comment: '执行耗时(毫秒)' })
    duration!: number;

    @Column({ type: 'text', nullable: true, comment: '错误信息' })
    errorMessage!: string;

    @Column({ type: 'text', nullable: true, comment: '执行日志' })
    executionLog!: string;

    @CreateDateColumn({ comment: '创建时间', name: 'created_at' })
    createdAt!: Date;

    @Column({ type: 'datetime', nullable: true, comment: '完成时间', name: 'completed_at' })
    completedAt!: Date;
}
