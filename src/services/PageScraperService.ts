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
    async scrapePage(url: string, keywords: string[] = []): Promise<ScrapedPageContent> {
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

            // 提取所有 p 标签的文本内容
            const paragraphs = await page.$$eval('p', (elements) =>
                elements
                    .map(el => el.textContent?.trim() || '')
                    .filter(text => text.length > 0)
            );

            console.log(`[PageScraperService] 提取到 ${paragraphs.length} 个段落`);

            // 如果提供了关键词，进行过滤
            let filteredContent = '';
            if (keywords.length > 0) {
                // 将关键词转换为小写用于匹配
                const lowerKeywords = keywords.map(k => k.toLowerCase());

                // 过滤包含关键词的段落
                const relevantParagraphs = paragraphs.filter(para => {
                    const lowerPara = para.toLowerCase();
                    return lowerKeywords.some(keyword => lowerPara.includes(keyword));
                });

                filteredContent = relevantParagraphs.join('\n\n');
                console.log(`[PageScraperService] 过滤后剩余 ${relevantParagraphs.length} 个相关段落`);
            } else {
                // 如果没有关键词，直接拼接所有段落
                filteredContent = paragraphs.join('\n\n');
            }

            await page.close();

            return {
                url,
                title,
                paragraphs,
                filteredContent,
                wordCount: filteredContent.length,
                scrapedAt: new Date().toISOString()
            };
        } catch (error: any) {
            await page.close();
            console.error(`[PageScraperService] 抓取失败: ${url}`, error.message);
            throw error;
        }
    }

    /**
     * 批量抓取多个页面
     */
    async scrapePages(
        urls: string[],
        keywords: string[] = [],
        maxPages: number = 5
    ): Promise<ScrapedPageContent[]> {
        const results: ScrapedPageContent[] = [];
        const limitedUrls = urls.slice(0, maxPages);

        for (let i = 0; i < limitedUrls.length; i++) {
            try {
                const content = await this.scrapePage(limitedUrls[i], keywords);
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
