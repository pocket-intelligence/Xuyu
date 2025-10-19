import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 智能体会话记录表
 * 记录每次智能体运行的完整会话信息
 */
@Entity('agent_sessions')
export class AgentSession {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 100, unique: true, comment: '会话ID (threadId)' })
    sessionId!: string;

    @Column({ type: 'varchar', length: 500, comment: '研究主题' })
    topic!: string;

    @Column({ type: 'varchar', length: 50, comment: '输出格式: 直接问答/深度报告/结构化输出' })
    outputFormat!: string;

    @Column({ type: 'varchar', length: 50, comment: '会话状态: running/completed/failed/cancelled' })
    status!: string;

    @Column({ type: 'int', default: 0, comment: '输入Token总数' })
    inputTokens!: number;

    @Column({ type: 'int', default: 0, comment: '输出Token总数' })
    outputTokens!: number;

    @Column({ type: 'int', default: 0, comment: '总Token数' })
    totalTokens!: number;

    @Column({ type: 'text', nullable: true, comment: '已完成的任务列表 (JSON)' })
    finishedTasks!: string;

    @Column({ type: 'text', nullable: true, comment: '最终生成的报告' })
    finalReport!: string;

    @Column({ type: 'varchar', length: 500, nullable: true, comment: 'PDF报告文件路径' })
    pdfReportPath!: string;

    @Column({ type: 'text', nullable: true, comment: '错误信息' })
    errorMessage!: string;

    @CreateDateColumn({ comment: '创建时间', name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ comment: '更新时间', name: 'updated_at' })
    updatedAt!: Date;

    @Column({ type: 'datetime', nullable: true, comment: '完成时间', name: 'completed_at' })
    completedAt!: Date;
}
