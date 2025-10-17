import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { SearchResult } from './SearchResult';
import { SearchItem } from './SearchItem';

@Entity('search_sub_queries')
export class SearchSubQuery {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 255, comment: '子问题' })
    question!: string;

    @Column({ type: 'int', comment: '关联的搜索结果ID' })
    searchResultId!: number;

    @ManyToOne(() => SearchResult, searchResult => searchResult.subQueries, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'search_result_id' })
    searchResult!: SearchResult;

    @OneToMany(() => SearchItem, searchItem => searchItem.subQuery)
    searchItems!: SearchItem[];

    @CreateDateColumn({ comment: '创建时间', name: 'created_at' })
    createdAt!: Date;
}