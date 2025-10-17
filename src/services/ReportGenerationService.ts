import { ResearchResult } from '../entities/ResearchResult';
import { ResearchResultRepository } from '../repositories/ResearchResultRepository';

export class ReportGenerationService {
    private researchResultRepository: ResearchResultRepository;

    constructor() {
        this.researchResultRepository = new ResearchResultRepository();
    }

    /**
     * 基于搜索结果生成研究报告
     * @param searchId 关联的搜索结果ID
     * @param fullText 报告全文（Markdown格式）
     * @returns 生成的研究报告
     */
    async generateReport(searchId: number, fullText: string): Promise<ResearchResult> {
        const researchResultData: Partial<ResearchResult> = {
            searchId: searchId,
            fullText: fullText
        };

        return await this.researchResultRepository.create(researchResultData);
    }

    /**
     * 批量生成研究报告
     * @param reportsData 报告数据数组
     * @returns 生成的研究报告数组
     */
    async generateReports(reportsData: { searchId: number; fullText: string }[]): Promise<ResearchResult[]> {
        const researchResultsData: Partial<ResearchResult>[] = reportsData.map(data => ({
            searchId: data.searchId,
            fullText: data.fullText
        }));

        return await this.researchResultRepository.createMany(researchResultsData);
    }

    /**
     * 更新研究报告
     * @param id 研究报告ID
     * @param fullText 更新的全文内容
     * @returns 更新后的研究报告
     */
    async updateReport(id: number, fullText: string): Promise<boolean> {
        return await this.researchResultRepository.update(id, { fullText });
    }

    /**
     * 获取研究报告
     * @param id 研究报告ID
     * @returns 研究报告
     */
    async getReport(id: number): Promise<ResearchResult | null> {
        return await this.researchResultRepository.findById(id);
    }

    /**
     * 根据搜索ID获取研究报告
     * @param searchId 搜索结果ID
     * @returns 研究报告
     */
    async getReportBySearchId(searchId: number): Promise<ResearchResult[]> {
        return await this.researchResultRepository.findBySearchId(searchId);
    }
}