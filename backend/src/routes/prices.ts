import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { getDatabase } from '../config/database';
import { Price, PriceHistory, PriceStatus, ApiResponse, UserRole } from '../types';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, requireApprover, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

const priceReportSchema = Joi.object({
  productId: Joi.string().required(),
  supermarketId: Joi.string().required(),
  price: Joi.number().positive().required(),
  notes: Joi.string().optional()
});

// Report new price
router.post('/report', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: express.Response<ApiResponse<Price>>) => {
  const { error, value } = priceReportSchema.validate(req.body);
  
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { productId, supermarketId, price: reportedPrice, notes } = value;
  const db = getDatabase();

  // Verify product exists
  const { resource: product } = await db.containers.products.item(productId, productId).read();
  if (!product || !product.isActive) {
    throw createError('Product not found', 404);
  }

  // Verify supermarket exists
  const { resource: supermarket } = await db.containers.supermarkets.item(supermarketId, supermarketId).read();
  if (!supermarket || !supermarket.isActive) {
    throw createError('Supermarket not found', 404);
  }

  const priceReport: Price = {
    id: uuidv4(),
    productId,
    supermarketId,
    price: reportedPrice,
    reportedBy: req.user!.userId,
    status: PriceStatus.PENDING,
    notes,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const { resource: createdPrice } = await db.containers.prices.items.create(priceReport);

  res.status(201).json({
    success: true,
    data: createdPrice,
    message: 'Price reported successfully and is pending approval'
  });
}));

// Get prices for a product
router.get('/product/:productId', asyncHandler(async (req, res: express.Response<ApiResponse<Price[]>>) => {
  const { productId } = req.params;
  const { status, page = 1, limit = 20 } = req.query;
  
  const db = getDatabase();
  
  let query = 'SELECT * FROM c WHERE c.productId = @productId';
  const parameters: any[] = [{ name: '@productId', value: productId }];

  if (status) {
    query += ' AND c.status = @status';
    parameters.push({ name: '@status', value: status });
  }

  query += ' ORDER BY c.createdAt DESC';

  const { resources: prices } = await db.containers.prices.items
    .query({
      query,
      parameters
    })
    .fetchAll();

  // Simple pagination
  const startIndex = ((page as number) - 1) * (limit as number);
  const endIndex = startIndex + (limit as number);
  const paginatedPrices = prices.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: paginatedPrices
  });
}));

// Get price history for a product
router.get('/history/:productId', asyncHandler(async (req, res: express.Response<ApiResponse<PriceHistory[]>>) => {
  const { productId } = req.params;
  const { supermarketId, page = 1, limit = 50 } = req.query;
  
  const db = getDatabase();
  
  let query = 'SELECT * FROM c WHERE c.productId = @productId';
  const parameters: any[] = [{ name: '@productId', value: productId }];

  if (supermarketId) {
    query += ' AND c.supermarketId = @supermarketId';
    parameters.push({ name: '@supermarketId', value: supermarketId });
  }

  query += ' ORDER BY c.timestamp DESC';

  const { resources: history } = await db.containers.priceHistory.items
    .query({
      query,
      parameters
    })
    .fetchAll();

  // Simple pagination
  const startIndex = ((page as number) - 1) * (limit as number);
  const endIndex = startIndex + (limit as number);
  const paginatedHistory = history.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: paginatedHistory
  });
}));

// Get pending prices (approver/admin only)
router.get('/pending', authenticateToken, requireApprover, asyncHandler(async (req, res: express.Response<ApiResponse<Price[]>>) => {
  const db = getDatabase();
  const { page = 1, limit = 20 } = req.query;
  
  const { resources: pendingPrices } = await db.containers.prices.items
    .query({
      query: 'SELECT * FROM c WHERE c.status = @status ORDER BY c.createdAt ASC',
      parameters: [{ name: '@status', value: PriceStatus.PENDING }]
    })
    .fetchAll();

  // Simple pagination
  const startIndex = ((page as number) - 1) * (limit as number);
  const endIndex = startIndex + (limit as number);
  const paginatedPrices = pendingPrices.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: paginatedPrices
  });
}));

// Approve/reject price (approver/admin only)
router.patch('/:priceId/approve', authenticateToken, requireApprover, asyncHandler(async (req: AuthenticatedRequest, res: express.Response<ApiResponse<Price>>) => {
  const { priceId } = req.params;
  const { approve } = req.body; // boolean: true for approve, false for reject
  
  if (typeof approve !== 'boolean') {
    throw createError('Approve field must be boolean', 400);
  }

  const db = getDatabase();
  
  const { resource: price } = await db.containers.prices.item(priceId, req.body.productId || priceId).read();
  if (!price) {
    throw createError('Price report not found', 404);
  }

  if (price.status !== PriceStatus.PENDING) {
    throw createError('Price report already processed', 400);
  }

  price.status = approve ? PriceStatus.APPROVED : PriceStatus.REJECTED;
  price.approvedBy = req.user!.userId;
  price.updatedAt = new Date();

  const { resource: updatedPrice } = await db.containers.prices.item(priceId, price.productId).replace(price);

  // If approved, add to price history and update product lowest price
  if (approve) {
    // Add to price history
    const historyEntry: PriceHistory = {
      id: uuidv4(),
      productId: price.productId,
      supermarketId: price.supermarketId,
      price: price.price,
      reportedBy: price.reportedBy,
      approvedBy: req.user!.userId,
      timestamp: new Date()
    };

    await db.containers.priceHistory.items.create(historyEntry);

    // Update product's lowest price
    const { resource: product } = await db.containers.products.item(price.productId, price.productId).read();
    if (product && (product.lowestPrice === 0 || price.price < product.lowestPrice)) {
      product.lowestPrice = price.price;
      product.lastUpdated = new Date();
      product.updatedAt = new Date();
      await db.containers.products.item(price.productId, product.barcode).replace(product);
    }
  }

  res.json({
    success: true,
    data: updatedPrice,
    message: `Price ${approve ? 'approved' : 'rejected'} successfully`
  });
}));

// Get user's price reports
router.get('/my-reports', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: express.Response<ApiResponse<Price[]>>) => {
  const db = getDatabase();
  const { page = 1, limit = 20 } = req.query;
  
  const { resources: userPrices } = await db.containers.prices.items
    .query({
      query: 'SELECT * FROM c WHERE c.reportedBy = @userId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@userId', value: req.user!.userId }]
    })
    .fetchAll();

  // Simple pagination
  const startIndex = ((page as number) - 1) * (limit as number);
  const endIndex = startIndex + (limit as number);
  const paginatedPrices = userPrices.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: paginatedPrices
  });
}));

// Get user's approvals (approver/admin only)
router.get('/my-approvals', authenticateToken, requireApprover, asyncHandler(async (req: AuthenticatedRequest, res: express.Response<ApiResponse<Price[]>>) => {
  const db = getDatabase();
  const { page = 1, limit = 20 } = req.query;
  
  const { resources: approvedPrices } = await db.containers.prices.items
    .query({
      query: 'SELECT * FROM c WHERE c.approvedBy = @userId ORDER BY c.updatedAt DESC',
      parameters: [{ name: '@userId', value: req.user!.userId }]
    })
    .fetchAll();

  // Simple pagination
  const startIndex = ((page as number) - 1) * (limit as number);
  const endIndex = startIndex + (limit as number);
  const paginatedPrices = approvedPrices.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: paginatedPrices
  });
}));

// Get current prices for a supermarket
router.get('/supermarket/:supermarketId', asyncHandler(async (req, res: express.Response<ApiResponse<PriceHistory[]>>) => {
  const { supermarketId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  
  const db = getDatabase();
  
  const { resources: prices } = await db.containers.priceHistory.items
    .query({
      query: 'SELECT * FROM c WHERE c.supermarketId = @supermarketId ORDER BY c.timestamp DESC',
      parameters: [{ name: '@supermarketId', value: supermarketId }]
    })
    .fetchAll();

  // Simple pagination
  const startIndex = ((page as number) - 1) * (limit as number);
  const endIndex = startIndex + (limit as number);
  const paginatedPrices = prices.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: paginatedPrices
  });
}));

export default router;