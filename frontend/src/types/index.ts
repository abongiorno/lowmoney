export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  USER = 'user',
  APPROVER = 'approver',
  ADMIN = 'admin'
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  category: string;
  brand?: string;
  description?: string;
  image?: string;
  lowestPrice: number;
  lastUpdated: string;
  isActive: boolean;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supermarket {
  id: string;
  name: string;
  chain?: string; // Added chain property
  address: string;
  city: string;
  zipCode: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  image?: string;
  website?: string;
  phone?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  distance?: number; // Added when getting nearby supermarkets
}

export interface Price {
  id: string;
  productId: string;
  supermarketId: string;
  price: number;
  reportedBy: string;
  status: PriceStatus;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistory {
  id: string;
  productId: string;
  supermarketId: string;
  price: number;
  reportedBy: string;
  approvedBy?: string;
  timestamp: string;
}

export enum PriceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface PriceReportData {
  productId: string;
  supermarketId: string;
  price: number;
  notes?: string;
}

export interface ProductFormData {
  name: string;
  barcode: string;
  category: string;
  brand?: string;
  description?: string;
  image?: string;
}

export interface SupermarketFormData {
  name: string;
  address: string;
  city: string;
  zipCode: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  image?: string;
  website?: string;
  phone?: string;
}