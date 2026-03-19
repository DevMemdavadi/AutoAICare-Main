# AutoAICare Client Onboarding Script (PowerShell)
# This is a Windows-friendly wrapper for the Python onboarding script

param(
    [string]$CompanyName,
    [string]$CompanyEmail,
    [string]$CompanyPhone,
    [string]$City,
    [string]$State,
    [string]$AdminName,
    [string]$AdminEmail,
    [string]$AdminPassword,
    [string]$Subdomain,
    [switch]$SeedData,
    [switch]$SkipDns,
    [switch]$Yes,
    [switch]$Help
)

# Colors
function Write-Header {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
    Write-Host "║                                                            ║" -ForegroundColor Blue
    Write-Host "║        🚀 AutoAICare Client Onboarding System 🚀          ║" -ForegroundColor Blue
    Write-Host "║                                                            ║" -ForegroundColor Blue
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

# Show help
if ($Help) {
    Write-Header
    Write-Host "AutoAICare Client Onboarding Script" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "USAGE:" -ForegroundColor Green
    Write-Host "  .\onboard_client.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "OPTIONS:" -ForegroundColor Green
    Write-Host "  -CompanyName       Company name"
    Write-Host "  -CompanyEmail      Company email"
    Write-Host "  -CompanyPhone      Company phone (10 digits)"
    Write-Host "  -City              City"
    Write-Host "  -State             State"
    Write-Host "  -AdminName         Admin name"
    Write-Host "  -AdminEmail        Admin email"
    Write-Host "  -AdminPassword     Admin password"
    Write-Host "  -Subdomain         Subdomain (e.g., k3car)"
    Write-Host "  -SeedData          Seed comprehensive test data"
    Write-Host "  -SkipDns           Skip DNS record creation"
    Write-Host "  -Yes               Skip confirmation prompt"
    Write-Host "  -Help              Show this help message"
    Write-Host ""
    Write-Host "EXAMPLES:" -ForegroundColor Green
    Write-Host "  # Interactive mode"
    Write-Host "  .\onboard_client.ps1"
    Write-Host ""
    Write-Host "  # With seed data"
    Write-Host "  .\onboard_client.ps1 -SeedData"
    Write-Host ""
    Write-Host "  # Full non-interactive"
    Write-Host "  .\onboard_client.ps1 ``"
    Write-Host "    -CompanyName 'K3 Car Care' ``"
    Write-Host "    -CompanyEmail 'info@k3car.com' ``"
    Write-Host "    -CompanyPhone '9876543210' ``"
    Write-Host "    -City 'Mumbai' ``"
    Write-Host "    -State 'Maharashtra' ``"
    Write-Host "    -AdminName 'K3 Admin' ``"
    Write-Host "    -AdminEmail 'admin@k3car.com' ``"
    Write-Host "    -AdminPassword 'K3Admin@2026' ``"
    Write-Host "    -Subdomain 'k3car' ``"
    Write-Host "    -SeedData ``"
    Write-Host "    -Yes"
    Write-Host ""
    exit 0
}

# Print header
Write-Header

# Build Python command
$scriptPath = Join-Path $PSScriptRoot "onboard_client.py"
$pythonArgs = @($scriptPath)

if ($CompanyName) { $pythonArgs += "--company-name", $CompanyName }
if ($CompanyEmail) { $pythonArgs += "--company-email", $CompanyEmail }
if ($CompanyPhone) { $pythonArgs += "--company-phone", $CompanyPhone }
if ($City) { $pythonArgs += "--city", $City }
if ($State) { $pythonArgs += "--state", $State }
if ($AdminName) { $pythonArgs += "--admin-name", $AdminName }
if ($AdminEmail) { $pythonArgs += "--admin-email", $AdminEmail }
if ($AdminPassword) { $pythonArgs += "--admin-password", $AdminPassword }
if ($Subdomain) { $pythonArgs += "--subdomain", $Subdomain }
if ($SeedData) { $pythonArgs += "--seed-data" }
if ($SkipDns) { $pythonArgs += "--skip-dns" }
if ($Yes) { $pythonArgs += "--yes" }

# Check if Python is available
try {
    $pythonVersion = python --version 2>&1
    Write-Info "Using: $pythonVersion"
} catch {
    Write-Error-Custom "Python is not installed or not in PATH"
    Write-Info "Please install Python 3.8 or higher"
    exit 1
}

# Run the Python script
Write-Info "Starting onboarding process..."
Write-Host ""

try {
    & python @pythonArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Success "Onboarding completed successfully! 🎉"
    } else {
        Write-Host ""
        Write-Error-Custom "Onboarding failed with exit code: $LASTEXITCODE"
        exit $LASTEXITCODE
    }
} catch {
    Write-Host ""
    Write-Error-Custom "Error running onboarding script: $_"
    exit 1
}
