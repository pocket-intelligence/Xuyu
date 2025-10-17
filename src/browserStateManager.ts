import * as fs from 'fs';
import * as path from 'path';
import { BrowserContext } from 'playwright';

export class BrowserStateManager {
    private cookiePath: string;
    private userDataDir: string;

    constructor() {
        this.cookiePath = path.resolve(__dirname, '..', 'data', 'cookies.json');
        this.userDataDir = path.resolve(__dirname, '..', 'data', 'user_data');

        // 确保数据目录存在
        const dataDir = path.resolve(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // 确保用户数据目录存在
        if (!fs.existsSync(this.userDataDir)) {
            fs.mkdirSync(this.userDataDir, { recursive: true });
        }
    }

    /**
     * 读取本地Cookie
     */
    readCookies(): any[] | null {
        if (!fs.existsSync(this.cookiePath)) {
            return null;
        }
        try {
            const data = fs.readFileSync(this.cookiePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error("读取Cookie失败:", error);
            return null;
        }
    }

    /**
     * 保存Cookie
     */
    async saveCookies(context: BrowserContext): Promise<void> {
        try {
            const cookies = await context.cookies();
            fs.writeFileSync(this.cookiePath, JSON.stringify(cookies, null, 2), 'utf-8');
            console.log(`✅ Cookies 已保存到 ${this.cookiePath}`);
        } catch (error) {
            console.error("保存Cookie失败:", error);
        }
    }

    /**
     * 检查Cookie是否过期
     */
    cookiesHaveValidExpiry(cookies: any[]): boolean {
        if (!cookies || cookies.length === 0) return false;
        const now = Date.now() / 1000;
        for (const c of cookies) {
            if (c.expires && c.expires < now) {
                return false;
            }
        }
        return true;
    }

    /**
     * 获取用户数据目录路径
     */
    getUserDataDir(): string {
        return this.userDataDir;
    }

    /**
     * 获取Cookie文件路径
     */
    getCookiePath(): string {
        return this.cookiePath;
    }
}