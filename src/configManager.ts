import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// 定义配置接口
export interface SystemConfig {
    // 语言模型配置
    llmApiUrl?: string;
    llmModelName?: string;
    llmApiKey?: string;

    // 多模态模型配置（用于图像理解和OCR）
    multimodalApiUrl?: string;
    multimodalModelName?: string;
    multimodalApiKey?: string;

    // SearxNG配置
    searxngUrl?: string;
}

// 获取配置文件路径
export function getConfigPath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'config.json');
}

// 读取配置
export function readConfig(): SystemConfig {
    try {
        const configPath = getConfigPath();
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error('读取配置文件失败:', error);
        return {};
    }
}

// 保存配置
export function saveConfig(config: SystemConfig): boolean {
    try {
        const configPath = getConfigPath();
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('保存配置文件失败:', error);
        return false;
    }
}