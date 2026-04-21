import { CosmosClient, Database, Container } from '@azure/cosmos';
import { logger } from '../utils/logger';
import { mockService } from '../services/mockService';

export interface DatabaseConfig {
  client: CosmosClient;
  database: Database;
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
  const databaseName = process.env.COSMOS_DATABASE_NAME || 'LowMoneyDB';

  // Check if we're in demo mode (no database credentials or connection failed)
  if (!endpoint || !key) {
    logger.warn('Azure Cosmos DB credentials not provided. Running in DEMO mode with mock data.');
    return createDemoConfig();
  }

  const client = new CosmosClient({
    endpoint,
    key,
    connectionPolicy: {
      requestTimeout: 30000,
      enableEndpointDiscovery: false,
      preferredLocations: ["West Europe"]
    }
  });

  try {
    // Create database if it doesn't exist
    const { database } = await client.databases.createIfNotExists({
      id: databaseName
    });

    // Create containers
    const containers = {
      users: await createContainer(database, 'users', '/email'),
      products: await createContainer(database, 'products', '/barcode'),
      supermarkets: await createContainer(database, 'supermarkets', '/id'),
      prices: await createContainer(database, 'prices', '/productId'),
      priceHistory: await createContainer(database, 'priceHistory', '/productId')
    };

    dbConfig = {
      client,
      database,
      containers,
      isDemo: false
    };

    logger.info('Database connection established successfully');
    return dbConfig;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    logger.warn('Falling back to DEMO mode with mock data.');
    return createDemoConfig();
  }
}

function createDemoConfig(): DatabaseConfig {
  // Return a mock config for demo mode
  const mockContainer = {} as Container;
  
  dbConfig = {
    client: {} as CosmosClient,
    database: {} as Database,
    containers: {
      users: mockContainer,
      products: mockContainer,
      supermarkets: mockContainer,
      prices: mockContainer,
      priceHistory: mockContainer
    },
    isDemo: true
  };

  return dbConfig;
}

async function createContainer(database: Database, containerId: string, partitionKey: string): Promise<Container> {
  const { container } = await database.containers.createIfNotExists({
    id: containerId,
    partitionKey: {
      paths: [partitionKey],
      kind: 'Hash'
    },
    indexingPolicy: {
      automatic: true,
      includedPaths: [
        {
          path: "/*"
        }
      ]
    }
  });
  return container;
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