import { app, BrowserWindow, ipcMain } from 'electron';
import { ensureBrowserInstalled, localChromePath } from './browserDownloader';
import { initializeDatabase } from './database/initialize';
import { SearchResultService } from './services/SearchResultService';
import { ResearchResultService } from './services/ResearchResultService';
import { DeepResearchScraper } from './DeepResearchScraper';
import * as fs from 'fs';
import path from 'path';


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const isDev = !app.isPackaged;
const BROWSER_PATH = localChromePath();
let mainWindow: BrowserWindow | null = null;

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
    title: "职航",
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
    // 如果浏览器不存在，发送显示下载模态框的事件
    if (!fs.existsSync(BROWSER_PATH)) {
      console.log("浏览器不存在，发送显示下载模态框事件");
      mainWindow?.webContents.send('show-download-modal');
    }
  });
};

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

app.whenReady().then(async () => {
  // 初始化数据库
  const dbInitialized = await initializeDatabase();
  if (!dbInitialized) {
    console.error("数据库初始化失败");
  }

  // 如果浏览器已存在，直接加载主页
  if (fs.existsSync(BROWSER_PATH)) {
    console.log("浏览器已存在，直接加载主页");
    createWindow("/");
  } else {
    console.log("浏览器不存在，需要下载");
    // 浏览器不存在 → 加载主页
    createWindow("/");

    try {
      await ensureBrowserInstalled((percent: number) => {
        console.log(`下载进度: ${percent}%`);
        mainWindow?.webContents.send("download-progress", percent);
      });

      // 下载完成后隐藏模态框并刷新页面
      console.log("下载完成，发送隐藏模态框事件");
      mainWindow?.webContents.send("hide-download-modal");

      // 重新加载页面以确保浏览器可用
      if (mainWindow) {
        if (isDev) {
          mainWindow.loadURL(`http://localhost:5173/#/`);
        } else {
          const indexPath = path.join(process.resourcesPath, "renderer/index.html");
          mainWindow.loadFile(indexPath, { hash: "/" });
        }
      }
    } catch (err: any) {
      console.error("下载失败:", err.message);
      mainWindow?.webContents.send("download-failed", err.message);
    }
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
