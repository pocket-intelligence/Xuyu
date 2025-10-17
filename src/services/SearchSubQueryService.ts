import { SearchSubQueryRepository } from '../repositories/SearchSubQueryRepository';
import { SearchSubQuery } from '../entities/SearchSubQuery';

export class SearchSubQueryService {
    private searchSubQueryRepository: SearchSubQueryRepository;

    constructor() {
        this.searchSubQueryRepository = new SearchSubQueryRepository();
    }

    // 创建子问题
    async createSearchSubQuery(subQueryData: Partial<SearchSubQuery>): Promise<SearchSubQuery> {
        return await this.searchSubQueryRepository.create(subQueryData);
    }

    // 批量创建子问题
    async createSearchSubQueries(subQueriesData: Partial<SearchSubQuery>[]): Promise<SearchSubQuery[]> {
        return await this.searchSubQueryRepository.createMany(subQueriesData);
    }

    // 获取所有子问题
    async getAllSearchSubQueries(): Promise<SearchSubQuery[]> {
        return await this.searchSubQueryRepository.findAll();
    }

    // 根据ID获取子问题
    async getSearchSubQueryById(id: number): Promise<SearchSubQuery | null> {
        return await this.searchSubQueryRepository.findById(id);
    }

    // 根据搜索结果ID获取所有子问题
    async getSearchSubQueriesBySearchResultId(searchResultId: number): Promise<SearchSubQuery[]> {
        return await this.searchSubQueryRepository.findBySearchResultId(searchResultId);
    }

    // 更新子问题
    async updateSearchSubQuery(id: number, subQueryData: Partial<SearchSubQuery>): Promise<boolean> {
        return await this.searchSubQueryRepository.update(id, subQueryData);
    }

    // 删除子问题
    async deleteSearchSubQuery(id: number): Promise<boolean> {
        return await this.searchSubQueryRepository.delete(id);
    }

    // 分页获取子问题
    async getSearchSubQueriesPaginated(page: number, limit: number): Promise<{ subQueries: SearchSubQuery[], total: number }> {
        const [subQueries, total] = await this.searchSubQueryRepository.findWithPagination(page, limit);
        return { subQueries, total };
    }
}