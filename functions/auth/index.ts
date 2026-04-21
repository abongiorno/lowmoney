import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

// Initialize Cosmos DB client
const cosmosClient = new CosmosClient(process.env.COSMOS_DB_CONNECTION!);
const database = cosmosClient.database(process.env.COSMOS_DB_DATABASE || 'lowmoney');
const usersContainer = database.container('users');

export async function authFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Auth function processed request for url "${request.url}"`);

    // Enable CORS
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGINS || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (request.method === 'OPTIONS') {
        return { status: 200, headers };
    }

    try {
        const action = request.params.action || 'login';
        const body = await request.json() as any;

        switch (action) {
            case 'login':
                return await handleLogin(body, headers);
            case 'register':
                return await handleRegister(body, headers);
            default:
                return {
                    status: 404,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Action not found' })
                };
        }
    } catch (error) {
        context.error('Auth function error:', error);
        return {
            status: 500,
            headers,
            body: JSON.stringify({ success: false, message: 'Internal server error' })
        };
    }
}

async function handleLogin(body: any, headers: any) {
    const { email, password } = body;

    if (!email || !password) {
        return {
            status: 400,
            headers,
            body: JSON.stringify({ success: false, message: 'Email and password required' })
        };
    }

    // Query user by email
    const { resources: users } = await usersContainer.items
        .query({
            query: 'SELECT * FROM c WHERE c.email = @email',
            parameters: [{ name: '@email', value: email }]
        })
        .fetchAll();

    if (users.length === 0) {
        return {
            status: 401,
            headers,
            body: JSON.stringify({ success: false, message: 'Invalid credentials' })
        };
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
        return {
            status: 401,
            headers,
            body: JSON.stringify({ success: false, message: 'Invalid credentials' })
        };
    }

    // Create JWT token
    const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
        status: 200,
        headers,
        body: JSON.stringify({
            success: true,
            data: {
                user: userWithoutPassword,
                token
            }
        })
    };
}

async function handleRegister(body: any, headers: any) {
    const { email, password, firstName, lastName } = body;

    if (!email || !password || !firstName || !lastName) {
        return {
            status: 400,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Email, password, firstName, and lastName are required' 
            })
        };
    }

    // Check if user already exists
    const { resources: existingUsers } = await usersContainer.items
        .query({
            query: 'SELECT * FROM c WHERE c.email = @email',
            parameters: [{ name: '@email', value: email }]
        })
        .fetchAll();

    if (existingUsers.length > 0) {
        return {
            status: 400,
            headers,
            body: JSON.stringify({ success: false, message: 'User already exists' })
        };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const newUser = {
        id: `user_${Date.now()}`,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'user',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    await usersContainer.items.create(newUser);

    // Create JWT token
    const token = jwt.sign(
        { userId: newUser.id, email: newUser.email, role: newUser.role },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    return {
        status: 201,
        headers,
        body: JSON.stringify({
            success: true,
            data: {
                user: userWithoutPassword,
                token
            }
        })
    };
}

app.http('auth', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'auth/{action?}',
    handler: authFunction,
});