import { ResearchResultRepository } from '../repositories/ResearchResultRepository';
import { ResearchResult } from '../entities/ResearchResult';

export class ResearchResultService {
    private researchResultRepository: ResearchResultRepository;

    constructor() {
        this.researchResultRepository = new ResearchResultRepository();
    }

    // 创建研究报告
    async createResearchResult(researchResultData: Partial<ResearchResult>): Promise<ResearchResult> {
        return await this.researchResultRepository.create(researchResultData);
    }

    // 批量创建研究报告
    async createResearchResults(researchResultsData: Partial<ResearchResult>[]): Promise<ResearchResult[]> {
        return await this.researchResultRepository.createMany(researchResultsData);
    }

    // 获取所有研究报告
    async getAllResearchResults(): Promise<ResearchResult[]> {
        return await this.researchResultRepository.findAll();
    }

    // 根据ID获取研究报告
    async getResearchResultById(id: number): Promise<ResearchResult | null> {
        return await this.researchResultRepository.findById(id);
    }

    // 根据搜索ID获取研究报告
    async getResearchResultsBySearchId(searchId: number): Promise<ResearchResult[]> {
        return await this.researchResultRepository.findBySearchId(searchId);
    }

    // 更新研究报告
    async updateResearchResult(id: number, researchResultData: Partial<ResearchResult>): Promise<boolean> {
        return await this.researchResultRepository.update(id, researchResultData);
    }

    // 删除研究报告
    async deleteResearchResult(id: number): Promise<boolean> {
        return await this.researchResultRepository.delete(id);
    }

    // 分页获取研究报告
    async getResearchResultsPaginated(page: number, limit: number): Promise<{ researchResults: ResearchResult[], total: number }> {
        const [researchResults, total] = await this.researchResultRepository.findWithPagination(page, limit);
        return { researchResults, total };
    }
}