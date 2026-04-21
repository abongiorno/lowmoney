# Azure Resources for LowMoney

## Created Resources
- Resource Group: rg-lowmoney
- Cosmos DB: lowmoney-cosmosdb (Serverless, Italy North)

## To Create Next (via Azure Portal)

### 1. Storage Account
- Navigate to: Create a resource → Storage Account
- Name: lowmoneystorage
- Resource Group: rg-lowmoney
- Region: Italy North
- Performance: Standard
- Redundancy: Locally-redundant storage (LRS)

### 2. App Service
- Navigate to: Create a resource → Web App
- Name: lowmoney-backend
- Resource Group: rg-lowmoney
- Runtime: Node 18 LTS
- Operating System: Linux
- Region: Italy North
- App Service Plan: Create new (F1 Free)

### 3. Static Web App
- Navigate to: Create a resource → Static Web App
- Name: lowmoney-frontend
- Resource Group: rg-lowmoney
- Region: West Europe 2

## Configuration Required After Creation

### Get Cosmos DB Connection Details
1. Go to lowmoney-cosmosdb in Azure Portal
2. Navigate to Keys section
3. Copy Primary Connection String
4. Create databases: lowmoneydb
5. Create containers: users, products, supermarkets

### Get Storage Account Connection Details
1. Go to lowmoneystorage in Azure Portal  
2. Navigate to Access keys
3. Copy Connection string
4. Create container: product-images

### Configure App Service Environment Variables
In lowmoney-backend → Configuration → Application settings:
- COSMOS_DB_ENDPOINT: https://lowmoney-cosmosdb.documents.azure.com:443/
- COSMOS_DB_KEY: [from Cosmos DB Keys]
- COSMOS_DB_DATABASE_NAME: lowmoneydb
- AZURE_STORAGE_CONNECTION_STRING: [from Storage Account]
- AZURE_STORAGE_CONTAINER_NAME: product-images
- JWT_SECRET: [generate random secure string]
- PORT: 8000
- NODE_ENV: production