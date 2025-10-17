import { AppDataSource } from '../database/dataSource';
import { SearchItem } from '../entities/SearchItem';
import { Repository } from 'typeorm';

export class SearchItemRepository {
    private repository: Repository<SearchItem>;

    constructor() {
        this.repository = AppDataSource.getRepository(SearchItem);
    }

    // 创建搜索项
    async create(searchItem: Partial<SearchItem>): Promise<SearchItem> {
        const newSearchItem = this.repository.create(searchItem);
        return await this.repository.save(newSearchItem);
    }

    // 批量创建搜索项
    async createMany(searchItems: Partial<SearchItem>[]): Promise<SearchItem[]> {
        const newSearchItems = this.repository.create(searchItems);
        return await this.repository.save(newSearchItems);
    }

    // 根据ID查找搜索项
    async findById(id: number): Promise<SearchItem | null> {
        return await this.repository.findOneBy({ id });
    }

    // 根据子问题ID查找所有搜索项
    async findBySubQueryId(subQueryId: number): Promise<SearchItem[]> {
        return await this.repository.find({
            where: { subQueryId }
        });
    }

    // 查找所有搜索项
    async findAll(): Promise<SearchItem[]> {
        return await this.repository.find({
            relations: ['subQuery']
        });
    }

    // 根据条件查找搜索项
    async findByConditions(conditions: Partial<SearchItem>): Promise<SearchItem[]> {
        return await this.repository.findBy(conditions);
    }

    // 更新搜索项
    async update(id: number, searchItem: Partial<SearchItem>): Promise<boolean> {
        const result = await this.repository.update(id, searchItem);
        return result.affected !== 0;
    }

    // 删除搜索项
    async delete(id: number): Promise<boolean> {
        const result = await this.repository.delete(id);
        return result.affected !== 0;
    }

    // 分页查询
    async findWithPagination(page: number, limit: number): Promise<[SearchItem[], number]> {
        return await this.repository.findAndCount({
            skip: (page - 1) * limit,
            take: limit,
            order: {
                createdAt: 'DESC'
            },
            relations: ['subQuery']
        });
    }
}