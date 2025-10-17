import { AppDataSource } from '../database/dataSource';
import { SearchResult } from '../entities/SearchResult';
import { Repository } from 'typeorm';

export class SearchResultRepository {
    private repository: Repository<SearchResult>;

    constructor() {
        this.repository = AppDataSource.getRepository(SearchResult);
    }

    // 创建搜索结果
    async create(searchResult: Partial<SearchResult>): Promise<SearchResult> {
        const newSearchResult = this.repository.create(searchResult);
        return await this.repository.save(newSearchResult);
    }

    // 批量创建搜索结果
    async createMany(searchResults: Partial<SearchResult>[]): Promise<SearchResult[]> {
        const newSearchResults = this.repository.create(searchResults);
        return await this.repository.save(newSearchResults);
    }

    // 根据ID查找搜索结果
    async findById(id: number): Promise<SearchResult | null> {
        return await this.repository.findOneBy({ id });
    }

    // 查找所有搜索结果
    async findAll(): Promise<SearchResult[]> {
        return await this.repository.find({
            relations: ['subQueries', 'subQueries.searchItems']
        });
    }

    // 根据条件查找搜索结果
    async findByConditions(conditions: Partial<SearchResult>): Promise<SearchResult[]> {
        return await this.repository.findBy(conditions);
    }

    // 更新搜索结果
    async update(id: number, searchResult: Partial<SearchResult>): Promise<boolean> {
        const result = await this.repository.update(id, searchResult);
        return result.affected !== 0;
    }

    // 删除搜索结果
    async delete(id: number): Promise<boolean> {
        const result = await this.repository.delete(id);
        return result.affected !== 0;
    }

    // 分页查询
    async findWithPagination(page: number, limit: number): Promise<[SearchResult[], number]> {
        return await this.repository.findAndCount({
            skip: (page - 1) * limit,
            take: limit,
            order: {
                createdAt: 'DESC'
            },
            relations: ['subQueries', 'subQueries.searchItems']
        });
    }
}