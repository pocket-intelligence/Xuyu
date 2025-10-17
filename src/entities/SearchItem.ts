import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SearchSubQuery } from './SearchSubQuery';

@Entity('search_items')
export class SearchItem {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 500, comment: 'URL' })
    url!: string;

    @Column({ type: 'varchar', length: 255, comment: '标题' })
    title!: string;

    @Column({ type: 'text', nullable: true, comment: '摘要' })
    abstract!: string;

    @Column({ type: 'varchar', length: 500, comment: '图像保存路径' })
    imagePath!: string;

    @Column({ type: 'int', comment: '关联的子问题ID' })
    subQueryId!: number;

    @ManyToOne(() => SearchSubQuery, subQuery => subQuery.searchItems, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sub_query_id' })
    subQuery!: SearchSubQuery;

    @CreateDateColumn({ comment: '创建时间', name: 'created_at' })
    createdAt!: Date;
}