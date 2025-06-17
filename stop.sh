# Shutdown script for untecwow project
# This script helps to stop the Docker Compose setup

# Stop all running containers
docker-compose down

echo "All containers have been stopped."
