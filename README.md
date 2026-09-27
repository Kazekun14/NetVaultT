# NetVaultT – Secure Network Device Credential Manager

**NetVaultT** is an internal **network device credential management system** intended for securely storing, revealing, copying, auditing, and managing access credentials for network infrastructure such as routers, MikroTik devices, OLTs, ONUs/ONTs, managed switches, firewalls, servers, NAS, access points, IPTV servers, monitoring servers, and related equipment.

---

## Key Features

* **Authenticated AES-256-GCM Credential Encryption**: All device passwords are encrypted server-side with unique 96-bit random IVs and 128-bit authentication tags before saving to database. Master key comes strictly from environment variable `NETVAULT_MASTER_KEY` and is never written to DB or sent to frontend.
* **Role-Based Access Control (RBAC)**: Support for `Super Administrator`, `Network Administrator`, `Network Engineer`, and `Viewer` roles with granular permission checks enforced on backend endpoints.
* **Secure Reveal & Copy Workflows**: Decrypts passwords on server-side only for authorized users, with optional re-authentication prompts and automatic 20-second auto-hide timers.
* **Immutable Audit Logging**: Immutable audit logs capturing all security events (login success/failure, logout, credential reveals, copies, password changes, device creation/updates, deactivations). Decrypted credentials and secrets are NEVER logged.
* **Password Rotation Policy Tracking**: Automatic tracking of password age, rotation intervals, due dates, and real-time rotation status (`CURRENT`, `DUE_SOON`, `OVERDUE`).
* **Responsive Infrastructure Dashboard**: Real-time statistics, device type breakdowns, rotation alerts, recent activity, and searchable inventory.

---

## Technical Architecture

* **Frontend**: React 19, TypeScript, Vite, React Router v7, Tailwind CSS, Lucide Icons, React Hook Form, Zod.
* **Backend**: Node.js, Express.js, TypeScript, Express Session, Helmet, Rate Limiter.
* **Database**: PostgreSQL 17 via the `pg` connection pool. IDs and timestamps remain TEXT; system-role flags remain INTEGER.
* **Security & Auth**: AES-256-GCM authenticated encryption, bcrypt password hashing, HTTP-only secure session cookies, granular permission middleware, rate limiting.

---

## Prerequisites

* **Node.js**: v18.0.0 or higher (v22+ recommended)
* **npm**: v9.0.0 or higher
* **PostgreSQL 17**: an existing database and a role permitted to use its `public` schema.

---

## Installation & Setup

1. **Clone Repository & Install Dependencies**:
   ```bash
   git clone <repository_url>
   cd NetVaultT
   npm install
   ```

2. **Environment Configuration**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Configure `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and `DB_POOL_SIZE` (see `.env.example`). The runtime ignores legacy `DATABASE_PATH`. Keep `.env` private.

   For an existing installation, preserve `NETVAULT_MASTER_KEY` and `SESSION_SECRET` exactly. Generate keys only for a new installation.

   Ensure `NETVAULT_MASTER_KEY` is a 64-character hex string (32 cryptographically secure random bytes).
   Generate one via CLI:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Database Migration & Seeding**:
   Apply safe `CREATE TABLE/INDEX IF NOT EXISTS` statements to the existing database:
   ```bash
   npm run db:migrate
   ```
   This does not migrate SQLite data, replace tables, or redesign columns. To add missing default roles, permissions, sites, sample devices, and settings, run:
   ```bash
   npm run db:seed
   ```

   Startup awaits schema initialization and the same transactional, insert-if-missing seed before listening. Existing password hashes, IDs, and encrypted credentials are preserved.

4. **Create Initial Administrator (Optional CLI Setup)**:
   ```bash
   npm run create-admin
   ```

---

## Development

Start both Express backend server and Vite frontend dev server concurrently:
```bash
nvm use
npm run dev
```
The `.nvmrc` pins Node.js to 22.23.2. Run `nvm install` first if that version is missing.

This starts both servers and stops the frontend if the backend exits. `npm run dev:all` is an alias. Use `npm run dev:client` only when the backend is already running separately.

* **Frontend Application**: `http://localhost:5173` (Vite with API proxy)
* **API Endpoints**: `http://localhost:5000/api`

If login reports `Server returned invalid response (500)`, check the backend terminal for a startup failure. Verify PostgreSQL is reachable and the `DB_*` configuration is correct, then restart `npm run dev`.

### Default Login Credentials (Development Seed Only)
* **Username**: `admin`
* **Password**: `Admin123!NetVaultT`
*(Force password change on first login recommended)*

---

## Running Tests

Execute unit and integration tests (PostgreSQL must be reachable using `DB_*`). Integration fixtures use transaction-local temporary tables and roll back; they do not write to migrated application tables:
```bash
npm run test
```

---

## Production Build & Run

1. **Build Frontend & Compile TypeScript**:
   ```bash
   npm run build
   ```

2. **Start Production Server**:
   ```bash
   npm run server
   ```

---

## Security & Backup Recommendations

### Master Key Backup
> [!CAUTION]
> The database backup contains AES-256-GCM encrypted ciphertext. Restoring the database backup without the `NETVAULT_MASTER_KEY` environment variable will render all device credentials unrecoverable.
> Store the master key separately in a protected vault or secret manager.

### Deployment Architecture
Deploy NetVaultT behind a reverse proxy (e.g. Nginx or Caddy) with TLS/HTTPS enabled:
```
Client Browser  ---> [HTTPS] ---> Reverse Proxy ---> NetVaultT App (:5000) ---> PostgreSQL
```
Restrict access using network firewalls so NetVaultT is accessible exclusively via internal LAN or management VPN.

### Retired SQLite Backend
The legacy SQLite files `netvault.db` and `netvault.db.backup` have been retired. PostgreSQL is the active database. The SQLite driver and its types have also been removed. Back up the active PostgreSQL database with PostgreSQL tooling and retain the original encryption key separately.
