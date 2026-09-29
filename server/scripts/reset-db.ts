import { initDb, execute, queryOne, db, databaseErrorCode } from '../db/index.js';

export async function clearExistingData() {
  console.log('🧹 Clearing existing demo data from NetVaultT database...');
  await initDb();

  try {
    // Delete in correct order to respect foreign key constraints
    await execute('DELETE FROM credentials');
    await execute('DELETE FROM devices');
    await execute('DELETE FROM sites');
    await execute('DELETE FROM audit_logs');
    await execute("UPDATE users SET username = 'superadmin', email = 'superadmin@netvaultt.internal' WHERE username = 'admin'");

    console.log('✔ All sample devices, credentials, sites, and audit logs cleared successfully.');
    console.log('✔ Essential superadmin account, roles, permissions, and device types retained.');
  } catch (err) {
    console.error('Error clearing database:', databaseErrorCode(err));
  }
}

if (process.argv[1] && process.argv[1].endsWith('reset-db.ts')) {
  clearExistingData()
    .then(() => db.end())
    .catch((err) => {
      console.error('Reset DB script failed:', err);
      return db.end();
    });
}
