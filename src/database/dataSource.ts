import { DataSource } from 'typeorm';
import { SearchResult } from '../entities/SearchResult';
import { SearchSubQuery } from '../entities/SearchSubQuery';
import { SearchItem } from '../entities/SearchItem';
import { ResearchResult } from '../entities/ResearchResult';
import { AgentSession } from '../entities/AgentSession';
import { AgentStepLog } from '../entities/AgentStepLog';
import * as path from 'path';

// 确保目录存在
const dataDir = path.resolve(__dirname, '..', '..', 'data');
const dbPath = path.resolve(dataDir, 'deep-research.db');

export const AppDataSource = new DataSource({
    type: 'better-sqlite3',
    database: dbPath,
    entities: [SearchResult, SearchSubQuery, SearchItem, ResearchResult, AgentSession, AgentStepLog],
    synchronize: true,
    logging: false,
});