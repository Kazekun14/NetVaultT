import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { db, execute, queryOne, query, transaction, initDb, getIsSqlite } from '../server/db/index.js';
import { encryptSecret, decryptSecret } from '../server/services/encryption.service.js';
import { logAudit } from '../server/services/audit.service.js';

import { isolated } from './postgres-fixture.js';

beforeAll(async () => {
  await initDb();
});

afterAll(() => db.end());

describe('PostgreSQL credential and audit integration', () => {
  it('commits read-only work and releases clients on success and failure', async (ctx) => {
    if (getIsSqlite()) ctx.skip();
    expect(await transaction(async () => (await queryOne('SELECT 42::int AS value'))?.value)).toBe(42);
    await expect(transaction(async () => { throw new Error('rollback'); })).rejects.toThrow('rollback');
    expect(db.idleCount).toBe(db.totalCount);
    const pids = await Promise.all([0, 1].map(() => transaction(async () => {
      const first = await queryOne('SELECT pg_backend_pid() AS pid');
      await execute('SELECT pg_sleep(0.02)');
      expect(await queryOne('SELECT pg_backend_pid() AS pid')).toEqual(first);
      return first!.pid;
    })));
    expect(new Set(pids).size).toBe(2);
  });

  it('stores encrypted secrets and awaits audit persistence without touching public tables', async (ctx) => {
    if (getIsSqlite()) ctx.skip();
    await isolated(async () => {
      const now = new Date().toISOString();
      await execute("INSERT INTO sites (id,code,name,created_at,updated_at) VALUES ('site','TEST','Test',$1,$1)", [now]);
      await execute("INSERT INTO device_types (id,code,name) VALUES ('type','TEST','Test')");
      await execute("INSERT INTO devices (id,device_name,device_type_id,site_id,management_ip,created_at,updated_at) VALUES ('device','Test','type','site','127.0.0.1',$1,$1)", [now]);
      const encrypted = encryptSecret('Test-only secret?');
      await execute(`INSERT INTO credentials (id,device_id,credential_name,username,encrypted_password,encryption_iv,authentication_tag,password_changed_at,next_rotation_at,created_at,updated_at)
        VALUES ('credential','device','Test','root',$1,$2,$3,$4,$4,$4,$4)`, [encrypted.ciphertext,encrypted.iv,encrypted.authTag,now]);
      const row = await queryOne('SELECT * FROM credentials WHERE id=$1', ['credential']);
      expect(row?.encrypted_password).toBe(encrypted.ciphertext);
      expect(decryptSecret(row!.encrypted_password,row!.encryption_iv,row!.authentication_tag)).toBe('Test-only secret?');
      await logAudit({usernameSnapshot:'test',action:'CREDENTIAL_REVEALED',resourceType:'CREDENTIAL',resourceId:'credential'});
      expect(await queryOne('SELECT COUNT(*)::int AS count FROM audit_logs')).toEqual({count:1});
      expect((await queryOne("SELECT '?' AS literal, $1::text AS value", ['data?']))).toEqual({literal:'?',value:'data?'});
    });
  });

  it('rolls back nested writes and keeps nested helpers on the same client', async (ctx) => {
    if (getIsSqlite()) ctx.skip();
    await isolated(async () => {
      const outer = await queryOne('SELECT pg_backend_pid() AS pid');
      await expect(transaction(async () => {
        expect(await queryOne('SELECT pg_backend_pid() AS pid')).toEqual(outer);
        await execute("INSERT INTO permissions (id,code,name) VALUES ('rollback','rollback','Rollback')");
        throw new Error('intentional failure');
      })).rejects.toThrow('intentional failure');
      expect(await query('SELECT * FROM permissions')).toEqual([]);
      await transaction(async () => {
        await execute("INSERT INTO permissions (id,code,name) VALUES ('success','success','Success')");
      });
      expect((await query('SELECT * FROM permissions')).length).toBe(1);
    });
  });
});
