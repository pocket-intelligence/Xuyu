// deep-research/agent/researchGraph.ts

import { START, END, StateGraph, Annotation, MemorySaver, interrupt } from "@langchain/langgraph";
import OpenAI from "openai";
import { readConfig } from "../configManager";
import { createOpenAIClient } from "./llm";
import { AgentSessionService } from "../services/AgentSessionService";
import { pageScraperService, ScrapeProgressData } from "../services/PageScraperService";
import { sendScrapeProgress } from "../index";
import { searchSearxng as searchSearxngTool } from "./searTool";

// ----------------------------
// 1️⃣ 状态定义
// ----------------------------
export const ResearchState = Annotation.Root({
    topic: Annotation<string>({
        reducer: (_, x) => x,
        default: () => "",
    }),
    // 使用大模型或者人工构造的一个任务清单，有每个任务的名称和描述
    task_list: Annotation<Record<string, string>[]>({
        reducer: (_, x) => x,
        default: () => [],
    }),
    // 已完成的任务清单，名称需和task_list中一致，结果用string保存
    // 这个结构主要是为了恢复任务状态
    finished_tasks: Annotation<Record<string, string>[]>({
        reducer: (_, x) => x,
        default: () => [],
    }),
    report: Annotation<string | null>({
        reducer: (_, x) => x,
        default: () => null,
    }),
    output_format: Annotation<"直接问答" | "深度报告" | "结构化输出">({
        reducer: (_, x) => x,
        default: () => "深度报告",
    }),
    input_tokens: Annotation<number>({
        reducer: (x, y) => x + (y ?? 0),
        default: () => 0,
    }),
    output_tokens: Annotation<number>({
        reducer: (x, y) => x + (y ?? 0),
        default: () => 0,
    }),
    llm_client: Annotation<OpenAI>({
        reducer: (_, x) => x,
        default: () => {
            const config = readConfig();
            if (!config || !config.llmApiUrl) throw new Error("No config found");
            return createOpenAIClient(config.llmApiUrl, config.llmApiKey);
        },
    }),
    llm_model: Annotation<string>({
        reducer: (_, x) => x,
        default: () => "deepseek-v3.1",
    }),
    // 新增: 会话 ID，用于数据持久化
    session_id: Annotation<string>({
        reducer: (_, x) => x,
        default: () => "",
    }),
});

// 辅助函数：获取已完成任务的结果
function getFinishedTaskResult(state: typeof ResearchState.State, taskName: string): string | null {
    const task = state.finished_tasks.find(t => t.name === taskName);
    return task ? task.result : null;
}

// 辅助函数：检查任务是否已完成
function isTaskFinished(state: typeof ResearchState.State, taskName: string): boolean {
    return state.finished_tasks.some(t => t.name === taskName);
}

// ----------------------------
// 2️⃣ 节点函数
// ----------------------------

/** 步骤1：询问细节 */
export async function askDetails(state: typeof ResearchState.State) {
    // 检查是否已完成
    if (isTaskFinished(state, "askDetails")) {
        console.log("[askDetails] 任务已完成，跳过");
        return {};
    }

    const startTime = Date.now();
    let stepLog: any = null;

    // 记录步骤开始
    if (state.session_id) {
        stepLog = await AgentSessionService.startStep(
            state.session_id,
            "askDetails",
            { topic: state.topic },
            state.llm_model
        );
    }

    try {
        console.log("[askDetails] 生成研究细节建议...");
        const prompt = `你是一个研究助手。请就“${state.topic}”这个主题，向用户提出3-5个关键问题，以帮助你更好地进行研究。`;

        const resp = await state.llm_client.chat.completions.create({
            model: state.llm_model,
            messages: [
                { role: "system", content: "你是一个研究助手。" },
                { role: "user", content: prompt },
            ],
        });

        const result = resp.choices[0].message.content?.trim() || "";
        const inputTokens = resp.usage?.prompt_tokens ?? 0;
        const outputTokens = resp.usage?.completion_tokens ?? 0;
        const duration = Date.now() - startTime;

        console.log("[askDetails] 建议生成完成");

        // 记录步骤完成
        if (stepLog && state.session_id) {
            await AgentSessionService.completeStep(
                stepLog.id,
                result,
                inputTokens,
                outputTokens,
                duration,
                `生成了 ${result.length} 个字符的研究细节建议`
            );
            await AgentSessionService.updateTokens(state.session_id, inputTokens, outputTokens);
        }

        return {
            finished_tasks: [
                ...state.finished_tasks,
                { name: "askDetails", result: result }
            ],
            input_tokens: inputTokens,
            output_tokens: outputTokens,
        };
    } catch (error: any) {
        // 记录步骤失败
        if (stepLog && state.session_id) {
            await AgentSessionService.failStep(stepLog.id, error.message, Date.now() - startTime);
        }
        throw error;
    }
}

/** 步骤2：用户审查细节 */
export async function userReviewDetails(state: typeof ResearchState.State) {
    // 检查是否已完成
    if (isTaskFinished(state, "userReviewDetails")) {
        console.log("[userReviewDetails] 任务已完成，跳过");
        return {};
    }

    console.log("[userReviewDetails] 等待用户审查细节...");

    // 从已完成的任务中获取askDetails的结果
    const detailsSuggestion = getFinishedTaskResult(state, "askDetails");

    // 使用 interrupt 暂停执行，等待用户输入
    const userInput = interrupt({
        question: detailsSuggestion,
        prompt: "是否修改研究细节或主题？如果满意请直接继续，否则请提供新的细节。"
    });

    console.log("[userReviewDetails] 用户输入:", userInput);

    // 保存用户确认或修改的细节
    let finalDetails = detailsSuggestion;
    if (userInput && typeof userInput === 'object' && 'details' in userInput) {
        finalDetails = userInput.details;
    }

    return {
        finished_tasks: [
            ...state.finished_tasks,
            { name: "userReviewDetails", result: finalDetails || "" }
        ],
    };
}

/** 步骤3：构建查询 */
export async function buildQuery(state: typeof ResearchState.State) {
    // 检查是否已完成
    if (isTaskFinished(state, "buildQuery")) {
        console.log("[buildQuery] 任务已完成，跳过");
        return {};
    }

    console.log("[buildQuery] 生成搜索关键词...");

    const startTime = Date.now();
    let stepLog: any = null;

    // 从已完成的任务中获取细节
    const details = getFinishedTaskResult(state, "userReviewDetails");

    if (state.session_id) {
        stepLog = await AgentSessionService.startStep(
            state.session_id,
            "buildQuery",
            { topic: state.topic, details },
            state.llm_model
        );
    }

    try {
        const prompt = `请根据研究主题"${state.topic}"和补充细节"${details}"，生成 3-5 个适合搜索引擎的关键词。

**要求：**
1. 每个关键词要简洁，可以是中文或英文
2. 关键词要超过足够宽泛，能搜索到相关结果
3. 每个关键词长度不要超过 50 个字符
4. **必须以 JSON 数组格式返回**，例：["keyword1", "keyword2", "keyword3"]
5. **只返回 JSON 数组，不要其他内容**

示例：
主题：人工智能发展
返回：["artificial intelligence trends", "AI development 2024", "人工智能应用"]
`;

        const resp = await state.llm_client.chat.completions.create({
            model: state.llm_model,
            messages: [{ role: "user", content: prompt }],
        });

        const inputTokens = resp.usage?.prompt_tokens ?? 0;
        const outputTokens = resp.usage?.completion_tokens ?? 0;

        let result = resp.choices[0].message.content?.trim() || "[]";
        console.log("[buildQuery] 大模型返回:", result);

        // 尝试解析 JSON，如果失败则使用默认值
        let keywords: string[] = [];
        try {
            // 移除可能的 markdown 代码块标记
            result = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            keywords = JSON.parse(result);

            if (!Array.isArray(keywords) || keywords.length === 0) {
                throw new Error("解析结果不是数组或为空");
            }

            console.log("[buildQuery] 解析后的关键词:", keywords);
        } catch (e) {
            console.error("[buildQuery] 解析关键词失败:", e);
            // 如果解析失败，使用主题作为默认关键词
            keywords = [state.topic];
            console.log("[buildQuery] 使用默认关键词:", keywords);
        }

        // 保存为 JSON 字符串
        const keywordsJson = JSON.stringify(keywords);
        console.log("[buildQuery] 关键词生成完成:", keywordsJson);

        // 记录步骤完成
        if (stepLog && state.session_id) {
            await AgentSessionService.completeStep(
                stepLog.id,
                keywordsJson,
                inputTokens,
                outputTokens,
                Date.now() - startTime,
                `生成了 ${keywords.length} 个搜索关键词`
            );
            await AgentSessionService.updateTokens(state.session_id, inputTokens, outputTokens);
        }

        return {
            finished_tasks: [
                ...state.finished_tasks,
                { name: "buildQuery", result: keywordsJson }
            ],
            input_tokens: inputTokens,
            output_tokens: outputTokens,
        };
    } catch (error: any) {
        if (stepLog && state.session_id) {
            await AgentSessionService.failStep(stepLog.id, error.message, Date.now() - startTime);
        }
        throw error;
    }
}

/** 步骤4：用户选择格式 */
export async function userChooseFormat(state: typeof ResearchState.State) {
    // 检查是否已完成
    if (isTaskFinished(state, "userChooseFormat")) {
        console.log("[userChooseFormat] 任务已完成，跳过");
        return {};
    }

    console.log("[userChooseFormat] 等待用户选择输出格式...");

    // 从已完成的任务中获取查询关键词
    const keywordsJson = getFinishedTaskResult(state, "buildQuery");
    let keywords: string[] = [];
    try {
        keywords = JSON.parse(keywordsJson);
    } catch (e) {
        keywords = [state.topic];
    }

    // 使用 interrupt 暂停执行，等待用户选择格式
    const userInput = interrupt({
        query: keywords.join(", "),
        prompt: "请选择输出格式",
        options: ["直接问答", "深度报告", "结构化输出"]
    });

    console.log("[userChooseFormat] 用户选择:", userInput);

    // 保存用户选择的格式
    let format = "深度报告";
    if (userInput && typeof userInput === 'object' && 'output_format' in userInput) {
        format = userInput.output_format;
    }

    return {
        output_format: format as "直接问答" | "深度报告" | "结构化输出",
        finished_tasks: [
            ...state.finished_tasks,
            { name: "userChooseFormat", result: format }
        ],
    };
}

/** 步骤5：执行搜索 */
export async function searchSearxng(state: typeof ResearchState.State) {
    // 检查是否已完成
    if (isTaskFinished(state, "search")) {
        console.log("[searchSearxng] 任务已完成，跳过");
        return {};
    }

    console.log("[searchSearxng] 执行搜索...");

    const startTime = Date.now();
    let stepLog: any = null;

    // 从已完成的任务中获取查询关键词
    const keywordsJson = getFinishedTaskResult(state, "buildQuery");
    if (!keywordsJson) {
        console.error("[searchSearxng] 未找到查询关键词");
        return {
            finished_tasks: [
                ...state.finished_tasks,
                { name: "search", result: JSON.stringify([]) }
            ],
        };
    }

    // 解析关键词数组
    let keywords: string[] = [];
    try {
        keywords = JSON.parse(keywordsJson);
        if (!Array.isArray(keywords) || keywords.length === 0) {
            throw new Error("关键词不是数组或为空");
        }
    } catch (e) {
        console.error("[searchSearxng] 解析关键词失败:", e);
        keywords = [state.topic]; // 使用主题作为默认关键词
    }

    console.log("[searchSearxng] 搜索关键词数组:", keywords);

    try {
        // 循环搜索每个关键词
        const allResults: any[] = [];

        // 记录步骤开始（在搜索之前）
        if (state.session_id) {
            stepLog = await AgentSessionService.startStep(
                state.session_id,
                "searchSearxng",
                { keywords },
                state.llm_model
            );
        }

        for (let i = 0; i < keywords.length; i++) {
            const keyword = keywords[i];
            console.log(`[searchSearxng] 搜索第 ${i + 1}/${keywords.length} 个关键词: ${keyword}`);

            // 发送搜索开始进度
            sendScrapeProgress({
                type: 'search_start',
                current: i + 1,
                total: keywords.length,
                keyword: keyword
            });

            try {
                // 使用 searTool 中的 searchSearxng 方法
                const results = await searchSearxngTool(keyword);



                console.log(`[searchSearxng] 第 ${i + 1} 个关键词返回结果数：`, results.length);

                allResults.push(...results);

                // 发送搜索完成进度
                sendScrapeProgress({
                    type: 'search_complete',
                    current: i + 1,
                    total: keywords.length,
                    keyword: keyword,
                    resultCount: results.length,
                    results: results.map((r: any) => ({ title: r.title, url: r.url }))
                });

                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (error: any) {
                console.error(`[searchSearxng] 搜索关键词 "${keyword}" 失败:`, error);

                // 发送搜索失败进度
                sendScrapeProgress({
                    type: 'search_error',
                    current: i + 1,
                    total: keywords.length,
                    keyword: keyword,
                    error: error.message
                });
                // 继续搜索下一个关键词
            }
        }

        // 为所有结果添加索引
        const indexedResults = allResults.map((r, i) => ({
            index: i + 1,
            ...r
        }));

        console.log("[searchSearxng] 搜索完成，总结果数:", indexedResults.length);

        // 记录步骤完成（搜索步骤不消耗 token）
        if (stepLog && state.session_id) {
            const resultJson = JSON.stringify(indexedResults, null, 2);
            await AgentSessionService.completeStep(
                stepLog.id,
                resultJson,
                0,
                0,
                Date.now() - startTime,
                `搜索了 ${keywords.length} 个关键词，获得 ${indexedResults.length} 条结果`
            );
        }

        // 保存搜索结果到状态
        const resultJson = JSON.stringify(indexedResults, null, 2);

        return {
            finished_tasks: [
                ...state.finished_tasks,
                { name: "search", result: resultJson }
            ],
        };
    } catch (error: any) {
        if (stepLog && state.session_id) {
            await AgentSessionService.failStep(stepLog.id, error.message, Date.now() - startTime);
        }
        throw error;
    }
}

/** 步骤5.5：抽取页面内容 */
export async function extractPageContent(state: typeof ResearchState.State) {
    // 检查是否已完成
    if (isTaskFinished(state, "extractContent")) {
        console.log("[extractPageContent] 任务已完成，跳过");
        return {};
    }

    console.log("[extractPageContent] 开始抽取页面内容...");

    const startTime = Date.now();
    let stepLog: any = null;

    // 从搜索结果中获取 URL
    const searchResultsJson = getFinishedTaskResult(state, "search");
    if (!searchResultsJson) {
        console.error("[extractPageContent] 未找到搜索结果");
        return {
            finished_tasks: [
                ...state.finished_tasks,
                { name: "extractContent", result: JSON.stringify([]) }
            ],
        };
    }

    // 解析搜索结果
    let searchResults: any[] = [];
    try {
        searchResults = JSON.parse(searchResultsJson);
    } catch (e) {
        console.error("[extractPageContent] 解析搜索结果失败:", e);
        return {
            finished_tasks: [
                ...state.finished_tasks,
                { name: "extractContent", result: JSON.stringify([]) }
            ],
        };
    }

    // 提取前 5 个 URL
    const urls = searchResults.slice(0, 5).map((r: any) => r.url).filter((url: string) => url);
    console.log(`[extractPageContent] 将抽取 ${urls.length} 个页面的内容`);

    if (state.session_id) {
        stepLog = await AgentSessionService.startStep(
            state.session_id,
            "extractPageContent",
            { urls },
            state.llm_model
        );
    }

    try {
        // 初始化浏览器
        await pageScraperService.initBrowser();

        // 批量抽取页面内容（添加进度回调）
        const scrapedContents = await pageScraperService.scrapePages(
            urls,
            5,
            // 进度回调：将抓取进度发送到前端
            (progress: ScrapeProgressData) => {
                console.log('[extractPageContent] 抓取进度:', progress);
                sendScrapeProgress(progress);
            }
        );

        console.log(`[extractPageContent] 成功抽取 ${scrapedContents.length} 个页面`);

        // 关闭浏览器
        await pageScraperService.closeBrowser();

        // 格式化抽取结果
        const extractedData = scrapedContents.map((content, index) => ({
            index: index + 1,
            url: content.url,
            title: content.title,
            wordCount: content.wordCount,
            filteredContent: content.filteredContent.substring(0, 2000), // 限制长度
            scrapedAt: content.scrapedAt
        }));

        const extractedJson = JSON.stringify(extractedData, null, 2);

        // 记录步骤完成
        if (stepLog && state.session_id) {
            await AgentSessionService.completeStep(
                stepLog.id,
                extractedJson,
                0,
                0,
                Date.now() - startTime,
                `成功抽取了 ${scrapedContents.length} 个页面，总字数 ${scrapedContents.reduce((sum, c) => sum + c.wordCount, 0)} 字`
            );
        }

        return {
            finished_tasks: [
                ...state.finished_tasks,
                { name: "extractContent", result: extractedJson }
            ],
        };
    } catch (error: any) {
        // 确保关闭浏览器
        await pageScraperService.closeBrowser();

        if (stepLog && state.session_id) {
            await AgentSessionService.failStep(stepLog.id, error.message, Date.now() - startTime);
        }
        throw error;
    }
}

/** 步骤6：生成报告 */
export async function writeReport(state: typeof ResearchState.State) {
    // 检查是否已完成
    if (isTaskFinished(state, "writeReport")) {
        console.log("[writeReport] 任务已完成，跳过");
        return {};
    }

    console.log("[writeReport] 生成研究报告...");

    const startTime = Date.now();
    let stepLog: any = null;

    // 从已完成的任务中获取所有需要的数据
    const details = getFinishedTaskResult(state, "userReviewDetails");
    const extractedContentJson = getFinishedTaskResult(state, "extractContent");

    // 解析提取的页面内容，格式化为文本
    let contentText = "";
    try {
        const extractedData = JSON.parse(extractedContentJson);
        contentText = extractedData.map((item: any) =>
            `# ${item.index}. ${item.title}
来源: ${item.url}
字数: ${item.wordCount}

${item.filteredContent}`
        ).join("\n\n---\n\n");
    } catch (e) {
        // 如果解析失败，尝试使用搜索结果
        const searchResultsJson = getFinishedTaskResult(state, "search");
        try {
            const results = JSON.parse(searchResultsJson);
            contentText = results.map((r: any) =>
                `#${r.index}: ${r.title}\n${r.url}\n${r.content}`
            ).join("\n\n");
        } catch (e2) {
            contentText = searchResultsJson || "无可用内容";
        }
    }

    if (state.session_id) {
        stepLog = await AgentSessionService.startStep(
            state.session_id,
            "writeReport",
            { topic: state.topic, details, output_format: state.output_format },
            state.llm_model
        );
    }

    try {
        const formatHint =
            state.output_format === "深度报告"
                ? "请生成详细的研究报告，使用 Markdown 格式，包含引言、分析、趋势、总结等多个章节"
                : state.output_format === "结构化输出"
                    ? "请输出 JSON 格式的结构化数据，包括 title（标题）、summary（摘要）、trends（趋势分析）、recommendations（建议）四个字段"
                    : "请用简洁明了的语言直接回答问题，不超过300字";

        const prompt = `请根据以下信息撰写一份研究报告。

主题：${state.topic}
细节：${details}

从网页中提取的内容：
${contentText}

要求：
- 用简洁、逻辑清晰的中文撰写
- 根据提供的网页内容进行分析，概述研究现状、趋势和潜在方向
- ${formatHint}
- 请在报告中标明信息来源（引用网页标题或URL）`;

        const resp = await state.llm_client.chat.completions.create({
            model: state.llm_model,
            messages: [{ role: "user", content: prompt }],
        });

        const inputTokens = resp.usage?.prompt_tokens ?? 0;
        const outputTokens = resp.usage?.completion_tokens ?? 0;

        const report = resp.choices[0].message.content?.trim() || "";
        console.log("[writeReport] 报告生成完成");

        // 记录步骤完成
        if (stepLog && state.session_id) {
            await AgentSessionService.completeStep(
                stepLog.id,
                report,
                inputTokens,
                outputTokens,
                Date.now() - startTime,
                `生成了 ${report.length} 个字符的${state.output_format}报告`
            );
            await AgentSessionService.updateTokens(state.session_id, inputTokens, outputTokens);
        }

        return {
            report: report,
            finished_tasks: [
                ...state.finished_tasks,
                { name: "writeReport", result: report }
            ],
            input_tokens: inputTokens,
            output_tokens: outputTokens,
        };
    } catch (error: any) {
        if (stepLog && state.session_id) {
            await AgentSessionService.failStep(stepLog.id, error.message, Date.now() - startTime);
        }
        throw error;
    }
}

// ----------------------------
// 3️⃣ 构建链式 Graph
// ----------------------------
export const ResearchGraph = new StateGraph(ResearchState)
    .addNode("askDetails", askDetails)
    .addNode("userReviewDetails", userReviewDetails)
    .addNode("buildQuery", buildQuery)
    .addNode("userChooseFormat", userChooseFormat)
    .addNode("search", searchSearxng)
    .addNode("extractContent", extractPageContent)
    .addNode("writeReport", writeReport)
    .addEdge(START, "askDetails")
    .addEdge("askDetails", "userReviewDetails")
    .addEdge("userReviewDetails", "buildQuery")
    .addEdge("buildQuery", "userChooseFormat")
    .addEdge("userChooseFormat", "search")
    .addEdge("search", "extractContent")
    .addEdge("extractContent", "writeReport")
    .addEdge("writeReport", END);

// 创建全局 checkpointer
export const checkpointer = new MemorySaver();

// 使用 checkpointer 编译，支持中断和恢复
export const app = ResearchGraph.compile({
    checkpointer,
});
