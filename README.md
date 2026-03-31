# House Construction Management System (HCMS)

A full-stack ecosystem for managing the entire residential construction lifecycle, built with Django (REST) and React.

> [!TIP]
> For a deep dive into the project's vision, modular architecture, and core development principles, see the [Project Overview Document](PROJECT_OVERVIEW.md).

## 🏗️ Tech Stack

### Frontend
- **React (Vite)** - Modern, high-performance UI library.
- **Dual-Experience UI** - Specialized components for Desktop/Tablet and Mobile usage.
- **Axios & Context API** - Centralized state and data management.

### Backend
- **Django REST Framework** - Robust, modular API layer.
- **Simple JWT** - Secure token-based authentication.
- **PostgreSQL** (via Docker) - Reliable relational data storage.

### DevOps
- **Docker & Compose** - Standardized dev/prod containerization.
- **Nginx** - High-concurrency production web server.

## 📁 System Architecture

| Directory | Description |
| :--- | :--- |
| **`backend/`** | Django Apps (Finance, Tasks, Permits, Resources). |
| **`frontend/`** | React Source (Desktop/Mobile specialized components). |
| **`mobile-app/`** | Mobile application source. |
| **`docs/`** | Deployment, Cloud, and Local setup guides. |
| **`scripts/`** | Automation scripts for CI/CD and synchronization. |

## 📚 Documentation Index

| Topic | Details |
| :--- | :--- |
| **🌟 Project Overview** | [Core Principles & Design](PROJECT_OVERVIEW.md) |
| **🚀 Getting Started** | [Local Setup Guide](docs/local_setup.md) |
| **💻 Dev Server** | [Detailed Server Guide](docs/dev_server.md) |
| **☁️ Cloud** | [Cloud Deployment](docs/cloud_setup.md) |
| **📊 Roadmap** | [Project Task List](docs/task.md) |
| **✨ Progress** | [Feature Walkthrough](docs/walkthrough.md) |

---

## 🚀 Quick Start (Development)

The fastest way to start is with the optimized development environment:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```
> **URLs**: Frontend: `5173`, Backend: `8000`. See [Local Setup Guide](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/docs/local_setup.md) for details.

## 🔧 Development Without Docker

### Backend

1. **Create virtual environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Run migrations**
   ```bash
   python manage.py migrate
   ```

5. **Create superuser**
   ```bash
   python manage.py createsuperuser
   ```

6. **Start development server**
   ```bash
   python manage.py runserver
   ```

### Frontend

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

## 📝 API Endpoints

### Authentication
- `POST /api/accounts/login/` - Login with username and password
- `POST /api/accounts/logout/` - Logout (requires authentication)
- `POST /api/accounts/register/` - Register new user
- `GET /api/accounts/profile/` - Get current user profile
- `POST /api/accounts/token/refresh/` - Refresh access token

## 🧪 Testing

### Backend Tests
```bash
# With Docker
docker-compose -f docker-compose.dev.yml exec backend python manage.py test

# Without Docker
cd backend
python manage.py test
```

## 🔐 Environment Variables

### Backend (.env)
```
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=1440
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000/api
```

## 📦 Building for Production

### Backend
```bash
cd backend
docker build -t construction-backend .
```

### Frontend
```bash
cd frontend
docker build -t construction-frontend .
```

## 🛠️ Useful Commands

### Docker Commands
```bash
# Start services
docker-compose -f docker-compose.dev.yml up

# Stop services
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Rebuild containers
docker-compose -f docker-compose.dev.yml up --build

# Run Django commands
docker-compose -f docker-compose.dev.yml exec backend python manage.py <command>
```

### Django Commands
```bash
# Make migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic
```

## 🎯 Current Features

- ✅ User authentication (login/logout)
- ✅ JWT token-based authentication
- ✅ Protected routes
- ✅ User profile management
- ✅ Docker containerization
- ✅ Development and production environments

## 🚧 Planned Features

- Project management
- Task tracking
- Material management
- Worker management
- Budget planning
- Progress reports
- File uploads
- Notifications

## 📄 License

This project is private and proprietary.

## 👥 Contributors

- Your Name

## 🤝 Support

For support, email your-email@example.com
