import { AsyncLocalStorage } from 'node:async_hooks';
import { readFile } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import Database from 'better-sqlite3';

dotenv.config();

let isSqlite = false;
let sqliteDb: Database.Database | null = null;
let pgPool: Pool | null = null;

const dbPath = process.env.DATABASE_PATH || './netvault.db';

export function databaseErrorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && /^[A-Z0-9_]+$/.test(code) ? code : 'UNKNOWN';
}

function initSqlite() {
  isSqlite = true;
  const dbDir = path.dirname(dbPath);
  if (dbDir && !fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('foreign_keys = ON');
  console.log('✔ Connected to SQLite local database file:', dbPath);
}

export function getIsSqlite() {
  return isSqlite;
}

// Export db object compatibility interface
export const db = {
  query: async <T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<{ rows: T[] }> => {
    const rows = await query<T>(sql, params);
    return { rows };
  },
  on: (event: string, listener: (...args: any[]) => void) => {
    if (pgPool) pgPool.on(event as any, listener);
  },
  end: async () => {
    if (pgPool) await pgPool.end();
    if (sqliteDb) sqliteDb.close();
  },
  get idleCount() {
    return pgPool?.idleCount ?? 0;
  },
  get totalCount() {
    return pgPool?.totalCount ?? 0;
  }
};

// Try connecting to PostgreSQL, fallback to SQLite if connection fails
export async function initDb(): Promise<void> {
  const forceSqlite = process.env.USE_SQLITE === 'true';

  if (!forceSqlite) {
    try {
      pgPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'netvaultt',
        user: process.env.DB_USER || 'wrks5',
        password: process.env.DB_PASSWORD,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        application_name: 'NetVaultT',
      });

      // Test connection
      const client = await pgPool.connect();
      client.release();
      console.log('✔ Connected to PostgreSQL database server.');
      const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
      await pgPool.query(sql);
      return;
    } catch (err: any) {
      console.warn('PostgreSQL connection unavailable (' + err.message + '). Falling back to SQLite database...');
      if (pgPool) {
        await pgPool.end().catch(() => {});
        pgPool = null;
      }
    }
  }

  initSqlite();
  const sqliteSchemaPath = path.join(process.cwd(), 'server/db/schema.sqlite.sql');
  if (fs.existsSync(sqliteSchemaPath)) {
    const sqliteSql = fs.readFileSync(sqliteSchemaPath, 'utf8');
    sqliteDb!.exec(sqliteSql);
  } else {
    const sql = fs.readFileSync(path.join(process.cwd(), 'server/db/schema.sql'), 'utf8');
    sqliteDb!.exec(sql);
  }
}

const transactionStorage = new AsyncLocalStorage<any>();

export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (isSqlite && sqliteDb) {
    const adaptedSql = sql.replace(/\$\d+/g, '?');
    return sqliteDb.prepare(adaptedSql).all(...params) as T[];
  }

  if (pgPool) {
    const target = transactionStorage.getStore() || pgPool;
    const result = await (target as PoolClient | Pool).query<T>(sql, params);
    return result.rows;
  }

  return [];
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}

export async function execute(sql: string, params: unknown[] = []): Promise<any> {
  if (isSqlite && sqliteDb) {
    const adaptedSql = sql.replace(/\$\d+/g, '?');
    const res = sqliteDb.prepare(adaptedSql).run(...params);
    return { rowCount: res.changes, rows: [] };
  }

  if (pgPool) {
    return (transactionStorage.getStore() || pgPool).query(sql, params);
  }

  return { rowCount: 0, rows: [] };
}

export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  if (isSqlite && sqliteDb) {
    await execute('BEGIN');
    try {
      const res = await fn();
      await execute('COMMIT');
      return res;
    } catch (err) {
      await execute('ROLLBACK');
      throw err;
    }
  }

  if (pgPool) {
    const client = await pgPool.connect();
    let discard = false;
    try {
      await client.query('BEGIN');
      const result = await transactionStorage.run(client, fn);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { discard = true; }
      throw error;
    } finally {
      client.release(discard);
    }
  }

  return fn();
}
