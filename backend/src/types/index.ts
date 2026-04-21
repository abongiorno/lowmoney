export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  isApproved: boolean;
  profileImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  USER = 'user', // utilizzatore e segnalatore
  APPROVER = 'approver', // approvatore
  ADMIN = 'admin' // amministratore
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  category: string;
  subcategory?: string;
  brand?: string;
  description?: string;
  image?: string;
  lowestPrice: number;
  lastUpdated: Date;
  isActive: boolean;
  isApproved: boolean;
  createdBy: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supermarket {
  id: string;
  name: string;
  address: string;
  city: string;
  zipCode: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  chain?: string;
  image?: string;
  website?: string;
  phone?: string;
  isActive: boolean;
  isApproved: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceHistory {
  id: string;
  productId: string;
  supermarketId: string;
  price: number;
  reportedBy: string;
  approvedBy?: string;
  timestamp: Date;
}

export enum PriceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface AuthToken {
  userId: string;
  email: string;
  role: UserRole;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

// Alias for Price - used in mockService
export type PriceEntry = Price;