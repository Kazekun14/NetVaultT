import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || './netvault.db';

// Ensure parent directory exists
const dbDir = path.dirname(dbPath);
if (dbDir && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

export function initDb() {
  const schemaSql = fs.readFileSync(path.join(process.cwd(), 'server/db/schema.sql'), 'utf-8');
  db.exec(schemaSql);
}

export function query<T = any>(sql: string, params: any[] = []): T[] {
  return db.prepare(sql).all(...params) as T[];
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

export function execute(sql: string, params: any[] = []): Database.RunResult {
  return db.prepare(sql).run(...params);
}

export function transaction<T>(fn: () => T): T {
  return db.transaction(fn)();
}

