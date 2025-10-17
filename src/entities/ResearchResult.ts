import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('research_results')
export class ResearchResult {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'int', comment: '关联的搜索结果ID' })
    searchId!: number;

    @Column({ type: 'text', comment: '报告全文 (Markdown格式)' })
    fullText!: string;

    @CreateDateColumn({ comment: '创建时间', name: 'created_at' })
    createdAt!: Date;

}