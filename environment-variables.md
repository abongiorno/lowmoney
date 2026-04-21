# Environment Variables for Production Deployment

## Backend Environment Variables (.env.production)
COSMOS_DB_ENDPOINT=https://lowmoney-cosmosdb.documents.azure.com:443/
COSMOS_DB_KEY=REPLACE_WITH_COSMOS_DB_PRIMARY_KEY
COSMOS_DB_DATABASE_NAME=lowmoneydb

AZURE_STORAGE_CONNECTION_STRING=REPLACE_WITH_STORAGE_CONNECTION_STRING
AZURE_STORAGE_CONTAINER_NAME=product-images

JWT_SECRET=GENERATE_SECURE_RANDOM_STRING_HERE
PORT=8000
NODE_ENV=production

# Optional for email functionality
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

## Frontend Environment Variables (.env.production)
VITE_API_URL=https://lowmoney-backend.azurewebsites.net
VITE_APP_NAME=LowMoney
VITE_ENVIRONMENT=production

## Steps to Get Real Values

### 1. Cosmos DB Key
1. Go to Azure Portal → lowmoney-cosmosdb
2. Settings → Keys
3. Copy "Primary Key"

### 2. Storage Connection String  
1. Go to Azure Portal → lowmoneystorage
2. Security + networking → Access keys
3. Copy "Connection string" under key1

### 3. Generate JWT Secret
Use this command to generate a secure random string:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. App Service URL
After creating the App Service, the URL will be:
https://lowmoney-backend.azurewebsites.net