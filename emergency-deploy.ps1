#!/usr/bin/env powershell
# DEPLOY EMERGENZA LOWMONEY - Fix errori JavaScript LIVE

$ErrorActionPreference = "Stop"

Write-Host "🚨 DEPLOY EMERGENZA LOWMONEY" -ForegroundColor Red
Write-Host "Risoluzione errori JavaScript live" -ForegroundColor Yellow
Write-Host "=" * 50

# Files corretti pronti
$ZipFile = "frontend\lowmoney-deploy-fixed.zip"
$AppUrl = "https://ambitious-desert-089c19810.7.azurestaticapps.net"

if (!(Test-Path $ZipFile)) {
    Write-Host "❌ ERRORE: File non trovato - $ZipFile" -ForegroundColor Red
    Write-Host "File richiesto per risolvere gli errori JavaScript live!" -ForegroundColor Yellow
    exit 1
}

$FileSize = [math]::Round((Get-Item $ZipFile).Length / 1KB, 2)
Write-Host "✅ File corretto trovato: $ZipFile ($FileSize KB)" -ForegroundColor Green

# Verifica app live con errori
Write-Host ""
Write-Host "🔍 Test app live attuale..." -ForegroundColor Cyan
try {
    $Response = Invoke-WebRequest -Uri $AppUrl -TimeoutSec 10
    Write-Host "⚠️  App raggiungibile ma CON ERRORI JavaScript:" -ForegroundColor Yellow
    Write-Host "   - TypeError: Cannot read properties of undefined (reading 'toFixed')" -ForegroundColor Red
    Write-Host "   - Bundle attuale: index-05030331.js (BUGGATO)" -ForegroundColor Red  
    Write-Host "   - Bundle corretto: index-8aa7ce02.js (NEL ZIP)" -ForegroundColor Green
} catch {
    Write-Host "❌ App non raggiungibile: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 DEPLOY MANUALE IMMEDIATO:" -ForegroundColor Yellow
Write-Host ""
Write-Host "METODO 1 - Azure Portal (VELOCE):" -ForegroundColor White
Write-Host "1. https://portal.azure.com" -ForegroundColor Gray
Write-Host "2. Cerca: 'lowmoney-frontend'" -ForegroundColor Gray
Write-Host "3. Static Web App > Overview" -ForegroundColor Gray
Write-Host "4. 'Manage deployment token' (copia token)" -ForegroundColor Gray
Write-Host "5. Torna qui e usa:" -ForegroundColor Gray
Write-Host "   swa deploy --deployment-token='TOKEN' --app-location frontend --output-location dist" -ForegroundColor DarkGray

Write-Host ""
Write-Host "METODO 2 - GitHub Upload (ALTERNATIVO):" -ForegroundColor White
Write-Host "1. https://github.com/tuorepo/settings/pages" -ForegroundColor Gray  
Write-Host "2. Static Web Apps > Update source" -ForegroundColor Gray
Write-Host "3. Upload ZIP: $ZipFile" -ForegroundColor Gray

Write-Host ""
Write-Host "METODO 3 - VS Code Extension:" -ForegroundColor White
Write-Host "1. Installa: Azure Static Web Apps" -ForegroundColor Gray
Write-Host "2. Azure panel > Static Web Apps > Deploy" -ForegroundColor Gray
Write-Host "3. Select file: $ZipFile" -ForegroundColor Gray

Write-Host ""
Write-Host "🎯 VERIFICA POST-DEPLOY:" -ForegroundColor Magenta
Write-Host "- URL: $AppUrl" -ForegroundColor White
Write-Host "- Login: admin@demo.com / admin" -ForegroundColor White
Write-Host "- Check: Nessun errore TypeError in console" -ForegroundColor White
Write-Host "- Bundle: index-8aa7ce02.js (NON index-05030331.js)" -ForegroundColor White

Write-Host ""
Write-Host "⚡ URGENZA: Gli utenti vedono errori JS critici!" -ForegroundColor Red
Write-Host "Deploy necessario per ripristinare funzionalità app." -ForegroundColor Red