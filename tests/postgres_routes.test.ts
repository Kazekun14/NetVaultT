import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { db, execute, queryOne, initDb, getTransactionClient, withTransactionClient } from '../server/db/index.js';
import { hashPassword } from '../server/services/password.service.js';
import { isolated } from './postgres-fixture.js';
import auth from '../server/routes/auth.routes.js';
import devices from '../server/routes/devices.routes.js';
import credentials from '../server/routes/credentials.routes.js';
import sites from '../server/routes/sites.routes.js';
import users from '../server/routes/users.routes.js';
import roles from '../server/routes/roles.routes.js';
import settings from '../server/routes/settings.routes.js';
import audit from '../server/routes/audit.routes.js';
import dashboard from '../server/routes/dashboard.routes.js';

beforeAll(async () => {
  await initDb();
});

afterAll(() => db.end());

it('runs authenticated API workflows, filters, authorization, and rollback against isolated PostgreSQL tables', async () => {
  await isolated(async () => {
    const isolatedClient = getTransactionClient();
    const now = new Date().toISOString();
    const password = 'TemporaryTestPassword!';
    const hash = await hashPassword(password);
    await execute("INSERT INTO users(id,first_name,last_name,username,email,password_hash,created_at,updated_at) VALUES ('tester','Test','User','tester','test@example.invalid',$1,$2,$2)", [hash,now]);
    await execute("INSERT INTO roles(id,name,created_at,updated_at) VALUES ('admin-role','Super Administrator',$1,$1),('viewer-role','Viewer',$1,$1)", [now]);
    const codes = ['dashboard.view','devices.view','devices.create','devices.update','devices.deactivate','credentials.view','credentials.create','credentials.update','credentials.reveal','credentials.copy','credentials.disable','sites.view','sites.create','sites.update','users.view','users.create','users.update','roles.manage','audit.view','settings.manage'];
    for (const code of codes) {
      await execute('INSERT INTO permissions(id,code,name) VALUES ($1,$1,$1)',[code]);
      await execute("INSERT INTO role_permissions(role_id,permission_id) VALUES ('admin-role',$1)",[code]);
    }
    await execute("INSERT INTO user_roles(user_id,role_id) VALUES ('tester','admin-role')");
    await execute("INSERT INTO device_types(id,code,name) VALUES ('type','ROUTER','Router')");
    for (const [key,value,type] of [['require_reauth_reveal','true','boolean'],['reveal_timeout','20','number'],['app_name','NetVaultT','string']]) {
      await execute('INSERT INTO system_settings(id,setting_key,setting_value,setting_type,updated_at) VALUES ($1,$1,$2,$3,$4)',[key,value,type,now]);
    }
    const app = express();
    if (isolatedClient) {
      app.use((_req, _res, next) => {
        withTransactionClient(isolatedClient, next);
      });
    }
    app.use(express.json());
    app.use(session({secret:'isolated-test-session-secret',resave:false,saveUninitialized:false}));
    for (const [path,router] of Object.entries({auth,devices,credentials,sites,users,roles,settings,'audit-logs':audit,dashboard})) app.use('/api/'+path,router);
    app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => { res.status(500).json({success:false,message:'Internal error'}); });
    // Listen inside the transaction's async context so HTTP work inherits its client.
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    try {
      const agent = request.agent(server);
      await agent.get('/api/devices').expect(401);
      await agent.post('/api/auth/login').send({username:'tester',password:'wrong'}).expect(401);
      const login = await agent.post('/api/auth/login').send({username:'tester',password}).expect(200);
      expect(login.body.user.permissions).toHaveLength(20);
      expect((await queryOne("SELECT last_login_at FROM users WHERE id='tester'"))?.last_login_at).toBeTruthy();
      await agent.get('/api/auth/me').expect(200);
      await agent.patch('/api/users/tester').send({status:'DISABLED'}).expect(400);
      const site = (await agent.post('/api/sites').send({code:'TEST',name:'MixedCase Site'}).expect(201)).body.siteId;
      await agent.patch('/api/sites/'+site).send({description:'Searchable'}).expect(200);
      const device = (await agent.post('/api/devices').send({device_name:'MixedCase Router',device_type_id:'type',site_id:site,management_ip:'192.0.2.1',vendor:'TestVendor'}).expect(201)).body.deviceId;
      await agent.patch('/api/devices/'+device).send({model:'TestModel',ssh_port:2222}).expect(200);
      const credential = (await agent.post('/api/credentials/device/'+device).send({credential_name:'SSH Admin',username:'root',password:'FixtureSecret?',protocol:'SSH',privilege_level:'ADMIN'}).expect(201)).body.credentialId;
      await agent.patch('/api/credentials/'+credential).send({description:'Fixture',rotation_interval_days:30}).expect(200);
      await agent.post('/api/credentials/'+credential+'/change-password').send({newPassword:'RotatedFixture?'}).expect(200);
      await agent.post('/api/credentials/'+credential+'/reveal').expect(401);
      await agent.post('/api/credentials/'+credential+'/reveal').set('x-reauth-password','wrong').expect(401);
      const reveal = await agent.post('/api/credentials/'+credential+'/reveal').set('x-reauth-password',password).expect(200);
      expect(reveal.body.password).toBe('RotatedFixture?');
      await agent.post('/api/credentials/'+credential+'/copy-access').expect(200);
      for (const filter of [{},{search:'mixedcase'},{siteId:site},{typeId:'type',status:'ACTIVE'},{vendor:'testvendor',search:'router',siteId:site,typeId:'type',status:'ACTIVE'}]) {
        const result = await agent.get('/api/devices').query({...filter,limit:1,page:1}).expect(200);
        expect(result.body.pagination.total).toBe(1);
        expect(result.body.devices[0].credential_count).toBe(1);
      }
      expect((await agent.get('/api/devices').query({page:2,limit:1}).expect(200)).body.devices).toEqual([]);
      for (const filter of [{},{search:'ssh'},{siteId:site,deviceTypeId:'type',protocol:'SSH',privilege:'ADMIN',status:'ACTIVE',search:'root'}]) {
        const result = await agent.get('/api/credentials').query(filter).expect(200);
        expect(result.body.pagination.total).toBe(1);
        expect(JSON.stringify(result.body)).not.toContain('encrypted_password');
      }
      for (const url of ['/api/devices/'+device,'/api/devices/types','/api/sites/'+site,'/api/credentials/device/'+device,'/api/roles','/api/roles/permissions','/api/settings']) await agent.get(url).expect(200);
      expect((await agent.get('/api/sites').query({search:'mixedcase',status:'ACTIVE'}).expect(200)).body.sites).toHaveLength(1);
      const summary = (await agent.get('/api/dashboard/summary').expect(200)).body;
      expect(summary.stats.totalDevices).toBe(1);
      expect(summary.devicesByType[0].count).toBe(1);
      const role = (await agent.post('/api/roles').send({name:'Custom',permissionCodes:['devices.view']}).expect(201)).body.roleId;
      await agent.patch('/api/roles/'+role).send({permissionCodes:['sites.view']}).expect(200);
      const user = (await agent.post('/api/users').send({first_name:'Viewer',last_name:'Test',username:'viewer',email:'viewer@example.invalid',password,role_id:role}).expect(201)).body.userId;
      await agent.patch('/api/users/'+user).send({role_id:'viewer-role'}).expect(200);
      await agent.post('/api/users/'+user+'/reset-password').send({newPassword:password}).expect(200);
      const listed = await agent.get('/api/users').query({search:'viewer',roleId:'viewer-role',status:'ACTIVE'}).expect(200);
      expect(listed.body.users).toHaveLength(1);
      expect(listed.body.users[0].roles[0].name).toBe('Viewer');
      await agent.patch('/api/settings').send({app_name:'Test App'}).expect(200);
      for (const filter of [{},{search:'credential'},{userId:'tester',action:'CREDENTIAL_REVEALED',resourceType:'CREDENTIAL',deviceId:device,startDate:now.slice(0,10),endDate:now.slice(0,10),search:'tester'}]) {
        const logs = await agent.get('/api/audit-logs').query({...filter,limit:1}).expect(200);
        expect(logs.body.pagination.total).toBeGreaterThan(0);
        expect(typeof logs.body.pagination.total).toBe('number');
      }
      // A constraint failure midway through permission replacement must roll back.
      await agent.patch('/api/roles/'+role).send({permissionCodes:['devices.view','devices.view']}).expect(500);
      expect(await queryOne('SELECT permission_id FROM role_permissions WHERE role_id=$1',[role])).toEqual({permission_id:'sites.view'});
      await agent.post('/api/credentials/'+credential+'/disable').expect(200);
      await agent.post('/api/devices/'+device+'/deactivate').expect(200);
      await agent.post('/api/auth/change-password').send({currentPassword:password,newPassword:password+'2'}).expect(200);
      await agent.post('/api/auth/logout').expect(200);
      await agent.post('/api/auth/login').send({username:'viewer',password}).expect(200);
      await agent.get('/api/devices').expect(403);
      // Async middleware failures must reach Express error handling.
      await execute('ALTER TABLE pg_temp.users RENAME TO hidden_users');
      await execute('CREATE TEMP TABLE users (unrelated text) ON COMMIT DROP');
      await agent.get('/api/auth/me').expect(500);
    } finally {
      await new Promise<void>((resolve,reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
});
