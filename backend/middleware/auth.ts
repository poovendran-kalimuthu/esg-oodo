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
