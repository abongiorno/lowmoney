# 🚀 Deploy LowMoney su Azure

## 📋 Servizi già attivi:
- ✅ Static Web App: `lowmoney-web`
- ✅ App Service: `lowmoneyapp`
- ✅ Cosmos DB: `lowmoney-cosmosdb`
- ✅ Storage Account: `lowmoneystorage`

## 🌐 URLs pubblici previsti:
- **Frontend**: https://lowmoney-web.azurestaticapps.net
- **Backend**: https://lowmoneyapp.azurewebsites.net

## 📦 Step per deploy:

### 1. Frontend (Static Web App)
```bash
# Build del frontend
cd frontend
npm run build

# Deploy manuale:
# - Vai su https://portal.azure.com
# - Apri "lowmoney-web" Static Web App
# - Carica il contenuto di /frontend/dist
```

### 2. Backend (App Service)
```bash
# Build del backend
cd backend
npm run build

# Deploy manuale:
# - Vai su https://portal.azure.com
# - Apri "lowmoneyapp" App Service
# - Usa "Deployment Center" per deploy
```

### 3. Configurazione ambiente
- Aggiorna `/frontend/src/services/api.ts`
- Cambia baseURL a: `https://lowmoneyapp.azurewebsites.net/api`
- Configura variabili ambiente Azure con chiavi Cosmos DB reali

## 🔧 Configurazione rapida:

### A. Aggiorna API URL nel frontend
```typescript
// frontend/src/services/api.ts
const api = axios.create({
  baseURL: 'https://lowmoneyapp.azurewebsites.net/api',
  timeout: 10000,
});
```

### B. Configura backend per Azure
```typescript
// backend/src/index.ts
app.use(cors({
  origin: [
    'http://localhost:3001',
    'https://lowmoney-web.azurestaticapps.net'
  ],
  credentials: true
}));
```

## 🎯 Risultato finale:
- 🌐 App accessibile da tutto il mondo
- 📱 URL pubblico condivisibile
- 🔒 HTTPS automatico
- 💰 Costo: €0.00/mese