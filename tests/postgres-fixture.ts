import { readFile } from 'node:fs/promises';
import { execute, transaction } from '../server/db/index.js';

// Every fixture is in temporary tables on a dedicated transaction connection.
// Public/migrated tables are never modified, even when a test assertion fails.
export async function isolated<T>(fn: () => Promise<T>): Promise<void> {
  const rollback = new Error('test rollback');
  try {
    await transaction(async () => {
      const schema = await readFile(new URL('../server/db/schema.sql', import.meta.url), 'utf8');
      await execute(schema.split('-- Indexes')[0].replaceAll('CREATE TABLE IF NOT EXISTS', 'CREATE TEMP TABLE').replaceAll('\n);', '\n) ON COMMIT DROP;'));
      await fn();
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

