import { AppDataSource } from '../database/dataSource';
import { SearchSubQuery } from '../entities/SearchSubQuery';
import { Repository } from 'typeorm';

export class SearchSubQueryRepository {
    private repository: Repository<SearchSubQuery>;

    constructor() {
        this.repository = AppDataSource.getRepository(SearchSubQuery);
    }

    // 创建子问题
    async create(subQuery: Partial<SearchSubQuery>): Promise<SearchSubQuery> {
        const newSubQuery = this.repository.create(subQuery);
        return await this.repository.save(newSubQuery);
    }

    // 批量创建子问题
    async createMany(subQueries: Partial<SearchSubQuery>[]): Promise<SearchSubQuery[]> {
        const newSubQueries = this.repository.create(subQueries);
        return await this.repository.save(newSubQueries);
    }

    // 根据ID查找子问题
    async findById(id: number): Promise<SearchSubQuery | null> {
        return await this.repository.findOneBy({ id });
    }

    // 根据搜索结果ID查找所有子问题
    async findBySearchResultId(searchResultId: number): Promise<SearchSubQuery[]> {
        return await this.repository.find({
            where: { searchResultId },
            relations: ['searchItems']
        });
    }

    // 查找所有子问题
    async findAll(): Promise<SearchSubQuery[]> {
        return await this.repository.find({
            relations: ['searchResult', 'searchItems']
        });
    }

    // 根据条件查找子问题
    async findByConditions(conditions: Partial<SearchSubQuery>): Promise<SearchSubQuery[]> {
        return await this.repository.findBy(conditions);
    }

    // 更新子问题
    async update(id: number, subQuery: Partial<SearchSubQuery>): Promise<boolean> {
        const result = await this.repository.update(id, subQuery);
        return result.affected !== 0;
    }

    // 删除子问题
    async delete(id: number): Promise<boolean> {
        const result = await this.repository.delete(id);
        return result.affected !== 0;
    }

    // 分页查询
    async findWithPagination(page: number, limit: number): Promise<[SearchSubQuery[], number]> {
        return await this.repository.findAndCount({
            skip: (page - 1) * limit,
            take: limit,
            order: {
                createdAt: 'DESC'
            },
            relations: ['searchResult', 'searchItems']
        });
    }
}