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
* **Database**: SQLite / PostgreSQL compatible SQL schema (`better-sqlite3` driver).
* **Security & Auth**: AES-256-GCM authenticated encryption, bcrypt password hashing, HTTP-only secure session cookies, granular permission middleware, rate limiting.

---

## Prerequisites

* **Node.js**: v18.0.0 or higher (v22+ recommended)
* **npm**: v9.0.0 or higher

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

   Ensure `NETVAULT_MASTER_KEY` is a 64-character hex string (32 cryptographically secure random bytes).
   Generate one via CLI:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Database Migration & Seeding**:
   Run database schema creation and seed default roles, permissions, sites, initial sample devices, and system settings:
   ```bash
   npm run db:seed
   ```

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
The `.nvmrc` pins Node.js to 22.23.2. Run `nvm install` first if that version is missing. After switching Node versions, run `npm rebuild better-sqlite3` in the same terminal before starting the app.

This starts both servers and stops the frontend if the backend exits. `npm run dev:all` is an alias. Use `npm run dev:client` only when the backend is already running separately.

* **Frontend Application**: `http://localhost:5173` (Vite with API proxy)
* **API Endpoints**: `http://localhost:5000/api`

If login reports `Server returned invalid response (500)`, check the backend terminal for a startup failure. After changing Node.js versions, rebuild the native SQLite module with `npm rebuild better-sqlite3`, then restart `npm run dev`. Install dependencies and run the app with the same Node.js version.

### Default Login Credentials (Development Seed Only)
* **Username**: `admin`
* **Password**: `Admin123!NetVaultT`
*(Force password change on first login recommended)*

---

## Running Tests

Execute unit and integration test suite:
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
Client Browser  ---> [HTTPS] ---> Reverse Proxy ---> NetVaultT App (:5000) ---> SQLite/PostgreSQL
```
Restrict access using network firewalls so NetVaultT is accessible exclusively via internal LAN or management VPN.
