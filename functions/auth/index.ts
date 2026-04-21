import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as bcrypt from 'bcryptjs';
import * as Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { usersContainer } from '../shared/cosmos';
import { handleCorsPreFlight, setCorsHeaders } from '../shared/cors';
import { verifyToken, signToken, AuthError } from '../shared/auth';

// Validation schemas
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

export async function authFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Auth function processed request for url "${request.url}"`);

    // Handle CORS preflight
    const corsResponse = handleCorsPreFlight(request);
    if (corsResponse) return corsResponse;

    const response: HttpResponseInit = {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    };

    try {
        const action = request.params.action || 'login';

        switch (action) {
            case 'login':
                if (request.method !== 'POST') {
                    response.status = 405;
                    response.body = JSON.stringify({ success: false, message: 'Method not allowed' });
                    break;
                }
                return await handleLogin(request, response);
            
            case 'register':
                if (request.method !== 'POST') {
                    response.status = 405;
                    response.body = JSON.stringify({ success: false, message: 'Method not allowed' });
                    break;
                }
                return await handleRegister(request, response);
            
            case 'me':
                if (request.method !== 'GET') {
                    response.status = 405;
                    response.body = JSON.stringify({ success: false, message: 'Method not allowed' });
                    break;
                }
                return await handleGetMe(request, response);
            
            default:
                response.status = 404;
                response.body = JSON.stringify({ success: false, message: 'Action not found' });
        }

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        context.error('Auth function error:', error);
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Internal server error' });
        setCorsHeaders(request, response);
        return response;
    }
}

async function handleLogin(request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        const body = await request.json() as any;
        
        // Validate input
        const { error } = loginSchema.validate(body);
        if (error) {
            response.status = 400;
            response.body = JSON.stringify({ 
                success: false, 
                message: error.details[0].message 
            });
            setCorsHeaders(request, response);
            return response;
        }

        const { email, password } = body;

        // Query user by email (include isApproved check)
        const { resources: users } = await usersContainer.items
            .query({
                query: 'SELECT * FROM c WHERE c.email = @email AND c.isApproved = true',
                parameters: [{ name: '@email', value: email }]
            })
            .fetchAll();

        if (users.length === 0) {
            response.status = 401;
            response.body = JSON.stringify({ success: false, message: 'Invalid credentials' });
            setCorsHeaders(request, response);
            return response;
        }

        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            response.status = 401;
            response.body = JSON.stringify({ success: false, message: 'Invalid credentials' });
            setCorsHeaders(request, response);
            return response;
        }

        // Create JWT token
        const token = signToken({
            userId: user.id,
            email: user.email,
            role: user.role
        });

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: {
                user: userWithoutPassword,
                token
            }
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Login failed' });
        setCorsHeaders(request, response);
        return response;
    }
}

async function handleRegister(request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        const body = await request.json() as any;
        
        // Validate input
        const { error } = registerSchema.validate(body);
        if (error) {
            response.status = 400;
            response.body = JSON.stringify({ 
                success: false, 
                message: error.details[0].message 
            });
            setCorsHeaders(request, response);
            return response;
        }

        const { email, password, firstName, lastName } = body;

        // Check if user already exists
        const { resources: existingUsers } = await usersContainer.items
            .query({
                query: 'SELECT * FROM c WHERE c.email = @email',
                parameters: [{ name: '@email', value: email }]
            })
            .fetchAll();

        if (existingUsers.length > 0) {
            response.status = 400;
            response.body = JSON.stringify({ success: false, message: 'User already exists' });
            setCorsHeaders(request, response);
            return response;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new user (with isApproved: false by default)
        const newUser = {
            id: uuidv4(),
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role: 'user' as const,
            isActive: true,
            isApproved: false, // Requires approval
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await usersContainer.items.create(newUser);

        // Create JWT token
        const token = signToken({
            userId: newUser.id,
            email: newUser.email,
            role: newUser.role
        });

        // Remove password from response
        const { password: _, ...userWithoutPassword } = newUser;

        response.status = 201;
        response.body = JSON.stringify({
            success: true,
            data: {
                user: userWithoutPassword,
                token
            },
            message: 'User registered successfully. Account pending approval.'
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Registration failed' });
        setCorsHeaders(request, response);
        return response;
    }
}

async function handleGetMe(request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        // Verify JWT token
        const user = verifyToken(request);

        // Get user from database
        const { resource: userDoc } = await usersContainer.item(user.userId, user.email).read();

        if (!userDoc) {
            response.status = 404;
            response.body = JSON.stringify({ success: false, message: 'User not found' });
            setCorsHeaders(request, response);
            return response;
        }

        // Remove password from response
        const { password, ...userWithoutPassword } = userDoc;

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
            response.body = JSON.stringify({ success: false, message: 'Failed to get user data' });
        }
        setCorsHeaders(request, response);
        return response;
    }
}

app.http('auth', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'auth/{action?}',
    handler: authFunction,
});