<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## LowMoney - Price Tracker App

Questa è una web app completa per il censimento e confronto dei prezzi di prodotti alimentari nei supermercati.

### Tecnologie utilizzate:
- **Frontend**: React TypeScript con Material-UI, Vite, React Query
- **Backend**: Node.js Express TypeScript con Azure Cosmos DB
- **Database**: Azure Cosmos DB (NoSQL)
- **Autenticazione**: JWT con ruoli utente (user/approver/admin)
- **Design**: Completamente responsive per PC/tablet/mobile

### Setup del progetto:
1. Installa Node.js 18+ se non presente
2. Esegui `npm run install:all` per installare tutte le dipendenze
3. Configura le variabili d'ambiente in `backend/.env` (vedi `.env.example`)
4. Esegui `npm run dev` per avviare entrambi frontend e backend

### Struttura del progetto:
- `/frontend` - React app (porta 3000)
- `/backend` - Express API (porta 5000)  
- `/package.json` - Script di build e sviluppo

Vedi il README.md per documentazione completa e istruzioni di deployment su Azure.

- [x] Verify that the copilot-instructions.md file in the .github directory is created.
- [x] Clarify Project Requirements
- [x] Scaffold the Project  
- [x] Customize the Project
- [x] Install Required Extensions
- [x] Compile the Project
- [x] Create and Run Task
- [x] Launch the Project
- [x] Ensure Documentation is Complete