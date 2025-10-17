import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { SearchSubQuery } from './SearchSubQuery';

@Entity('search_results')
export class SearchResult {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 255, comment: '原始搜索查询' })
    query!: string;

    @CreateDateColumn({ comment: '创建时间', name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ comment: '更新时间', name: 'updated_at' })
    updatedAt!: Date;

    @OneToMany(() => SearchSubQuery, subQuery => subQuery.searchResult)
    subQueries!: SearchSubQuery[];
}