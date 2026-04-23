import axios, { AxiosInstance } from 'axios';
import { 
  User, 
  Product, 
  Supermarket, 
  Price, 
  PriceHistory, 
  LoginCredentials, 
  RegisterData,
  PriceReportData,
  ProductFormData,
  SupermarketFormData,
  ApiResponse 
} from '../types';

import { demoApi } from './demoApiService';

// Demo mode flag - set to false for production with Azure Cosmos DB
const DEMO_MODE = true;

// Create axios instance for when we have real backend
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168');
const baseURL = isDevelopment 
  ? 'http://localhost:7071/api'
  : '/api';

const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('lowmoney_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<ApiResponse<{ user: User; token: string }>> => {
    if (DEMO_MODE) {
      return await demoApi.login(credentials.email, credentials.password);
    }
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (data: RegisterData): Promise<ApiResponse<{ user: User; token: string }>> => {
    if (DEMO_MODE) {
      return await demoApi.register(data);
    }
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    if (DEMO_MODE) {
      return await demoApi.getProfile();
    }
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Users API
export const usersApi = {
  getAllUsers: async (): Promise<ApiResponse<User[]>> => {
    const response = await api.get('/users');
    return response.data;
  },

  updateUserRole: async (userId: string, role: string): Promise<ApiResponse<User>> => {
    const response = await api.patch(`/users/${userId}/role`, { role });
    return response.data;
  },

  updateProfile: async (userId: string, data: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await api.patch(`/users/${userId}`, data);
    return response.data;
  },

  deactivateUser: async (userId: string): Promise<ApiResponse<null>> => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  },
};

// Products API
export const productsApi = {
  getAllProducts: async (params?: { search?: string; category?: string; page?: number; limit?: number }): Promise<ApiResponse<Product[]>> => {
    if (DEMO_MODE) {
      return await demoApi.getProducts(params?.search);
    }
    const response = await api.get('/products', { params });
    return response.data;
  },

  getProductById: async (productId: string): Promise<ApiResponse<Product>> => {
    if (DEMO_MODE) {
      const products = await demoApi.getProducts();
      const product = products.data.find((p: any) => p.id === productId);
      return { success: true, data: product };
    }
    const response = await api.get(`/products/${productId}`);
    return response.data;
  },

  getProductByBarcode: async (barcode: string): Promise<ApiResponse<Product>> => {
    if (DEMO_MODE) {
      return await demoApi.getProductByBarcode(barcode);
    }
    const response = await api.get(`/products/barcode/${barcode}`);
    return response.data;
  },

  createProduct: async (data: ProductFormData): Promise<ApiResponse<Product>> => {
    if (DEMO_MODE) {
      return await demoApi.createProduct(data);
    }
    const response = await api.post('/products', data);
    return response.data;
  },

  updateProduct: async (productId: string, data: Partial<ProductFormData>): Promise<ApiResponse<Product>> => {
    const response = await api.patch(`/products/${productId}`, data);
    return response.data;
  },

  approveProduct: async (productId: string, barcode?: string): Promise<ApiResponse<Product>> => {
    const response = await api.patch(`/products/${productId}/approve`, {}, { params: { barcode } });
    return response.data;
  },
};

// Supermarkets API
export const supermarketsApi = {
  getAllSupermarkets: async (params?: { city?: string; search?: string; page?: number; limit?: number }): Promise<ApiResponse<Supermarket[]>> => {
    if (DEMO_MODE) {
      return await demoApi.getSupermarkets();
    }
    const response = await api.get('/supermarkets', { params });
    return response.data;
  },

  getNearbySupermarkets: async (lat: number, lon: number, radius?: number): Promise<ApiResponse<Supermarket[]>> => {
    if (DEMO_MODE) {
      return await demoApi.getNearbySupermarkets(lat, lon, radius);
    }
    const response = await api.get('/supermarkets/nearby', {
      params: { lat, lon, radius }
    });
    return response.data;
  },

  getSupermarketById: async (supermarketId: string): Promise<ApiResponse<Supermarket>> => {
    const response = await api.get(`/supermarkets/${supermarketId}`);
    return response.data;
  },

  createSupermarket: async (data: SupermarketFormData): Promise<ApiResponse<Supermarket>> => {
    const response = await api.post('/supermarkets', data);
    return response.data;
  },

  updateSupermarket: async (supermarketId: string, data: Partial<SupermarketFormData>): Promise<ApiResponse<Supermarket>> => {
    const response = await api.patch(`/supermarkets/${supermarketId}`, data);
    return response.data;
  },
};

// Prices API
export const pricesApi = {
  reportPrice: async (data: PriceReportData): Promise<ApiResponse<Price>> => {
    if (DEMO_MODE) {
      return await demoApi.createPriceReport(data);
    }
    const response = await api.post('/prices/report', data);
    return response.data;
  },

  getProductPrices: async (productId: string, params?: { status?: string; page?: number; limit?: number }): Promise<ApiResponse<Price[]>> => {
    if (DEMO_MODE) {
      return await demoApi.getPricesByProduct(productId);
    }
    const response = await api.get(`/prices/product/${productId}`, { params });
    return response.data;
  },

  getProductHistory: async (productId: string, params?: { supermarketId?: string; page?: number; limit?: number }): Promise<ApiResponse<PriceHistory[]>> => {
    if (DEMO_MODE) {
      // Return empty history for demo
      return { success: true, data: [] };
    }
    const response = await api.get(`/prices/history/${productId}`, { params });
    return response.data;
  },

  getPendingPrices: async (params?: { page?: number; limit?: number }): Promise<ApiResponse<Price[]>> => {
    if (DEMO_MODE) {
      return await demoApi.getPendingPrices();
    }
    const response = await api.get('/prices/pending', { params });
    return response.data;
  },

  approvePrice: async (priceId: string, approve: boolean, productId: string): Promise<ApiResponse<Price>> => {
    if (DEMO_MODE) {
      // Demo: just return success
      return { success: true, data: null as any };
    }
    const response = await api.patch(`/prices/${priceId}/approve`, { approve, productId });
    return response.data;
  },

  getUserReports: async (params?: { page?: number; limit?: number }): Promise<ApiResponse<Price[]>> => {
    if (DEMO_MODE) {
      // Demo: return user's prices
      const prices = JSON.parse(localStorage.getItem('lowmoney_prices') || '[]');
      return { success: true, data: prices };
    }
    const response = await api.get('/prices/my-reports', { params });
    return response.data;
  },

  getUserApprovals: async (params?: { page?: number; limit?: number }): Promise<ApiResponse<Price[]>> => {
    if (DEMO_MODE) {
      return { success: true, data: [] };
    }
    const response = await api.get('/prices/my-approvals', { params });
    return response.data;
  },

  getSupermarketPrices: async (supermarketId: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<PriceHistory[]>> => {
    if (DEMO_MODE) {
      return { success: true, data: [] };
    }
    const response = await api.get(`/prices/supermarket/${supermarketId}`, { params });
    return response.data;
  },
};

export default api;