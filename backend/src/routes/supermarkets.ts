import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { getDatabase, isDemoMode, getMockService } from '../config/database';
import { Supermarket, ApiResponse } from '../types';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, requireApprover, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

const supermarketSchema = Joi.object({
  name: Joi.string().min(2).required(),
  address: Joi.string().required(),
  city: Joi.string().required(),
  zipCode: Joi.string().required(),
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  }).required(),
  image: Joi.string().optional(),
  website: Joi.string().uri().optional(),
  phone: Joi.string().optional()
});

// Get all supermarkets
router.get('/', asyncHandler(async (req, res: express.Response<ApiResponse<Supermarket[]>>) => {
  const { city, search, page = 1, limit = 20 } = req.query;

  if (isDemoMode()) {
    // Demo mode - use mock service
    const mockService = getMockService();
    let supermarkets = await mockService.getSupermarkets();

    // Apply city filter
    if (city) {
      supermarkets = supermarkets.filter(supermarket => 
        supermarket.city.toLowerCase() === (city as string).toLowerCase()
      );
    }

    // Apply search filter
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      supermarkets = supermarkets.filter(supermarket => 
        supermarket.name.toLowerCase().includes(searchTerm) ||
        supermarket.address.toLowerCase().includes(searchTerm)
      );
    }

    // Simple pagination
    const startIndex = ((page as number) - 1) * (limit as number);
    const endIndex = startIndex + (limit as number);
    const paginatedSupermarkets = supermarkets.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedSupermarkets,
      message: `Found ${paginatedSupermarkets.length} supermarkets (DEMO MODE)`
    });
    return;
  }

  // Database mode - original logic  
  const db = getDatabase();
  let query = 'SELECT * FROM c WHERE c.isApproved = true';
  const parameters: any[] = [];

  if (city) {
    query += ' AND LOWER(c.city) = @city';
    parameters.push({ name: '@city', value: (city as string).toLowerCase() });
  }

  if (search) {
    query += ' AND (CONTAINS(LOWER(c.name), @search) OR CONTAINS(LOWER(c.address), @search))';
    parameters.push({ name: '@search', value: (search as string).toLowerCase() });
  }

  query += ' ORDER BY c.name';

  const { resources: supermarkets } = await db.containers.supermarkets.items
    .query({
      query,
      parameters
    })
    .fetchAll();

  // Simple pagination
  const startIndex = ((page as number) - 1) * (limit as number);
  const endIndex = startIndex + (limit as number);
  const paginatedSupermarkets = supermarkets.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: paginatedSupermarkets
  });
}));

// Get supermarkets near coordinates
router.get('/nearby', asyncHandler(async (req, res: express.Response<ApiResponse<Supermarket[]>>) => {
  const { lat, lon, radius = 10 } = req.query;
  
  if (!lat || !lon) {
    throw createError('Latitude and longitude are required', 400);
  }

  const db = getDatabase();
  
  // Note: For a production app, you'd want to use geospatial queries
  // For now, we'll get all supermarkets and filter in memory
  const { resources: allSupermarkets } = await db.containers.supermarkets.items
    .query('SELECT * FROM c WHERE c.isActive = true')
    .fetchAll();

  const userLat = parseFloat(lat as string);
  const userLon = parseFloat(lon as string);
  const radiusKm = parseFloat(radius as string);

  // Calculate distance and filter
  const nearbySupermarkets = allSupermarkets
    .map(supermarket => ({
      ...supermarket,
      distance: calculateDistance(
        userLat,
        userLon,
        supermarket.coordinates.latitude,
        supermarket.coordinates.longitude
      )
    }))
    .filter(supermarket => supermarket.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);

  res.json({
    success: true,
    data: nearbySupermarkets
  });
}));

// Create supermarket
router.post('/', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: express.Response<ApiResponse<Supermarket>>) => {
  const { error, value } = supermarketSchema.validate(req.body);
  
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { name, address, city, zipCode, coordinates, image, website, phone } = value;
  const db = getDatabase();

  const supermarket: Supermarket = {
    id: uuidv4(),
    name,
    address,
    city,
    zipCode,
    coordinates,
    image,
    website,
    phone,
    isActive: true,
    createdBy: req.user!.userId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const { resource: createdSupermarket } = await db.containers.supermarkets.items.create(supermarket);

  res.status(201).json({
    success: true,
    data: createdSupermarket,
    message: 'Supermarket created successfully'
  });
}));

// Update supermarket (approver/admin only)
router.patch('/:supermarketId', authenticateToken, requireApprover, asyncHandler(async (req: AuthenticatedRequest, res: express.Response<ApiResponse<Supermarket>>) => {
  const { supermarketId } = req.params;
  const { name, address, city, zipCode, coordinates, image, website, phone } = req.body;

  const db = getDatabase();
  
  const { resource: supermarket } = await db.containers.supermarkets.item(supermarketId, supermarketId).read();
  if (!supermarket || !supermarket.isActive) {
    throw createError('Supermarket not found', 404);
  }

  // Update allowed fields
  if (name) supermarket.name = name;
  if (address) supermarket.address = address;
  if (city) supermarket.city = city;
  if (zipCode) supermarket.zipCode = zipCode;
  if (coordinates) supermarket.coordinates = coordinates;
  if (image !== undefined) supermarket.image = image;
  if (website !== undefined) supermarket.website = website;
  if (phone !== undefined) supermarket.phone = phone;
  supermarket.updatedAt = new Date();

  const { resource: updatedSupermarket } = await db.containers.supermarkets.item(supermarketId, supermarketId).replace(supermarket);

  res.json({
    success: true,
    data: updatedSupermarket,
    message: 'Supermarket updated successfully'
  });
}));

// Get single supermarket
router.get('/:supermarketId', asyncHandler(async (req, res: express.Response<ApiResponse<Supermarket>>) => {
  const { supermarketId } = req.params;
  const db = getDatabase();

  const { resource: supermarket } = await db.containers.supermarkets.item(supermarketId, supermarketId).read();
  if (!supermarket || !supermarket.isActive) {
    throw createError('Supermarket not found', 404);
  }

  res.json({
    success: true,
    data: supermarket
  });
}));

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in kilometers
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}

export default router;