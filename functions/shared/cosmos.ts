import { CosmosClient, Container, Database } from '@azure/cosmos';

// Singleton Cosmos DB client and containers
class CosmosService {
  private static instance: CosmosService;
  private client: CosmosClient;
  private database: Database;

  public usersContainer: Container;
  public productsContainer: Container;
  public supermarketsContainer: Container;
  public pricesContainer: Container;
  public priceHistoryContainer: Container;

  private constructor() {
    const connectionString = process.env.COSMOS_DB_CONNECTION;
    if (!connectionString) {
      throw new Error('COSMOS_DB_CONNECTION environment variable not set');
    }

    this.client = new CosmosClient(connectionString);
    this.database = this.client.database('lowmoney');

    // Initialize container references
    this.usersContainer = this.database.container('users');
    this.productsContainer = this.database.container('products');
    this.supermarketsContainer = this.database.container('supermarkets');
    this.pricesContainer = this.database.container('prices');
    this.priceHistoryContainer = this.database.container('priceHistory');
  }

  public static getInstance(): CosmosService {
    if (!CosmosService.instance) {
      CosmosService.instance = new CosmosService();
    }
    return CosmosService.instance;
  }
}

// Export singleton instance
export const cosmos = CosmosService.getInstance();

// Export individual containers for convenience
export const {
  usersContainer,
  productsContainer,
  supermarketsContainer,
  pricesContainer,
  priceHistoryContainer
} = cosmos;