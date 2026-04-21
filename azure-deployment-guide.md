# 🚀 LowMoney - Guida Deployment Azure Completo

## ✅ SERVIZI GIÀ CREATI
- ✅ **Cosmos DB**: `lowmoney-cosmosdb` (Serverless, Italy North)
- ✅ **Resource Group**: `rg-lowmoney`

## 📋 SERVIZI DA CREARE MANUALMENTE

### 1. 📦 STORAGE ACCOUNT
**Scopo**: Archiviazione immagini prodotti
- **Nome**: `lowmoneystorage`
- **Location**: `Italy North`
- **Performance**: `Standard`
- **Redundancy**: `LRS` (Locally Redundant)
- **Access Tier**: `Hot`

**Comando CLI** (se risolvi problemi permessi):
```bash
az storage account create \
  --name lowmoneystorage \
  --resource-group rg-lowmoney \
  --location italynorth \
  --sku Standard_LRS \
  --access-tier Hot
```

### 2. 🌐 APP SERVICE PLAN + APP SERVICE
**Scopo**: Hosting backend Node.js
- **App Service Plan**: `lowmoney-plan` (F1 Free)
- **App Service**: `lowmoney-backend`
- **Runtime**: `Node 18 LTS`

**Comandi CLI**:
```bash
# App Service Plan
az appservice plan create \
  --name lowmoney-plan \
  --resource-group rg-lowmoney \
  --sku F1 \
  --is-linux

# App Service
az webapp create \
  --name lowmoney-backend \
  --resource-group rg-lowmoney \
  --plan lowmoney-plan \
  --runtime "NODE|18-lts"
```

### 3. 📱 STATIC WEB APP
**Scopo**: Hosting frontend React
- **Nome**: `lowmoney-frontend`
- **Source**: GitHub repository
- **Framework**: React

**Comando CLI**:
```bash
az staticwebapp create \
  --name lowmoney-frontend \
  --resource-group rg-lowmoney \
  --location westeurope2 \
  --source https://github.com/TUO-USERNAME/lowmoney \
  --branch main \
  --app-location "frontend" \
  --api-location "backend" \
  --output-location "dist"
```

## 🔧 CONFIGURAZIONE VARIABILI D'AMBIENTE

### Backend (.env)
```bash
# Cosmos DB
COSMOS_DB_ENDPOINT=https://lowmoney-cosmosdb.documents.azure.com:443/
COSMOS_DB_KEY=<PRIMARY_KEY_DA_AZURE>
COSMOS_DB_DATABASE_NAME=lowmoneydb

# Storage Account
AZURE_STORAGE_CONNECTION_STRING=<CONNECTION_STRING_DA_AZURE>
AZURE_STORAGE_CONTAINER_NAME=product-images

# JWT
JWT_SECRET=your-super-secure-random-string-here

# Server
PORT=8000
NODE_ENV=production
```

### Frontend (.env)
```bash
VITE_API_URL=https://lowmoney-backend.azurewebsites.net
VITE_APP_NAME=LowMoney
```

## 📊 COSTI TOTALI STIMATI

| Servizio | Piano | Costo/Mese |
|----------|--------|------------|
| Cosmos DB | Serverless | €0* + pay-per-use |
| Storage Account | Standard LRS | ~€0.50 |
| App Service | F1 Free | €0 |
| Static Web App | Free | €0 |
| **TOTALE** | | **~€0.50-1.00/mese** |

*Include 1000 RU/s e 25 GB gratuite mensili

## 🎯 DEPLOYMENT CODE

### 1. Setup Database Containers
Nel Cosmos DB crea questi containers:
- `users` (partitionKey: `/email`)
- `products` (partitionKey: `/supermarket`)
- `supermarkets` (partitionKey: `/id`)

### 2. Deploy Backend
```bash
cd backend
npm run build
zip -r ../deploy.zip .
az webapp deployment source config-zip \
  --resource-group rg-lowmoney \
  --name lowmoney-backend \
  --src deploy.zip
```

### 3. Deploy Frontend
Il deployment avviene automaticamente tramite GitHub Actions dopo configurazione Static Web App.

## ✅ VERIFICA FINALE

1. **Backend**: https://lowmoney-backend.azurewebsites.net/health
2. **Frontend**: https://lowmoney-frontend.azurestaticapps.net
3. **Database**: Connessione tramite Azure Portal Data Explorer

## 🔗 CONNESSIONI

- Frontend → Backend (API calls)
- Backend → Cosmos DB (database)
- Backend → Storage Account (immagini)