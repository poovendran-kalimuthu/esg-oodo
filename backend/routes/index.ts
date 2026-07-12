import { Router } from 'express';
import authRouter from '../modules/auth/auth.controller.js';
import policyRouter from '../modules/policies/policy.controller.js';
import auditRouter from '../modules/audits/audit.controller.js';
import findingsRouter from '../modules/compliance/findings.controller.js';
import dashboardRouter from '../modules/dashboard/dashboard.controller.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/policies', policyRouter);
router.use('/audits', auditRouter);
router.use('/findings', findingsRouter);
router.use('/dashboard', dashboardRouter);

export default router;
