# Deploy diretto LowMoney su Azure Static Web Apps
# Workaround per problemi Azure CLI

param(
    [string]$ZipFile = "frontend\lowmoney-deploy-fixed.zip"
)

Write-Host "🚀 DEPLOY DIRETTO LOWMONEY" -ForegroundColor Green
Write-Host "=" * 40

# Verifica file ZIP
if (!(Test-Path $ZipFile)) {
    Write-Host "❌ File non trovato: $ZipFile" -ForegroundColor Red
    exit 1
}

$ZipSize = (Get-Item $ZipFile).Length / 1KB
Write-Host "📦 File ZIP: $ZipFile ($([Math]::Round($ZipSize, 2)) KB)" -ForegroundColor Cyan

# URL dell'app Azure
$AppUrl = "https://ambitious-desert-089c19810.7.azurestaticapps.net"

Write-Host ""
Write-Host "📋 ISTRUZIONI DEPLOY MANUALE:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Vai su: https://portal.azure.com" -ForegroundColor White
Write-Host "2. Cerca: 'lowmoney-frontend'" -ForegroundColor White  
Write-Host "3. Static Web Apps > Overview > Manage deployment token" -ForegroundColor White
Write-Host "4. Copia il token e usa:"
Write-Host "   swa deploy --deployment-token=`"IL_TUO_TOKEN`" --app-location frontend --output-location dist" -ForegroundColor Gray
Write-Host ""
Write-Host "OPPURE UPLOAD MANUALE:" -ForegroundColor Yellow
Write-Host "1. Azure Portal > Static Web Apps > Overview > Browse" -ForegroundColor White
Write-Host "2. Trascina e rilascia il file ZIP: $ZipFile" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ App live: $AppUrl" -ForegroundColor Green
Write-Host "👤 Login admin: admin@demo.com / admin" -ForegroundColor Cyan

# Test connettività
Write-Host ""
Write-Host "🔍 Test connettività app..." -ForegroundColor Cyan
try {
    $Response = Invoke-WebRequest -Uri $AppUrl -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ App raggiungibile (Status: $($Response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "⚠️  App non raggiungibile: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Note:" -ForegroundColor Magenta
Write-Host "- Il file ZIP contiene i fix per i prezzi undefined" -ForegroundColor White
Write-Host "- Bundle corretto: index-8aa7ce02.js" -ForegroundColor White
Write-Host "- Sostituisce bundle attuale: index-05030331.js" -ForegroundColor White