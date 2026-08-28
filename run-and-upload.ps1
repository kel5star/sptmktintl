# Daily fetch and upload to Google Drive
# Run via Windows Task Scheduler

$projectDir = "C:\Users\kevin\sprout-market-intelligence-live"
Set-Location $projectDir

# Run the fetch
Write-Host "[$(Get-Date)] Starting fetch..."
& node fetch.js
if ($LASTEXITCODE -ne 0) {
  Write-Error "Fetch failed with exit code $LASTEXITCODE"
  exit 1
}

# Upload to Google Drive
Write-Host "[$(Get-Date)] Uploading to Google Drive..."
rclone copy live-data.json gdrive:/sprout-market-intelligence-live/ --verbose
if ($LASTEXITCODE -ne 0) {
  Write-Error "Upload failed with exit code $LASTEXITCODE"
  exit 1
}

Write-Host "[$(Get-Date)] Success: fetch complete and uploaded."
