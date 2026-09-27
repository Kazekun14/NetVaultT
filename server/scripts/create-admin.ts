import { initDb, execute, queryOne, transaction, db, databaseErrorCode } from '../db/index.js';
import { hashPassword } from '../services/password.service.js';
import crypto from 'crypto';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function createAdmin() {
  await initDb();

  console.log('--- NetVaultT Super Administrator Initialization ---');
  const username = (await ask('Enter Username [admin]: ')).trim() || 'admin';
  const email = (await ask('Enter Email [admin@netvaultt.internal]: ')).trim() || 'admin@netvaultt.internal';
  const firstName = (await ask('Enter First Name [System]: ')).trim() || 'System';
  const lastName = (await ask('Enter Last Name [Administrator]: ')).trim() || 'Administrator';
  const password = await ask('Enter Password: ');

  if (!password || password.length < 8) {
    console.error('Error: Password must be at least 8 characters long.');
    rl.close();
    process.exitCode = 1;
    return;
  }

  const existingUser = await queryOne('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
  if (existingUser) {
    console.error(`Error: User with username "${username}" or email "${email}" already exists.`);
    rl.close();
    process.exitCode = 1;
    return;
  }

  const superAdminRole = await queryOne<{ id: string }>('SELECT id FROM roles WHERE name = $1', ['Super Administrator']);
  if (!superAdminRole) {
    console.error('Error: Super Administrator role not found in database. Run npm run db:seed first.');
    rl.close();
    process.exitCode = 1;
    return;
  }

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  await transaction(async () => {
    await execute(
      `INSERT INTO users (id, first_name, last_name, username, email, password_hash, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, firstName, lastName, username, email, passwordHash, 'ACTIVE', now, now]
    );

    await execute('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, superAdminRole.id]);
  });

  console.log(`\nSuper Administrator "${username}" created successfully!`);
  rl.close();
}

createAdmin().catch((err) => {
  console.error('Create admin error:', databaseErrorCode(err));
  rl.close();
  process.exitCode = 1;
}).finally(() => db.end());
