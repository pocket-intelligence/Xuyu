import { AppDataSource } from './dataSource';
import * as fs from 'fs';
import * as path from 'path';

// 确保数据目录存在
const dataDir = path.resolve(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 初始化数据库连接
export async function initializeDatabase() {
    try {
        await AppDataSource.initialize();
        console.log('✅ 数据库连接成功');
        return true;
    } catch (error) {
        console.error('❌ 数据库连接失败:', error);
        return false;
    }
}

// 关闭数据库连接
export async function closeDatabase() {
    try {
        await AppDataSource.destroy();
        console.log('数据库连接已关闭');
    } catch (error) {
        console.error('关闭数据库连接时出错:', error);
    }
}