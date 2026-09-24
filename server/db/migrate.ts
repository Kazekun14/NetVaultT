import { initDb } from './index.js';

console.log('Running NetVaultT database migrations...');
try {
  initDb();
  console.log('Database migrations completed successfully.');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}

