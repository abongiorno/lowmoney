import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

// Initialize Cosmos DB client
const cosmosClient = new CosmosClient(process.env.COSMOS_DB_CONNECTION!);
const database = cosmosClient.database(process.env.COSMOS_DB_DATABASE || 'lowmoney');
const pricesContainer = database.container('prices');
const productsContainer = database.container('products');
const supermarketsContainer = database.container('supermarkets');

export async function pricesFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Prices function processed request for url "${request.url}"`);

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
                if (action && action.startsWith('product/')) {
                    // Get prices for specific product - /api/prices/product/123
                    const productId = action.split('/')[1];
                    return await getPricesByProduct(productId, headers);
                } else if (action === 'pending') {
                    // Get pending prices for approval
                    return await getPendingPrices(headers);
                } else {
                    // Get all prices
                    return await getAllPrices(headers);
                }
            case 'POST':
                if (action === 'report') {
                    const body = await request.json() as any;
                    return await reportPrice(body, headers);
                }
                break;
            default:
                return {
                    status: 405,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Method not allowed' })
                };
        }
    } catch (error) {
        context.error('Prices function error:', error);
        return {
            status: 500,
            headers,
            body: JSON.stringify({ success: false, message: 'Internal server error' })
        };
    }
}

async function getAllPrices(headers: any) {
    const { resources: prices } = await pricesContainer.items
        .query('SELECT * FROM c ORDER BY c.createdAt DESC')
        .fetchAll();

    return {
        status: 200,
        headers,
        body: JSON.stringify({
            success: true,
            data: prices
        })
    };
}

async function getPricesByProduct(productId: string, headers: any) {
    const { resources: prices } = await pricesContainer.items
        .query({
            query: 'SELECT * FROM c WHERE c.productId = @productId ORDER BY c.createdAt DESC',
            parameters: [{ name: '@productId', value: productId }]
        })
        .fetchAll();

    // Enrich with product and supermarket info
    const enrichedPrices = await Promise.all(prices.map(async (price: any) => {
        const [productResult, supermarketResult] = await Promise.all([
            productsContainer.item(price.productId, price.productId).read().catch(() => null),
            supermarketsContainer.item(price.supermarketId, price.supermarketId).read().catch(() => null)
        ]);

        return {
            ...price,
            product: productResult?.resource || null,
            supermarket: supermarketResult?.resource || null
        };
    }));

    return {
        status: 200,
        headers,
        body: JSON.stringify({
            success: true,
            data: enrichedPrices
        })
    };
}

async function getPendingPrices(headers: any) {
    const { resources: prices } = await pricesContainer.items
        .query('SELECT * FROM c WHERE c.isVerified = false ORDER BY c.createdAt DESC')
        .fetchAll();

    return {
        status: 200,
        headers,
        body: JSON.stringify({
            success: true,
            data: prices
        })
    };
}

async function reportPrice(body: any, headers: any) {
    const { productId, supermarketId, price, discountPrice, isOnSale } = body;

    if (!productId || !supermarketId || !price) {
        return {
            status: 400,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'ProductId, supermarketId, and price are required' 
            })
        };
    }

    // Verify product and supermarket exist
    try {
        await productsContainer.item(productId, productId).read();
        await supermarketsContainer.item(supermarketId, supermarketId).read();
    } catch (error) {
        return {
            status: 400,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Product or supermarket not found' 
            })
        };
    }

    const newPrice = {
        id: `price_${Date.now()}`,
        productId,
        supermarketId,
        price: parseFloat(price),
        discountPrice: discountPrice ? parseFloat(discountPrice) : null,
        isOnSale: !!isOnSale,
        isVerified: false, // Needs approval
        reportedBy: 'anonymous', // TODO: Get from JWT token
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const { resource: createdPrice } = await pricesContainer.items.create(newPrice);

    return {
        status: 201,
        headers,
        body: JSON.stringify({
            success: true,
            data: createdPrice
        })
    };
}

app.http('prices', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'prices/{*action}',
    handler: pricesFunction,
});