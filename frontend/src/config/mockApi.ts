// Mock API Configuration for LowMoney
export const API_CONFIG = {
  // MockAPI.io endpoint (create account and project at mockapi.io)
  BASE_URL: 'https://667a123456789.mockapi.io/api/v1', // Replace with your MockAPI URL
  ENDPOINTS: {
    AUTH: {
      REGISTER: '/auth/register',
      LOGIN: '/auth/login',
      PROFILE: '/auth/profile'
    },
    PRODUCTS: {
      LIST: '/products',
      SEARCH: '/products',
      BARCODE: '/products/barcode',
      CREATE: '/products',
      UPDATE: '/products'
    },
    SUPERMARKETS: {
      LIST: '/supermarkets',
      NEARBY: '/supermarkets/nearby',
      CREATE: '/supermarkets'
    },
    PRICES: {
      LIST: '/prices',
      CREATE: '/prices',
      BY_PRODUCT: '/prices/product',
      HISTORY: '/prices/history',
      PENDING: '/prices/pending',
      APPROVE: '/prices/approve'
    }
  }
};

// For demo purposes, we'll use localStorage for auth
export const DEMO_MODE = true;

export const DEMO_USERS = [
  {
    id: '1',
    email: 'user@demo.com',
    password: 'password', 
    firstName: 'Mario',
    lastName: 'Rossi',
    role: 'user'
  },
  {
    id: '2',
    email: 'admin@demo.com',
    password: 'admin',
    firstName: 'Admin',
    lastName: 'LowMoney',
    role: 'admin'
  }
];

export const DEMO_PRODUCTS = [
  {
    id: '1',
    name: 'Pasta Barilla Penne 500g',
    description: 'Pasta di grano duro',
    category: 'alimentari',
    brand: 'Barilla',
    barcode: '8076809513845',
    imageUrl: 'https://via.placeholder.com/200',
    isApproved: true,
    createdBy: '1'
  },
  {
    id: '2', 
    name: 'Latte Parmalat Intero 1L',
    description: 'Latte fresco intero',
    category: 'latticini',
    brand: 'Parmalat',
    barcode: '8000300123456',
    imageUrl: 'https://via.placeholder.com/200',
    isApproved: true,
    createdBy: '1'
  }
];

export const DEMO_SUPERMARKETS = [
  {
    id: '1',
    name: 'Coop',
    location: 'Via Roma 123, Milano',
    latitude: 45.4642,
    longitude: 9.1900
  },
  {
    id: '2',
    name: 'Esselunga',
    location: 'Via Dante 456, Milano', 
    latitude: 45.4708,
    longitude: 9.1852
  }
];

export const DEMO_PRICES = [
  {
    id: '1',
    productId: '1',
    supermarketId: '1',
    price: 1.89,
    discountPrice: null,
    isOnSale: false,
    reportedBy: '1',
    isVerified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    productId: '1',
    supermarketId: '2', 
    price: 1.99,
    discountPrice: 1.79,
    isOnSale: true,
    reportedBy: '1',
    isVerified: true,
    createdAt: new Date().toISOString()
  }
];