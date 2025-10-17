import fs from "fs";
import path from "path";
import axios from "axios";
import unzipper from "unzipper";
import { promisify } from "util";
import { app } from "electron";

// promisify stream.pipeline 是确保文件写入完成的最佳方式
const pipeline = promisify(require("stream").pipeline);

function getBaseDir(): string {
    // 使用 userData 存储路径，这是持久化、跨平台且推荐的位置
    // 您的应用名称将作为子目录名
    return app.getPath('userData');
}

export function localChromePath(): string {
    const baseDir = getBaseDir();
    const chromePath = path.join(baseDir, 'chrome-win/chrome.exe');
    return chromePath;
}

const CHROMIUM_URL =
    "https://cdn.playwright.dev/dbazure/download/playwright/builds/chromium/1187/chromium-win64.zip";

// -------------------------------------------------------------
// 1. 使用 Axios 重写下载文件函数
// -------------------------------------------------------------
export async function downloadFile(
    url: string,
    targetPath: string,
    onProgress?: (percent: number) => void
): Promise<void> {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream', // 关键：以流的形式接收响应
            // Axios 默认会自动处理重定向 (maxRedirects > 0)
            maxRedirects: 5, // 确保重定向次数足够
        });

        // 获取文件总大小 (如果服务器提供了)
        const totalLength = response.headers['content-length'];
        let downloadedLength = 0;
        let lastProgress = 0;

        // 创建写入流
        const writer = fs.createWriteStream(targetPath);

        // 绑定下载进度事件
        response.data.on('data', (chunk: Buffer) => {
            downloadedLength += chunk.length;
            if (onProgress && totalLength) {
                const percent = Math.round((downloadedLength / parseInt(totalLength, 10)) * 100);
                // 限制进度更新频率，避免过多更新
                if (percent - lastProgress >= 1 || percent === 100) {
                    onProgress(percent);
                    lastProgress = percent;
                }
            }
        });

        // 使用 pipeline 确保数据流从下载到写入文件完全结束
        await pipeline(response.data, writer);

    } catch (error) {
        // Axios 会自动捕获网络错误、HTTP错误状态码（非 2xx）和重定向失败
        // 并以 Promise 拒绝的形式抛出
        if (axios.isAxiosError(error) && error.response) {
            throw new Error(`下载失败，状态码: ${error.response.status}`);
        }
        throw new Error(`下载发生错误: ${error.message}`);
    }
}

// -------------------------------------------------------------
// 2. 解压函数（增强版，支持进度回调）
// -------------------------------------------------------------
export async function extractZip(zipPath: string, extractTo: string, onExtractStart?: () => void, onExtractProgress?: (percent: number) => void) {
    return new Promise<void>((resolve, reject) => {
        try {
            // 触发解压开始事件
            if (onExtractStart) onExtractStart();

            let entryCount = 0;
            let extractedCount = 0;

            const zipStream = fs.createReadStream(zipPath)
                .pipe(unzipper.Parse())
                .on('entry', (entry: any) => {
                    entryCount++;
                    const filePath = path.join(extractTo, entry.path);

                    // 确保目录存在
                    const dirName = path.dirname(filePath);
                    if (!fs.existsSync(dirName)) {
                        fs.mkdirSync(dirName, { recursive: true });
                    }

                    if (entry.type === 'Directory') {
                        entry.autodrain();
                    } else {
                        const writeStream = fs.createWriteStream(filePath);
                        entry.pipe(writeStream);

                        writeStream.on('close', () => {
                            extractedCount++;
                            if (onExtractProgress && entryCount > 0) {
                                const percent = Math.round((extractedCount / entryCount) * 100);
                                onExtractProgress(percent);
                            }
                        });
                    }
                })
                .on('close', () => {
                    resolve();
                })
                .on('error', (error: Error) => {
                    reject(error);
                });
        } catch (error) {
            reject(error);
        }
    });
}

// -------------------------------------------------------------
// 3. 整合函数（使用新的下载和解压逻辑）
// -------------------------------------------------------------
export async function ensureBrowserInstalled(
    onProgress?: (percent: number) => void,
    onExtractStart?: () => void,
    onExtractProgress?: (percent: number) => void
) {
    try {
        // 使用 fs/promises 版本，如果您的 Node.js 版本支持
        const baseDir = getBaseDir();

        const targetFolder = path.join(baseDir, "chromium-win");
        const zipPath = path.join(baseDir, "chromium.zip");

        if (fs.existsSync(targetFolder)) {
            console.log("✅ 浏览器已存在");
            if (onProgress) onProgress(100);
            return;
        }

        console.log("🚀 开始下载浏览器包... to ", zipPath);

        // 使用新的 Axios 下载函数
        await downloadFile(CHROMIUM_URL, zipPath, onProgress);

        console.log("📦 解压中...");
        // 解压完成
        await extractZip(zipPath, baseDir, onExtractStart, onExtractProgress);

        // 删除临时压缩包
        fs.unlinkSync(zipPath);
        console.log("✅ 浏览器下载完成");
    } catch (error: any) {
        console.error("浏览器下载失败:", error.message);
        throw error;
    }
}