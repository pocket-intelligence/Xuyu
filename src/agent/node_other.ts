// deep-research/agent/node_other.ts
// 深度报告专用节点：粗读、生成大纲、填充内容
// 最终报告由 agent.ts 中的 writeReport 统一生成

import { ResearchState } from "./agent";
import { AgentSessionService } from "../services/AgentSessionService";

// ---------- 辅助函数 ----------
function getFinishedTaskResult(state: typeof ResearchState.State, name: string): string | null {
    const task = state.finished_tasks.find(t => t.name === name);
    return task ? task.result : null;
}

function getFinishedTaskResultParsed(state: typeof ResearchState.State, name: string): any {
    const raw = getFinishedTaskResult(state, name);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return raw;
    }
}

function isTaskFinished(state: typeof ResearchState.State, taskName: string): boolean {
    return state.finished_tasks.some(t => t.name === taskName);
}

// ----------------------------
// 新增节点 1：粗读（coarseRead）
// ----------------------------
export async function coarseRead(state: typeof ResearchState.State) {
    if (isTaskFinished(state, "coarseRead")) {
        console.log("[coarseRead] 任务已完成，跳过");
        return {};
    }

    console.log("[coarseRead] LLM 正在进行粗读与主题抽取...");

    const startTime = Date.now();
    let stepLog: any = null;

    // 优先使用 extractContent 的结果
    const extractedData = getFinishedTaskResultParsed(state, "extractContent");

    if (!extractedData || !Array.isArray(extractedData) || extractedData.length === 0) {
        console.warn("[coarseRead] 未找到提取的内容，跳过粗读");
        return {
            finished_tasks: [
                ...state.finished_tasks,
                { name: "coarseRead", result: JSON.stringify({ topics: [], main_findings: [], evidence_refs: [], numeric_candidates: [], reading_notes: ["无可用内容"] }) }
            ],
        };
    }

    if (state.session_id) {
        stepLog = await AgentSessionService.startStep(
            state.session_id,
            "coarseRead",
            { sourceCount: extractedData.length },
            state.llm_model
        );
    }

    try {
        // 格式化提取的内容为易读文本
        const previewText = extractedData
            .map((item: any) => `标题: ${item.title}\n内容: ${item.filteredContent}\nURL: ${item.url}`)
            .join("\n\n---\n\n")
            .substring(0, 8000); // 限制长度避免超出上下文

        const prompt = `你现在做的是粗读（skim）阶段：请快速阅读下面的材料并输出一个 JSON 对象，包含：
1) topics: （5 个以内）针对此主题的关键主题或关键词数组
2) main_findings: （每项一行）抓取到的主要论点或结论（尽量简短，3-8条）
3) evidence_refs: 从材料中能直接引用作为证据的来源（最多 10 条，返回 {title, url} 数组）
4) numeric_candidates: 任何可量化的数据点（返回数组，每项 {label, value, unit, hint}）
5) reading_notes: 对后续写作需要注意的点（短句数组，3-5条）

**要求：**
- 必须返回有效的 JSON 格式
- 不要添加任何其他说明文字
- 只返回 JSON 对象

材料：
${previewText}`;

        const resp = await state.llm_client.chat.completions.create({
            model: state.llm_model,
            messages: [{ role: "user", content: prompt }],
        });

        const raw = resp.choices[0].message.content?.trim() || "{}";
        let parsed: any = {};
        try {
            // 移除可能的代码块标记
            const cleaned = raw.replace(/```(?:json)?/g, '').trim();
            parsed = JSON.parse(cleaned);
        } catch (e) {
            console.error("[coarseRead] JSON 解析失败，使用默认结构:", e);
            // 如果无法解析 JSON，则放到 reading_notes 中作为原始文本
            parsed = {
                topics: [],
                main_findings: [],
                evidence_refs: [],
                numeric_candidates: [],
                reading_notes: [raw.substring(0, 500)]
            };
        }

        const inputTokens = resp.usage?.prompt_tokens ?? 0;
        const outputTokens = resp.usage?.completion_tokens ?? 0;

        if (stepLog && state.session_id) {
            await AgentSessionService.completeStep(
                stepLog.id,
                JSON.stringify(parsed).slice(0, 2000),
                inputTokens,
                outputTokens,
                Date.now() - startTime,
                `粗读完成，提取 ${parsed.topics?.length ?? 0} 个主题，${parsed.main_findings?.length ?? 0} 个发现`
            );
            await AgentSessionService.updateTokens(state.session_id, inputTokens, outputTokens);
        }

        return {
            finished_tasks: [
                ...state.finished_tasks,
                { name: "coarseRead", result: JSON.stringify(parsed) }
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
// 新增节点 2：生成大纲/行文思路（craftOutline）
// ----------------------------
export async function craftOutline(state: typeof ResearchState.State) {
    if (isTaskFinished(state, "craftOutline")) {
        console.log("[craftOutline] 已完成，跳过");
        return {};
    }

    console.log("[craftOutline] 基于粗读结果生成结构化大纲...");

    const startTime = Date.now();
    let stepLog: any = null;

    const coarse = getFinishedTaskResultParsed(state, "coarseRead") || {};
    const details = getFinishedTaskResult(state, "userReviewDetails") || "";

    if (state.session_id) {
        stepLog = await AgentSessionService.startStep(
            state.session_id,
            "craftOutline",
            { topics: coarse.topics || [], details },
            state.llm_model
        );
    }

    try {
        const prompt = `你现在来设计一份研究报告的大纲。主题是：${state.topic}

用户补充细节：${details}

粗读结果（JSON）：
${JSON.stringify(coarse, null, 2)}

请 output a structure outline JSON，格式如下：
{
  "title": "最终报告标题（一句话）",
  "structure": [
    {
      "id": "sec1",
      "heading": "第一章 标题",
      "purpose": "本章目的（1-2 句）",
      "key_points": ["要点1","要点2"],
      "preferred_sources": [{"title": "...", "url":"..."}]
    }
  ],
  "writing_style": "建议写作风格（如学术/简洁/行业白皮书）"
}

要求：
- 结构合理，章数控制在 3-6 个
- 每章给出 2-4 个 key_points，便于后续逐条填充
- 如果 coarse 中有 numeric_candidates，请在合适章节注明可能出现的图表类型（如折线/柱状/饼图）
- 必须返回有效的 JSON 格式
- 不要添加任何其他说明文字`;

        const resp = await state.llm_client.chat.completions.create({
            model: state.llm_model,
            messages: [{ role: "user", content: prompt }],
        });

        const raw = resp.choices[0].message.content?.trim() || "{}";
        let outline: any = {};
        try {
            const cleaned = raw.replace(/```(?:json)?/g, '').trim();
            outline = JSON.parse(cleaned);
        } catch (e) {
            console.error("[craftOutline] JSON 解析失败，使用默认结构:", e);
            // 兜底：把 raw 放入简单结构
            outline = {
                title: `关于 ${state.topic} 的研究报告`,
                structure: [],
                writing_style: "简洁",
                rawOutline: raw.substring(0, 500)
            };
        }

        const inputTokens = resp.usage?.prompt_tokens ?? 0;
        const outputTokens = resp.usage?.completion_tokens ?? 0;

        if (stepLog && state.session_id) {
            await AgentSessionService.completeStep(
                stepLog.id,
                JSON.stringify(outline).slice(0, 2000),
                inputTokens,
                outputTokens,
                Date.now() - startTime,
                `生成大纲，章节数 ${outline.structure?.length ?? 0}，标题: ${outline.title || '未知'}`
            );
            await AgentSessionService.updateTokens(state.session_id, inputTokens, outputTokens);
        }

        return {
            finished_tasks: [
                ...state.finished_tasks,
                { name: "craftOutline", result: JSON.stringify(outline, null, 2) }
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
// 新增节点 3：逐章填充（fillOutline）
// 最后一个预处理节点，之后由 agent.ts 中的 writeReport 进行最终润色和组装
// ----------------------------
export async function fillOutline(state: typeof ResearchState.State) {
    if (isTaskFinished(state, "fillOutline")) {
        console.log("[fillOutline] 已完成，跳过");
        return {};
    }

    console.log("[fillOutline] 正在逐章填充大纲内容...");

    const startTime = Date.now();
    let stepLog: any = null;

    const outline = getFinishedTaskResultParsed(state, "craftOutline");
    const coarse = getFinishedTaskResultParsed(state, "coarseRead");
    const extractedData = getFinishedTaskResultParsed(state, "extractContent") || [];

    if (!outline || !outline.structure || outline.structure.length === 0) {
        console.warn("[fillOutline] 未找到有效大纲，跳过填充");
        return {
            finished_tasks: [
                ...state.finished_tasks,
                { name: "fillOutline", result: JSON.stringify([]) }
            ],
        };
    }

    if (state.session_id) {
        stepLog = await AgentSessionService.startStep(
            state.session_id,
            "fillOutline",
            { outlineTitle: outline.title || "未知", sectionCount: outline.structure.length },
            state.llm_model
        );
    }

    try {
        const filledSections: any[] = [];

        // 将提取的内容格式化为证据池
        const evidencePool = Array.isArray(extractedData)
            ? extractedData.map((item: any) =>
                `【标题】${item.title}\n【摘要】${item.filteredContent?.slice(0, 800) ?? ""}\n【来源】${item.url}`
            ).join("\n\n---\n\n")
            : String(extractedData).slice(0, 5000);

        let totalInputTokens = 0;
        let totalOutputTokens = 0;

        // 对每个章节逐个请求 LLM 填充
        for (let i = 0; i < outline.structure.length; i++) {
            const sec = outline.structure[i];
            console.log(`[fillOutline] 填充第 ${i + 1}/${outline.structure.length} 个章节: ${sec.heading}`);

            const prompt = `你需要基于以下证据池与大纲要点，为章节 "${sec.heading}" 生成 2-3 段用于研究报告的正文段落。

章节目的：${sec.purpose || "未指定"}

要求：
- 严格基于证据池内容（不要凭空编造事实）
- 每段 150-250 字
- 在每段末尾用【来源: 标题】标注该段主要依据（找最相关的 evidence）
- 如果大纲 key_points 中提到需要图表的数据点，注明"（建议图表：折线/柱状/饼图）"
- 用 Markdown 格式输出，段落之间空一行

证据池：
${evidencePool}

本章要点：
${JSON.stringify(sec.key_points || [], null, 2)}`;

            const resp = await state.llm_client.chat.completions.create({
                model: state.llm_model,
                messages: [{ role: "user", content: prompt }],
            });

            const content = resp.choices[0].message.content?.trim() || "";
            const inputTokens = resp.usage?.prompt_tokens ?? 0;
            const outputTokens = resp.usage?.completion_tokens ?? 0;

            totalInputTokens += inputTokens;
            totalOutputTokens += outputTokens;

            filledSections.push({
                id: sec.id || sec.heading,
                heading: sec.heading,
                purpose: sec.purpose,
                content,
            });

            // 节流，避免请求过快
            if (i < outline.structure.length - 1) {
                await new Promise(r => setTimeout(r, 800));
            }
        }

        const filledJson = JSON.stringify(filledSections, null, 2);

        if (stepLog && state.session_id) {
            await AgentSessionService.completeStep(
                stepLog.id,
                filledJson.slice(0, 2000),
                totalInputTokens,
                totalOutputTokens,
                Date.now() - startTime,
                `完成 ${filledSections.length} 个章节的填充`
            );
            await AgentSessionService.updateTokens(state.session_id, totalInputTokens, totalOutputTokens);
        }

        return {
            finished_tasks: [
                ...state.finished_tasks,
                { name: "fillOutline", result: filledJson }
            ],
            input_tokens: totalInputTokens,
            output_tokens: totalOutputTokens,
        };
    } catch (error: any) {
        if (stepLog && state.session_id) {
            await AgentSessionService.failStep(stepLog.id, error.message, Date.now() - startTime);
        }
        throw error;
    }
}

// ----------------------------
// 新增节点 4：生成图表（generateCharts）
// 利用 LLM + ECharts 生成数据可视化
// ----------------------------
export async function generateCharts(state: typeof ResearchState.State) {
    if (isTaskFinished(state, "generateCharts")) {
        console.log("[generateCharts] 已完成，跳过");
        return {};
    }

    console.log("[generateCharts] 正在生成数据可视化图表...");

    const startTime = Date.now();
    let stepLog: any = null;

    const coarse = getFinishedTaskResultParsed(state, "coarseRead");
    const filled = getFinishedTaskResultParsed(state, "fillOutline");

    // 检查是否有可量化的数据
    const numericCandidates = coarse?.numeric_candidates || [];

    if (!numericCandidates || numericCandidates.length === 0) {
        console.log("[generateCharts] 未找到可量化数据，跳过图表生成");
        return {
            finished_tasks: [
                ...state.finished_tasks,
                { name: "generateCharts", result: JSON.stringify([]) }
            ],
        };
    }

    if (state.session_id) {
        stepLog = await AgentSessionService.startStep(
            state.session_id,
            "generateCharts",
            { candidateCount: numericCandidates.length },
            state.llm_model
        );
    }

    try {
        // 准备数据描述
        const dataDescription = numericCandidates.map((item: any, idx: number) =>
            `${idx + 1}. ${item.label || '未知指标'}: ${item.value || 'N/A'} ${item.unit || ''} (${item.hint || '无说明'})`
        ).join("\n");

        const prompt = `你是一个数据可视化专家。请根据以下数据生成 ECharts 图表配置。

可量化数据：
${dataDescription}

要求：
1. 为每组相关数据生成一个 ECharts 配置（JSON 格式）
2. 自动选择合适的图表类型：
   - 趋势数据 → 折线图（line）
   - 对比数据 → 柱状图（bar）
   - 占比数据 → 饼图（pie）
   - 关联数据 → 散点图（scatter）
3. 配置要包含 title、tooltip、legend、xAxis、yAxis、series 等
4. 使用中文标题和标签
5. 配色美观、专业

请输出 JSON 数组格式：
[
  {
    "chartId": "chart1",
    "title": "图表标题",
    "description": "图表说明（1-2句话）",
    "config": { /* 完整的 ECharts 配置对象 */ }
  }
]

只返回 JSON，不要其他内容。`;

        const resp = await state.llm_client.chat.completions.create({
            model: state.llm_model,
            messages: [{ role: "user", content: prompt }],
        });

        const raw = resp.choices[0].message.content?.trim() || "[]";
        let charts: any[] = [];

        try {
            const cleaned = raw.replace(/```(?:json)?/g, '').trim();
            charts = JSON.parse(cleaned);

            if (!Array.isArray(charts)) {
                charts = [];
            }
        } catch (e) {
            console.error("[generateCharts] JSON 解析失败:", e);
            charts = [];
        }

        const inputTokens = resp.usage?.prompt_tokens ?? 0;
        const outputTokens = resp.usage?.completion_tokens ?? 0;

        console.log(`[generateCharts] 生成了 ${charts.length} 个图表配置`);

        if (stepLog && state.session_id) {
            await AgentSessionService.completeStep(
                stepLog.id,
                JSON.stringify(charts).slice(0, 2000),
                inputTokens,
                outputTokens,
                Date.now() - startTime,
                `生成了 ${charts.length} 个图表`
            );
            await AgentSessionService.updateTokens(state.session_id, inputTokens, outputTokens);
        }

        return {
            finished_tasks: [
                ...state.finished_tasks,
                { name: "generateCharts", result: JSON.stringify(charts) }
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
// 新增节点 4：组装最终报告（assembleReport）
// ----------------------------
export async function assembleReport(state: typeof ResearchState.State) {
    if (isTaskFinished(state, "assembleReport")) {
        console.log("[assembleReport] 已完成，跳过");
        return {};
    }

    console.log("[assembleReport] 正在合并章节并进行最终润色...");

    const startTime = Date.now();
    let stepLog: any = null;

    const outline = getFinishedTaskResultParsed(state, "craftOutline");
    const filled = getFinishedTaskResultParsed(state, "fillOutline");
    const coarse = getFinishedTaskResultParsed(state, "coarseRead");
    const details = getFinishedTaskResult(state, "userReviewDetails");

    if (state.session_id) {
        stepLog = await AgentSessionService.startStep(
            state.session_id,
            "assembleReport",
            { titleHint: outline?.title ?? state.topic, sectionCount: filled?.length ?? 0 },
            state.llm_model
        );
    }

    try {
        // 将各章按序合并为 Markdown
        const sections = Array.isArray(filled) ? filled : [];
        const body = sections.map((s: any, idx: number) =>
            `## ${idx + 1}. ${s.heading}\n\n${s.content}`
        ).join("\n\n");

        // 提取主要引用来源
        const evidenceRefs = coarse?.evidence_refs || [];
        const referencesText = evidenceRefs.slice(0, 10).map((ref: any, idx: number) =>
            `${idx + 1}. [${ref.title || '未知标题'}](${ref.url || '#'})`
        ).join("\n");

        const prompt = `请将下面的章节内容合并为一篇连贯、逻辑清晰的研究报告（Markdown 格式）。

主题：${state.topic}
用户细节：${details}
标题建议：${outline?.title ?? `关于 ${state.topic} 的研究报告`}
写作风格建议：${outline?.writing_style ?? "简洁、客观"}

章节正文：
${body}

要求：
- 在开头写一段 2-4 句的引言，概括背景与目的
- 保持现有章节结构（已给出小标题），确保内容连贯
- 在报告末尾添加 "## 总结与建议" 章节，给出 3-5 条可执行建议
- 最后添加 "## 参考来源" 章节，列出主要信息来源
- 使用 Markdown 格式，结构清晰
- 不要修改章节中已标注的来源引用

输出完整的 Markdown 报告：`;

        const resp = await state.llm_client.chat.completions.create({
            model: state.llm_model,
            messages: [{ role: "user", content: prompt }],
        });

        let report = resp.choices[0].message.content?.trim() || "";

        // 如果报告中没有参考来源章节，手动添加
        if (!report.includes("## 参考来源") && !report.includes("## References") && referencesText) {
            report += `

## 参考来源

${referencesText}`;
        }

        const inputTokens = resp.usage?.prompt_tokens ?? 0;
        const outputTokens = resp.usage?.completion_tokens ?? 0;

        if (stepLog && state.session_id) {
            await AgentSessionService.completeStep(
                stepLog.id,
                report.slice(0, 2000),
                inputTokens,
                outputTokens,
                Date.now() - startTime,
                `生成最终报告，长度 ${report.length} 字符`
            );
            await AgentSessionService.updateTokens(state.session_id, inputTokens, outputTokens);
        }

        return {
            report,
            finished_tasks: [
                ...state.finished_tasks,
                { name: "assembleReport", result: report }
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
