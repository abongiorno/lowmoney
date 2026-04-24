# 🚀 DEPLOY MANUALE SU AZURE STATIC WEB APPS

## ✅ STATUS: PRONTO PER DEPLOY
- **GitHub workflow:** DISABILITATO ✅
- **File ZIP:** `frontend/lowmoney-deploy.zip` ✅  
- **Build:** Completato con tutte le correzioni ✅
- **Bug risolti:** Registrazione e login funzionanti ✅

## 📋 METODI DI DEPLOY DIRETTO

### 🎯 METODO 1: Azure Portal (CONSIGLIATO)

1. **Vai su Azure Portal:** https://portal.azure.com
2. **Cerca la risorsa:** "ambitious-desert-089c19810"  
3. **Vai su Static Web Apps**
4. **Clicca su "Deploy"** nel menu laterale
5. **Seleziona "Upload"**
6. **Carica il file:** `c:\code_per\lowmoney\frontend\lowmoney-deploy.zip`
7. **Conferma** il deploy

### 🔐 METODO 2: Con Deployment Token

Se hai accesso al **Deployment Token** della risorsa Azure:

```bash
cd c:\code_per\lowmoney
swa deploy --deployment-token="IL_TUO_TOKEN" --app-location frontend --output-location dist
```

**Per ottenere il token:**
1. Azure Portal → Static Web Apps
2. Settings → Configuration  
3. Copia il "Deployment token"

### 📁 METODO 3: FTP/SFTP (SE ABILITATO)

Se FTP è abilitato sulla risorsa Azure:
- **Host:** Dai dettagli della risorsa Azure
- **User/Pass:** Dalle credenziali FTP in Azure Portal
- **Cartella:** Upload contenuto di `frontend/dist/`

## ⚠️ IMPORTANTE: GITHUB DISABILITATO

- ✅ Tutti i workflow GitHub sono stati **spostati** in `.github/workflows-disabled/`
- ✅ Nessun deploy automatico da GitHub
- ✅ Solo deploy manuali da questo workspace

## 🔧 CREDENZIALI ADMIN

Per testare l'app dopo il deploy:
- **Email:** admin@demo.com
- **Password:** admin

## 📞 SUPPORTO

Se hai problemi con il deploy, verifica:
1. **Permessi Azure:** Accesso come Owner/Contributor  
2. **Risorsa attiva:** Static Web App online
3. **Token valido:** Non scaduto (se usi metodo 2)

---
**DEPLOY PRONTO! 🎉**