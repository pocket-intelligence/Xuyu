import { AppDataSource } from '../database/dataSource';
import { ResearchResult } from '../entities/ResearchResult';
import { Repository } from 'typeorm';

export class ResearchResultRepository {
    private repository: Repository<ResearchResult>;

    constructor() {
        this.repository = AppDataSource.getRepository(ResearchResult);
    }

    // 创建研究报告
    async create(researchResult: Partial<ResearchResult>): Promise<ResearchResult> {
        const newResearchResult = this.repository.create(researchResult);
        return await this.repository.save(newResearchResult);
    }

    // 批量创建研究报告
    async createMany(researchResults: Partial<ResearchResult>[]): Promise<ResearchResult[]> {
        const newResearchResults = this.repository.create(researchResults);
        return await this.repository.save(newResearchResults);
    }

    // 根据ID查找研究报告
    async findById(id: number): Promise<ResearchResult | null> {
        return await this.repository.findOneBy({ id });
    }

    // 根据搜索ID查找研究报告
    async findBySearchId(searchId: number): Promise<ResearchResult[]> {
        return await this.repository.findBy({ searchId });
    }

    // 查找所有研究报告
    async findAll(): Promise<ResearchResult[]> {
        return await this.repository.find();
    }

    // 根据条件查找研究报告
    async findByConditions(conditions: Partial<ResearchResult>): Promise<ResearchResult[]> {
        return await this.repository.findBy(conditions);
    }

    // 更新研究报告
    async update(id: number, researchResult: Partial<ResearchResult>): Promise<boolean> {
        const result = await this.repository.update(id, researchResult);
        return result.affected !== 0;
    }

    // 删除研究报告
    async delete(id: number): Promise<boolean> {
        const result = await this.repository.delete(id);
        return result.affected !== 0;
    }

    // 分页查询
    async findWithPagination(page: number, limit: number): Promise<[ResearchResult[], number]> {
        return await this.repository.findAndCount({
            skip: (page - 1) * limit,
            take: limit,
            order: {
                createdAt: 'DESC'
            }
        });
    }
}