import { DEMO_USERS, DEMO_PRODUCTS, DEMO_SUPERMARKETS, DEMO_PRICES } from '../config/mockApi';

// Demo API Service using localStorage
export class DemoApiService {
  private static instance: DemoApiService;

  static getInstance(): DemoApiService {
    if (!DemoApiService.instance) {
      DemoApiService.instance = new DemoApiService();
    }
    return DemoApiService.instance;
  }

  // Initialize localStorage with demo data
  initDemoData() {
    if (!localStorage.getItem('lowmoney_products')) {
      localStorage.setItem('lowmoney_products', JSON.stringify(DEMO_PRODUCTS));
    }
    if (!localStorage.getItem('lowmoney_supermarkets')) {
      localStorage.setItem('lowmoney_supermarkets', JSON.stringify(DEMO_SUPERMARKETS));
    }
    if (!localStorage.getItem('lowmoney_prices')) {
      localStorage.setItem('lowmoney_prices', JSON.stringify(DEMO_PRICES));
    }
    if (!localStorage.getItem('lowmoney_users')) {
      localStorage.setItem('lowmoney_users', JSON.stringify([]));
    }
  }

  // Auth API
  async register(userData: any) {
    // Check if email already exists
    const registeredUsers = JSON.parse(localStorage.getItem('lowmoney_users') || '[]');
    const allUsers = [...DEMO_USERS, ...registeredUsers];
    const existingUser = allUsers.find(u => u.email === userData.email);
    
    if (existingUser) {
      throw new Error('Email già registrata');
    }

    const newUser = {
      id: Date.now().toString(),
      ...userData,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    // Add user to localStorage for persistence
    const updatedUsers = [...registeredUsers, newUser];
    localStorage.setItem('lowmoney_users', JSON.stringify(updatedUsers));

    // Create and save token
    const token = btoa(JSON.stringify({ id: newUser.id, email: newUser.email }));
    localStorage.setItem('token', token);
    
    return {
      success: true,
      data: {
        user: { ...newUser, password: undefined },
        token
      }
    };
  }

  async login(email: string, password: string) {
    // Check both demo users and registered users
    const registeredUsers = JSON.parse(localStorage.getItem('lowmoney_users') || '[]');
    const allUsers = [...DEMO_USERS, ...registeredUsers];
    
    console.log('Debug login - searching for:', email, password);
    console.log('Demo users:', DEMO_USERS);
    console.log('All users:', allUsers);
    
    const user = allUsers.find(u => u.email === email && u.password === password);
    
    if (!user) {
      console.log('User not found!');
      throw new Error('Credenziali non valide');
    }

    console.log('User found:', user);
    const token = btoa(JSON.stringify({ id: user.id, email: user.email }));
    localStorage.setItem('token', token);
    console.log('Token saved:', token);
    
    return {
      success: true,
      data: {
        user: { ...user, password: undefined },
        token
      }
    };
  }

  async getProfile() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found in getProfile');
      throw new Error('Non autenticato');
    }

    try {
      const userData = JSON.parse(atob(token));
      console.log('Decoded token data:', userData);
      
      // Check both demo users and registered users
      const registeredUsers = JSON.parse(localStorage.getItem('lowmoney_users') || '[]');
      const allUsers = [...DEMO_USERS, ...registeredUsers];
      console.log('Looking for user ID:', userData.id, 'in users:', allUsers);
      
      const user = allUsers.find(u => u.id === userData.id);
      
      if (!user) {
        console.log('User not found by ID!');
        throw new Error('Utente non trovato');
      }
      
      console.log('Profile found:', user);
      return {
        success: true,
        data: { ...user, password: undefined }
      };
    } catch (error) {
      console.error('Error in getProfile:', error);
      throw new Error('Token non valido');
    }
  }

  logout() {
    localStorage.removeItem('token');
  }

  // Products API
  async getProducts(search?: string) {
    let products = JSON.parse(localStorage.getItem('lowmoney_products') || '[]');
    
    if (search) {
      products = products.filter((p: any) => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    return {
      success: true,
      data: products
    };
  }

  async getProductByBarcode(barcode: string) {
    const products = JSON.parse(localStorage.getItem('lowmoney_products') || '[]');
    const product = products.find((p: any) => p.barcode === barcode);
    
    return {
      success: true,
      data: product || null
    };
  }

  async createProduct(productData: any) {
    const products = JSON.parse(localStorage.getItem('lowmoney_products') || '[]');
    const newProduct = {
      id: Date.now().toString(),
      ...productData,
      isApproved: false,
      createdAt: new Date().toISOString()
    };
    
    products.push(newProduct);
    localStorage.setItem('lowmoney_products', JSON.stringify(products));
    
    return {
      success: true,
      data: newProduct
    };
  }

  // Supermarkets API
  async getSupermarkets() {
    const supermarkets = JSON.parse(localStorage.getItem('lowmoney_supermarkets') || '[]');
    return {
      success: true,
      data: supermarkets
    };
  }

  async getNearbySupermarkets(_lat: number, _lng: number, radius: number = 5) {
    const supermarkets = JSON.parse(localStorage.getItem('lowmoney_supermarkets') || '[]');
    
    // Simple distance calculation (for demo)
    const nearby = supermarkets.map((s: any) => ({
      ...s,
      distance: Math.random() * radius // Demo: random distance
    })).filter((s: any) => s.distance <= radius)
      .sort((a: any, b: any) => a.distance - b.distance);
    
    return {
      success: true,
      data: nearby
    };
  }

  // Prices API
  async getPricesByProduct(productId: string) {
    const prices = JSON.parse(localStorage.getItem('lowmoney_prices') || '[]');
    const productPrices = prices.filter((p: any) => p.productId === productId);
    
    return {
      success: true,
      data: productPrices
    };
  }

  async createPriceReport(priceData: any) {
    const prices = JSON.parse(localStorage.getItem('lowmoney_prices') || '[]');
    const newPrice = {
      id: Date.now().toString(),
      ...priceData,
      isVerified: false,
      createdAt: new Date().toISOString()
    };
    
    prices.push(newPrice);
    localStorage.setItem('lowmoney_prices', JSON.stringify(prices));
    
    return {
      success: true,
      data: newPrice
    };
  }

  async getPendingPrices() {
    const prices = JSON.parse(localStorage.getItem('lowmoney_prices') || '[]');
    const pending = prices.filter((p: any) => !p.isVerified);
    
    return {
      success: true,
      data: pending
    };
  }
}

export const demoApi = DemoApiService.getInstance();