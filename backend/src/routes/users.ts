import express from 'express';
import { getDatabase } from '../config/database';
import { User, UserRole, ApiResponse } from '../types';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, asyncHandler(async (req, res: express.Response<ApiResponse<User[]>>) => {
  const db = getDatabase();
  
  const { resources: users } = await db.containers.users.items
    .query('SELECT * FROM c WHERE c.isActive = true ORDER BY c.createdAt DESC')
    .fetchAll();

  const usersWithoutPassword = users.map(user => {
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });

  res.json({
    success: true,
    data: usersWithoutPassword
  });
}));

// Update user role (admin only)
router.patch('/:userId/role', authenticateToken, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: express.Response<ApiResponse<User>>) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!Object.values(UserRole).includes(role)) {
    throw createError('Invalid role', 400);
  }

  const db = getDatabase();
  
  const { resource: user } = await db.containers.users.item(userId, userId).read();
  if (!user || !user.isActive) {
    throw createError('User not found', 404);
  }

  user.role = role;
  user.updatedAt = new Date();

  const { resource: updatedUser } = await db.containers.users.item(userId, userId).replace(user);
  
  const { password: _, ...userWithoutPassword } = updatedUser;

  res.json({
    success: true,
    data: userWithoutPassword,
    message: 'User role updated successfully'
  });
}));

// Deactivate user (admin only)
router.delete('/:userId', authenticateToken, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: express.Response<ApiResponse<null>>) => {
  const { userId } = req.params;
  const db = getDatabase();
  
  const { resource: user } = await db.containers.users.item(userId, userId).read();
  if (!user) {
    throw createError('User not found', 404);
  }

  user.isActive = false;
  user.updatedAt = new Date();

  await db.containers.users.item(userId, userId).replace(user);

  res.json({
    success: true,
    message: 'User deactivated successfully'
  });
}));

// Get user profile
router.get('/:userId', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: express.Response<ApiResponse<Omit<User, 'password'>>>) => {
  const { userId } = req.params;
  const currentUser = req.user!;

  // Users can only view their own profile unless they're admin
  if (currentUser.userId !== userId && currentUser.role !== UserRole.ADMIN) {
    throw createError('Access denied', 403);
  }

  const db = getDatabase();
  
  const { resource: user } = await db.containers.users.item(userId, userId).read();
  if (!user || !user.isActive) {
    throw createError('User not found', 404);
  }

  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    data: userWithoutPassword
  });
}));

// Update user profile
router.patch('/:userId', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: express.Response<ApiResponse<Omit<User, 'password'>>>) => {
  const { userId } = req.params;
  const currentUser = req.user!;
  const { firstName, lastName, profileImage } = req.body;

  // Users can only update their own profile unless they're admin
  if (currentUser.userId !== userId && currentUser.role !== UserRole.ADMIN) {
    throw createError('Access denied', 403);
  }

  const db = getDatabase();
  
  const { resource: user } = await db.containers.users.item(userId, userId).read();
  if (!user || !user.isActive) {
    throw createError('User not found', 404);
  }

  // Update allowed fields
  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (profileImage !== undefined) user.profileImage = profileImage;
  user.updatedAt = new Date();

  const { resource: updatedUser } = await db.containers.users.item(userId, userId).replace(user);
  
  const { password: _, ...userWithoutPassword } = updatedUser;

  res.json({
    success: true,
    data: userWithoutPassword,
    message: 'Profile updated successfully'
  });
}));

export default router;