import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as Joi from 'joi';
import { usersContainer } from '../shared/cosmos';
import { handleCorsPreFlight, setCorsHeaders } from '../shared/cors';
import { verifyToken, requireAdmin, AuthError } from '../shared/auth';

// User roles enum
enum UserRole {
  USER = 'user',
  APPROVER = 'approver', 
  ADMIN = 'admin'
}

// Validation schemas
const updateUserSchema = Joi.object({
  firstName: Joi.string().min(2).optional(),
  lastName: Joi.string().min(2).optional(),
  isActive: Joi.boolean().optional(),
  isApproved: Joi.boolean().optional(),
  profileImage: Joi.string().uri().optional()
});

const roleChangeSchema = Joi.object({
  role: Joi.string().valid('user', 'approver', 'admin').required()
});

export async function usersFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Users function processed request for url "${request.url}"`);

    const corsResponse = handleCorsPreFlight(request);
    if (corsResponse) return corsResponse;

    const response: HttpResponseInit = {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    };

    try {
        if (request.method === 'GET') {
            return await getAllUsers(request, response);
        } else {
            response.status = 405;
            response.body = JSON.stringify({ success: false, message: 'Method not allowed' });
            setCorsHeaders(request, response);
            return response;
        }
    } catch (error) {
        context.error('Users function error:', error);
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Internal server error' });
        setCorsHeaders(request, response);
        return response;
    }
}

// User by ID - separate function for proper routing
export async function userByIdFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`User by ID function processed request for url "${request.url}"`);

    const corsResponse = handleCorsPreFlight(request);
    if (corsResponse) return corsResponse;

    const response: HttpResponseInit = {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    };

    try {
        const userId = request.params.id;
        
        if (request.method === 'GET') {
            return await getUserById(userId!, request, response);
        } else if (request.method === 'PATCH') {
            return await updateUser(userId!, request, response);
        } else if (request.method === 'DELETE') {
            return await deactivateUser(userId!, request, response);
        } else {
            response.status = 405;
            response.body = JSON.stringify({ success: false, message: 'Method not allowed' });
            setCorsHeaders(request, response);
            return response;
        }
    } catch (error) {
        context.error('User by ID function error:', error);
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Internal server error' });
        setCorsHeaders(request, response);
        return response;
    }
}

// User role change - separate function for proper routing
export async function userRoleFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`User role function processed request for url "${request.url}"`);

    const corsResponse = handleCorsPreFlight(request);
    if (corsResponse) return corsResponse;

    const response: HttpResponseInit = {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    };

    try {
        if (request.method === 'PATCH') {
            const userId = request.params.id;
            return await changeUserRole(userId!, request, response);
        } else {
            response.status = 405;
            response.body = JSON.stringify({ success: false, message: 'Method not allowed' });
            setCorsHeaders(request, response);
            return response;
        }
    } catch (error) {
        context.error('User role function error:', error);
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Internal server error' });
        setCorsHeaders(request, response);
        return response;
    }
}

async function getAllUsers(request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        // Require admin role
        const user = verifyToken(request);
        requireAdmin(user);

        const page = parseInt(request.query.get('page') || '1');
        const limit = parseInt(request.query.get('limit') || '20');
        const search = request.query.get('search');
        const role = request.query.get('role');
        const isActive = request.query.get('isActive');

        let query = 'SELECT * FROM c WHERE 1=1';
        const parameters: any[] = [];

        // Apply search filter
        if (search) {
            query += ' AND (CONTAINS(LOWER(c.firstName), @search) OR CONTAINS(LOWER(c.lastName), @search) OR CONTAINS(LOWER(c.email), @search))';
            parameters.push({ name: '@search', value: search.toLowerCase() });
        }

        // Apply role filter
        if (role) {
            query += ' AND c.role = @role';
            parameters.push({ name: '@role', value: role });
        }

        // Apply isActive filter
        if (isActive !== null) {
            query += ' AND c.isActive = @isActive';
            parameters.push({ name: '@isActive', value: isActive === 'true' });
        }

        // Add ordering
        query += ' ORDER BY c.createdAt DESC';

        // Apply pagination
        const offset = (page - 1) * limit;
        query += ` OFFSET ${offset} LIMIT ${limit}`;

        const { resources: users } = await usersContainer.items
            .query({ query, parameters })
            .fetchAll();

        // Remove sensitive data (password) from response
        const sanitizedUsers = users.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: sanitizedUsers,
            pagination: {
                page,
                limit,
                total: sanitizedUsers.length
            }
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        if (error instanceof AuthError) {
            response.status = error.statusCode;
            response.body = JSON.stringify({ success: false, message: error.message });
        } else {
            response.status = 500;
            response.body = JSON.stringify({ success: false, message: 'Failed to fetch users' });
        }
        setCorsHeaders(request, response);
        return response;
    }
}

async function getUserById(userId: string, request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        // Require admin role
        const user = verifyToken(request);
        requireAdmin(user);

        const { resource: foundUser } = await usersContainer.item(userId, userId).read();

        if (!foundUser) {
            response.status = 404;
            response.body = JSON.stringify({ success: false, message: 'User not found' });
            setCorsHeaders(request, response);
            return response;
        }

        // Remove sensitive data (password) from response
        const { password, ...userWithoutPassword } = foundUser;

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: userWithoutPassword
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        if (error instanceof AuthError) {
            response.status = error.statusCode;
            response.body = JSON.stringify({ success: false, message: error.message });
        } else {
            response.status = 500;
            response.body = JSON.stringify({ success: false, message: 'Failed to fetch user' });
        }
        setCorsHeaders(request, response);
        return response;
    }
}

async function updateUser(userId: string, request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        // Require admin role
        const admin = verifyToken(request);
        requireAdmin(admin);

        const body = await request.json() as any;
        
        // Validate input
        const { error } = updateUserSchema.validate(body);
        if (error) {
            response.status = 400;
            response.body = JSON.stringify({ 
                success: false, 
                message: error.details[0].message 
            });
            setCorsHeaders(request, response);
            return response;
        }

        // Get existing user
        const { resource: user } = await usersContainer.item(userId, userId).read();

        if (!user) {
            response.status = 404;
            response.body = JSON.stringify({ success: false, message: 'User not found' });
            setCorsHeaders(request, response);
            return response;
        }

        // Prevent admin from deactivating themselves
        if (admin.userId === userId && body.isActive === false) {
            response.status = 400;
            response.body = JSON.stringify({ 
                success: false, 
                message: 'Cannot deactivate your own account' 
            });
            setCorsHeaders(request, response);
            return response;
        }

        // Update user fields
        const { firstName, lastName, isActive, isApproved, profileImage } = body;
        const updatedUser = {
            ...user,
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(isActive !== undefined && { isActive }),
            ...(isApproved !== undefined && { isApproved }),
            ...(profileImage !== undefined && { profileImage }),
            updatedAt: new Date()
        };

        const { resource: result } = await usersContainer.item(userId, userId).replace(updatedUser);

        // Remove sensitive data (password) from response
        const { password, ...userWithoutPassword } = result;

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: userWithoutPassword,
            message: 'User updated successfully'
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        if (error instanceof AuthError) {
            response.status = error.statusCode;
            response.body = JSON.stringify({ success: false, message: error.message });
        } else {
            response.status = 500;
            response.body = JSON.stringify({ success: false, message: 'Failed to update user' });
        }
        setCorsHeaders(request, response);
        return response;
    }
}

async function deactivateUser(userId: string, request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        // Require admin role
        const admin = verifyToken(request);
        requireAdmin(admin);

        // Prevent admin from deactivating themselves
        if (admin.userId === userId) {
            response.status = 400;
            response.body = JSON.stringify({ 
                success: false, 
                message: 'Cannot deactivate your own account' 
            });
            setCorsHeaders(request, response);
            return response;
        }

        // Get existing user
        const { resource: user } = await usersContainer.item(userId, userId).read();

        if (!user) {
            response.status = 404;
            response.body = JSON.stringify({ success: false, message: 'User not found' });
            setCorsHeaders(request, response);
            return response;
        }

        // Deactivate user
        const deactivatedUser = {
            ...user,
            isActive: false,
            updatedAt: new Date()
        };

        const { resource: result } = await usersContainer.item(userId, userId).replace(deactivatedUser);

        // Remove sensitive data (password) from response
        const { password, ...userWithoutPassword } = result;

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: userWithoutPassword,
            message: 'User deactivated successfully'
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        if (error instanceof AuthError) {
            response.status = error.statusCode;
            response.body = JSON.stringify({ success: false, message: error.message });
        } else {
            response.status = 500;
            response.body = JSON.stringify({ success: false, message: 'Failed to deactivate user' });
        }
        setCorsHeaders(request, response);
        return response;
    }
}

async function changeUserRole(userId: string, request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        // Require admin role
        const admin = verifyToken(request);
        requireAdmin(admin);

        const body = await request.json() as any;
        
        // Validate input
        const { error } = roleChangeSchema.validate(body);
        if (error) {
            response.status = 400;
            response.body = JSON.stringify({ 
                success: false, 
                message: error.details[0].message 
            });
            setCorsHeaders(request, response);
            return response;
        }

        // Prevent admin from changing their own role
        if (admin.userId === userId) {
            response.status = 400;
            response.body = JSON.stringify({ 
                success: false, 
                message: 'Cannot change your own role' 
            });
            setCorsHeaders(request, response);
            return response;
        }

        // Get existing user
        const { resource: user } = await usersContainer.item(userId, userId).read();

        if (!user) {
            response.status = 404;
            response.body = JSON.stringify({ success: false, message: 'User not found' });
            setCorsHeaders(request, response);
            return response;
        }

        // Update user role
        const updatedUser = {
            ...user,
            role: body.role,
            updatedAt: new Date()
        };

        const { resource: result } = await usersContainer.item(userId, userId).replace(updatedUser);

        // Remove sensitive data (password) from response
        const { password, ...userWithoutPassword } = result;

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: userWithoutPassword,
            message: `User role changed to ${body.role} successfully`
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        if (error instanceof AuthError) {
            response.status = error.statusCode;
            response.body = JSON.stringify({ success: false, message: error.message });
        } else {
            response.status = 500;
            response.body = JSON.stringify({ success: false, message: 'Failed to change user role' });
        }
        setCorsHeaders(request, response);
        return response;
    }
}

// Register multiple routes for different endpoints
app.http('users', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'users',
    handler: usersFunction,
});

app.http('users-by-id', {
    methods: ['GET', 'PATCH', 'DELETE', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'users/{id}',
    handler: userByIdFunction,
});

app.http('users-role', {
    methods: ['PATCH', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'users/{id}/role',
    handler: userRoleFunction,
});