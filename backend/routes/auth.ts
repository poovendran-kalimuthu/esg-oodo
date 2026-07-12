import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { RoleName, authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-jwt-esg-governance-module';

const generateToken = (user: any) => {
  const roleName = user.role?.name || user.role;
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: roleName,
      departmentId: user.departmentId,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { department: true, role: true }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user);

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        details: `User logged in from IP ${req.ip}`,
        ipAddress: req.ip || '127.0.0.1',
      }
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        department: user.department ? user.department.name : null,
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { department: true, role: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        department: user.department ? user.department.name : null,
        departmentId: user.departmentId
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/switch-role', async (req: Request, res: Response, next: NextFunction) => {
  const { role } = req.body;

  try {
    const validRoles: RoleName[] = ['ADMIN', 'COMPLIANCE_OFFICER', 'AUDITOR', 'DEPARTMENT_HEAD', 'EMPLOYEE'];
    if (!validRoles.includes(role as RoleName)) {
      return res.status(400).json({ success: false, message: 'Invalid role provided' });
    }

    let user = await prisma.user.findFirst({
      where: { role: { name: role } },
      include: { department: true, role: true }
    });

    if (!user) {
      const passwordHash = await bcrypt.hash('password123', 10);
      const email = `${role.toLowerCase().replace('_', '')}@greenledger.com`;
      const name = `Demo ${role.charAt(0) + role.slice(1).toLowerCase().replace('_', ' ')}`;

      let dept = await prisma.department.findFirst();
      if (!dept) {
        dept = await prisma.department.create({ data: { name: 'EHS & Compliance' } });
      }

      let roleRecord = await prisma.role.findUnique({ where: { name: role } });
      if (!roleRecord) {
        roleRecord = await prisma.role.create({ data: { name: role } });
      }

      user = await prisma.user.create({
        data: {
          email,
          name,
          roleId: roleRecord.id,
          passwordHash,
          departmentId: dept.id,
        },
        include: { department: true, role: true }
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        department: user.department ? user.department.name : null,
        departmentId: user.departmentId
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
