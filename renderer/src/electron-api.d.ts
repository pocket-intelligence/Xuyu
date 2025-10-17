// electron-api.d.ts
export interface IElectronAPI {
    // 浏览器下载相关
    onProgress: (callback: (percent: number) => void) => void;
    onDownloadFailed: (callback: (msg: string) => void) => void;
    onExtractStart: (callback: () => void) => void;
    onExtractProgress: (callback: (percent: number) => void) => void;

    // 研究相关
    startResearch: (params: { query: string; maxResults?: number }, callback: (result: { success: boolean; message: string; data?: any }) => void) => void;
    generateReport: (params: { search_id: number; full_text: string }, callback: (result: { success: boolean; message: string; data?: any }) => void) => void;
    onResearchProgress: (callback: (message: string) => void) => void;

    // 数据库相关
    getSearchResults: (params: { page?: number, limit?: number }, callback: (result: { success: boolean; message: string; data?: any }) => void) => void;
    getResearchResults: (params: { page?: number, limit?: number }, callback: (result: { success: boolean; message: string; data?: any }) => void) => void;

    // 通用IPC方法
    on: (channel: string, func: (...args: any[]) => void) => void;
    sendMessage: (channel: string, data?: any) => void;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}