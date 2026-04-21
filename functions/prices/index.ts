import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { pricesContainer, priceHistoryContainer, productsContainer, supermarketsContainer } from '../shared/cosmos';
import { handleCorsPreFlight, setCorsHeaders } from '../shared/cors';
import { verifyToken, requireApprover, AuthError } from '../shared/auth';

// Price status enum
enum PriceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

// Validation schemas
const priceReportSchema = Joi.object({
  productId: Joi.string().required(),
  supermarketId: Joi.string().required(),
  price: Joi.number().positive().required(),
  notes: Joi.string().optional()
});

const approvalSchema = Joi.object({
  approve: Joi.boolean().required()
});

export async function pricesFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Prices function processed request for url "${request.url}"`);

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
                if (action === 'pending') {
                    return await getPendingPrices(request, response);
                } else if (action === 'my-reports') {
                    return await getMyReports(request, response);
                } else if (action === 'my-approvals') {
                    return await getMyApprovals(request, response);
                } else {
                    return await getAllPrices(request, response);
                }
            
            case 'POST':
                if (action === 'report') {
                    return await reportPrice(request, response);
                } else {
                    response.status = 404;
                    response.body = JSON.stringify({ success: false, message: 'Action not found' });
                    setCorsHeaders(request, response);
                    return response;
                }
            
            default:
                response.status = 405;
                response.body = JSON.stringify({ success: false, message: 'Method not allowed' });
                setCorsHeaders(request, response);
                return response;
        }
    } catch (error) {
        context.error('Prices function error:', error);
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Internal server error' });
        setCorsHeaders(request, response);
        return response;
    }
}

// Product-specific prices - separate function for proper routing
export async function pricesProductFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Prices product function processed request for url "${request.url}"`);

    const corsResponse = handleCorsPreFlight(request);
    if (corsResponse) return corsResponse;

    const response: HttpResponseInit = {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    };

    try {
        const productId = request.params.productId;
        
        if (request.method === 'GET') {
            return await getPricesByProduct(productId!, request, response);
        } else {
            response.status = 405;
            response.body = JSON.stringify({ success: false, message: 'Method not allowed' });
            setCorsHeaders(request, response);
            return response;
        }
    } catch (error) {
        context.error('Prices product function error:', error);
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Internal server error' });
        setCorsHeaders(request, response);
        return response;
    }
}

// Price history - separate function for proper routing
export async function pricesHistoryFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Prices history function processed request for url "${request.url}"`);

    const corsResponse = handleCorsPreFlight(request);
    if (corsResponse) return corsResponse;

    const response: HttpResponseInit = {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    };

    try {
        const productId = request.params.productId;
        
        if (request.method === 'GET') {
            return await getPriceHistory(productId!, request, response);
        } else {
            response.status = 405;
            response.body = JSON.stringify({ success: false, message: 'Method not allowed' });
            setCorsHeaders(request, response);
            return response;
        }
    } catch (error) {
        context.error('Prices history function error:', error);
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Internal server error' });
        setCorsHeaders(request, response);
        return response;
    }
}

// Supermarket prices - separate function for proper routing
export async function pricesSupermarketFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Prices supermarket function processed request for url "${request.url}"`);

    const corsResponse = handleCorsPreFlight(request);
    if (corsResponse) return corsResponse;

    const response: HttpResponseInit = {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    };

    try {
        const supermarketId = request.params.supermarketId;
        
        if (request.method === 'GET') {
            return await getPricesBySupermarket(supermarketId!, request, response);
        } else {
            response.status = 405;
            response.body = JSON.stringify({ success: false, message: 'Method not allowed' });
            setCorsHeaders(request, response);
            return response;
        }
    } catch (error) {
        context.error('Prices supermarket function error:', error);
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Internal server error' });
        setCorsHeaders(request, response);
        return response;
    }
}

// Price approval - separate function for proper routing
export async function priceApprovalFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Price approval function processed request for url "${request.url}"`);

    const corsResponse = handleCorsPreFlight(request);
    if (corsResponse) return corsResponse;

    const response: HttpResponseInit = {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    };

    try {
        if (request.method === 'PATCH') {
            const priceId = request.params.id;
            return await approvePrice(priceId!, request, response);
        } else {
            response.status = 405;
            response.body = JSON.stringify({ success: false, message: 'Method not allowed' });
            setCorsHeaders(request, response);
            return response;
        }
    } catch (error) {
        context.error('Price approval function error:', error);
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Internal server error' });
        setCorsHeaders(request, response);
        return response;
    }
}

async function getAllPrices(request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        const status = request.query.get('status') || PriceStatus.APPROVED;
        const page = parseInt(request.query.get('page') || '1');
        const limit = parseInt(request.query.get('limit') || '20');

        let query = 'SELECT * FROM c WHERE c.status = @status';
        const parameters = [{ name: '@status', value: status }];

        query += ' ORDER BY c.createdAt DESC';

        const offset = (page - 1) * limit;
        query += ` OFFSET ${offset} LIMIT ${limit}`;

        const { resources: prices } = await pricesContainer.items
            .query({ query, parameters })
            .fetchAll();

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: prices,
            pagination: { page, limit, total: prices.length }
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Failed to fetch prices' });
        setCorsHeaders(request, response);
        return response;
    }
}

async function getPricesByProduct(productId: string, request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        const status = request.query.get('status') || PriceStatus.APPROVED;
        const page = parseInt(request.query.get('page') || '1');
        const limit = parseInt(request.query.get('limit') || '20');

        let query = 'SELECT * FROM c WHERE c.productId = @productId AND c.status = @status';
        const parameters = [
            { name: '@productId', value: productId },
            { name: '@status', value: status }
        ];

        query += ' ORDER BY c.createdAt DESC';

        const offset = (page - 1) * limit;
        query += ` OFFSET ${offset} LIMIT ${limit}`;

        const { resources: prices } = await pricesContainer.items
            .query({ query, parameters })
            .fetchAll();

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: prices,
            pagination: { page, limit, total: prices.length }
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Failed to fetch product prices' });
        setCorsHeaders(request, response);
        return response;
    }
}

async function getPriceHistory(productId: string, request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        const supermarketId = request.query.get('supermarketId');

        let query = 'SELECT * FROM c WHERE c.productId = @productId';
        const parameters = [{ name: '@productId', value: productId }];

        if (supermarketId) {
            query += ' AND c.supermarketId = @supermarketId';
            parameters.push({ name: '@supermarketId', value: supermarketId });
        }

        query += ' ORDER BY c.timestamp DESC';

        const { resources: history } = await priceHistoryContainer.items
            .query({ query, parameters })
            .fetchAll();

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: history
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Failed to fetch price history' });
        setCorsHeaders(request, response);
        return response;
    }
}

async function getPricesBySupermarket(supermarketId: string, request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        const { resources: history } = await priceHistoryContainer.items
            .query({
                query: 'SELECT * FROM c WHERE c.supermarketId = @supermarketId ORDER BY c.timestamp DESC',
                parameters: [{ name: '@supermarketId', value: supermarketId }]
            })
            .fetchAll();

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: history
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        response.status = 500;
        response.body = JSON.stringify({ success: false, message: 'Failed to fetch supermarket prices' });
        setCorsHeaders(request, response);
        return response;
    }
}

async function getPendingPrices(request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        // Require approver/admin role
        const user = verifyToken(request);
        requireApprover(user);

        const { resources: prices } = await pricesContainer.items
            .query({
                query: 'SELECT * FROM c WHERE c.status = @status ORDER BY c.createdAt ASC',
                parameters: [{ name: '@status', value: PriceStatus.PENDING }]
            })
            .fetchAll();

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: prices
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        if (error instanceof AuthError) {
            response.status = error.statusCode;
            response.body = JSON.stringify({ success: false, message: error.message });
        } else {
            response.status = 500;
            response.body = JSON.stringify({ success: false, message: 'Failed to fetch pending prices' });
        }
        setCorsHeaders(request, response);
        return response;
    }
}

async function getMyReports(request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        const user = verifyToken(request);

        const { resources: prices } = await pricesContainer.items
            .query({
                query: 'SELECT * FROM c WHERE c.reportedBy = @userId ORDER BY c.createdAt DESC',
                parameters: [{ name: '@userId', value: user.userId }]
            })
            .fetchAll();

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: prices
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        if (error instanceof AuthError) {
            response.status = error.statusCode;
            response.body = JSON.stringify({ success: false, message: error.message });
        } else {
            response.status = 500;
            response.body = JSON.stringify({ success: false, message: 'Failed to fetch your reports' });
        }
        setCorsHeaders(request, response);
        return response;
    }
}

async function getMyApprovals(request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        const user = verifyToken(request);
        requireApprover(user);

        const { resources: prices } = await pricesContainer.items
            .query({
                query: 'SELECT * FROM c WHERE c.approvedBy = @userId ORDER BY c.updatedAt DESC',
                parameters: [{ name: '@userId', value: user.userId }]
            })
            .fetchAll();

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: prices
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        if (error instanceof AuthError) {
            response.status = error.statusCode;
            response.body = JSON.stringify({ success: false, message: error.message });
        } else {
            response.status = 500;
            response.body = JSON.stringify({ success: false, message: 'Failed to fetch your approvals' });
        }
        setCorsHeaders(request, response);
        return response;
    }
}

async function reportPrice(request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        // Require authentication
        const user = verifyToken(request);

        const body = await request.json() as any;
        
        // Validate input
        const { error } = priceReportSchema.validate(body);
        if (error) {
            response.status = 400;
            response.body = JSON.stringify({ 
                success: false, 
                message: error.details[0].message 
            });
            setCorsHeaders(request, response);
            return response;
        }

        const { productId, supermarketId, price, notes } = body;

        // Verify product and supermarket exist
        try {
            const [productResult, supermarketResult] = await Promise.all([
                productsContainer.item(productId, productId).read(),
                supermarketsContainer.item(supermarketId, supermarketId).read()
            ]);

            if (!productResult.resource?.isActive || !productResult.resource?.isApproved) {
                response.status = 400;
                response.body = JSON.stringify({ 
                    success: false, 
                    message: 'Product not found or not active' 
                });
                setCorsHeaders(request, response);
                return response;
            }

            if (!supermarketResult.resource?.isActive) {
                response.status = 400;
                response.body = JSON.stringify({ 
                    success: false, 
                    message: 'Supermarket not found or not active' 
                });
                setCorsHeaders(request, response);
                return response;
            }
        } catch (error) {
            response.status = 400;
            response.body = JSON.stringify({ 
                success: false, 
                message: 'Product or supermarket not found' 
            });
            setCorsHeaders(request, response);
            return response;
        }

        const newPrice = {
            id: uuidv4(),
            productId,
            supermarketId,
            price: parseFloat(price.toString()),
            reportedBy: user.userId,
            status: PriceStatus.PENDING,
            notes: notes || '',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const { resource: createdPrice } = await pricesContainer.items.create(newPrice);

        response.status = 201;
        response.body = JSON.stringify({
            success: true,
            data: createdPrice,
            message: 'Price reported successfully and is pending approval'
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        if (error instanceof AuthError) {
            response.status = error.statusCode;
            response.body = JSON.stringify({ success: false, message: error.message });
        } else {
            response.status = 500;
            response.body = JSON.stringify({ success: false, message: 'Failed to report price' });
        }
        setCorsHeaders(request, response);
        return response;
    }
}

async function approvePrice(priceId: string, request: HttpRequest, response: HttpResponseInit): Promise<HttpResponseInit> {
    try {
        // Require approver/admin role
        const user = verifyToken(request);
        requireApprover(user);

        const body = await request.json() as any;
        
        // Validate input
        const { error } = approvalSchema.validate(body);
        if (error) {
            response.status = 400;
            response.body = JSON.stringify({ 
                success: false, 
                message: error.details[0].message 
            });
            setCorsHeaders(request, response);
            return response;
        }

        const { approve } = body;

        // Get existing price
        const { resource: price } = await pricesContainer.item(priceId, priceId).read();

        if (!price) {
            response.status = 404;
            response.body = JSON.stringify({ success: false, message: 'Price not found' });
            setCorsHeaders(request, response);
            return response;
        }

        if (price.status !== PriceStatus.PENDING) {
            response.status = 400;
            response.body = JSON.stringify({ 
                success: false, 
                message: 'Price has already been processed' 
            });
            setCorsHeaders(request, response);
            return response;
        }

        // Update price status
        const updatedPrice = {
            ...price,
            status: approve ? PriceStatus.APPROVED : PriceStatus.REJECTED,
            approvedBy: user.userId,
            updatedAt: new Date()
        };

        const { resource: result } = await pricesContainer.item(priceId, priceId).replace(updatedPrice);

        // If approved, create price history entry and update product's lowest price
        if (approve) {
            // Create price history entry
            const historyEntry = {
                id: uuidv4(),
                productId: price.productId,
                supermarketId: price.supermarketId,
                price: price.price,
                reportedBy: price.reportedBy,
                approvedBy: user.userId,
                timestamp: new Date()
            };

            await priceHistoryContainer.items.create(historyEntry);

            // Update product's lowest price if this is lower
            try {
                const { resource: product } = await productsContainer.item(price.productId, price.productId).read();
                if (product && (product.lowestPrice === 0 || price.price < product.lowestPrice)) {
                    const updatedProduct = {
                        ...product,
                        lowestPrice: price.price,
                        lastUpdated: new Date(),
                        updatedAt: new Date()
                    };
                    await productsContainer.item(price.productId, price.productId).replace(updatedProduct);
                }
            } catch (error) {
                // Log error but don't fail the approval
                console.error('Failed to update product lowest price:', error);
            }
        }

        response.status = 200;
        response.body = JSON.stringify({
            success: true,
            data: result,
            message: `Price ${approve ? 'approved' : 'rejected'} successfully`
        });

        setCorsHeaders(request, response);
        return response;
    } catch (error) {
        if (error instanceof AuthError) {
            response.status = error.statusCode;
            response.body = JSON.stringify({ success: false, message: error.message });
        } else {
            response.status = 500;
            response.body = JSON.stringify({ success: false, message: 'Failed to process price approval' });
        }
        setCorsHeaders(request, response);
        return response;
    }
}

// Register multiple routes for different endpoints
app.http('prices', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'prices/{action?}',
    handler: pricesFunction,
});

app.http('prices-product', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'prices/product/{productId}',
    handler: pricesProductFunction,
});

app.http('prices-history', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'prices/history/{productId}',
    handler: pricesHistoryFunction,
});

app.http('prices-supermarket', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'prices/supermarket/{supermarketId}',
    handler: pricesSupermarketFunction,
});

app.http('prices-approve', {
    methods: ['PATCH', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'prices/{id}/approve',
    handler: priceApprovalFunction,
});