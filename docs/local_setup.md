# 🏗️ Mero Ghar - Local Development Guide

Fastest way to get your development environment running with **Hot-Reloading**.

## 🚀 Quick Start (Development)

To start the project for local development (changes reflect instantly):

```bash
# 1. Start the dev environment
docker compose -f docker-compose.dev.yml up -d --build

# 2. View the App
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
```

## 🌐 Port Reference Table

| Environment | Frontend URL | Backend API | Config File |
| :--- | :--- | :--- | :--- |
| **Development** | [http://localhost:5173](http://localhost:5173) | [http://localhost:8000](http://localhost:8000) | `docker-compose.dev.yml` |
| **Production** | [http://localhost:8080](http://localhost:8080) | [http://localhost:8001](http://localhost:8001) | `docker-compose.yml` |

## 🛠️ Environment Files

We use separate `.env` files to keep Local and Cloud settings distinct:

| Environment | Docker File | Env Files |
| :--- | :--- | :--- |
| **Development** | `docker-compose.dev.yml` | `.env.dev` |
| **Production** | `docker-compose.yml` | `.env` |

## 📦 Useful Commands

### Force Rebuild
If you add new npm packages or python requirements:
```bash
docker compose -f docker-compose.dev.yml up -d --build
```

### View Logs
```bash
docker compose -f docker-compose.dev.yml logs -f
```

### Stop Environment
```bash
docker compose -f docker-compose.dev.yml down
```

---

## 📖 Documentation Index

| Scope | Document | Description |
| :--- | :--- | :--- |
| **Project** | [Local Setup Guide](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/docs/local_setup.md) | This Guide (Quick Start) |
| **Project** | [Detailed Server Guide](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/docs/dev_server.md) | In-depth setup (Native & Docker) |
| **Backend** | [backend/README.md](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/README.md) | Tech stack & structure |
| **Frontend** | [frontend/README.md](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/frontend/README.md) | Tech stack & structure |

---
> [!TIP]
> **Hot-Reloading** is active! Edit any code in `frontend/src` or `backend/apps` and the browser/server will update automatically.
