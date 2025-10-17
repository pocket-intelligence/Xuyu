import { app, BrowserWindow, ipcMain } from 'electron';
import { ensureBrowserInstalled, localChromePath } from './browserDownloader';
import { initializeDatabase } from './database/initialize';
import { SearchResultService } from './services/SearchResultService';
import { ResearchResultService } from './services/ResearchResultService';
import { DeepResearchScraper } from './DeepResearchScraper';
import * as fs from 'fs';
import path from 'path';
import { readConfig, saveConfig, SystemConfig } from './configManager';
import { AgentService } from './services/AgentService';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const isDev = !app.isPackaged;
const BROWSER_PATH = localChromePath();
let mainWindow: BrowserWindow | null = null;
let isDownloading = false;
let lastProgress = 0;

function setMainWindow(window: any) {
  mainWindow = window;
}

const createWindow = (initialRoute: string): void => {
  let iconPath;
  if (isDev) {
    iconPath = "./icon/icon.ico";
  } else {
    iconPath = path.join(process.resourcesPath, "resources", "icon", "icon.ico");
  }
  const preloadPath = path.join(__dirname, "..", "renderer", "main_window", "preload.js");
  console.log("preloadPath", preloadPath);
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: iconPath,
    title: "须臾",
    autoHideMenuBar: true,
  });

  // 设置主窗口引用，以便在resumeScraper中使用
  setMainWindow(mainWindow);

  if (isDev) {
    mainWindow.loadURL(`http://localhost:5173/#${initialRoute}`);
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(process.resourcesPath, "renderer/index.html");
    mainWindow.loadFile(indexPath, { hash: initialRoute });
    mainWindow.webContents.openDevTools();
  }

  // 监听页面加载完成事件
  mainWindow.webContents.on('dom-ready', () => {
    console.log('页面加载完成');
    // 检查浏览器是否存在
    checkAndDownloadBrowser();
  });
};

// 检查并下载浏览器
async function checkAndDownloadBrowser() {
  // 如果已经在下载，则不重复触发
  if (isDownloading) {
    return;
  }

  console.log("检查浏览器是否存在:", BROWSER_PATH);
  // 如果浏览器不存在，发送显示下载模态框的事件
  if (!fs.existsSync(BROWSER_PATH)) {
    console.log("浏览器不存在，发送显示下载模态框事件");
    isDownloading = true;
    lastProgress = 0;
    mainWindow?.webContents.send('show-download-modal');

    try {
      await ensureBrowserInstalled(
        (percent: number) => {
          // 限制进度更新频率，避免过多更新
          if (percent - lastProgress >= 1 || percent === 100) {
            console.log(`下载进度: ${percent}%`);
            mainWindow?.webContents.send("download-progress", percent);
            lastProgress = percent;
          }
        },
        () => {
          // 解压缩开始
          console.log("开始解压缩");
          mainWindow?.webContents.send("extract-start");
        },
        (percent: number) => {
          // 解压缩进度
          console.log(`解压缩进度: ${percent}%`);
          mainWindow?.webContents.send("extract-progress", percent);
        }
      );

      // 下载和解压缩完成后隐藏模态框
      console.log("下载和解压缩完成，发送隐藏模态框事件");
      mainWindow?.webContents.send("hide-download-modal");
      isDownloading = false;
    } catch (err: any) {
      console.error("下载失败:", err.message);
      mainWindow?.webContents.send("download-failed", err.message);
      // 注意：不设置 isDownloading = false，允许用户重试
    }
  }
}

// 处理开始研究请求
ipcMain.on("start-research", async (event, params: { query: string; maxResults?: number }) => {
  console.log("收到开始研究请求，参数:", params);

  try {
    // 发送进度更新
    mainWindow?.webContents.send("research-progress", "正在初始化研究环境...");

    // 1. 创建搜索结果记录
    const searchResultService = new SearchResultService();

    // 2. 执行搜索任务
    const scraper = new DeepResearchScraper({
      query: params.query,
      maxResults: params.maxResults || 3,
      headless: true
    });

    // 执行搜索
    const results = await scraper.run();

    // 3. 保存完整的搜索结果
    const searchData = {
      query: params.query,
      subQueries: [
        {
          q: params.query,
          searchs: results.map(result => ({
            url: result.url,
            title: result.title,
            abstract: result.snippet || '',
            image_save_path: result.imagePath
          }))
        }
      ]
    };

    const searchResult = await searchResultService.createCompleteSearchResult(searchData);

    // 发送结果
    event.reply("research-result", {
      success: true,
      message: "研究完成",
      data: {
        search_id: searchResult.id
      }
    });
  } catch (error: any) {
    console.error("研究失败:", error);
    event.reply("research-result", {
      success: false,
      message: "研究失败: " + error.message
    });
  }
});

// 处理生成报告请求
ipcMain.on("generate-report", async (event, params: { search_id: number; full_text: string }) => {
  console.log("收到生成报告请求，参数:", params);

  try {
    // 创建研究报告
    const researchResultService = new ResearchResultService();
    const researchResult = await researchResultService.createResearchResult({
      searchId: params.search_id,
      fullText: params.full_text
    });

    // 发送结果
    event.reply("generate-report-result", {
      success: true,
      message: "报告生成完成",
      data: {
        id: researchResult.id
      }
    });
  } catch (error: any) {
    console.error("报告生成失败:", error);
    event.reply("generate-report-result", {
      success: false,
      message: "报告生成失败: " + error.message
    });
  }
});

// 处理获取搜索结果请求
ipcMain.on("get-search-results", async (event, params: { page?: number, limit?: number } = {}) => {
  console.log("收到获取搜索结果请求，参数:", params);

  try {
    const searchResultService = new SearchResultService();

    // 默认分页参数
    const page = params.page || 1;
    const limit = params.limit || 20;

    const { searchResults, total } = await searchResultService.getSearchResultsPaginated(page, limit);

    // 发送结果
    event.reply("get-search-results-result", {
      success: true,
      message: "获取搜索结果成功",
      data: {
        searchResults,
        total,
        page,
        limit
      }
    });
  } catch (error: any) {
    console.error("获取搜索结果失败:", error);
    event.reply("get-search-results-result", {
      success: false,
      message: "获取搜索结果失败: " + error.message
    });
  }
});

// 处理获取研究报告请求
ipcMain.on("get-research-results", async (event, params: { page?: number, limit?: number } = {}) => {
  console.log("收到获取研究报告请求，参数:", params);

  try {
    const researchResultService = new ResearchResultService();

    // 默认分页参数
    const page = params.page || 1;
    const limit = params.limit || 20;

    const { researchResults, total } = await researchResultService.getResearchResultsPaginated(page, limit);

    // 发送结果
    event.reply("get-research-results-result", {
      success: true,
      message: "获取研究报告成功",
      data: {
        researchResults,
        total,
        page,
        limit
      }
    });
  } catch (error: any) {
    console.error("获取研究报告失败:", error);
    event.reply("get-research-results-result", {
      success: false,
      message: "获取研究报告失败: " + error.message
    });
  }
});

// 处理重试下载请求
ipcMain.on("retry-download", async () => {
  console.log("收到重试下载请求");
  if (isDownloading) {
    console.log("已有下载任务正在进行中");
    return;
  }

  isDownloading = true;
  lastProgress = 0;
  mainWindow?.webContents.send("download-progress", 0);

  try {
    await ensureBrowserInstalled(
      (percent: number) => {
        // 限制进度更新频率，避免过多更新
        if (percent - lastProgress >= 1 || percent === 100) {
          console.log(`下载进度: ${percent}%`);
          mainWindow?.webContents.send("download-progress", percent);
          lastProgress = percent;
        }
      },
      () => {
        // 解压缩开始
        console.log("开始解压缩");
        mainWindow?.webContents.send("extract-start");
      },
      (percent: number) => {
        // 解压缩进度
        console.log(`解压缩进度: ${percent}%`);
        mainWindow?.webContents.send("extract-progress", percent);
      }
    );

    // 下载和解压缩完成后隐藏模态框
    console.log("下载和解压缩完成，发送隐藏模态框事件");
    mainWindow?.webContents.send("hide-download-modal");
    isDownloading = false;
  } catch (err: any) {
    console.error("下载失败:", err.message);
    mainWindow?.webContents.send("download-failed", err.message);
    // 注意：不设置 isDownloading = false，允许用户重试
  }
});

// 处理获取配置请求
ipcMain.on("get-config", (event) => {
  console.log("收到获取配置请求");
  try {
    const config = readConfig();
    event.reply("get-config-result", {
      success: true,
      data: config
    });
  } catch (error: any) {
    console.error("获取配置失败:", error);
    event.reply("get-config-result", {
      success: false,
      message: "获取配置失败: " + error.message
    });
  }
});

// 处理保存配置请求
ipcMain.on("save-config", (event, params: { config: SystemConfig }) => {
  console.log("收到保存配置请求，参数:", params);
  try {
    const success = saveConfig(params.config);
    if (success) {
      event.reply("save-config-result", {
        success: true,
        message: "配置保存成功"
      });
    } else {
      event.reply("save-config-result", {
        success: false,
        message: "配置保存失败"
      });
    }
  } catch (error: any) {
    console.error("保存配置失败:", error);
    event.reply("save-config-result", {
      success: false,
      message: "保存配置失败: " + error.message
    });
  }
});

// 处理创建研究会话请求
ipcMain.handle("create-research-session", async (event, params: { topic: string }) => {
  console.log("[IPC] 收到创建研究会话请求，参数:", params);

  try {
    const sessionId = await AgentService.createResearchSession(params.topic);

    console.log("[IPC] 会话创建成功，sessionId:", sessionId);
    return {
      success: true,
      sessionId: sessionId
    };
  } catch (error: any) {
    console.error("[IPC] 创建研究会话失败:", error);
    return {
      success: false,
      message: "创建研究会话失败: " + error.message
    };
  }
});

// 处理执行下一步请求
ipcMain.handle("execute-next-step", async (event, params: { sessionId: string }) => {
  console.log("[IPC] 收到执行下一步请求，参数:", params);

  try {
    const result = await AgentService.executeNextStep(
      params.sessionId,
      (step: number, data: any, stepInfo?: { title: string; description: string }) => {
        // 发送进度更新
        console.log("[IPC] 发送进度更新:", { step, data, stepInfo });
        mainWindow?.webContents.send("agent-research-progress", {
          step,
          data,
          stepInfo
        });
      }
    );

    // 过滤掉不可序列化的字段
    const serializableState = { ...result.state };
    delete serializableState.llm_client;

    // 返回执行结果
    console.log("[IPC] 返回执行结果:", {
      success: true,
      completed: result.completed,
      needsInput: result.needsInput
    });
    return {
      success: true,
      completed: result.completed,
      needsInput: result.needsInput,
      inputPrompt: result.inputPrompt,
      state: serializableState
    };
  } catch (error: any) {
    console.error("[IPC] 执行下一步失败:", error);
    return {
      success: false,
      message: "执行下一步失败: " + error.message
    };
  }
});

// 处理提交用户输入请求
ipcMain.handle("submit-user-input", async (event, params: { sessionId: string, input: any }) => {
  console.log("[IPC] 收到提交用户输入请求，参数:", params);

  try {
    const result = await AgentService.submitUserInput(
      params.sessionId,
      params.input,
      (step: number, data: any, stepInfo?: { title: string; description: string }) => {
        // 发送进度更新
        console.log("[IPC] 发送进度更新:", { step, data, stepInfo });
        mainWindow?.webContents.send("agent-research-progress", {
          step,
          data,
          stepInfo
        });
      }
    );

    // 过滤掉不可序列化的字段
    const serializableState = { ...result.state };
    delete serializableState.llm_client;

    // 返回执行结果
    console.log("[IPC] 返回执行结果:", {
      success: true,
      completed: result.completed,
      needsInput: result.needsInput
    });
    return {
      success: true,
      completed: result.completed,
      needsInput: result.needsInput,
      inputPrompt: result.inputPrompt,
      state: serializableState
    };
  } catch (error: any) {
    console.error("[IPC] 提交用户输入失败:", error);
    return {
      success: false,
      message: "提交用户输入失败: " + error.message
    };
  }
});

// 处理销毁会话请求
ipcMain.on("destroy-session", async (event, params: { sessionId: string }) => {
  console.log("收到销毁会话请求，参数:", params);

  try {
    const result = await AgentService.destroySession(params.sessionId);

    // 发送销毁结果
    event.reply("destroy-session-result", {
      success: true,
      destroyed: result
    });
  } catch (error: any) {
    console.error("销毁会话失败:", error);
    event.reply("destroy-session-result", {
      success: false,
      message: "销毁会话失败: " + error.message
    });
  }
});

// 处理打开外部 URL 请求
ipcMain.handle("open-external-url", async (event, params: { url: string }) => {
  console.log("收到打开外部 URL 请求:", params.url);

  try {
    const { shell } = require('electron');
    await shell.openExternal(params.url);
    return { success: true };
  } catch (error: any) {
    console.error("打开 URL 失败:", error);
    return {
      success: false,
      message: "打开 URL 失败: " + error.message
    };
  }
});





app.whenReady().then(async () => {
  // 初始化数据库
  const dbInitialized = await initializeDatabase();
  if (!dbInitialized) {
    console.error("数据库初始化失败");
  }

  // 直接创建窗口
  createWindow("/");
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});