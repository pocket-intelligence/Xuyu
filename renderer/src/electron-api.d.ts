// electron-api.d.ts
export interface ResearchOutput {
    type: string;
    content: unknown;
    metadata?: Record<string, unknown>;
}

interface ConfigResultData {
    success: boolean;
    message?: string;
    data?: unknown;
}

interface SaveConfigParams {
    config: unknown;
}

interface StartAgentResearchParams {
    topic: string;
}

interface AgentResearchResultData {
    success: boolean;
    message?: string;
    data?: unknown;
}

interface AgentResearchProgressData {
    step: number;
    data: ResearchOutput;
}

interface ScrapeProgressData {
    type: 'start' | 'progress' | 'complete' | 'error' | 'search_start' | 'search_complete' | 'search_error';
    current: number;
    total: number;
    url?: string;
    title?: string;
    wordCount?: number;
    error?: string;
    // 搜索相关字段
    keyword?: string;
    resultCount?: number;
    results?: Array<{ title: string; url: string }>;
}

export interface IElectronAPI {
    // 浏览器下载相关
    onProgress: (callback: (percent: number) => void) => void;
    onDownloadFailed: (callback: (msg: string) => void) => void;
    onExtractStart: (callback: () => void) => void;
    onExtractProgress: (callback: (percent: number) => void) => void;

    // 配置管理相关
    getConfig: (callback: (result: ConfigResultData) => void) => void;
    saveConfig: (params: SaveConfigParams, callback: (result: ConfigResultData) => void) => void;

    // 智能体研究相关
    startAgentResearch: (params: StartAgentResearchParams, callback: (result: AgentResearchResultData) => void) => void;
    onAgentResearchProgress: (callback: (data: AgentResearchProgressData) => void) => void;

    // 页面抓取进度监听
    onScrapeProgress: (callback: (progress: ScrapeProgressData) => void) => void;
    removeScrapeProgressListener: (callback: (progress: ScrapeProgressData) => void) => void;

    // 通用IPC方法
    on: (channel: string, func: (...args: unknown[]) => void) => void;
    removeListener: (channel: string, func: (...args: unknown[]) => void) => void;
    sendMessage: (channel: string, data?: unknown) => void;
    invoke: (channel: string, data?: unknown) => Promise<any>;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}