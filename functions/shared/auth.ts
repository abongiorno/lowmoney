import { HttpRequest } from '@azure/functions';
import * as jwt from 'jsonwebtoken';

export interface AuthToken {
  userId: string;
  email: string;
  role: 'user' | 'approver' | 'admin';
}

export class AuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Extract and verify JWT token from Authorization header
 */
export function verifyToken(request: HttpRequest): AuthToken {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new AuthError('JWT_SECRET not configured', 500);
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Authorization header missing or invalid');
  }

  const token = authHeader.substring(7); // Remove 'Bearer '
  
  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthToken;
    return decoded;
  } catch (error) {
    throw new AuthError('Invalid or expired token');
  }
}

/**
 * Check if user has required role
 */
export function requireRole(user: AuthToken, ...allowedRoles: string[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw new AuthError(`Access denied. Required role: ${allowedRoles.join(' or ')}`, 403);
  }
}

/**
 * Check if user is approver or admin
 */
export function requireApprover(user: AuthToken): void {
  requireRole(user, 'approver', 'admin');
}

/**
 * Check if user is admin
 */
export function requireAdmin(user: AuthToken): void {
  requireRole(user, 'admin');
}

/**
 * Sign JWT token
 */
export function signToken(payload: Omit<AuthToken, 'iat' | 'exp'>): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new AuthError('JWT_SECRET not configured', 500);
  }

  return jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
}