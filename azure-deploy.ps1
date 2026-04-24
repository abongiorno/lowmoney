# DEPLOY DIRETTO SU AZURE STATIC WEB APPS
# Senza GitHub - Deploy locale immediato

param(
    [Parameter(Mandatory=$false)]
    [string]$DeploymentToken = ""
)

Write-Host "🚀 DEPLOY LOWMONEY SU AZURE - Senza GitHub" -ForegroundColor Green
Write-Host "=" * 50

# Verifica se esiste il file build
$BuildPath = "frontend\dist"
$ZipPath = "frontend\lowmoney-deploy.zip"

if (!(Test-Path $BuildPath)) {
    Write-Host "❌ Cartella build non trovata. Eseguo npm run build..." -ForegroundColor Yellow
    Set-Location frontend
    npm run build
    Set-Location ..
}

if (!(Test-Path $ZipPath)) {
    Write-Host "📦 Creo file ZIP per deploy..." -ForegroundColor Cyan
    Compress-Archive -Path "$BuildPath\*" -DestinationPath $ZipPath -Force
}

Write-Host "✅ File ZIP pronto: $ZipPath" -ForegroundColor Green

if ($DeploymentToken -ne "") {
    Write-Host "🔑 Utilizzo deployment token fornito..." -ForegroundColor Cyan
    swa deploy --deployment-token="$DeploymentToken" --app-location frontend --output-location dist
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ DEPLOY COMPLETATO!" -ForegroundColor Green
        Write-Host "🌐 URL: https://ambitious-desert-089c19810.7.azurestaticapps.net/" -ForegroundColor Yellow
        Write-Host "👤 Admin login: admin@demo.com / admin" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Deploy fallito. Verifica il token." -ForegroundColor Red
    }
} else {
    Write-Host "📋 DEPLOY MANUALE RICHIESTO:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Vai su Azure Portal: https://portal.azure.com" 
    Write-Host "2. Cerca: 'ambitious-desert-089c19810'"
    Write-Host "3. Static Web Apps > Deploy > Upload"
    Write-Host "4. Carica: $((Get-Location).Path)\$ZipPath"
    Write-Host ""
    Write-Host "OPPURE fornisci il deployment token:"
    Write-Host ".\azure-deploy.ps1 -DeploymentToken 'IL_TUO_TOKEN'"
    Write-Host ""
    Write-Host "🎯 Per ottenere il token:"
    Write-Host "   Azure Portal > Static Web Apps > Settings > Configuration"
}

Write-Host ""
Write-Host "🔒 GitHub DISABILITATO - Solo deploy manuali" -ForegroundColor Magenta