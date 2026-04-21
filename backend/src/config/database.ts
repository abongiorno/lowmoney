import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';
import { mockService } from '../services/mockService';

export interface DatabaseConfig {
  pool: Pool;
  isDemo?: boolean;
}

let dbConfig: DatabaseConfig | null = null;

export async function connectToDatabase(): Promise<DatabaseConfig> {
  if (dbConfig) {
    return dbConfig;
  }

  const databaseUrl = process.env.DATABASE_URL;

  // Check if we're in demo mode (no database credentials)
  if (!databaseUrl) {
    logger.warn('Database URL not provided. Running in DEMO mode with mock data.');
    return createDemoConfig();
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  try {
    // Test the connection
    const client = await pool.connect();
    logger.info('Successfully connected to PostgreSQL database');
    
    // Create tables if they don't exist
    await createTables(client);
    client.release();

    dbConfig = { pool };
    return dbConfig;
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL database:', error);
    logger.warn('Falling back to DEMO mode with mock data.');
    return createDemoConfig();
  }
}

async function createTables(client: PoolClient): Promise<void> {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      role VARCHAR(20) DEFAULT 'user',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createSupermarketsTable = `
    CREATE TABLE IF NOT EXISTS supermarkets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      location VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createProductsTable = `
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      brand VARCHAR(100),
      barcode VARCHAR(50),
      image_url VARCHAR(500),
      is_approved BOOLEAN DEFAULT false,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createPricesTable = `
    CREATE TABLE IF NOT EXISTS prices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID REFERENCES products(id) ON DELETE CASCADE,
      supermarket_id UUID REFERENCES supermarkets(id) ON DELETE CASCADE,
      price DECIMAL(10,2) NOT NULL,
      discount_price DECIMAL(10,2),
      is_on_sale BOOLEAN DEFAULT false,
      reported_by UUID REFERENCES users(id),
      is_verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createPriceHistoryTable = `
    CREATE TABLE IF NOT EXISTS price_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID REFERENCES products(id) ON DELETE CASCADE,
      supermarket_id UUID REFERENCES supermarkets(id) ON DELETE CASCADE,
      old_price DECIMAL(10,2) NOT NULL,
      new_price DECIMAL(10,2) NOT NULL,
      changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_prices_product_supermarket ON prices(product_id, supermarket_id);
    CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id);
  `;

  try {
    await client.query(createUsersTable);
    await client.query(createSupermarketsTable);
    await client.query(createProductsTable);
    await client.query(createPricesTable);
    await client.query(createPriceHistoryTable);
    await client.query(createIndexes);
    
    logger.info('Database tables created/verified successfully');
  } catch (error) {
    logger.error('Error creating database tables:', error);
    throw error;
  }
}

function createDemoConfig(): DatabaseConfig {
  logger.info('Creating demo database configuration');
  return {
    pool: null as any, // Mock pool for demo mode
    isDemo: true
  };
}

export function getDatabase(): DatabaseConfig {
  if (!dbConfig) {
    throw new Error('Database not connected. Call connectToDatabase first.');
  }
  return dbConfig;
}

export function isDemoMode(): boolean {
  return dbConfig?.isDemo || false;
}

export function getMockService() {
  return mockService;
}