import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { getDatabase, isDemoMode, getMockService } from '../config/database';
import { User, UserRole, ApiResponse, AuthToken } from '../types';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().min(2).required(),
  lastName: Joi.string().min(2).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Register
router.post('/register', asyncHandler(async (req, res: express.Response<ApiResponse<{ user: Omit<User, 'password'>; token: string }>>) => {
  const { error, value } = registerSchema.validate(req.body);
  
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { email, password, firstName, lastName } = value;

  if (isDemoMode()) {
    // Demo mode - use mock service
    const mockService = getMockService();
    
    // Check if user already exists
    const existingUser = await mockService.findUserByEmail(email);
    if (existingUser) {
      throw createError('User already exists with this email', 409);
    }

    // Hash password
    const hashedPassword = await mockService.hashPassword(password);

    // Create user
    const user: User = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: UserRole.USER,
      isApproved: false, // Default to false, needs approval
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const createdUser = await mockService.createUser(user);
    const token = mockService.generateToken(createdUser);

    const { password: _, ...userWithoutPassword } = createdUser;
    
    res.status(201).json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      },
      message: 'User registered successfully (DEMO MODE)'
    });
    return;
  }

  // Database mode - original logic
  const db = getDatabase();

  // Check if user already exists
  const { resources: existingUsers } = await db.containers.users.items
    .query({
      query: 'SELECT * FROM c WHERE c.email = @email',
      parameters: [{ name: '@email', value: email }]
    })
    .fetchAll();

  if (existingUsers.length > 0) {
    throw createError('User already exists with this email', 409);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user: User = {
    id: uuidv4(),
    email,
    password: hashedPassword,
    firstName,
    lastName,
    role: UserRole.USER,
    isApproved: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await db.containers.users.items.create(user);

  // Generate token
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw createError('JWT secret not configured', 500);
  }

  const tokenPayload: AuthToken = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '7d' });

  const { password: _, ...userWithoutPassword } = user;
  
  res.status(201).json({
    success: true,
    data: {
      user: userWithoutPassword,
      token
    },
    message: 'User registered successfully'
  });
}));

// Login
router.post('/login', asyncHandler(async (req, res: express.Response<ApiResponse<{ user: Omit<User, 'password'>; token: string }>>) => {
  const { error, value } = loginSchema.validate(req.body);
  
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { email, password } = value;

  if (isDemoMode()) {
    // Demo mode - use mock service
    const mockService = getMockService();
    
    // Find user
    const user = await mockService.findUserByEmail(email);
    if (!user) {
      throw createError('Invalid credentials', 401);
    }

    // Check password
    const isValidPassword = await mockService.comparePassword(password, user.password);
    if (!isValidPassword) {
      throw createError('Invalid credentials', 401);
    }

    // Generate token
    const token = mockService.generateToken(user);

    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      },
      message: 'Login successful (DEMO MODE)'
    });
    return;
  }

  // Database mode - original logic
  const db = getDatabase();

  // Find user
  const { resources: users } = await db.containers.users.items
    .query({
      query: 'SELECT * FROM c WHERE c.email = @email AND c.isApproved = true',
      parameters: [{ name: '@email', value: email }]
    })
    .fetchAll();

  if (users.length === 0) {
    throw createError('Invalid credentials', 401);
  }

  const user = users[0] as User;

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw createError('Invalid credentials', 401);
  }

  // Generate token
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw createError('JWT secret not configured', 500);
  }

  const tokenPayload: AuthToken = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '7d' });

  const { password: _, ...userWithoutPassword } = user;
  
  res.json({
    success: true,
    data: {
      user: userWithoutPassword,
      token
    },
    message: 'Login successful'
  });
}));

// Get current user
router.get('/me', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: express.Response<ApiResponse<Omit<User, 'password'>>>) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw createError('User not found', 404);
  }

  if (isDemoMode()) {
    // Demo mode - use mock service
    const mockService = getMockService();
    const user = await mockService.findUserById(userId);
    
    if (!user) {
      throw createError('User not found', 404);
    }

    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: userWithoutPassword
    });
    return;
  }

  // Database mode - original logic
  const db = getDatabase();
  const { resource: user } = await db.containers.users.item(userId, userId).read();
  
  if (!user || !user.isApproved) {
    throw createError('User not found', 404);
  }

  const { password: _, ...userWithoutPassword } = user;
  
  res.json({
    success: true,
    data: userWithoutPassword
  });
}));

export default router;