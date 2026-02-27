# 🐍 Mero Ghar - Backend Service

Django-based REST API for construction project management.

## 🚀 Quick Run (Native)
```bash
# Activate venv
source venv/bin/activate

# Start server
python manage.py runserver
```

## 🛠️ Key Technologies
- **Framework**: Django 4.2.9
- **API**: Django REST Framework
- **Database**: MySQL (via `mysqlclient`)
- **Image Handling**: Pillow (for Contractor/Supplier photos)
- **Environment**: Decouple (using `.env` or `.env.dev`)

## 📂 Project Structure
- `apps/finance`: Expense and Payment logic.
- `apps/resources`: Contractor and Supplier management.
- `config/`: Django project settings and URLs.
- `media/`: Storage for uploaded photos.

---
> For full setup details, see [Detailed Server Guide](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/docs/dev_server.md)
