import { SearchItemRepository } from '../repositories/SearchItemRepository';
import { SearchItem } from '../entities/SearchItem';

export class SearchItemService {
    private searchItemRepository: SearchItemRepository;

    constructor() {
        this.searchItemRepository = new SearchItemRepository();
    }

    // 创建搜索项
    async createSearchItem(searchItemData: Partial<SearchItem>): Promise<SearchItem> {
        return await this.searchItemRepository.create(searchItemData);
    }

    // 批量创建搜索项
    async createSearchItems(searchItemsData: Partial<SearchItem>[]): Promise<SearchItem[]> {
        return await this.searchItemRepository.createMany(searchItemsData);
    }

    // 获取所有搜索项
    async getAllSearchItems(): Promise<SearchItem[]> {
        return await this.searchItemRepository.findAll();
    }

    // 根据ID获取搜索项
    async getSearchItemById(id: number): Promise<SearchItem | null> {
        return await this.searchItemRepository.findById(id);
    }

    // 根据子问题ID获取所有搜索项
    async getSearchItemsBySubQueryId(subQueryId: number): Promise<SearchItem[]> {
        return await this.searchItemRepository.findBySubQueryId(subQueryId);
    }

    // 更新搜索项
    async updateSearchItem(id: number, searchItemData: Partial<SearchItem>): Promise<boolean> {
        return await this.searchItemRepository.update(id, searchItemData);
    }

    // 删除搜索项
    async deleteSearchItem(id: number): Promise<boolean> {
        return await this.searchItemRepository.delete(id);
    }

    // 分页获取搜索项
    async getSearchItemsPaginated(page: number, limit: number): Promise<{ searchItems: SearchItem[], total: number }> {
        const [searchItems, total] = await this.searchItemRepository.findWithPagination(page, limit);
        return { searchItems, total };
    }
}