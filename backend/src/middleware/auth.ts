import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthToken, UserRole } from '../types';
import { createError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: AuthToken;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(createError('Access token required', 401));
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return next(createError('JWT secret not configured', 500));
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthToken;
    req.user = decoded;
    next();
  } catch (error) {
    return next(createError('Invalid or expired token', 403));
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(createError('Insufficient permissions', 403));
    }

    next();
  };
};

export const requireApprover = authorize(UserRole.APPROVER, UserRole.ADMIN);
export const requireAdmin = authorize(UserRole.ADMIN);