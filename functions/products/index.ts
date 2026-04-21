import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { productsContainer } from '../shared/cosmos';
import { handleCorsPreFlight, setCorsHeaders } from '../shared/cors';
import { verifyToken, requireApprover, AuthError } from '../shared/auth';

// Validation schemas
const productSchema = Joi.object({
  name: Joi.string().min(2).required(),
  barcode: Joi.string().required(),
  category: Joi.string().required(),
  brand: Joi.string().optional(),
  description: Joi.string().optional(),
  image: Joi.string().optional()
});

export async function productsFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Products function processed request for url "${request.url}"`);

    // Handle CORS preflight
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
                if (action === 'barcode') {
                    // Get product by barcode - /api/products/barcode?code=123456
                    const barcode = request.query.get('code');
                    return await getProductByBarcode(barcode, request, response);
                } else {
                    // Get all products with optional filters - /api/products?search=pasta&category=food
                    return await getProducts(request, response);
                }
            
            case 'POST':
                return await createProduct(request, response);
            
            default:
                response.status = 405;
                response.body = JSON.stringify({ success: false, message: 'Method not allowed' });
                setCorsHeaders(request, response);
                return response;
        }
    } catch (error) {
        context.error('Products function error:', error);
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Internal server error' });
        setCorsHeaders(request, response);
        return response;
    }
}

// Single product by ID - separate function for proper routing
export async function productByIdFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Product by ID function processed request for url "${request.url}"`);

    const corsResponse = handleCorsPreFlight(request);
    if (corsResponse) return corsResponse;

    const response: HttpResponseInit = {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    };

    try {
        const productId = request.params.id;
        
        if (request.method === 'GET') {
            return await getProductById(productId!, request, response);
        } else if (request.method === 'PATCH') {
            return await updateProduct(productId!, request, response);
        } else {
            response.status = 405;
            response.body = JSON.stringify({ success: false, message: 'Method not allowed' });
            setCorsHeaders(request, response);
            return response;
        }
    } catch (error) {
        context.error('Product by ID function error:', error);
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Internal server error' });
        setCorsHeaders(request, response);
        return response;
    }
}

// Product approval - separate function for proper routing
export async function productApprovalFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Product approval function processed request for url "${request.url}"`);

    const corsResponse = handleCorsPreFlight(request);
    if (corsResponse) return corsResponse;

    const response: HttpResponseInit = {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    };

    try {
        if (request.method === 'PATCH') {
            const productId = request.params.id;
            return await approveProduct(productId!, request, response);
        } else {
            response.status = 405;
            response.body = JSON.stringify({ success: false, message: 'Method not allowed' });
            setCorsHeaders(request, response);
            return response;
        }
    } catch (error) {
        context.error('Product approval function error:', error);
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Internal server error' });
        setCorsHeaders(request, response);
        return response;
    }
}

async function getProducts(request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        const search = request.query.get('search');
        const category = request.query.get('category');
        const page = parseInt(request.query.get('page') || '1');
        const limit = parseInt(request.query.get('limit') || '20');

        let query = 'SELECT * FROM c WHERE c.isActive = true AND c.isApproved = true';
        const parameters: any[] = [];

        // Apply search filter
        if (search) {
            query += ' AND (CONTAINS(LOWER(c.name), @search) OR CONTAINS(LOWER(c.brand), @search) OR CONTAINS(LOWER(c.description), @search))';
            parameters.push({ name: '@search', value: search.toLowerCase() });
        }

        // Apply category filter
        if (category) {
            query += ' AND c.category = @category';
            parameters.push({ name: '@category', value: category });
        }

        // Add ordering
        query += ' ORDER BY c.name ASC';

        // Apply pagination using OFFSET/LIMIT
        const offset = (page - 1) * limit;
        query += ` OFFSET ${offset} LIMIT ${limit}`;

        const { resources: products } = await productsContainer.items
            .query({ query, parameters })
            .fetchAll();

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: products,
            pagination: {
                page,
                limit,
                total: products.length
            }
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Failed to fetch products' });
        setCorsHeaders(request, response);
        return response;
    }
}

async function getProductByBarcode(barcode: string | null, request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        if (!barcode) {
            response.status = 400;
            response.body = JSON.stringify({ success: false, message: 'Barcode is required' });
            setCorsHeaders(request, response);
            return response;
        }

        const { resources: products } = await productsContainer.items
            .query({
                query: 'SELECT * FROM c WHERE c.barcode = @barcode AND c.isActive = true AND c.isApproved = true',
                parameters: [{ name: '@barcode', value: barcode }]
            })
            .fetchAll();

        if (products.length === 0) {
            response.status = 404;
            response.body = JSON.stringify({ success: false, message: 'Product not found' });
            setCorsHeaders(request, response);
            return response;
        }

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: products[0]
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Failed to fetch product' });
        setCorsHeaders(request, response);
        return response;
    }
}

async function getProductById(productId: string, request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        const { resource: product } = await productsContainer.item(productId, productId).read();

        if (!product || !product.isActive) {
            response.status = 404;
            response.body = JSON.stringify({ success: false, message: 'Product not found' });
            setCorsHeaders(request, response);
            return response;
        }

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: product
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Failed to fetch product' });
        setCorsHeaders(request, response);
        return response;
    }
}

async function createProduct(request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        // Require authentication
        const user = verifyToken(request);

        const body = await request.json() as any;
        
        // Validate input
        const { error } = productSchema.validate(body);
        if (error) {
            response.status = 400;
            response.body = JSON.stringify({ 
                success: false, 
                message: error.details[0].message 
            });
            setCorsHeaders(request, response);
            return response;
        }

        const { name, description, category, brand, barcode, image } = body;

        // Check if product with same barcode exists
        if (barcode) {
            const { resources: existingProducts } = await productsContainer.items
                .query({
                    query: 'SELECT * FROM c WHERE c.barcode = @barcode',
                    parameters: [{ name: '@barcode', value: barcode }]
                })
                .fetchAll();

            if (existingProducts.length > 0) {
                response.status = 400;
                response.body = JSON.stringify({ 
                    success: false, 
                    message: 'Product with this barcode already exists' 
                });
                setCorsHeaders(request, response);
                return response;
            }
        }

        // Create new product
        const newProduct = {
            id: uuidv4(),
            name,
            description: description || '',
            category,
            brand: brand || '',
            barcode,
            image: image || '',
            lowestPrice: 0, // Will be updated when prices are added
            lastUpdated: new Date(),
            isActive: true,
            isApproved: false, // Requires approval
            createdBy: user.userId,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const { resource: createdProduct } = await productsContainer.items.create(newProduct);

        response.status = 201;
        response.body = JSON.stringify({
            success: true,
            data: createdProduct,
            message: 'Product created successfully. Pending approval.'
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        if (error instanceof AuthError) {
            response.status = error.statusCode;
            response.body = JSON.stringify({ success: false, message: error.message });
        } else {
            response.status = 500;
            response.body = JSON.stringify({ success: false, message: 'Failed to create product' });
        }
        setCorsHeaders(request, response);
        return response;
    }
}

async function updateProduct(productId: string, request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        // Require approver/admin role
        const user = verifyToken(request);
        requireApprover(user);

        const body = await request.json() as any;
        const { name, description, category, brand, image } = body;

        // Get existing product
        const { resource: product } = await productsContainer.item(productId, productId).read();

        if (!product || !product.isActive) {
            response.status = 404;
            response.body = JSON.stringify({ success: false, message: 'Product not found' });
            setCorsHeaders(request, response);
            return response;
        }

        // Update fields
        const updatedProduct = {
            ...product,
            ...(name && { name }),
            ...(description && { description }),
            ...(category && { category }),
            ...(brand && { brand }),
            ...(image && { image }),
            updatedAt: new Date()
        };

        const { resource: result } = await productsContainer.item(productId, productId).replace(updatedProduct);

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: result,
            message: 'Product updated successfully'
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        if (error instanceof AuthError) {
            response.status = error.statusCode;
            response.body = JSON.stringify({ success: false, message: error.message });
        } else {
            response.status = 500;
            response.body = JSON.stringify({ success: false, message: 'Failed to update product' });
        }
        setCorsHeaders(request, response);
        return response;
    }
}

async function approveProduct(productId: string, request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        // Require approver/admin role
        const user = verifyToken(request);
        requireApprover(user);

        // Get existing product
        const { resource: product } = await productsContainer.item(productId, productId).read();

        if (!product || !product.isActive) {
            response.status = 404;
            response.body = JSON.stringify({ success: false, message: 'Product not found' });
            setCorsHeaders(request, response);
            return response;
        }

        // Approve product
        const approvedProduct = {
            ...product,
            isApproved: true,
            approvedBy: user.userId,
            updatedAt: new Date()
        };

        const { resource: result } = await productsContainer.item(productId, productId).replace(approvedProduct);

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: result,
            message: 'Product approved successfully'
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        if (error instanceof AuthError) {
            response.status = error.statusCode;
            response.body = JSON.stringify({ success: false, message: error.message });
        } else {
            response.status = 500;
            response.body = JSON.stringify({ success: false, message: 'Failed to approve product' });
        }
        setCorsHeaders(request, response);
        return response;
    }
}

// Register multiple routes for different endpoints
app.http('products', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'products/{action?}',
    handler: productsFunction,
});

app.http('products-by-id', {
    methods: ['GET', 'PATCH', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'products/{id}',
    handler: productByIdFunction,
});

app.http('products-approve', {
    methods: ['PATCH', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'products/{id}/approve',
    handler: productApprovalFunction,
});