import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import { getMasterKey } from './services/encryption.service.js';
import { databaseErrorCode } from './db/index.js';
import { seedDatabase } from './db/seed.js';

import authRoutes from './routes/auth.routes.js';
import devicesRoutes from './routes/devices.routes.js';
import credentialsRoutes from './routes/credentials.routes.js';
import sitesRoutes from './routes/sites.routes.js';
import usersRoutes from './routes/users.routes.js';
import rolesRoutes from './routes/roles.routes.js';
import auditRoutes from './routes/audit.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import settingsRoutes from './routes/settings.routes.js';

dotenv.config();

// 1. Startup Security Check: Master Key Validation
try {
  getMasterKey();
  console.log('✔ Master Encryption Key verified successfully.');
} catch (err: any) {
  console.error('CRITICAL STARTUP ERROR:', err.message);
  process.exit(1);
}

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.APP_URL || 'http://localhost:5000',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Server Session Config
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'netvaultt_default_fallback_session_secret_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    },
  })
);

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/credentials', credentialsRoutes);
app.use('/api/sites', sitesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);

// Serve Static Production Frontend Build if present
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global Centralized Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', databaseErrorCode(err));
  res.status(500).json({
    success: false,
    message: 'An internal server error occurred.',
  });
});

// Seed DB & Start Server
seedDatabase()
  .then(() => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 NetVaultT Server running on http://0.0.0.0:${PORT}`);
    });
    const shutdown = () => {
      server.close();
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  })
  .catch((err) => {
    console.error('Database startup initialization failed:', err);
    process.exit(1);
  });

export default app;
