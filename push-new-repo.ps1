$ErrorActionPreference = "Continue"
$env:GIT_PAGER = ""
cd "h:\10.02\qui.02"
Write-Host "Changing remote URL..."
& git remote set-url origin "https://github.com/infoquiae-create/qui.ae-11.02.git"
Write-Host "Remote URL changed. Current config:"
& git remote -v
Write-Host "Pushing to new repository..."
& git push -u origin main --force 2>&1
Write-Host "Push complete!"
