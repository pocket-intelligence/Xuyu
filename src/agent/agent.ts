// deep-research/agent/researchGraph.ts

import { START, END, StateGraph, Annotation, MemorySaver, interrupt } from "@langchain/langgraph";
import OpenAI from "openai";
import { readConfig } from "../configManager";
import { createOpenAIClient } from "./llm";

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
    output_format: Annotation<"markdown" | "plain" | "json">({
        reducer: (_, x) => x,
        default: () => "markdown",
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

    console.log("[askDetails] 生成研究细节建议...");
    const prompt = `你是一个研究助手。请就"${state.topic}"这个主题，向用户提出3-5个关键问题，以帮助你更好地进行研究。`;

    const resp = await state.llm_client.chat.completions.create({
        model: state.llm_model,
        messages: [
            { role: "system", content: "你是一个研究助手。" },
            { role: "user", content: prompt },
        ],
    });

    const result = resp.choices[0].message.content?.trim() || "";
    console.log("[askDetails] 建议生成完成");

    return {
        finished_tasks: [
            ...state.finished_tasks,
            { name: "askDetails", result: result }
        ],
        input_tokens: resp.usage?.prompt_tokens ?? 0,
        output_tokens: resp.usage?.completion_tokens ?? 0,
    };
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

    // 从已完成的任务中获取细节
    const details = getFinishedTaskResult(state, "userReviewDetails");

    const prompt = `请根据研究主题"${state.topic}"和补充细节"${details}"，生成3-5个适合学术搜索的英文关键词。`;

    const resp = await state.llm_client.chat.completions.create({
        model: state.llm_model,
        messages: [{ role: "user", content: prompt }],
    });

    const result = resp.choices[0].message.content?.trim().replace(/\n/g, " ") || "";
    console.log("[buildQuery] 关键词生成完成:", result);

    return {
        finished_tasks: [
            ...state.finished_tasks,
            { name: "buildQuery", result: result }
        ],
        input_tokens: resp.usage?.prompt_tokens ?? 0,
        output_tokens: resp.usage?.completion_tokens ?? 0,
    };
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
    const query = getFinishedTaskResult(state, "buildQuery");

    // 使用 interrupt 暂停执行，等待用户选择格式
    const userInput = interrupt({
        query: query,
        prompt: "请选择输出格式（markdown/plain/json，默认 markdown）"
    });

    console.log("[userChooseFormat] 用户选择:", userInput);

    // 保存用户选择的格式
    let format = "markdown";
    if (userInput && typeof userInput === 'object' && 'output_format' in userInput) {
        format = userInput.output_format;
    }

    return {
        output_format: format as "markdown" | "plain" | "json",
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

    // 从已完成的任务中获取查询关键词
    const query = getFinishedTaskResult(state, "buildQuery");
    if (!query) {
        console.error("[searchSearxng] 未找到查询关键词");
        return {};
    }

    const searxUrl = "http://localhost:9527/search";
    const params = new URLSearchParams({ q: query, format: "json" });
    const resp = await fetch(`${searxUrl}?${params.toString()}`);
    const data = await resp.json();

    const results = (data.results || []).slice(0, 5).map(
        (r: any, i: number) => `#${i + 1}: ${r.title}\n${r.url}\n${r.content}`
    );

    console.log("[searchSearxng] 搜索完成，结果数量:", results.length);

    return {
        finished_tasks: [
            ...state.finished_tasks,
            { name: "search", result: results.join("\n\n") }
        ],
    };
}

/** 步骤6：生成报告 */
export async function writeReport(state: typeof ResearchState.State) {
    // 检查是否已完成
    if (isTaskFinished(state, "writeReport")) {
        console.log("[writeReport] 任务已完成，跳过");
        return {};
    }

    console.log("[writeReport] 生成研究报告...");

    // 从已完成的任务中获取所有需要的数据
    const details = getFinishedTaskResult(state, "userReviewDetails");
    const searchResults = getFinishedTaskResult(state, "search");

    const formatHint =
        state.output_format === "markdown"
            ? "请用 Markdown 格式输出"
            : state.output_format === "json"
                ? "请输出 JSON 格式，包括 title, summary, trends 三个字段"
                : "请用纯文本格式输出";

    const prompt = `请根据以下信息撰写一份简短研究报告。

主题：${state.topic}
细节：${details}
搜索结果：
${searchResults}

要求：
- 用简洁、逻辑清晰的中文撰写
- 概述研究现状、趋势和潜在方向
- ${formatHint}`;

    const resp = await state.llm_client.chat.completions.create({
        model: state.llm_model,
        messages: [{ role: "user", content: prompt }],
    });

    const report = resp.choices[0].message.content?.trim() || "";
    console.log("[writeReport] 报告生成完成");

    return {
        report: report,
        finished_tasks: [
            ...state.finished_tasks,
            { name: "writeReport", result: report }
        ],
        input_tokens: resp.usage?.prompt_tokens ?? 0,
        output_tokens: resp.usage?.completion_tokens ?? 0,
    };
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
    .addNode("writeReport", writeReport)
    .addEdge(START, "askDetails")
    .addEdge("askDetails", "userReviewDetails")
    .addEdge("userReviewDetails", "buildQuery")
    .addEdge("buildQuery", "userChooseFormat")
    .addEdge("userChooseFormat", "search")
    .addEdge("search", "writeReport")
    .addEdge("writeReport", END);

// 创建全局 checkpointer
export const checkpointer = new MemorySaver();

// 使用 checkpointer 编译，支持中断和恢复
export const app = ResearchGraph.compile({
    checkpointer,
});
