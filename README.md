# House Construction Management System

A full-stack web application for managing house construction projects, built with React and Django.

## 🏗️ Tech Stack

### Frontend
- **React** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client

### Backend
- **Django** - Web framework
- **Django REST Framework** - API framework
- **Simple JWT** - JWT authentication
- **CORS Headers** - Cross-origin resource sharing

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Production web server

## 📁 Project Structure

```
Construction/
├── backend/                 # Django backend
│   ├── apps/
│   │   └── accounts/       # Authentication app
│   ├── config/             # Django settings
│   ├── Dockerfile          # Production Docker config
│   ├── Dockerfile.dev      # Development Docker config
│   ├── requirements.txt    # Python dependencies
│   └── manage.py
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   └── services/      # API services
│   ├── Dockerfile         # Production Docker config
│   ├── Dockerfile.dev     # Development Docker config
│   └── package.json
├── docker-compose.yml      # Production compose
└── docker-compose.dev.yml  # Development compose
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git installed

### Development Setup

1. **Clone the repository** (if using Git)
   ```bash
   git clone <repository-url>
   cd Construction
   ```

2. **Set up environment variables**
   
   Backend:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your settings
   cd ..
   ```
   
   Frontend:
   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env with your settings
   cd ..
   ```

3. **Start the development servers**
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

4. **Create a superuser** (in a new terminal)
   ```bash
   docker-compose -f docker-compose.dev.yml exec backend python manage.py createsuperuser
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/api
   - Django Admin: http://localhost:8000/admin

### Production Setup

1. **Build and start production containers**
   ```bash
   docker-compose up --build -d
   ```

2. **Create a superuser**
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

3. **Access the application**
   - Frontend: http://localhost
   - Backend API: http://localhost:8000/api

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
