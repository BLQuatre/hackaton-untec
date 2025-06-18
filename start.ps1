# Startup script for untecwow project (PowerShell version)

# Stop all running containers if any
docker compose down

# Build and start containers in detached mode
$env:COMPOSE_BAKE = "true"
docker compose up --build -d

# Display container status
docker compose ps

Write-Host "Application is running!" -ForegroundColor Green
Write-Host "Backend API: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
