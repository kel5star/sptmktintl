# Setup Sprout Market Intelligence on a new computer
# This script installs rclone, configures Google Drive, and sets up the daily task

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Sprout Market Intelligence - Setup Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host "This script requires Administrator privileges." -ForegroundColor Red
  Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Red
  exit 1
}

# Step 1: Install rclone
Write-Host "`n[Step 1] Installing rclone..." -ForegroundColor Yellow
$installPath = "$env:USERPROFILE\.local\bin"
New-Item -ItemType Directory -Path $installPath -Force | Out-Null

$url = "https://downloads.rclone.org/v1.67.0/rclone-v1.67.0-windows-amd64.zip"
$zipPath = "$env:TEMP\rclone.zip"

try {
  Write-Host "Downloading rclone..."
  Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing -ErrorAction Stop

  Write-Host "Extracting..."
  Expand-Archive -Path $zipPath -DestinationPath "$env:TEMP\rclone-extract" -Force

  $rcloneExe = Get-ChildItem -Path "$env:TEMP\rclone-extract" -Recurse -Filter "rclone.exe" | Select-Object -First 1
  Copy-Item -Path $rcloneExe.FullName -Destination "$installPath\rclone.exe" -Force

  $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if ($currentPath -notlike "*$installPath*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$installPath", "User")
  }

  Write-Host "✓ rclone installed successfully" -ForegroundColor Green
} catch {
  Write-Host "✗ Failed to install rclone: $_" -ForegroundColor Red
  exit 1
}

# Step 2: Configure rclone with Google Drive
Write-Host "`n[Step 2] Configuring rclone with Google Drive..." -ForegroundColor Yellow
Write-Host "When prompted, configure as follows:" -ForegroundColor Cyan
Write-Host "  - Name: gdrive" -ForegroundColor Cyan
Write-Host "  - Type: 17 (Google Drive)" -ForegroundColor Cyan
Write-Host "  - Client ID: (leave blank)" -ForegroundColor Cyan
Write-Host "  - Client Secret: (leave blank)" -ForegroundColor Cyan
Write-Host "  - Scope: 1 (Full access)" -ForegroundColor Cyan
Write-Host "  - Service Account: n (no)" -ForegroundColor Cyan
Write-Host "  - Advanced config: n (no)" -ForegroundColor Cyan
Write-Host "  - Authorize: y (yes) — sign in with your Google account" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Enter to continue..." -ForegroundColor Yellow
Read-Host

& "$installPath\rclone.exe" config

# Step 3: Set execution policy
Write-Host "`n[Step 3] Setting PowerShell execution policy..." -ForegroundColor Yellow
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
Write-Host "✓ Execution policy updated" -ForegroundColor Green

# Step 4: Import the Task Scheduler task
Write-Host "`n[Step 4] Importing Task Scheduler task..." -ForegroundColor Yellow

# Look for the XML file in common locations
$xmlFile = $null
$searchPaths = @(
  "$PSScriptRoot\SproutFetchAndUpload.xml",
  "$env:USERPROFILE\Desktop\SproutFetchAndUpload.xml",
  "$env:USERPROFILE\Downloads\SproutFetchAndUpload.xml"
)

foreach ($path in $searchPaths) {
  if (Test-Path $path) {
    $xmlFile = $path
    break
  }
}

if (-not $xmlFile) {
  Write-Host "✗ Could not find SproutFetchAndUpload.xml" -ForegroundColor Red
  Write-Host "Please ensure the XML file is in one of these locations:" -ForegroundColor Red
  $searchPaths | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  exit 1
}

try {
  $xmlContent = Get-Content $xmlFile | Out-String
  Register-ScheduledTask -Xml $xmlContent -TaskName "SproutFetchAndUpload" -Force | Out-Null
  Write-Host "✓ Task Scheduler task imported" -ForegroundColor Green
} catch {
  Write-Host "✗ Failed to import task: $_" -ForegroundColor Red
  exit 1
}

# Step 5: Verify setup
Write-Host "`n[Step 5] Verifying setup..." -ForegroundColor Yellow

$task = Get-ScheduledTask -TaskName "SproutFetchAndUpload" -ErrorAction SilentlyContinue
if ($task) {
  Write-Host "✓ Task Scheduler task verified" -ForegroundColor Green
} else {
  Write-Host "✗ Task not found" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "The task will run daily at 7:00 AM" -ForegroundColor Cyan
Write-Host "It will:" -ForegroundColor Cyan
Write-Host "  1. Fetch news from 5 sources (Fed, Africanews, Africa Report, World Bank, BLS)" -ForegroundColor Cyan
Write-Host "  2. Upload live-data.json to Google Drive" -ForegroundColor Cyan
Write-Host ""
Write-Host "To verify it's working, the cloud routine will publish the artifact daily." -ForegroundColor Cyan
Write-Host ""
