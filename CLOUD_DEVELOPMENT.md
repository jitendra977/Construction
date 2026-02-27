# 🏗️ Construction Project: Complete Deployment Guide

This is the **single, complete guide** to deploy the Construction Project to production on `nishanaweb.cloud` with **Nginx Proxy Manager** and **External MySQL Database**.

---

## 📋 Prerequisites

Before starting, ensure you have:
1. A server running Docker and Docker Compose
2. Nginx Proxy Manager installed and accessible
3. An existing MySQL container (`mysql_db`) on the `app-network`
4. DNS records pointing to your server:
   - `construction.nishanaweb.cloud` → Your Server IP
   - `api.construction.nishanaweb.cloud` → Your Server IP

---

## 🗄️ Step 1: Database Setup

SSH into your server and create the database:

```bash
ssh nishanaweb@nishanaweb.cloud

# Create the database
docker exec -it mysql_db mysql -u root -pM3IF00UrzSZEEnZkp5lk -e "CREATE DATABASE IF NOT EXISTS construction_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Grant permissions to nishanaweb user
docker exec -it mysql_db mysql -u root -pM3IF00UrzSZEEnZkp5lk -e "GRANT ALL PRIVILEGES ON construction_db.* TO 'nishanaweb'@'%'; FLUSH PRIVILEGES;"
```

---

## 🔧 Step 2: Environment Configuration

### Backend Configuration

Create `~/project/Construction/backend/.env`:

```bash
nano ~/project/Construction/backend/.env
```

Paste this content:

```ini
# Django Core
SECRET_KEY=your-secure-production-key-change-this
DEBUG=False
SECURE_SSL_REDIRECT=False
ALLOWED_HOSTS=api.construction.nishanaweb.cloud,construction.nishanaweb.cloud,localhost

# MySQL Database (External Container)
DB_ENGINE=django.db.backends.mysql
DB_NAME=construction_db
DB_USER=nishanaweb
DB_PASSWORD=M3IF00UrzSZEEnZkp5lk
DB_HOST=mysql_db
DB_PORT=3306

# CORS & CSRF
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://construction.nishanaweb.cloud,https://api.construction.nishanaweb.cloud
CSRF_TRUSTED_ORIGINS=https://api.construction.nishanaweb.cloud,https://construction.nishanaweb.cloud

# Email (Gmail)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=your-email@gmail.com

# File Upload (50MB)
FILE_UPLOAD_MAX_MEMORY_SIZE=52428800
DATA_UPLOAD_MAX_MEMORY_SIZE=52428800
```

### Root Configuration

Create `~/project/Construction/.env`:

```bash
nano ~/project/Construction/.env
```

Paste this:

```ini
VITE_API_URL=https://api.construction.nishanaweb.cloud/api/v1
```

### Frontend Configuration (Legacy/Optional)

```bash
nano ~/project/Construction/frontend/.env
```

Paste this:

```ini
VITE_API_URL=https://api.construction.nishanaweb.cloud/api/v1
```

---

## 🌐 Step 3: Nginx Proxy Manager Configuration

Login to your Nginx Proxy Manager dashboard.

### 🅰️ Host 1: Frontend (construction.nishanaweb.cloud)

1. **Add Proxy Host**
2. **Details Tab**:
   - Domain: `construction.nishanaweb.cloud`
   - Scheme: `http`
   - Forward Hostname/IP: `construction_frontend`
   - Forward Port: `80`
   - ✅ Websockets Support
   - ✅ Block Common Exploits
3. **SSL Tab**:
   - ✅ Request a new SSL Certificate
   - ✅ Force SSL
   - ✅ HTTP/2 Support
   - ✅ HSTS Enabled
4. **Save**

### 🅱️ Host 2: Backend (api.construction.nishanaweb.cloud)

1. **Add Proxy Host**
2. **Details Tab**:
   - Domain: `api.construction.nishanaweb.cloud`
   - Scheme: `http`
   - Forward Hostname/IP: `construction_backend`
   - Forward Port: `8000`
   - ✅ Block Common Exploits
3. **SSL Tab**:
   - ✅ Request a new SSL Certificate
   - ✅ Force SSL
   - ✅ HTTP/2 Support
4. **Custom Locations Tab** → Add Location:
   - **Location**: `/media/`
   - **Forward Hostname/IP**: `construction_frontend`
   - **Forward Port**: `80`
   - **Scheme**: `http`
5. **Advanced Tab** (paste this):
   ```nginx
   client_max_body_size 50M;
   proxy_set_header Host $host;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;
   proxy_read_timeout 300;
   proxy_connect_timeout 300;
   proxy_send_timeout 300;
   ```
6. **Save**

---

## 🚀 Step 4: Deploy the Application

### On Your Local Machine:

```bash
cd /Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction
git add .
git commit -m "production-deployment"
git push origin main
```

### On Your Server:

```bash
ssh nishanaweb@nishanaweb.cloud
cd ~/project/Construction

# Pull latest code
git pull origin main

# Build and start containers
docker compose down
docker compose build --no-cache
docker compose up -d

# Check containers are running
docker compose ps
```

---

## 👤 Step 5: Create Admin User

```bash
docker exec -it construction_backend python manage.py createsuperuser
```

Follow the prompts to create your admin account.

---

## ✅ Step 6: Verify Deployment

1. **Frontend**: Visit `https://construction.nishanaweb.cloud`
   - Should see the login page
2. **Backend Admin**: Visit `https://api.construction.nishanaweb.cloud/admin/`
   - Should see styled Django admin panel
3. **Login Test**: Try logging in with your created user

---

## 🔄 Future Updates (After Initial Setup)

When you make changes to the code:

```bash
# Local
git add .
git commit -m "your-changes"
git push origin main

# Server
ssh nishanaweb@nishanaweb.cloud
cd ~/project/Construction
git pull origin main
docker compose up --build -d
```

---

## 🐛 Troubleshooting

### Check Backend Logs
```bash
docker compose logs --tail=50 backend
```

### Check Frontend Logs
```bash
docker compose logs --tail=50 frontend
```

### Reset Database (⚠️ Deletes all data)
```bash
docker exec -it mysql_db mysql -u root -pM3IF00UrzSZEEnZkp5lk -e "DROP DATABASE construction_db;"
docker exec -it mysql_db mysql -u root -pM3IF00UrzSZEEnZkp5lk -e "CREATE DATABASE construction_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
docker exec -it construction_backend python manage.py migrate
docker exec -it construction_backend python manage.py createsuperuser
```

### Load Sample Data (Optional)
```bash
docker cp backend/data_dump.json construction_backend:/app/data_dump.json
docker exec construction_backend python manage.py loaddata data_dump.json
```

---

## 🏗️ Architecture: Understanding File Storage

### 📂 Media Files (User Uploads)
- **Storage Location**: `construction_frontend` container (Nginx)
- **Volume**: `media_data:/usr/share/nginx/html/media`
- **Why?**: Nginx efficiently serves static files directly
- **Access**: Proxied through `api.construction.nishanaweb.cloud/media/`
  - Requests to `/media/` on the API domain are forwarded to the frontend container

### 📄 Static Files (CSS/JS for Admin Panel)
- **Storage Location**: `construction_backend` container (Django)
- **Path**: `/app/staticfiles`
- **Why?**: Django Admin needs these files
- **Served By**: Whitenoise (middleware in Django)
- **Access**: Direct from `api.construction.nishanaweb.cloud/static/`

### 🔄 Why This Setup?
Django generates user uploads (e.g., blueprints, photos) which need to be served efficiently. By storing them in the Nginx container and proxying requests, we get:
1. **Performance**: Nginx is optimized for serving files
2. **Simplicity**: No separate file server needed
3. **Persistence**: Volume survives container restarts

---

## 📝 Important Notes

1. **Port Mapping**: The backend uses `8001:8000` to avoid conflicts with other services on port 8000.
2. **Network**: All containers must be on the `app-network` to communicate via container names.
3. **Root URL**: `https://api.construction.nishanaweb.cloud/` will show "Not Found" - this is normal. The API has no homepage.

---

## ✨ Success!

Your Construction Management System is now live and ready to use! 🎉
