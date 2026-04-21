import { DEMO_MODE, DEMO_USERS, DEMO_PRODUCTS, DEMO_SUPERMARKETS, DEMO_PRICES } from '../config/mockApi';

// Demo API Service using localStorage
export class DemoApiService {
  private static instance: DemoApiService;
  private currentUser: any = null;

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
  }

  // Auth API
  async register(userData: any) {
    const newUser = {
      id: Date.now().toString(),
      ...userData,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    // Add to demo users (in real app would be sent to server)
    const token = btoa(JSON.stringify({ id: newUser.id, email: newUser.email }));
    
    return {
      success: true,
      data: {
        user: { ...newUser, password: undefined },
        token
      }
    };
  }

  async login(email: string, password: string) {
    const user = DEMO_USERS.find(u => u.email === email && u.password === password);
    
    if (!user) {
      throw new Error('Credenziali non valide');
    }

    const token = btoa(JSON.stringify({ id: user.id, email: user.email }));
    this.currentUser = user;
    localStorage.setItem('lowmoney_token', token);
    
    return {
      success: true,
      data: {
        user: { ...user, password: undefined },
        token
      }
    };
  }

  async getProfile() {
    const token = localStorage.getItem('lowmoney_token');
    if (!token) throw new Error('Non autenticato');

    const userData = JSON.parse(atob(token));
    const user = DEMO_USERS.find(u => u.id === userData.id);
    
    if (!user) throw new Error('Utente non trovato');
    
    return {
      success: true,
      data: { ...user, password: undefined }
    };
  }

  logout() {
    localStorage.removeItem('lowmoney_token');
    this.currentUser = null;
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

  async getNearbySupermarkets(lat: number, lng: number, radius: number = 5) {
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