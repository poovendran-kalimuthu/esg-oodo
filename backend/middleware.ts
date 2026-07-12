import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type RoleName = 'ADMIN' | 'COMPLIANCE_OFFICER' | 'AUDITOR' | 'DEPARTMENT_HEAD' | 'EMPLOYEE';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: RoleName;
    departmentId: string | null;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-jwt-esg-governance-module';

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication token missing or invalid' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      departmentId: decoded.departmentId,
    };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token' });
  }
};

export const authorize = (allowedRoles: RoleName[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user.role}' is not authorized to access this resource`
      });
    }

    next();
  };
};

const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (limit: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown-ip';
    const now = Date.now();
    
    const record = ipRequestCounts.get(ip);
    
    if (!record) {
      ipRequestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (now > record.resetTime) {
      ipRequestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    record.count += 1;
    if (record.count > limit) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests from this IP, please try again later.'
      });
    }
    
    next();
  };
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error Interceptor]:', err);

  if (err.code === 'P2002') {
    const fields = err.meta?.target || [];
    return res.status(400).json({
      success: false,
      message: `Unique constraint check failed. Record with value already exists. Fields: ${fields.join(', ')}`
    });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      message: 'Foreign key lookup constraint failed. Checked associated IDs do not exist.'
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message
  });
};
