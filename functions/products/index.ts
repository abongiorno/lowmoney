import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

// Initialize Cosmos DB client
const cosmosClient = new CosmosClient(process.env.COSMOS_DB_CONNECTION!);
const database = cosmosClient.database(process.env.COSMOS_DB_DATABASE || 'lowmoney');
const productsContainer = database.container('products');

export async function productsFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Products function processed request for url "${request.url}"`);

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
                if (action === 'barcode') {
                    // Get product by barcode - /api/products/barcode?code=123456
                    const barcode = request.query.get('code');
                    return await getProductByBarcode(barcode, headers);
                } else {
                    // Get all products with optional search - /api/products?search=pasta
                    const search = request.query.get('search');
                    return await getProducts(search, headers);
                }
            case 'POST':
                const body = await request.json() as any;
                return await createProduct(body, headers);
            default:
                return {
                    status: 405,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Method not allowed' })
                };
        }
    } catch (error) {
        context.error('Products function error:', error);
        return {
            status: 500,
            headers,
            body: JSON.stringify({ success: false, message: 'Internal server error' })
        };
    }
}

async function getProducts(search: string | null, headers: any) {
    let query = 'SELECT * FROM c WHERE c.isApproved = true';
    const parameters: any[] = [];

    if (search) {
        query += ' AND (CONTAINS(LOWER(c.name), @search) OR CONTAINS(LOWER(c.brand), @search))';
        parameters.push({ name: '@search', value: search.toLowerCase() });
    }

    const { resources: products } = await productsContainer.items
        .query({ query, parameters })
        .fetchAll();

    return {
        status: 200,
        headers,
        body: JSON.stringify({
            success: true,
            data: products
        })
    };
}

async function getProductByBarcode(barcode: string | null, headers: any) {
    if (!barcode) {
        return {
            status: 400,
            headers,
            body: JSON.stringify({ success: false, message: 'Barcode is required' })
        };
    }

    const { resources: products } = await productsContainer.items
        .query({
            query: 'SELECT * FROM c WHERE c.barcode = @barcode',
            parameters: [{ name: '@barcode', value: barcode }]
        })
        .fetchAll();

    if (products.length === 0) {
        return {
            status: 404,
            headers,
            body: JSON.stringify({ success: false, message: 'Product not found' })
        };
    }

    return {
        status: 200,
        headers,
        body: JSON.stringify({
            success: true,
            data: products[0]
        })
    };
}

async function createProduct(body: any, headers: any) {
    const { name, description, category, brand, barcode, imageUrl } = body;

    if (!name || !brand) {
        return {
            status: 400,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Name and brand are required' 
            })
        };
    }

    // Check if product with same barcode exists
    if (barcode) {
        const { resources: existingProducts } = await productsContainer.items
            .query({
                query: 'SELECT * FROM c WHERE c.barcode = @barcode',
                parameters: [{ name: '@barcode', value: barcode }]
            })
            .fetchAll();

        if (existingProducts.length > 0) {
            return {
                status: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'Product with this barcode already exists' })
            };
        }
    }

    // Create new product
    const newProduct = {
        id: `product_${Date.now()}`,
        name,
        description: description || '',
        category: category || 'general',
        brand,
        barcode: barcode || null,
        imageUrl: imageUrl || '',
        isApproved: false, // Needs approval
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const { resource: createdProduct } = await productsContainer.items.create(newProduct);

    return {
        status: 201,
        headers,
        body: JSON.stringify({
            success: true,
            data: createdProduct
        })
    };
}

app.http('products', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'products/{action?}',
    handler: productsFunction,
});