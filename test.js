import axios from "axios";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const searxInstance = "http://localhost:9527/"; // 你自己的 SearxNG 实例地址
const query = "AI resume optimization";  // 搜索关键词
const outputDir = path.resolve("./searx_results");
const maxResults = 5; // 只取前 5 个结果

// 创建输出目录
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function main() {
    console.log("🔍 正在使用 SearxNG 搜索:", query);

    // 第一步：用 axios 获取搜索结果
    const { data } = await axios.get(`${searxInstance}/search`, {
        params: {
            q: query,
            format: "json",
            categories: "general",
            language: "zh-CN",
        },
    });

    const results = data.results.slice(0, maxResults);
    console.log(`📄 获取到 ${results.length} 条搜索结果`);

    // 第二步：启动浏览器
    const browser = await chromium.launch({
        headless: true,
        executablePath: 'C:/Users/xiaoshuyui/github_repo/job-helper/app/browser/chrome-win/chrome.exe',
    });
    const context = await browser.newContext();

    for (let i = 0; i < results.length; i++) {
        const item = results[i];
        const url = item.url;
        const title = item.title || "无标题";
        const fileName = `${i + 1}-${title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_")}.png`;
        const savePath = path.join(outputDir, fileName);

        console.log(`🖼️ [${i + 1}] 正在打开: ${url}`);

        try {
            const page = await context.newPage();
            await page.goto(url, { timeout: 20000, waitUntil: "domcontentloaded" });
            await page.screenshot({ path: savePath, fullPage: true });
            await page.close();

            console.log(`✅ 已保存截图: ${savePath}`);

            // 保存元数据
            const meta = {
                title,
                url,
                snippet: item.content,
                imagePath: savePath,
                source: searxInstance,
                savedAt: new Date().toISOString(),
            };
            fs.writeFileSync(
                path.join(outputDir, `${i + 1}-meta.json`),
                JSON.stringify(meta, null, 2),
                "utf-8"
            );
        } catch (err) {
            console.warn(`❌ 打开失败: ${url}`, err.message);
        }
    }

    await browser.close();
    console.log("🎉 全部完成！");
}

main().catch(console.error);
