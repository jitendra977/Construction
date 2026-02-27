# 💻 Mero Ghar - Development Server Guide

This guide covers how to run the development servers for both **Frontend** and **Backend**.

## 🌐 Port Reference Table

| Environment | Frontend URL | Backend API | Config File |
| :--- | :--- | :--- | :--- |
| **Development** | [http://localhost:5173](http://localhost:5173) | [http://localhost:8000](http://localhost:8000) | `docker-compose.dev.yml` |
| **Production** | [http://localhost:8080](http://localhost:8080) | [http://localhost:8001](http://localhost:8001) | `docker-compose.yml` |

---

## 🏎️ Option 1: Docker (Recommended)
This is the easiest way. It handles all dependencies (Bun, Python, MySQL) for you.

```bash
# Start everything with hot-reload
docker compose -f docker-compose.dev.yml up -d --build
```

---

## 🛠️ Option 2: Native Run (Standalone)
Use this if you want to run the servers directly on your machine for maximum speed.

### 1. Frontend (Bun + Vite)
Inside the `frontend` directory:

```bash
# Install dependencies
bun install

# Start the Vite development server
bun run dev
```
> **URL**: [http://localhost:5173](http://localhost:5173)

### 2. Backend (Django)
Inside the `backend` directory:

```bash
# Create virtual environment (if not exists)
python -m venv venv
source venv/bin/activate  # Mac/Linux
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start the Django development server
python manage.py runserver
```
> **URL**: [http://localhost:8000](http://localhost:8000)

---

## ✨ Features
- **Hot-Reloading**: Any change in the code is immediately reflected.
- **Dedicated Envs**: Uses `.env.dev` files for local configuration.
- **Fast Refresh**: Vite ensures UI updates happen in milliseconds.

---

## 📖 Documentation Index

| Scope | Document | Description |
| :--- | :--- | :--- |
| **Project** | [Local Setup Guide](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/docs/local_setup.md) | Local Dev Quick Start |
| **Project** | [Detailed Server Guide](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/docs/dev_server.md) | This Detailed Guide |
| **Backend** | [backend/README.md](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/README.md) | API & Backend details |
| **Frontend** | [frontend/README.md](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/frontend/README.md) | UI & Frontend details |

---

## ❓ Troubleshooting
- **Port Conflict**: If port 8000 or 5173 is busy, check running processes.
- **Database Connection**: Ensure the MySQL container is running or update `DB_HOST` in `.env.dev`.
