import { SearchResultRepository } from '../repositories/SearchResultRepository';
import { SearchSubQueryService } from './SearchSubQueryService';
import { SearchItemService } from './SearchItemService';
import { SearchResult } from '../entities/SearchResult';

export class SearchResultService {
    private searchResultRepository: SearchResultRepository;
    private searchSubQueryService: SearchSubQueryService;
    private searchItemService: SearchItemService;

    constructor() {
        this.searchResultRepository = new SearchResultRepository();
        this.searchSubQueryService = new SearchSubQueryService();
        this.searchItemService = new SearchItemService();
    }

    // 创建搜索结果
    async createSearchResult(searchResultData: Partial<SearchResult>): Promise<SearchResult> {
        return await this.searchResultRepository.create(searchResultData);
    }

    // 创建完整的搜索结果（包括子问题和搜索项）
    async createCompleteSearchResult(data: {
        query: string;
        subQueries: {
            q: string;
            searchs: {
                url: string;
                title: string;
                abstract: string;
                image_save_path: string;
            }[];
        }[];
    }): Promise<SearchResult> {
        // 创建搜索结果
        const searchResult = await this.createSearchResult({
            query: data.query
        });

        // 创建子问题和搜索项
        for (const subQueryData of data.subQueries) {
            // 创建子问题
            const subQuery = await this.searchSubQueryService.createSearchSubQuery({
                question: subQueryData.q,
                searchResultId: searchResult.id
            });

            // 创建搜索项
            const searchItemsData = subQueryData.searchs.map(search => ({
                url: search.url,
                title: search.title,
                abstract: search.abstract,
                imagePath: search.image_save_path,
                subQueryId: subQuery.id
            }));

            if (searchItemsData.length > 0) {
                await this.searchItemService.createSearchItems(searchItemsData);
            }
        }

        // 返回完整的搜索结果
        return await this.getSearchResultById(searchResult.id);
    }

    // 获取所有搜索结果
    async getAllSearchResults(): Promise<SearchResult[]> {
        return await this.searchResultRepository.findAll();
    }

    // 根据ID获取搜索结果
    async getSearchResultById(id: number): Promise<SearchResult | null> {
        return await this.searchResultRepository.findById(id);
    }

    // 更新搜索结果
    async updateSearchResult(id: number, searchResultData: Partial<SearchResult>): Promise<boolean> {
        return await this.searchResultRepository.update(id, searchResultData);
    }

    // 删除搜索结果
    async deleteSearchResult(id: number): Promise<boolean> {
        return await this.searchResultRepository.delete(id);
    }

    // 分页获取搜索结果
    async getSearchResultsPaginated(page: number, limit: number): Promise<{ searchResults: SearchResult[], total: number }> {
        const [searchResults, total] = await this.searchResultRepository.findWithPagination(page, limit);
        return { searchResults, total };
    }
}