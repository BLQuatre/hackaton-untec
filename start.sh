# Startup script for untecwow project
# This script helps to run the project with Docker Compose

# Stop all running containers if any
docker compose down

# Build and start containers in detached mode
docker compose up --build -d

# Display container status
docker compose ps

echo "Application is running!"
echo "Backend API: http://localhost:8000"
echo "Frontend: http://localhost:3000"
