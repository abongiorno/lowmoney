import { User, Product, Supermarket, PriceEntry } from '../types';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock data
let mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@lowmoney.com',
    password: bcrypt.hashSync('admin123', 10), 
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isApproved: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

let mockProducts: Product[] = [
  {
    id: '1',
    name: 'Pasta Barilla',
    brand: 'Barilla',
    category: 'alimentari',
    subcategory: 'pasta',
    barcode: '8076809513876',
    description: 'Pasta di semola di grano duro',
    isApproved: true,
    createdBy: '1',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2', 
    name: 'Latte Parmalat',
    brand: 'Parmalat',
    category: 'alimentari',
    subcategory: 'latticini',
    barcode: '8000300631542',
    description: 'Latte intero UHT 1L',
    isApproved: true,
    createdBy: '1',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

let mockSupermarkets: Supermarket[] = [
  {
    id: '1',
    name: 'Coop',
    chain: 'Coop',
    address: 'Via Roma 123, Milano',
    city: 'Milano',
    province: 'MI',
    region: 'Lombardia',
    country: 'Italia',
    latitude: 45.4642,
    longitude: 9.1900,
    phone: '+39 02 1234567',
    isApproved: true,
    createdBy: '1',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Esselunga',
    chain: 'Esselunga', 
    address: 'Corso Buenos Aires 456, Milano',
    city: 'Milano',
    province: 'MI',
    region: 'Lombardia',
    country: 'Italia',
    latitude: 45.4758,
    longitude: 9.2008,
    phone: '+39 02 9876543',
    isApproved: true,
    createdBy: '1',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

let mockPrices: PriceEntry[] = [
  {
    id: '1',
    productId: '1',
    supermarketId: '1',
    price: 1.89,
    priceType: 'regular',
    isPromotion: false,
    isApproved: true,
    reportedBy: '1',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    productId: '1',
    supermarketId: '2', 
    price: 1.95,
    priceType: 'regular',
    isPromotion: false,
    isApproved: true,
    reportedBy: '1',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export class MockService {
  // User methods
  async findUserByEmail(email: string): Promise<User | null> {
    return mockUsers.find(user => user.email === email) || null;
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockUsers.push(newUser);
    return newUser;
  }

  async findUserById(id: string): Promise<User | null> {
    return mockUsers.find(user => user.id === id) || null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const userIndex = mockUsers.findIndex(user => user.id === id);
    if (userIndex === -1) return null;
    
    mockUsers[userIndex] = { ...mockUsers[userIndex], ...updates, updatedAt: new Date() };
    return mockUsers[userIndex];
  }

  // Product methods
  async getProducts(): Promise<Product[]> {
    const products = mockProducts.filter(product => product.isApproved);
    
    // Add lowestPrice to each product
    const productsWithPrices = products.map(product => {
      const productPrices = mockPrices.filter(price => 
        price.productId === product.id && price.isApproved
      );
      
      const lowestPrice = productPrices.length > 0 
        ? Math.min(...productPrices.map(p => p.price))
        : 0;

      return {
        ...product,
        lowestPrice
      };
    });

    return productsWithPrices;
  }

  async getProductById(id: string): Promise<Product | null> {
    return mockProducts.find(product => product.id === id) || null;
  }

  async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const newProduct: Product = {
      ...productData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockProducts.push(newProduct);
    return newProduct;
  }

  async searchProductsByName(name: string): Promise<Product[]> {
    const searchTerm = name.toLowerCase();
    return mockProducts.filter(product => 
      product.name.toLowerCase().includes(searchTerm) && product.isApproved
    );
  }

  // Supermarket methods
  async getSupermarkets(): Promise<Supermarket[]> {
    const supermarkets = mockSupermarkets.filter(supermarket => supermarket.isApproved);
    
    // Add mock distance for demo purposes
    const supermarketsWithDistance = supermarkets.map((supermarket, index) => ({
      ...supermarket,
      distance: (index + 1) * 0.8 // Mock distance: 0.8, 1.6, 2.4 km, etc.
    }));

    return supermarketsWithDistance;
  }

  async getSupermarketById(id: string): Promise<Supermarket | null> {
    return mockSupermarkets.find(supermarket => supermarket.id === id) || null;
  }

  async createSupermarket(supermarketData: Omit<Supermarket, 'id' | 'createdAt' | 'updatedAt'>): Promise<Supermarket> {
    const newSupermarket: Supermarket = {
      ...supermarketData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockSupermarkets.push(newSupermarket);
    return newSupermarket;
  }

  // Price methods
  async getPrices(): Promise<PriceEntry[]> {
    return mockPrices.filter(price => price.isApproved);
  }

  async createPrice(priceData: Omit<PriceEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<PriceEntry> {
    const newPrice: PriceEntry = {
      ...priceData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockPrices.push(newPrice);
    return newPrice;
  }

  async getPricesByProduct(productId: string): Promise<PriceEntry[]> {
    return mockPrices.filter(price => price.productId === productId && price.isApproved);
  }

  // Auth methods
  generateToken(user: User): string {
    const secret = process.env.JWT_SECRET || 'demo-secret-key';
    return jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      secret,
      { expiresIn: '24h' }
    );
  }

  async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}

export const mockService = new MockService();