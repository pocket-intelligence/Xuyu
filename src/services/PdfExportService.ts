import { BrowserWindow, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { marked } from 'marked';
import * as DOMPurify from 'isomorphic-dompurify';

/**
 * PDF 导出服务
 * 使用 Electron 的打印 API 将报告导出为 PDF
 */
export class PdfExportService {
    /**
     * 生成 PDF 报告
     * @param sessionId 会话ID
     * @param markdownContent Markdown 格式的报告内容
     * @param topic 报告主题（用于文件名）
     * @returns PDF 文件的完整路径
     */
    static async exportToPdf(
        sessionId: string,
        markdownContent: string,
        topic: string
    ): Promise<string> {
        console.log(`[PdfExportService] 开始生成 PDF: ${sessionId}`);

        // 创建 PDF 存储目录
        const pdfDir = path.join(app.getPath('userData'), 'reports');
        if (!fs.existsSync(pdfDir)) {
            fs.mkdirSync(pdfDir, { recursive: true });
        }

        // 生成文件名（使用时间戳和主题）
        const timestamp = new Date().getTime();
        const safeTopic = topic.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);
        const filename = `${safeTopic}_${timestamp}.pdf`;
        const pdfPath = path.join(pdfDir, filename);

        // 清理 Markdown 内容（移除代码块标记）
        const cleanedMarkdown = this.cleanMarkdownContent(markdownContent);

        // 将 Markdown 转换为 HTML
        const htmlContent = this.convertMarkdownToHtml(cleanedMarkdown);

        // 创建隐藏的浏览器窗口用于渲染
        const win = new BrowserWindow({
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
            },
        });

        try {
            // 构建完整的 HTML 页面（包含样式）
            const fullHtml = this.buildHtmlPage(htmlContent, topic);

            // 加载 HTML 内容
            await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);

            // 等待页面加载完成
            await new Promise(resolve => setTimeout(resolve, 500));

            // 生成 PDF
            const data = await win.webContents.printToPDF({
                printBackground: true,
                pageSize: 'A4',
                margins: {
                    top: 0.5,
                    bottom: 0.5,
                    left: 0.5,
                    right: 0.5,
                },
            });

            // 写入文件
            fs.writeFileSync(pdfPath, data);

            console.log(`[PdfExportService] PDF 生成成功: ${pdfPath}`);
            return pdfPath;
        } catch (error: any) {
            console.error('[PdfExportService] PDF 生成失败:', error);
            throw new Error(`PDF 生成失败: ${error.message}`);
        } finally {
            // 关闭窗口
            win.close();
        }
    }

    /**
     * 清理 Markdown 内容
     * 移除可能存在的代码块包装标记
     */
    private static cleanMarkdownContent(content: string): string {
        let cleaned = content || '';

        // 移除开头的 ````` 或 ``` 标记
        cleaned = cleaned.replace(/^````\s*\n?/i, '').replace(/^```\s*\n?/, '');

        // 移除结尾的 ``` 标记
        cleaned = cleaned.replace(/\n?```\s*$/, '');

        // 移除 ECharts 配置注释（因为 PDF 不支持图表）
        cleaned = cleaned.replace(/<!--\s*ECHARTS_CONFIG_START[\s\S]*?ECHARTS_CONFIG_END\s*-->/g, '');

        // 移除图表占位符
        cleaned = cleaned.replace(/{{CHART:\w+}}/g, '');

        console.log('[PdfExportService] Markdown 内容已清理');
        return cleaned.trim();
    }

    /**
     * 将 Markdown 转换为 HTML
     */
    private static convertMarkdownToHtml(markdown: string): string {
        try {
            // 配置 marked 选项
            marked.setOptions({
                gfm: true, // 启用 GitHub Flavored Markdown
                breaks: true, // 支持换行
            });

            // 转换 Markdown 为 HTML
            const rawHtml = marked.parse(markdown) as string;

            // 使用 DOMPurify 清理 HTML（防止 XSS）
            const cleanHtml = DOMPurify.sanitize(rawHtml, {
                ALLOWED_TAGS: [
                    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                    'p', 'br', 'hr',
                    'ul', 'ol', 'li',
                    'table', 'thead', 'tbody', 'tr', 'th', 'td',
                    'strong', 'em', 'code', 'pre',
                    'blockquote', 'a', 'img'
                ],
                ALLOWED_ATTR: ['href', 'src', 'alt', 'title']
            });

            console.log('[PdfExportService] Markdown 已转换为 HTML');
            return cleanHtml;
        } catch (error: any) {
            console.error('[PdfExportService] Markdown 转换失败:', error);
            // 如果转换失败，返回原始内容（用 <pre> 包裹）
            return `<pre>${markdown}</pre>`;
        }
    }

    /**
     * 构建完整的 HTML 页面
     */
    private static buildHtmlPage(content: string, topic: string): string {
        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${topic}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", 
                         "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif;
            font-size: 14px;
            line-height: 1.8;
            color: #262626;
            background: #fff;
            padding: 40px 60px;
        }
        
        .content {
            max-width: 100%;
        }
        
        h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 20px;
            margin-top: 0;
            color: #000;
            border-bottom: 3px solid #1890ff;
            padding-bottom: 12px;
            page-break-after: avoid;
        }
        
        h2 {
            font-size: 22px;
            font-weight: 600;
            margin-top: 32px;
            margin-bottom: 16px;
            color: #1890ff;
            border-bottom: 2px solid #e8e8e8;
            padding-bottom: 8px;
            page-break-after: avoid;
        }
        
        h3 {
            font-size: 18px;
            font-weight: 600;
            margin-top: 24px;
            margin-bottom: 12px;
            color: #333;
            page-break-after: avoid;
        }
        
        h4, h5, h6 {
            font-size: 16px;
            font-weight: 600;
            margin-top: 16px;
            margin-bottom: 8px;
            color: #555;
            page-break-after: avoid;
        }
        
        p {
            margin-bottom: 12px;
            text-align: justify;
            line-height: 1.8;
            orphans: 3;
            widows: 3;
        }
        
        ul, ol {
            margin-left: 24px;
            margin-bottom: 12px;
            padding-left: 0;
        }
        
        li {
            margin-bottom: 6px;
            line-height: 1.8;
        }
        
        blockquote {
            border-left: 4px solid #1890ff;
            padding-left: 16px;
            margin: 16px 0;
            color: #666;
            font-style: italic;
            background: #f5f5f5;
            padding: 12px 16px;
        }
        
        code {
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: "Consolas", "Monaco", "Courier New", Courier, monospace;
            font-size: 13px;
            color: #d63384;
        }
        
        pre {
            background: #f6f8fa;
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            margin-bottom: 16px;
            border: 1px solid #e8e8e8;
            page-break-inside: avoid;
        }
        
        pre code {
            background: none;
            padding: 0;
            color: #333;
            font-size: 13px;
            line-height: 1.5;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            font-size: 13px;
            page-break-inside: avoid;
        }
        
        table th {
            background: #fafafa;
            font-weight: 600;
            text-align: left;
            padding: 10px 12px;
            border: 1px solid #e8e8e8;
            border-bottom: 2px solid #d9d9d9;
        }
        
        table td {
            padding: 10px 12px;
            border: 1px solid #e8e8e8;
            line-height: 1.6;
        }
        
        table tr:nth-child(even) {
            background: #fafafa;
        }
        
        a {
            color: #1890ff;
            text-decoration: none;
            word-break: break-all;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        img {
            max-width: 100%;
            height: auto;
            margin: 12px 0;
            page-break-inside: avoid;
        }
        
        hr {
            border: none;
            border-top: 1px solid #e8e8e8;
            margin: 24px 0;
        }
        
        strong {
            font-weight: 600;
            color: #262626;
        }
        
        em {
            font-style: italic;
            color: #595959;
        }
        
        .page-break {
            page-break-after: always;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e8e8e8;
            text-align: center;
            color: #999;
            font-size: 12px;
        }
        
        @media print {
            body {
                padding: 20px;
            }
            
            h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid;
            }
            
            table, figure, img {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <h1>${this.escapeHtml(topic)}</h1>
    <div class="content">
        ${content}
    </div>
    <div class="footer">
        <p>本报告由深度研究智能体生成 · ${new Date().toLocaleString('zh-CN')}</p>
    </div>
</body>
</html>
        `.trim();
    }

    /**
     * HTML 转义
     */
    private static escapeHtml(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * 打开 PDF 文件所在目录
     */
    static async openPdfDirectory(pdfPath: string): Promise<void> {
        const { shell } = require('electron');
        await shell.showItemInFolder(pdfPath);
    }
}
