# 🏗️ Construction Project: Manual Operations & Cloud Guide

This guide contains **every command** required to develop and deploy the Construction Project manually. This version is specifically configured for your **Nginx Proxy Manager** setup with **Separate Subdomains** and **MySQL Database**.

---

## 💻 1. Local Development (Mac)

### 1.1 Terminal 1: Backend (Django)
```bash
cd /Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend
python manage.py runserver
```

### 1.2 Terminal 2: Frontend (Vite/React)
```bash
cd /Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/frontend
bun run dev
```

---

## ☁️ 2. Cloud Server Setup (nishanaweb.cloud)

### 2.1 Nginx Proxy Manager (Docker Network Setup)
Since all your containers (Backend, Frontend, and NPM) make sure they are on the same network (`app-network`).

#### 🅰️ Host 1: Frontend (The Website)
*   **Domain**: `construction.nishanaweb.cloud`
*   **Forward Hostname / IP**: `construction_frontend` (Container Name)
*   **Forward Port**: `80`
*   **SSL**: Force SSL, HTTP/2.
*   **Websockets**: On.

#### 🅱️ Host 2: Backend (The API)
*   **Domain**: `api.construction.nishanaweb.cloud`
*   **Forward Hostname / IP**: `construction_backend` (Container Name)
*   **Forward Port**: `8000` (Internal Container Port) - *Note: Host port is 8001, but inside the network we use 8000*
*   **SSL**: Force SSL, HTTP/2.

#### 🖼️ CRITICAL: Serve Media via Proxy Manager
The media files live in the Frontend container. We must tell the Backend Proxy to fetch them from there.

1.  Edit **Host 2** (`api.construction...`).
2.  **Custom Locations** tab -> "Add Location".
3.  **Define Location**: `/media/`
4.  **Forward Hostname / IP**: `construction_frontend`  <-- **THIS IS KEY**
5.  **Forward Port**: `80`
6.  Gear Icon (⚙️): `proxy_set_header Host $host;`
7.  **Save**.

#### 📂 Advanced: Upload Limits
1.  Edit **Host 2**.
2.  **Advanced** tab:
    ```nginx
    client_max_body_size 50M;
    proxy_set_header X-Forwarded-Proto $scheme;
    ```

---

### 2.2 Database Initialization
Since you are using an existing MySQL container, you must create the new database for this project.

Run this command on your server:
```bash
# 1. Create Database
docker exec -it mysql_db mysql -u root -pM3IF00UrzSZEEnZkp5lk -e "CREATE DATABASE IF NOT EXISTS construction_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Grant Permissions (CRITICAL FIX for Access Denied Error)
docker exec -it mysql_db mysql -u root -pM3IF00UrzSZEEnZkp5lk -e "GRANT ALL PRIVILEGES ON construction_db.* TO 'nishanaweb'@'%'; FLUSH PRIVILEGES;"
```

---

## 📋 3. Cloud Configuration (.env Manuals)

### 🔴 Step 3.1: Backend Cloud Config
Run: `nano ~/project/Construction/backend/.env`
Paste the following (updated with your MySQL and Email settings):

```ini
# Django Core Settings
SECRET_KEY=your-secure-production-key
DEBUG=False
SECURE_SSL_REDIRECT=False
ALLOWED_HOSTS=api.construction.nishanaweb.cloud,construction.nishanaweb.cloud,localhost

# MySQL Database Settings (EXTERNAL DB)
DB_ENGINE=django.db.backends.mysql
DB_NAME=construction_db
DB_USER=nishanaweb
DB_PASSWORD=M3IF00UrzSZEEnZkp5lk
# IMPORTANT: This must match the CONTAINER NAME of your existing MySQL service
DB_HOST=mysql_db 
DB_PORT=3306

# CORS & CSRF Settings
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://construction.nishanaweb.cloud,https://api.construction.nishanaweb.cloud
CSRF_TRUSTED_ORIGINS=https://api.construction.nishanaweb.cloud,https://construction.nishanaweb.cloud

# Email Settings (Using Gmail SMTP)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=jitendrakhadka444@gmail.com
EMAIL_HOST_PASSWORD=xpjo wrpg akxt tlik
DEFAULT_FROM_EMAIL=jitendrakhadka444@gmail.com

# File Upload Settings
FILE_UPLOAD_MAX_MEMORY_SIZE=52428800
DATA_UPLOAD_MAX_MEMORY_SIZE=52428800
```

### 🔵 Step 3.2: Frontend Cloud Config
Run: `nano ~/project/Construction/frontend/.env`
```ini
VITE_API_URL=https://api.construction.nishanaweb.cloud/api/v1
```

---

## 🚀 4. Manual Deployment Process

### Step 1: Push Local Work (On Mac)
```bash
git add .
git commit -m "mysql-backend-update"
git push origin main
```

### Step 2: Update Server (Via SSH)
```bash
ssh nishanaweb@nishanaweb.cloud
cd ~/project/Construction
git pull origin main
```

### Step 3: Restart Docker (Via SSH)
```bash
# Rebuild ensures the new VITE_API_URL is baked into the frontend build
docker compose down
docker compose up --build -d
```

---

## 🛡️ 5. Maintenance & Permissions

### 5.1 Fix Folder Permissions
```bash
sudo chown -R nishanaweb:nishanaweb ~/project/Construction
find ~/project/Construction -type d -exec sudo chmod 755 {} +
find ~/project/Construction -type f -exec sudo chmod 644 {} +
```

### 5.2 Superuser Creation
```bash
docker exec -it construction_backend python manage.py createsuperuser
```

### 5.3 MySQL Database Backup
To backup your MySQL database:
```bash
docker exec mysql_db mysqldump -u nishanaweb -pM3IF00UrzSZEEnZkp5lk construction_db > backup.sql
```

---

## 📝 Key Rules for This Setup
1.  **External Database**: The project expects an existing container `mysql_db` on network `app-network`.
    *   **I have configured `docker-compose.yml` to join `app-network` automatically.**
    *   Ensure your existing MySQL container is actually running on this network.
2.  **Email**: The system is now configured to send emails via Gmail.
3.  **Large Files**: Upload limits have been increased to 50MB.
4.  **SSL**: Let Nginx Proxy Manager handle SSL. `SECURE_SSL_REDIRECT` is False to avoid infinite loops behind the proxy.
