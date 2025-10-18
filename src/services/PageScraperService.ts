import { chromium, Browser, Page } from 'playwright';
import { localChromePath } from '../browserDownloader';

export interface ScrapedPageContent {
    url: string;
    title: string;
    paragraphs: string[];
    filteredContent: string;
    wordCount: number;
    scrapedAt: string;
}

export interface ScrapeProgressData {
    type: 'start' | 'progress' | 'complete' | 'error';
    current: number;
    total: number;
    url?: string;
    title?: string;
    wordCount?: number;
    error?: string;
}

export type ScrapeProgressCallback = (progress: ScrapeProgressData) => void;

export class PageScraperService {
    private browser: Browser | null = null;

    /**
     * 初始化浏览器
     */
    async initBrowser(): Promise<void> {
        if (this.browser) {
            return;
        }

        const chromePath = localChromePath();
        console.log('[PageScraperService] 启动浏览器:', chromePath);

        this.browser = await chromium.launch({
            headless: true,
            executablePath: chromePath,
        });
    }

    /**
     * 关闭浏览器
     */
    async closeBrowser(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    /**
     * 抓取单个页面的 p 标签内容
     */
    async scrapePage(
        url: string,
        onProgress?: ScrapeProgressCallback
    ): Promise<ScrapedPageContent> {
        if (!this.browser) {
            await this.initBrowser();
        }

        const page = await this.browser!.newPage();

        try {
            console.log(`[PageScraperService] 正在抓取: ${url}`);

            // 访问页面
            await page.goto(url, {
                timeout: 30000,
                waitUntil: 'domcontentloaded'
            });

            // 获取页面标题
            const title = await page.title();

            // 发送进度通知：开始抓取
            if (onProgress) {
                onProgress({
                    type: 'start',
                    current: 0,
                    total: 1,
                    url,
                    title
                });
            }

            // 提取所有 p 标签的文本内容
            const paragraphs = await page.$$eval('p', (elements) =>
                elements
                    .map(el => el.textContent?.trim() || '')
                    .filter(text => text.length > 0)
            );

            console.log(`[PageScraperService] 提取到 ${paragraphs.length} 个段落`);

            // 直接拼接所有段落，不进行关键词过滤
            const filteredContent = paragraphs.join('\n\n');
            console.log(`[PageScraperService] 总字数: ${filteredContent.length}`);

            await page.close();

            const result: ScrapedPageContent = {
                url,
                title,
                paragraphs,
                filteredContent,
                wordCount: filteredContent.length,
                scrapedAt: new Date().toISOString()
            };

            // 发送进度通知：完成
            if (onProgress) {
                onProgress({
                    type: 'complete',
                    current: 1,
                    total: 1,
                    url,
                    title,
                    wordCount: result.wordCount
                });
            }

            return result;
        } catch (error: any) {
            await page.close();
            console.error(`[PageScraperService] 抓取失败: ${url}`, error.message);

            // 发送错误通知
            if (onProgress) {
                onProgress({
                    type: 'error',
                    current: 0,
                    total: 1,
                    url,
                    error: error.message
                });
            }

            throw error;
        }
    }

    /**
     * 批量抓取多个页面
     */
    async scrapePages(
        urls: string[],
        maxPages: number = 5,
        onProgress?: ScrapeProgressCallback
    ): Promise<ScrapedPageContent[]> {
        const results: ScrapedPageContent[] = [];
        const limitedUrls = urls.slice(0, maxPages);

        for (let i = 0; i < limitedUrls.length; i++) {
            try {
                const content = await this.scrapePage(
                    limitedUrls[i],
                    onProgress ? (progress) => {
                        // 调整进度信息，反映总体进度
                        onProgress({
                            ...progress,
                            current: i + (progress.type === 'complete' ? 1 : 0),
                            total: limitedUrls.length
                        });
                    } : undefined
                );
                results.push(content);
            } catch (error: any) {
                console.error(`[PageScraperService] 跳过失败的页面: ${limitedUrls[i]}`);
                // 继续处理下一个页面
            }
        }

        return results;
    }
}

// 导出单例实例
export const pageScraperService = new PageScraperService();
