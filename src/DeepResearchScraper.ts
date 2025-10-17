import { chromium, BrowserContext } from "playwright";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import { BrowserStateManager } from "./browserStateManager";

export interface DeepResearchOptions {
    searxInstance?: string;      // SearXNG 实例地址
    query: string;               // 搜索关键词
    maxResults?: number;         // 抓取前 N 个结果
    outputDir?: string;          // 输出目录
    headless?: boolean;          // 是否无头模式
}

export interface DeepResearchResult {
    title: string;
    url: string;
    snippet?: string;
    imagePath: string;
    savedAt: string;
}

export class DeepResearchScraper {
    private browserContext: BrowserContext | null = null;
    private browserStateManager: BrowserStateManager;

    constructor(private options: DeepResearchOptions) {
        this.options.searxInstance ||= "http://localhost:9527/"; // 可替换为你的 SearXNG 实例
        this.options.outputDir ||= path.resolve(__dirname, "../deepresearch_output");
        this.options.maxResults ||= 5;
        this.options.headless ??= false;

        if (!fs.existsSync(this.options.outputDir)) {
            fs.mkdirSync(this.options.outputDir, { recursive: true });
        }

        // 初始化浏览器状态管理器
        this.browserStateManager = new BrowserStateManager();
    }

    /** 调用 SearXNG API 获取搜索结果（axios版） */
    private async fetchSearchResults(): Promise<any[]> {
        const apiUrl = `${this.options.searxInstance}/search`;
        console.log(`[DeepResearch] 查询: ${apiUrl}`);

        try {
            const res = await axios.get(apiUrl, {
                params: {
                    q: this.options.query,
                    format: "json",
                    categories: "general",
                    language: "zh-CN",
                },
                timeout: 15000,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    Accept: "application/json",
                },
            });

            if (!res.data || !res.data.results) {
                throw new Error("无搜索结果返回");
            }

            const items = res.data.results.slice(0, this.options.maxResults);
            console.log(`[DeepResearch] 获取到 ${items.length} 个结果`);
            return items;
        } catch (error: any) {
            console.error("[DeepResearch] SearXNG 查询失败:", error.message);
            return [];
        }
    }

    /** 使用 Playwright 截取网页长图 */
    private async capturePageScreenshot(url: string, index: number): Promise<string | null> {
        try {
            const page = await this.browserContext!.newPage();
            console.log(`[DeepResearch] 打开页面: ${url}`);
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });

            // 延迟几秒等待页面加载
            await new Promise((r) => setTimeout(r, 10_000));

            const filePath = path.resolve(
                this.options.outputDir!,
                `page_${index + 1}_${Date.now()}.png`
            );
            await page.screenshot({ path: filePath, fullPage: true });
            await page.close();

            console.log(`✅ 截图保存: ${filePath}`);
            return filePath;
        } catch (err: any) {
            console.error(`[DeepResearch] 截图失败: ${url}`, err.message);
            return null;
        }
    }

    /** 主流程 */
    async run(): Promise<DeepResearchResult[]> {
        console.log("[DeepResearch] 开始执行...");
        const results: DeepResearchResult[] = [];

        // Step 1: 获取搜索结果
        const items = await this.fetchSearchResults();
        if (!items.length) {
            console.warn("[DeepResearch] 没有可用结果");
            return [];
        }

        // Step 2: 启动浏览器并尝试恢复登录状态
        const cookies = this.browserStateManager.readCookies();
        this.browserContext = await chromium.launchPersistentContext(
            this.browserStateManager.getUserDataDir(),
            {
                headless: this.options.headless,
            }
        );

        // 如果有保存的cookie，尝试加载
        if (cookies && this.browserStateManager.cookiesHaveValidExpiry(cookies)) {
            try {
                await this.browserContext.addCookies(cookies);
                console.log("✅ 已加载保存的浏览器状态");
            } catch (error) {
                console.warn("加载保存的浏览器状态失败:", error);
            }
        }

        // Step 3: 逐个截图
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const url = item.url;
            if (!url) continue;

            const imagePath = await this.capturePageScreenshot(url, i);
            if (!imagePath) continue;

            const record: DeepResearchResult = {
                title: item.title || "未命名页面",
                url,
                snippet: item.content || item.parsed_title || "",
                imagePath,
                savedAt: new Date().toISOString(),
            };

            results.push(record);

            // 写入 metadata.json（每次追加更新）
            const metaFile = path.resolve(this.options.outputDir!, "metadata.json");
            fs.writeFileSync(metaFile, JSON.stringify(results, null, 2), "utf-8");

            console.log(`📄 已保存: ${record.title}`);
        }

        // 保存浏览器状态
        await this.browserStateManager.saveCookies(this.browserContext);
        console.log("✅ 浏览器状态已保存");

        await this.browserContext.close();
        console.log("[DeepResearch] 全部完成 ✅");
        return results;
    }
}