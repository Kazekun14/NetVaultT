import { AsyncLocalStorage } from 'node:async_hooks';
import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

dotenv.config();

let pgPool: Pool | null = null;
let savepointCounter = 0;

export function databaseErrorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && /^[A-Z0-9_]+$/.test(code) ? code : 'UNKNOWN';
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
  },
  get idleCount() {
    return pgPool?.idleCount ?? 0;
  },
  get totalCount() {
    return pgPool?.totalCount ?? 0;
  }
};

// Initialize PostgreSQL connection. Throws if connection fails — no fallback.
export async function initDb(): Promise<void> {
  const poolSize = parseInt(process.env.DB_POOL_SIZE || '10', 10);
  const maxConnections = Number.isFinite(poolSize) && poolSize > 0 ? poolSize : 10;

  pgPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'netvaultt',
    user: process.env.DB_USER || 'wrks5',
    password: process.env.DB_PASSWORD,
    max: maxConnections,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    application_name: 'NetVaultT',
  });

  // Test connection — throws on failure, propagating to caller
  const client = await pgPool.connect();
  client.release();
  console.log('✔ Connected to PostgreSQL database server.');

  const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pgPool.query(sql);
}

const transactionStorage = new AsyncLocalStorage<PoolClient>();

export function getTransactionClient(): PoolClient | undefined {
  return transactionStorage.getStore();
}

export function withTransactionClient<T>(client: PoolClient, fn: () => T): T {
  return transactionStorage.run(client, fn);
}

export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (!pgPool) {
    throw new Error('Database not initialized. Call initDb() before querying.');
  }
  const target = transactionStorage.getStore() || pgPool;
  const result = await (target as PoolClient | Pool).query<T>(sql, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}

export async function execute(sql: string, params: unknown[] = []): Promise<any> {
  if (!pgPool) {
    throw new Error('Database not initialized. Call initDb() before executing.');
  }
  return (transactionStorage.getStore() || pgPool).query(sql, params);
}

export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  if (!pgPool) {
    throw new Error('Database not initialized. Call initDb() before starting a transaction.');
  }

  const existing = transactionStorage.getStore();
  if (existing) {
    const sp = `sp_${++savepointCounter}`;
    await existing.query(`SAVEPOINT ${sp}`);
    try {
      const result = await fn();
      await existing.query(`RELEASE SAVEPOINT ${sp}`);
      return result;
    } catch (error) {
      await existing.query(`ROLLBACK TO SAVEPOINT ${sp}`);
      throw error;
    }
  }

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
