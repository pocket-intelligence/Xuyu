import os
from langgraph.graph import StateGraph, END, START
from openai import OpenAI
import requests
import json

# 初始化 OpenAI client
client = OpenAI(
    api_key= os.environ["OPENAI_API_KEY"],
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

# ----------------------------
# 1️⃣ 定义状态结构
# ----------------------------
class ResearchState(dict):
    topic: str | None
    details: str | None
    query: str | None
    results: list[str] | None
    report: str | None


# ----------------------------
# 2️⃣ 定义各个节点
# ----------------------------

def ask_details(state: ResearchState):
    """节点1: 询问研究细节"""
    topic = state.get("topic")
    prompt = f"用户想研究“{topic}”。请列出3~5个你需要了解的关键细节（例如研究目标、角度、时间范围等）。"
    resp = client.chat.completions.create(
        model="deepseek-v3.1",
        messages=[{"role": "system", "content": "你是一个研究助手。"},
                  {"role": "user", "content": prompt}],
    )
    details = resp.choices[0].message.content.strip()
    print(f"[ask_details] → {details}")
    # 这里等待用户人工输入（模拟用户反馈）
    user_feedback = input("\n请输入你补充的研究细节: ")
    return {"details": details + "\n用户补充: " + user_feedback}


def build_query(state: ResearchState):
    """节点2: 构造搜索关键词"""
    topic = state.get("topic")
    details = state.get("details")
    prompt = f"请根据研究主题“{topic}”和补充细节“{details}”，生成3~5个适合学术搜索的英文关键词。"
    resp = client.chat.completions.create(
        model="deepseek-v3.1",
        messages=[{"role": "user", "content": prompt}],
    )
    query = resp.choices[0].message.content.strip().replace("\n", " ")
    print(f"[build_query] → {query}")
    return {"query": query}


def search_searxng(state: ResearchState):
    """节点3: 使用 SearxNG 搜索"""
    query = state.get("query")
    searx_url = "https://localhost:9527/search"  # 你自己的 searxng 实例
    print(f"[search_searxng] Searching for: {query}")
    params = {"q": query, "format": "json"}
    try:
        resp = requests.get(searx_url, params=params, timeout=10)
        data = resp.json()
        results = [r["title"] + " - " + r["url"] for r in data.get("results", [])[:5]]
    except Exception as e:
        results = [f"(搜索失败: {e})"]
    print(f"[search_searxng] → {len(results)} results")
    return {"results": results}


def write_report(state: ResearchState):
    """节点4: 撰写研究报告"""
    topic = state.get("topic")
    details = state.get("details")
    results = "\n".join(state.get("results", []))
    prompt = f"""
请根据以下信息撰写一份简短研究报告。

主题：{topic}
细节：{details}
搜索结果：
{results}

要求：
- 用简洁、逻辑清晰的中文撰写
- 概述研究现状、趋势和潜在方向
"""
    resp = client.chat.completions.create(
        model="deepseek-v3.1",
        messages=[{"role": "user", "content": prompt}],
    )
    report = resp.choices[0].message.content.strip()
    print(f"\n[write_report] ✅ 研究报告生成完毕\n")
    print(report)
    return {"report": report}


# ----------------------------
# 3️⃣ 构建 LangGraph 工作流
# ----------------------------
def build_graph():
    graph = StateGraph(ResearchState)

    graph.add_node("ask_details", ask_details)
    graph.add_node("build_query", build_query)
    graph.add_node("search", search_searxng)
    graph.add_node("write_report", write_report)

    # ✅ 定义流程
    graph.add_edge(START, "ask_details")
    graph.add_edge("ask_details", "build_query")
    graph.add_edge("build_query", "search")
    graph.add_edge("search", "write_report")
    graph.add_edge("write_report", END)

    return graph.compile()


# ----------------------------
# 4️⃣ 运行智能体
# ----------------------------
if __name__ == "__main__":
    topic = input("请输入研究主题：")
    app = build_graph()
    final_state = app.invoke({"topic": topic})
    print("\n✅ 完成全部流程！")
