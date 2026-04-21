# LowMoney - Price Tracker App

Una web app responsive per il censimento e il confronto dei prezzi di prodotti alimentari nei supermercati, con sistema di autenticazione utenti e ruoli gerarchici.

## ✨ Architettura

- **Frontend**: React TypeScript con Material-UI, Vite, React Query
- **Backend**: Azure Functions (serverless) con TypeScript  
- **Database**: Azure Cosmos DB (NoSQL)
- **Hosting**: GitHub Pages (frontend) + Azure Functions (API)
- **Autenticazione**: JWT con ruoli utente (user/approver/admin)
- **Design**: Completamente responsive per PC/tablet/mobile

## 🚀 Demo Live

- **App**: https://abongiorno.github.io/lowmoney/
- **API**: https://lowmoney-functions.azurewebsites.net/api

### Credenziali Demo
- **Utente**: `user@demo.com` / `password`  
- **Admin**: `admin@demo.com` / `admin`

## 🚀 Funzionalità

### Prodotti
- ✅ Censimento prodotti con nome, immagine, codice a barre
- ✅ Categorie prodotti (alimentari, bevande, latticini, ecc.)
- ✅ Ricerca prodotti per nome o codice a barre
- ✅ Storico prezzi completo con data/ora e supermercato
- ✅ Tracking prezzo più basso automatico

### Supermercati
- ✅ Gestione supermercati con nome, posizione geografica, indirizzo
- ✅ Ricerca supermercati per vicinanza (geolocalizzazione)
- ✅ Immagini identificative dei supermercati
- ✅ Informazioni di contatto (telefono, sito web)

### Sistema Utenti
- ✅ Registrazione utenti tramite email
- ✅ 3 ruoli utente:
  - **Utilizzatore/Segnalatore**: Ricerca prodotti e segnala prezzi
  - **Approvatore**: Tutte le funzioni utente + approvazione segnalazioni
  - **Amministratore**: Gestione completa sistema e utenti
- ✅ Tracciamento completo attività utenti

### Autenticazione e Sicurezza
- ✅ JWT token-based authentication
- ✅ Middleware di autorizzazione per ruoli
- ✅ Password hashing con bcrypt
- ✅ Gestione sessioni sicura

## 🛠 Tecnologie Utilizzate

### Frontend
- **React 18** con TypeScript
- **Material-UI (MUI)** per UI responsive
- **React Router** per navigazione
- **React Query** per state management API
- **React Hook Form** per gestione form
- **Vite** come build tool

### Backend
- **Node.js** con **Express** e TypeScript
- **Azure Cosmos DB** come database NoSQL
- **JWT** per autenticazione
- **Joi** per validazione input
- **bcrypt** per hashing password
- **Multer** per upload file

### Deployment
- **Azure App Service** per hosting
- **Azure Cosmos DB** per database
- **Azure Blob Storage** per immagini

## 📁 Struttura Progetto

```
lowmoney/
├── backend/                 # API Node.js/Express
│   ├── src/
│   │   ├── config/         # Configurazione database
│   │   ├── middleware/     # Auth, error handling
│   │   ├── routes/         # Route API
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Utility functions
│   │   └── index.ts        # Entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # React App
│   ├── src/
│   │   ├── components/     # Componenti riutilizzabili
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Pagine applicazione
│   │   ├── services/       # API clients
│   │   ├── types/          # TypeScript types
│   │   └── main.tsx        # Entry point
│   ├── index.html
│   └── vite.config.ts
└── package.json            # Root package
```

## 🚦 Quick Start

### Prerequisiti
- Node.js 18+
- Account Azure con Cosmos DB

### Installazione

1. **Clona il repository**
```bash
git clone <repository-url>
cd lowmoney
```

2. **Installa dipendenze**
```bash
npm run install:all
```

3. **Configura variabili d'ambiente**
```bash
# Backend
cp backend/.env.example backend/.env
# Modifica backend/.env con le tue credenziali Azure
```

4. **Avvia in modalità sviluppo**
```bash
npm run dev
```

L'applicazione sarà disponibile su:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Build per produzione
```bash
npm run build
```

## 🔧 Configurazione Azure

### Cosmos DB Setup
1. Crea un account Azure Cosmos DB (SQL API)
2. Ottieni endpoint e chiave primaria
3. Configura le variabili d'ambiente:
```env
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your-primary-key
COSMOS_DATABASE_NAME=LowMoneyDB
```

### Container Cosmos DB
L'applicazione creerà automaticamente questi container:
- `users` (partition key: `/email`)
- `products` (partition key: `/barcode`) 
- `supermarkets` (partition key: `/id`)
- `prices` (partition key: `/productId`)
- `priceHistory` (partition key: `/productId`)

## 📱 Responsive Design

L'app è completamente responsive e ottimizzata per:
- 🖥️ **Desktop/PC** - Layout completo con sidebar
- 📱 **Mobile** - Navigation drawer e layout mobile-first  
- 📺 **Tablet** - Layout adattivo per schermi medi

## 🔐 API Endpoints

### Autenticazione
- `POST /api/auth/register` - Registrazione utente
- `POST /api/auth/login` - Login utente  
- `GET /api/auth/me` - Profilo utente corrente

### Prodotti
- `GET /api/products` - Lista prodotti (con ricerca/filtri)
- `POST /api/products` - Crea prodotto
- `GET /api/products/:id` - Dettaglio prodotto
- `GET /api/products/barcode/:barcode` - Trova per codice a barre

### Supermercati
- `GET /api/supermarkets` - Lista supermercati
- `GET /api/supermarkets/nearby` - Supermercati nelle vicinanze
- `POST /api/supermarkets` - Crea supermercato

### Prezzi
- `POST /api/prices/report` - Segnala nuovo prezzo
- `GET /api/prices/product/:id` - Prezzi prodotto
- `GET /api/prices/history/:id` - Storico prezzi prodotto
- `GET /api/prices/pending` - Prezzi in attesa approvazione (approver+)
- `PATCH /api/prices/:id/approve` - Approva/rifiuta prezzo (approver+)

## 👥 Ruoli Utente

### Utilizzatore/Segnalatore (`user`)
- Ricerca prodotti e supermercati
- Segnalazione nuovi prezzi
- Visualizzazione storico personale

### Approvatore (`approver`)  
- Tutte le funzioni dell'utilizzatore
- Approvazione/rifiuto segnalazioni prezzi
- Gestione contenuti

### Amministratore (`admin`)
- Controllo completo sistema
- Gestione utenti e ruoli
- Accesso analytics e report

## 🔒 Sicurezza

- ✅ Autenticazione JWT con token sicuri
- ✅ Autorizzazione basata su ruoli
- ✅ Validazione input con Joi  
- ✅ Protezione CORS configurata
- ✅ Rate limiting e helmet headers
- ✅ Password hashing sicuro

## 📊 Database Schema (Cosmos DB)

### Users Collection
```typescript
{
  id: string,
  email: string,
  password: string, // hashed
  firstName: string,
  lastName: string, 
  role: 'user' | 'approver' | 'admin',
  profileImage?: string,
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Products Collection  
```typescript
{
  id: string,
  name: string,
  barcode: string, // partition key
  category: string,
  brand?: string,
  image?: string,
  lowestPrice: number,
  createdBy: string,
  approvedBy?: string,
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## 🚀 Deployment su Azure

### App Service Deployment
1. Crea Azure App Service (Node.js 18)
2. Configura variabili d'ambiente
3. Deploy tramite GitHub Actions o Azure CLI

### Esempio GitHub Action
```yaml
name: Deploy to Azure
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm run install:all
      - run: npm run build
      - name: Deploy to Azure WebApp
        uses: azure/webapps-deploy@v2
        with:
          app-name: 'lowmoney-app'
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
```

## 📈 Funzionalità Future

- [ ] Notifiche push per prezzi bassi
- [ ] Comparazione prezzi automatica
- [ ] Lista della spesa intelligente
- [ ] API mobile per app nativa
- [ ] Analytics avanzate per admin
- [ ] Sistema di recensioni prodotti
- [ ] Integrazione con sistemi fedeltà

## 📄 Licenza

MIT License - Vedi file LICENSE per dettagli.

## 👨‍💻 Contributi

1. Fork il progetto
2. Crea feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit modifiche (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri Pull Request

## 📞 Supporto

Per supporto o domande, contatta il team di sviluppo.

---

**LowMoney** - Trova i prezzi più bassi, risparmia di più! 💰