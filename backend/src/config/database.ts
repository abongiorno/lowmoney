import { CosmosClient, Database, Container } from '@azure/cosmos';
import { logger } from '../utils/logger';
import { mockService } from '../services/mockService';

export interface DatabaseConfig {
  containers: {
    users: Container;
    products: Container;
    supermarkets: Container;
    prices: Container;
    priceHistory: Container;
  };
  isDemo?: boolean;
}

let dbConfig: DatabaseConfig | null = null;

export async function connectToDatabase(): Promise<DatabaseConfig> {
  if (dbConfig) {
    return dbConfig;
  }

  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  const databaseName = process.env.COSMOS_DATABASE_NAME;

  // Check if we're in demo mode (no database credentials)
  if (!endpoint || !key || key === 'your-primary-key-here') {
    logger.warn('Cosmos DB credentials not provided. Running in DEMO mode with mock data.');
    return createDemoConfig();
  }

  try {
    // Create Cosmos client
    const client = new CosmosClient({ endpoint, key });
    
    // Get database reference
    const database = client.database(databaseName || 'lowmoney');
    
    // Test the connection by reading database properties
    await database.read();
    logger.info('Successfully connected to Azure Cosmos DB');
    
    // Get container references
    const containers = {
      users: database.container('users'),
      products: database.container('products'),
      supermarkets: database.container('supermarkets'),
      prices: database.container('prices'),
      priceHistory: database.container('priceHistory')
    };

    // Verify containers exist
    await verifyContainers(containers);

    dbConfig = { containers };
    return dbConfig;
  } catch (error) {
    logger.error('Failed to connect to Azure Cosmos DB:', error);
    logger.warn('Falling back to DEMO mode with mock data.');
    return createDemoConfig();
  }
}

async function verifyContainers(containers: any): Promise<void> {
  try {
    // Try to read from each container to verify they exist
    const containerNames = Object.keys(containers);
    for (const name of containerNames) {
      await containers[name].read();
      logger.info(`Verified container: ${name}`);
    }
  } catch (error) {
    logger.warn('Some containers may not exist yet:', error);
    // Don't throw error - containers might be created on first use
  }
}

function createDemoConfig(): DatabaseConfig {
  logger.info('Creating demo database configuration');
  return {
    containers: null as any, // Mock containers for demo mode
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