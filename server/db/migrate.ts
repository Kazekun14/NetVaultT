import { initDb, db, databaseErrorCode } from './index.js';

console.log('Running NetVaultT PostgreSQL schema initialization...');
try {
  await initDb();
  console.log('Database migrations completed successfully.');
} catch (error) {
  console.error('PostgreSQL initialization failed. Check DB_* configuration and server availability. Code:', databaseErrorCode(error));
  process.exitCode = 1;
} finally {
  await db.end();
}
