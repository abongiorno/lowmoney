import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

// Initialize Cosmos DB client
const cosmosClient = new CosmosClient(process.env.COSMOS_DB_CONNECTION!);
const database = cosmosClient.database(process.env.COSMOS_DB_DATABASE || 'lowmoney');
const supermarketsContainer = database.container('supermarkets');

export async function supermarketsFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Supermarkets function processed request for url "${request.url}"`);

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
        const action = request.params.action;

        switch (request.method) {
            case 'GET':
                if (action === 'nearby') {
                    const lat = parseFloat(request.query.get('lat') || '0');
                    const lng = parseFloat(request.query.get('lng') || '0');
                    const radius = parseFloat(request.query.get('radius') || '5');
                    return await getNearbySupermarkets(lat, lng, radius, headers);
                } else {
                    return await getSupermarkets(headers);
                }
            case 'POST':
                const body = await request.json() as any;
                return await createSupermarket(body, headers);
            default:
                return {
                    status: 405,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Method not allowed' })
                };
        }
    } catch (error) {
        context.error('Supermarkets function error:', error);
        return {
            status: 500,
            headers,
            body: JSON.stringify({ success: false, message: 'Internal server error' })
        };
    }
}

async function getSupermarkets(headers: any) {
    const { resources: supermarkets } = await supermarketsContainer.items
        .query('SELECT * FROM c')
        .fetchAll();

    return {
        status: 200,
        headers,
        body: JSON.stringify({
            success: true,
            data: supermarkets
        })
    };
}

async function getNearbySupermarkets(lat: number, lng: number, radius: number, headers: any) {
    // Get all supermarkets (in production, would use geospatial queries)
    const { resources: supermarkets } = await supermarketsContainer.items
        .query('SELECT * FROM c')
        .fetchAll();

    // Simple distance calculation for demo (in production use proper geospatial)
    const nearby = supermarkets.map((s: any) => ({
        ...s,
        distance: calculateDistance(lat, lng, s.latitude || 45.4642, s.longitude || 9.1900)
    })).filter((s: any) => s.distance <= radius)
      .sort((a: any, b: any) => a.distance - b.distance);

    return {
        status: 200,
        headers,
        body: JSON.stringify({
            success: true,
            data: nearby
        })
    };
}

async function createSupermarket(body: any, headers: any) {
    const { name, location, latitude, longitude } = body;

    if (!name || !location) {
        return {
            status: 400,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Name and location are required' 
            })
        };
    }

    const newSupermarket = {
        id: `supermarket_${Date.now()}`,
        name,
        location,
        latitude: latitude || null,
        longitude: longitude || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const { resource: created } = await supermarketsContainer.items.create(newSupermarket);

    return {
        status: 201,
        headers,
        body: JSON.stringify({
            success: true,
            data: created
        })
    };
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

app.http('supermarkets', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'supermarkets/{action?}',
    handler: supermarketsFunction,
});