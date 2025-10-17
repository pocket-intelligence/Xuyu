// deep-research/agent/researchGraph.ts

import { START, END, StateGraph, Annotation } from "@langchain/langgraph";
import OpenAI from "openai";
import { readConfig } from "../configManager";
import { createOpenAIClient } from "./llm";
import readline from "readline";

// ----------------------------
// 1️⃣ 状态定义
// ----------------------------
export const ResearchState = Annotation.Root({
    topic: Annotation<string>({
        reducer: (_, x) => x,
        default: () => "",
    }),
    details: Annotation<string | null>({
        reducer: (_, x) => x,
        default: () => null,
    }),
    query: Annotation<string | null>({
        reducer: (_, x) => x,
        default: () => null,
    }),
    results: Annotation<string[]>({
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

// ----------------------------
// 工具函数：命令行交互
// ----------------------------
function askUser(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) =>
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        }),
    );
}

// ----------------------------
// 2️⃣ 节点函数
// ----------------------------
export async function askDetails(state: typeof ResearchState.State) {
    const prompt = `你是一个研究助手。请就“${state.topic}”这个主题，向用户提出3-5个关键问题，以帮助你更好地进行研究。`;
    const resp = await state.llm_client.chat.completions.create({
        model: state.llm_model,
        messages: [
            { role: "system", content: "你是一个研究助手。" },
            { role: "user", content: prompt },
        ],
    });

    return {
        details: resp.choices[0].message.content?.trim() || "",
        input_tokens: resp.usage?.prompt_tokens ?? 0,
        output_tokens: resp.usage?.completion_tokens ?? 0,
    };
}

/** 用户干预节点：允许修改主题或细节 */
export async function userReviewDetails(state: typeof ResearchState.State) {
    console.log("\n🧩 系统生成的研究细节：\n");
    console.log(state.details);

    const edit = await askUser("\n是否修改研究细节或主题？(y/n): ");
    let topic = state.topic;
    let details = state.details;

    if (edit.toLowerCase() === "y") {
        const newTopic = await askUser(`请输入新的主题（或回车保持“${state.topic}”）: `);
        if (newTopic) topic = newTopic;

        const newDetails = await askUser(`请输入新的细节（或回车保持当前内容）: `);
        if (newDetails) details = newDetails;
    }

    return { topic, details };
}

/** 根据研究主题构建检索关键词 */
export async function buildQuery(state: typeof ResearchState.State) {
    const prompt = `请根据研究主题“${state.topic}”和补充细节“${state.details}”，生成3-5个适合学术搜索的英文关键词。`;
    const resp = await state.llm_client.chat.completions.create({
        model: state.llm_model,
        messages: [{ role: "user", content: prompt }],
    });

    return {
        query: resp.choices[0].message.content?.trim().replace(/\n/g, " ") || "",
        input_tokens: resp.usage?.prompt_tokens ?? 0,
        output_tokens: resp.usage?.completion_tokens ?? 0,
    };
}

/** 用户干预节点：选择输出格式 */
export async function userChooseFormat(state: typeof ResearchState.State) {
    console.log("\n🔍 系统生成的搜索关键词：", state.query);
    const format = await askUser("\n请选择输出格式（markdown/plain/json，默认 markdown）: ");
    const selected =
        format.toLowerCase() === "plain"
            ? "plain"
            : format.toLowerCase() === "json"
                ? "json"
                : "markdown";

    return { output_format: selected };
}

/** 搜索 SearxNG 结果 */
export async function searchSearxng(state: typeof ResearchState.State) {
    if (!state.query) return {};
    const searxUrl = "http://localhost:9527/search";
    const params = new URLSearchParams({ q: state.query, format: "json" });
    const resp = await fetch(`${searxUrl}?${params.toString()}`);
    const data = await resp.json();

    const results = (data.results || []).slice(0, 5).map(
        (r: any, i: number) =>
            `#${i + 1}: ${r.title}\n${r.url}\n${r.content}`,
    );
    return { results };
}

/** 生成报告 */
export async function writeReport(state: typeof ResearchState.State) {
    const formatHint =
        state.output_format === "markdown"
            ? "请用 Markdown 格式输出"
            : state.output_format === "json"
                ? "请输出 JSON 格式，包括 title, summary, trends 三个字段"
                : "请用纯文本格式输出";

    const prompt = `
请根据以下信息撰写一份简短研究报告。

主题：${state.topic}
细节：${state.details}
搜索结果：
${state.results.join("\n\n")}

要求：
- 用简洁、逻辑清晰的中文撰写
- 概述研究现状、趋势和潜在方向
- ${formatHint}
`;

    const resp = await state.llm_client.chat.completions.create({
        model: state.llm_model,
        messages: [{ role: "user", content: prompt }],
    });

    return {
        report: resp.choices[0].message.content?.trim() || "",
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

export const app = ResearchGraph.compile();

// ----------------------------
// 4️⃣ 测试执行
// ----------------------------
if (require.main === module) {
    (async () => {
        const config = readConfig();
        const initState = {
            topic: "AI ethics in generative models",
            details: "",
            query: "",
            results: [] as string[],
            report: "",
            output_format: "markdown" as const,
            input_tokens: 0,
            output_tokens: 0,
            llm_client: createOpenAIClient(config.llmApiUrl, config.llmApiKey),
        };

        const result = await app.invoke(initState);
        console.log("\n=== 🧠 最终研究报告 ===\n");
        console.log(result.report);
    })();
}
