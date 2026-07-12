import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorHandler } from './middleware/error.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { authenticate } from './middleware/auth.js';
import prisma from './config/db.js';

import authRouter from './routes/auth.js';
import policyRouter from './routes/policies.js';
import auditRouter from './routes/audits.js';
import findingsRouter from './routes/findings.js';
import dashboardRouter from './routes/dashboard.js';
import environmentRouter from './routes/environment.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', rateLimiter(150, 60000));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/policies', policyRouter);
app.use('/api/v1/audits', auditRouter);
app.use('/api/v1/findings', findingsRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/environment', environmentRouter);

// Utility route to fetch departments (needed for forms)
app.get('/api/v1/departments', authenticate, async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, departments });
  } catch (err) {
    next(err);
  }
});

// Utility route to fetch users by role (needed for assignments)
app.get('/api/v1/users', authenticate, async (req, res, next) => {
  try {
    const { role } = req.query;
    const filter: any = {};
    if (role) {
      filter.role = { name: role as string };
    }
    const users = await prisma.user.findMany({
      where: filter,
      include: { role: true },
      orderBy: { name: 'asc' }
    });
    const formatted = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role.name,
      departmentId: u.departmentId
    }));
    res.json({ success: true, users: formatted });
  } catch (err) {
    next(err);
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'healthy', service: 'ESG Governance API', version: '1.0.0' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[Server] ESG Governance backend running on port ${PORT}`);
});

export default app;
