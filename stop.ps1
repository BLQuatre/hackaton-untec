# Shutdown script for untecwow project (PowerShell version)

# Stop all running containers
docker-compose down

Write-Host "All containers have been stopped." -ForegroundColor Green
