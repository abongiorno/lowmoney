import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { getDatabase, isDemoMode, getMockService } from '../config/database';
import { Product, ApiResponse, UserRole } from '../types';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, requireApprover, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

const productSchema = Joi.object({
  name: Joi.string().min(2).required(),
  barcode: Joi.string().required(),
  category: Joi.string().required(),
  brand: Joi.string().optional(),
  description: Joi.string().optional(),
  image: Joi.string().optional()
});

// Get all products
router.get('/', asyncHandler(async (req, res: express.Response<ApiResponse<Product[]>>) => {
  const { search, category, page = 1, limit = 20 } = req.query;

  if (isDemoMode()) {
    // Demo mode - use mock service
    const mockService = getMockService();
    let products = await mockService.getProducts();

    // Apply search filter
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      products = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.barcode.includes(search as string)
      );
    }

    // Apply category filter
    if (category) {
      products = products.filter(product => product.category === category);
    }

    // Simple pagination
    const startIndex = ((page as number) - 1) * (limit as number);
    const endIndex = startIndex + (limit as number);
    const paginatedProducts = products.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedProducts,
      message: `Found ${paginatedProducts.length} products (DEMO MODE)`
    });
    return;
  }

  // Database mode - original logic
  const db = getDatabase();
  let query = 'SELECT * FROM c WHERE c.isApproved = true';
  const parameters: any[] = [];

  if (search) {
    query += ' AND (CONTAINS(LOWER(c.name), @search) OR CONTAINS(c.barcode, @search))';
    parameters.push({ name: '@search', value: (search as string).toLowerCase() });
  }

  if (category) {
    query += ' AND c.category = @category';
    parameters.push({ name: '@category', value: category });
  }

  query += ' ORDER BY c.lastUpdated DESC';

  const { resources: products } = await db.containers.products.items
    .query({
      query,
      parameters
    })
    .fetchAll();

  // Simple pagination
  const startIndex = ((page as number) - 1) * (limit as number);
  const endIndex = startIndex + (limit as number);
  const paginatedProducts = products.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: paginatedProducts
  });
}));

// Get product by barcode
router.get('/barcode/:barcode', asyncHandler(async (req, res: express.Response<ApiResponse<Product>>) => {
  const { barcode } = req.params;
  const db = getDatabase();

  const { resources: products } = await db.containers.products.items
    .query({
      query: 'SELECT * FROM c WHERE c.barcode = @barcode AND c.isActive = true',
      parameters: [{ name: '@barcode', value: barcode }]
    })
    .fetchAll();

  if (products.length === 0) {
    throw createError('Product not found', 404);
  }

  res.json({
    success: true,
    data: products[0]
  });
}));

// Create product
router.post('/', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: express.Response<ApiResponse<Product>>) => {
  const { error, value } = productSchema.validate(req.body);
  
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { name, barcode, category, brand, description, image } = value;
  const db = getDatabase();

  // Check if product with barcode already exists
  const { resources: existingProducts } = await db.containers.products.items
    .query({
      query: 'SELECT * FROM c WHERE c.barcode = @barcode',
      parameters: [{ name: '@barcode', value: barcode }]
    })
    .fetchAll();

  if (existingProducts.length > 0) {
    throw createError('Product with this barcode already exists', 409);
  }

  const product: Product = {
    id: uuidv4(),
    name,
    barcode,
    category,
    brand,
    description,
    image,
    lowestPrice: 0,
    lastUpdated: new Date(),
    isActive: true,
    createdBy: req.user!.userId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const { resource: createdProduct } = await db.containers.products.items.create(product);

  res.status(201).json({
    success: true,
    data: createdProduct,
    message: 'Product created successfully'
  });
}));

// Update product (approver/admin only)
router.patch('/:productId', authenticateToken, requireApprover, asyncHandler(async (req: AuthenticatedRequest, res: express.Response<ApiResponse<Product>>) => {
  const { productId } = req.params;
  const { name, category, brand, description, image } = req.body;

  const db = getDatabase();
  
  const { resource: product } = await db.containers.products.item(productId, req.body.barcode || productId).read();
  if (!product || !product.isActive) {
    throw createError('Product not found', 404);
  }

  // Update allowed fields
  if (name) product.name = name;
  if (category) product.category = category;
  if (brand !== undefined) product.brand = brand;
  if (description !== undefined) product.description = description;
  if (image !== undefined) product.image = image;
  product.updatedAt = new Date();

  const { resource: updatedProduct } = await db.containers.products.item(productId, product.barcode).replace(product);

  res.json({
    success: true,
    data: updatedProduct,
    message: 'Product updated successfully'
  });
}));

// Approve product (approver/admin only)
router.patch('/:productId/approve', authenticateToken, requireApprover, asyncHandler(async (req: AuthenticatedRequest, res: express.Response<ApiResponse<Product>>) => {
  const { productId } = req.params;
  const db = getDatabase();
  
  const { resource: product } = await db.containers.products.item(productId, req.query.barcode as string || productId).read();
  if (!product) {
    throw createError('Product not found', 404);
  }

  product.approvedBy = req.user!.userId;
  product.updatedAt = new Date();

  const { resource: updatedProduct } = await db.containers.products.item(productId, product.barcode).replace(product);

  res.json({
    success: true,
    data: updatedProduct,
    message: 'Product approved successfully'
  });
}));

// Get single product
router.get('/:productId', asyncHandler(async (req, res: express.Response<ApiResponse<Product>>) => {
  const { productId } = req.params;
  const db = getDatabase();

  const { resource: product } = await db.containers.products.item(productId, req.query.barcode as string || productId).read();
  if (!product || !product.isActive) {
    throw createError('Product not found', 404);
  }

  res.json({
    success: true,
    data: product
  });
}));

export default router;