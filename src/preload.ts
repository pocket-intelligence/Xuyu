import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
    // 浏览器下载相关
    onProgress: (callback: (percent: number) => void) =>
        ipcRenderer.on("download-progress", (_, percent) => callback(percent)),
    onDownloadFailed: (callback: (msg: string) => void) =>
        ipcRenderer.on("download-failed", (_, msg) => callback(msg)),
    onExtractStart: (callback: () => void) =>
        ipcRenderer.on("extract-start", () => callback()),
    onExtractProgress: (callback: (percent: number) => void) =>
        ipcRenderer.on("extract-progress", (_, percent) => callback(percent)),

    // 研究相关
    startResearch: (params: { query: string; maxResults?: number }, callback: (result: { success: boolean; message: string; data?: any }) => void) => {
        ipcRenderer.send("start-research", params);
        ipcRenderer.once("research-result", (_, result) => callback(result));
    },
    generateReport: (params: { search_id: number; full_text: string }, callback: (result: { success: boolean; message: string; data?: any }) => void) => {
        ipcRenderer.send("generate-report", params);
        ipcRenderer.once("generate-report-result", (_, result) => callback(result));
    },
    onResearchProgress: (callback: (message: string) => void) => {
        ipcRenderer.on("research-progress", (_, message) => callback(message));
    },

    // 数据库相关
    getSearchResults: (params: { page?: number, limit?: number }, callback: (result: { success: boolean; message: string; data?: any }) => void) => {
        ipcRenderer.send("get-search-results", params);
        ipcRenderer.once("get-search-results-result", (_, result) => callback(result));
    },
    getResearchResults: (params: { page?: number, limit?: number }, callback: (result: { success: boolean; message: string; data?: any }) => void) => {
        ipcRenderer.send("get-research-results", params);
        ipcRenderer.once("get-research-results-result", (_, result) => callback(result));
    },

    // 配置管理相关
    getConfig: (callback: (result: { success: boolean; message?: string; data?: any }) => void) => {
        ipcRenderer.send("get-config");
        ipcRenderer.once("get-config-result", (_, result) => callback(result));
    },
    saveConfig: (params: { config: any }, callback: (result: { success: boolean; message?: string }) => void) => {
        ipcRenderer.send("save-config", params);
        ipcRenderer.once("save-config-result", (_, result) => callback(result));
    },

    // 智能体研究相关
    startAgentResearch: (params: { topic: string }, callback: (result: { success: boolean; message?: string; data?: any }) => void) => {
        ipcRenderer.send("agent-research", params);
        ipcRenderer.once("agent-research-result", (_, result) => callback(result));
    },
    onAgentResearchProgress: (callback: (data: { step: number; data: any; stepInfo?: { title: string; description: string } }) => void) => {
        console.log("注册 agent-research-progress 监听器");
        ipcRenderer.on("agent-research-progress", (_, data) => {
            console.log("收到 agent-research-progress 消息:", data);
            callback(data);
        });
    },

    // 通用IPC方法
    on: (channel: string, func: (...args: any[]) => void) => {
        ipcRenderer.on(channel, (_, ...args) => func(...args));
    },
    removeListener: (channel: string, func: (...args: any[]) => void) => {
        ipcRenderer.removeListener(channel, (_, ...args) => func(...args));
    },
    sendMessage: (channel: string, data?: any) => {
        ipcRenderer.send(channel, data);
    },
    invoke: async (channel: string, data?: any) => {
        return await ipcRenderer.invoke(channel, data);
    }
});