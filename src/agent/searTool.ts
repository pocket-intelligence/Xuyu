import axios, { AxiosError } from "axios";
import axiosRetry from "axios-retry";
import { readConfig } from "../configManager";

const config = readConfig();

// SearxNG 响应数据类型定义
interface SearxNGResult {
    url: string;
    title: string;
    content: string;
    engine: string;
    template: string;
    parsed_url: string[];
    img_src: string;
    thumbnail: string;
    priority: string;
    engines: string[];
    positions: number[];
    score: number;
    category: string;
    publishedDate: string | null;
}

interface SearxNGResponse {
    query: string;
    number_of_results: number;
    results: SearxNGResult[];
    answers: any[];
    corrections: any[];
    infoboxes: any[];
    suggestions: any[];
    unresponsive_engines: [string, string][];
}


// 创建 axios 实例
const axiosInstance = axios.create({
    timeout: 15000, // 15 秒超时
});


// -----------------------------------------------------------------
// !! 关键改动：添加响应拦截器
// 必须在 axiosRetry(axiosInstance, ...) 之前设置
axiosInstance.interceptors.response.use(
    (response) => {
        // 检查是否是 SearxNG 的成功响应
        const data = response.data as SearxNGResponse;

        // 检查是否是我们关心的 SearxNG 响应格式
        // (typeof data.query === 'string' 是一个很好的判断依据)
        if (data && typeof data.query === 'string' && Array.isArray(data.results)) {

            // 如果结果为空，手动抛出一个错误，以便被 axios-retry 捕获
            if (data.results.length === 0) {
                console.warn(`[Interceptor] SearxNG 返回空结果，将主动触发重试机制...`);

                // 创建一个类似 AxiosError 的对象
                // axios-retry 需要 error 对象上有 config 和 response 才能正确工作
                const error: Partial<AxiosError> = new Error("SearxNG returned 0 results");
                error.config = response.config;
                error.response = response; // 将原始响应附加到错误上
                error.isAxiosError = true; // 模拟 Axios 错误

                // 拒绝这个 Promise，使其进入 .catch() 逻辑和重试逻辑
                return Promise.reject(error);
            }
        }

        // 如果结果不为空，或者不是 SearxNG 响应，正常返回
        return response;
    },
    (error) => {
        // 对于真正的网络错误等，直接拒绝，让 axios-retry 处理
        return Promise.reject(error);
    }
);
// -----------------------------------------------------------------

// 设置自动重试逻辑 (这里的代码保持不变)
axiosRetry(axiosInstance, {
    retries: 3, // 最多重试 3 次
    retryDelay: (retryCount) => retryCount * 2000, // 每次延迟递增
    retryCondition: (error) => {
        // 网络错误、超时错误一定重试
        if (axiosRetry.isNetworkError(error) || axiosRetry.isRetryableError(error)) {
            console.warn(`[Retry] 网络错误或超时: ${error.message}`);
            return true;
        }

        // !! 现在，因为拦截器在空结果时抛出了一个
        // !! 附带 'response' 属性的 error，
        // !! 这里的逻辑可以被正确触发了！
        if (error.response?.data) {
            const data = error.response.data as SearxNGResponse;
            if (Array.isArray(data.results) && data.results.length === 0) {
                console.warn(`[Retry] SearxNG 返回空结果，准备重试... (by retryCondition)`);
                return true;
            }
        }

        return false;
    },
});

export async function searchSearxng(keyword: string) {
    // 构造基础URL
    let searxUrl = "";

    if (config.searxngUrl) {
        // 去掉末尾所有斜杠再加上 /search
        searxUrl = config.searxngUrl.replace(/\/+$/, "") + "/search";
    } else {
        searxUrl = "http://localhost:9527/search";
    }

    // 构造查询参数（注意，这里 format=json 不要再重复拼接）
    const params = new URLSearchParams({
        q: keyword,
        format: "json",
    });

    // 拼接完整请求 URL
    const fullUrl = `${searxUrl}?${params.toString()}`;

    console.log(`[searchSearxng] 请求URL: ${fullUrl}`);

    try {
        const resp = await axiosInstance.get<SearxNGResponse>(fullUrl);

        const data = resp.data;
        console.log(`[searchSearxng] 响应数据:`, data);

        const results = (data.results || []).slice(0, 3).map((r: SearxNGResult) => ({
            keyword,
            title: r.title || '无标题',
            url: r.url || '',
            content: r.content || '',
        }));

        console.log(`[searchSearxng] ${keyword} -> 返回 ${results.length} 条`);
        return results;
    } catch (error: any) {
        console.error(`[searchSearxng] 搜索 "${keyword}" 失败:`, error.message);
        return [];
    }
}
