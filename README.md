# UntecWow Project

A web application with Django backend and Next.js frontend.

## Project Structure

- `backend/`: Django REST API backend
- `frontend/`: Next.js frontend
- `.env`: Environment variables
- `docker-compose.yml`: Docker Compose configuration

## Getting Started with Docker

The easiest way to run this project is using Docker Compose.

### Prerequisites

- Docker and Docker Compose installed on your system

### Running the Application

On Windows (PowerShell):

```powershell
# Start the application
.\start.ps1

# Stop the application
.\stop.ps1
```

On Linux/Mac:

```bash
# Start the application
./start.sh

# Stop the application
./stop.sh
```

Or use Docker Compose directly:

```bash
# Start the application
docker-compose up -d

# Stop the application
docker-compose down
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## Development

### Backend (Django)

The backend is a Django REST API application.

Key files:
- `backend/api/models.py`: Database models
- `backend/api/views.py`: API views
- `backend/api/urls.py`: API routes

### Frontend (Next.js)

The frontend is a Next.js application with TypeScript.

Key files:
- `frontend/app/page.tsx`: Main page component
- `frontend/app/api/*`: API routes for the frontend
- `frontend/components/`: Reusable UI components

## Environment Variables

Environment variables are stored in the `.env` file in the root directory:

- `SECRET_KEY`: Django secret key
- `DEBUG`: Enable debug mode (True/False)
- `ALLOWED_HOSTS`: Comma-separated list of allowed hosts
- `DATABASE_URL`: Database connection URL
- `NEXT_PUBLIC_API_URL`: URL for the backend API
- `BACKEND_PORT`: Port for the backend service
- `FRONTEND_PORT`: Port for the frontend service
