// electron-api.d.ts
export interface ResearchOutput {
    type: string;
    content: unknown;
    metadata?: Record<string, unknown>;
}

interface SearchResultData {
    success: boolean;
    message: string;
    data?: unknown;
}

interface ResearchResultData {
    success: boolean;
    message?: string;
    data?: unknown;
}

interface ConfigResultData {
    success: boolean;
    message?: string;
    data?: unknown;
}

interface SaveConfigParams {
    config: unknown;
}

interface StartResearchParams {
    query: string;
    maxResults?: number;
}

interface GenerateReportParams {
    search_id: number;
    full_text: string;
}

interface GetSearchResultsParams {
    page?: number;
    limit?: number;
}

interface GetResearchResultsParams {
    page?: number;
    limit?: number;
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

export interface IElectronAPI {
    // 浏览器下载相关
    onProgress: (callback: (percent: number) => void) => void;
    onDownloadFailed: (callback: (msg: string) => void) => void;
    onExtractStart: (callback: () => void) => void;
    onExtractProgress: (callback: (percent: number) => void) => void;

    // 研究相关
    startResearch: (params: StartResearchParams, callback: (result: SearchResultData) => void) => void;
    generateReport: (params: GenerateReportParams, callback: (result: SearchResultData) => void) => void;
    onResearchProgress: (callback: (message: string) => void) => void;

    // 数据库相关
    getSearchResults: (params: GetSearchResultsParams, callback: (result: SearchResultData) => void) => void;
    getResearchResults: (params: GetResearchResultsParams, callback: (result: SearchResultData) => void) => void;

    // 配置管理相关
    getConfig: (callback: (result: ConfigResultData) => void) => void;
    saveConfig: (params: SaveConfigParams, callback: (result: ConfigResultData) => void) => void;

    // 智能体研究相关
    startAgentResearch: (params: StartAgentResearchParams, callback: (result: AgentResearchResultData) => void) => void;
    onAgentResearchProgress: (callback: (data: AgentResearchProgressData) => void) => void;

    // 通用IPC方法
    on: (channel: string, func: (...args: unknown[]) => void) => void;
    sendMessage: (channel: string, data?: unknown) => void;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}