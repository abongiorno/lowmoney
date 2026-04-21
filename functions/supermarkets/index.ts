import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { supermarketsContainer } from '../shared/cosmos';
import { handleCorsPreFlight, setCorsHeaders } from '../shared/cors';
import { verifyToken, requireApprover, AuthError } from '../shared/auth';

// Validation schemas
const supermarketSchema = Joi.object({
  name: Joi.string().min(2).required(),
  address: Joi.string().required(),
  city: Joi.string().required(),
  zipCode: Joi.string().optional(),
  coordinates: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required()
  }).optional(),
  phone: Joi.string().optional(),
  website: Joi.string().uri().optional(),
  image: Joi.string().uri().optional()
});

export async function supermarketsFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Supermarkets function processed request for url "${request.url}"`);

    const corsResponse = handleCorsPreFlight(request);
    if (corsResponse) return corsResponse;

    const response: HttpResponseInit = {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    };

    try {
        const action = request.params.action;

        switch (request.method) {
            case 'GET':
                if (action === 'nearby') {
                    return await getNearbySupermarkets(request, response);
                } else {
                    return await getSupermarkets(request, response);
                }
            
            case 'POST':
                return await createSupermarket(request, response);
            
            default:
                response.status = 405;
                response.body = JSON.stringify({ success: false, message: 'Method not allowed' });
                setCorsHeaders(request, response);
                return response;
        }
    } catch (error) {
        context.error('Supermarkets function error:', error);
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Internal server error' });
        setCorsHeaders(request, response);
        return response;
    }
}

// Supermarket by ID - separate function for proper routing
export async function supermarketByIdFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Supermarket by ID function processed request for url "${request.url}"`);

    const corsResponse = handleCorsPreFlight(request);
    if (corsResponse) return corsResponse;

    const response: HttpResponseInit = {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    };

    try {
        const supermarketId = request.params.id;
        
        if (request.method === 'GET') {
            return await getSupermarketById(supermarketId!, request, response);
        } else if (request.method === 'PATCH') {
            return await updateSupermarket(supermarketId!, request, response);
        } else {
            response.status = 405;
            response.body = JSON.stringify({ success: false, message: 'Method not allowed' });
            setCorsHeaders(request, response);
            return response;
        }
    } catch (error) {
        context.error('Supermarket by ID function error:', error);
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Internal server error' });
        setCorsHeaders(request, response);
        return response;
    }
}

// Supermarket approval - separate function for proper routing
export async function supermarketApprovalFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Supermarket approval function processed request for url "${request.url}"`);

    const corsResponse = handleCorsPreFlight(request);
    if (corsResponse) return corsResponse;

    const response: HttpResponseInit = {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    };

    try {
        if (request.method === 'PATCH') {
            const supermarketId = request.params.id;
            return await approveSupermarket(supermarketId!, request, response);
        } else {
            response.status = 405;
            response.body = JSON.stringify({ success: false, message: 'Method not allowed' });
            setCorsHeaders(request, response);
            return response;
        }
    } catch (error) {
        context.error('Supermarket approval function error:', error);
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Internal server error' });
        setCorsHeaders(request, response);
        return response;
    }
}

async function getSupermarkets(request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        const search = request.query.get('search');
        const city = request.query.get('city');
        const page = parseInt(request.query.get('page') || '1');
        const limit = parseInt(request.query.get('limit') || '20');

        let query = 'SELECT * FROM c WHERE c.isActive = true AND c.isApproved = true';
        const parameters: any[] = [];

        // Apply search filter
        if (search) {
            query += ' AND (CONTAINS(LOWER(c.name), @search) OR CONTAINS(LOWER(c.address), @search))';
            parameters.push({ name: '@search', value: search.toLowerCase() });
        }

        // Apply city filter
        if (city) {
            query += ' AND LOWER(c.city) = @city';
            parameters.push({ name: '@city', value: city.toLowerCase() });
        }

        // Add ordering
        query += ' ORDER BY c.name ASC';

        // Apply pagination
        const offset = (page - 1) * limit;
        query += ` OFFSET ${offset} LIMIT ${limit}`;

        const { resources: supermarkets } = await supermarketsContainer.items
            .query({ query, parameters })
            .fetchAll();

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: supermarkets,
            pagination: {
                page,
                limit,
                total: supermarkets.length
            }
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Failed to fetch supermarkets' });
        setCorsHeaders(request, response);
        return response;
    }
}

async function getSupermarketById(supermarketId: string, request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        const { resource: supermarket } = await supermarketsContainer.item(supermarketId, supermarketId).read();

        if (!supermarket || !supermarket.isActive) {
            response.status = 404;
            response.body = JSON.stringify({ success: false, message: 'Supermarket not found' });
            setCorsHeaders(request, response);
            return response;
        }

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: supermarket
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Failed to fetch supermarket' });
        setCorsHeaders(request, response);
        return response;
    }
}

async function getNearbySupermarkets(request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        const lat = parseFloat(request.query.get('lat') || '0');
        const lng = parseFloat(request.query.get('lng') || '0');
        const radius = parseFloat(request.query.get('radius') || '5');

        if (lat === 0 || lng === 0) {
            response.status = 400;
            response.body = JSON.stringify({ 
                success: false, 
                message: 'Latitude and longitude are required' 
            });
            setCorsHeaders(request, response);
            return response;
        }

        // Get all approved supermarkets with coordinates
        const { resources: supermarkets } = await supermarketsContainer.items
            .query({
                query: 'SELECT * FROM c WHERE c.isActive = true AND c.isApproved = true AND c.coordinates != null',
                parameters: []
            })
            .fetchAll();

        // Calculate distances and filter by radius
        const nearby = supermarkets.map((supermarket: any) => {
            const distance = calculateDistance(
                lat, 
                lng, 
                supermarket.coordinates?.lat || 0, 
                supermarket.coordinates?.lng || 0
            );
            return { ...supermarket, distance };
        })
        .filter((supermarket: any) => supermarket.distance <= radius)
        .sort((a: any, b: any) => a.distance - b.distance);

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: nearby
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Failed to fetch nearby supermarkets' });
        setCorsHeaders(request, response);
        return response;
    }
}

async function createSupermarket(request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        // Require authentication
        const user = verifyToken(request);

        const body = await request.json() as any;
        
        // Validate input
        const { error } = supermarketSchema.validate(body);
        if (error) {
            response.status = 400;
            response.body = JSON.stringify({ 
                success: false, 
                message: error.details[0].message 
            });
            setCorsHeaders(request, response);
            return response;
        }

        const { name, address, city, zipCode, coordinates, phone, website, image } = body;

        // Check if supermarket with same name and address exists
        const { resources: existingSupermarkets } = await supermarketsContainer.items
            .query({
                query: 'SELECT * FROM c WHERE LOWER(c.name) = @name AND LOWER(c.address) = @address AND LOWER(c.city) = @city',
                parameters: [
                    { name: '@name', value: name.toLowerCase() },
                    { name: '@address', value: address.toLowerCase() },
                    { name: '@city', value: city.toLowerCase() }
                ]
            })
            .fetchAll();

        if (existingSupermarkets.length > 0) {
            response.status = 400;
            response.body = JSON.stringify({ 
                success: false, 
                message: 'Supermarket with this name and address already exists in this city' 
            });
            setCorsHeaders(request, response);
            return response;
        }

        // Create new supermarket
        const newSupermarket = {
            id: uuidv4(),
            name,
            address,
            city,
            zipCode: zipCode || '',
            coordinates: coordinates || null,
            phone: phone || '',
            website: website || '',
            image: image || '',
            isActive: true,
            isApproved: false, // Requires approval
            createdBy: user.userId,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const { resource: createdSupermarket } = await supermarketsContainer.items.create(newSupermarket);

        response.status = 201;
        response.body = JSON.stringify({
            success: true,
            data: createdSupermarket,
            message: 'Supermarket created successfully. Pending approval.'
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        if (error instanceof AuthError) {
            response.status = error.statusCode;
            response.body = JSON.stringify({ success: false, message: error.message });
        } else {
            response.status = 500;
            response.body = JSON.stringify({ success: false, message: 'Failed to create supermarket' });
        }
        setCorsHeaders(request, response);
        return response;
    }
}

async function updateSupermarket(supermarketId: string, request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        // Require approver/admin role
        const user = verifyToken(request);
        requireApprover(user);

        const body = await request.json() as any;
        const { name, address, city, zipCode, coordinates, phone, website, image } = body;

        // Get existing supermarket
        const { resource: supermarket } = await supermarketsContainer.item(supermarketId, supermarketId).read();

        if (!supermarket || !supermarket.isActive) {
            response.status = 404;
            response.body = JSON.stringify({ success: false, message: 'Supermarket not found' });
            setCorsHeaders(request, response);
            return response;
        }

        // Update fields
        const updatedSupermarket = {
            ...supermarket,
            ...(name && { name }),
            ...(address && { address }),
            ...(city && { city }),
            ...(zipCode !== undefined && { zipCode }),
            ...(coordinates && { coordinates }),
            ...(phone !== undefined && { phone }),
            ...(website !== undefined && { website }),
            ...(image !== undefined && { image }),
            updatedAt: new Date()
        };

        const { resource: result } = await supermarketsContainer.item(supermarketId, supermarketId).replace(updatedSupermarket);

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: result,
            message: 'Supermarket updated successfully'
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        if (error instanceof AuthError) {
            response.status = error.statusCode;
            response.body = JSON.stringify({ success: false, message: error.message });
        } else {
            response.status = 500;
            response.body = JSON.stringify({ success: false, message: 'Failed to update supermarket' });
        }
        setCorsHeaders(request, response);
        return response;
    }
}

async function approveSupermarket(supermarketId: string, request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        // Require approver/admin role
        const user = verifyToken(request);
        requireApprover(user);

        // Get existing supermarket
        const { resource: supermarket } = await supermarketsContainer.item(supermarketId, supermarketId).read();

        if (!supermarket || !supermarket.isActive) {
            response.status = 404;
            response.body = JSON.stringify({ success: false, message: 'Supermarket not found' });
            setCorsHeaders(request, response);
            return response;
        }

        // Approve supermarket
        const approvedSupermarket = {
            ...supermarket,
            isApproved: true,
            approvedBy: user.userId,
            updatedAt: new Date()
        };

        const { resource: result } = await supermarketsContainer.item(supermarketId, supermarketId).replace(approvedSupermarket);

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: result,
            message: 'Supermarket approved successfully'
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        if (error instanceof AuthError) {
            response.status = error.statusCode;
            response.body = JSON.stringify({ success: false, message: error.message });
        } else {
            response.status = 500;
            response.body = JSON.stringify({ success: false, message: 'Failed to approve supermarket' });
        }
        setCorsHeaders(request, response);
        return response;
    }
}

// Simple distance calculation (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Register multiple routes for different endpoints
app.http('supermarkets', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'supermarkets/{action?}',
    handler: supermarketsFunction,
});

app.http('supermarkets-by-id', {
    methods: ['GET', 'PATCH', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'supermarkets/{id}',
    handler: supermarketByIdFunction,
});

app.http('supermarkets-approve', {
    methods: ['PATCH', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'supermarkets/{id}/approve',
    handler: supermarketApprovalFunction,
});