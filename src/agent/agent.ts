// deep-research/agent/researchGraph.ts

import { START, END, StateGraph, Annotation } from "@langchain/langgraph";
import OpenAI from "openai";
import { readConfig } from "../configManager";
import { createOpenAIClient } from "./llm";

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
// 2️⃣ 节点函数
// ----------------------------
// ----------------------------
// 2️⃣ 节点函数
// ----------------------------
export async function askDetails(state: typeof ResearchState.State): Promise<Partial<typeof ResearchState.State>> {
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

export async function buildQuery(state: typeof ResearchState.State): Promise<Partial<typeof ResearchState.State>> {
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

export async function searchSearxng(state: typeof ResearchState.State): Promise<Partial<typeof ResearchState.State>> {
    if (!state.query) return {};

    // 🔧 替换为你的 SearxNG API
    const searxUrl = "http://localhost:9527/search";
    const params = new URLSearchParams({ q: state.query, format: "json" });
    const resp = await fetch(`${searxUrl}?${params.toString()}`);
    const data = await resp.json();

    const results = (data.results || []).slice(0, 5).map((r: any) => `${r.title}\n${r.url}\n${r.content}`);
    return { results };
}

export async function writeReport(state: typeof ResearchState.State): Promise<Partial<typeof ResearchState.State>> {
    const prompt = `
请根据以下信息撰写一份简短研究报告。

主题：${state.topic}
细节：${state.details}
搜索结果：
${state.results.join("\n\n")}

要求：
- 用简洁、逻辑清晰的中文撰写
- 概述研究现状、趋势和潜在方向
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
    .addNode("buildQuery", buildQuery)
    .addNode("search", searchSearxng)
    .addNode("writeReport", writeReport)
    .addEdge(START, "askDetails")
    .addEdge("askDetails", "buildQuery")
    .addEdge("buildQuery", "search")
    .addEdge("search", "writeReport");

// 如果需要条件跳转，可以这样
// .addConditionalEdges("writeReport", (state) => {
//   return state.detailsChanged ? "askDetails" : END;
// });

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
            input_tokens: 0,
            output_tokens: 0,
            llm_client: createOpenAIClient(config.llmApiUrl, config.llmApiKey),
        };
        const result = await app.invoke(initState);

        console.log("\n=== 研究报告 ===\n");
        console.log(result.report);
    })();
}