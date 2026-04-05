#!/bin/bash

# Project Initialization & Stabilization Script
# This script ensures a clean, working environment from scratch.

echo "🏗️  Starting Construction Project Initialization..."

# 1. Environment Check
if [ ! -f "backend/.env" ]; then
    echo "⚠️  backend/.env not found. Creating from example..."
    cp backend/.env.example backend/.env
fi

# 2. Database Cleanup (Optional but recommended for dev stabilization)
read -p "❓ Do you want to wipe the database and start fresh? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Wiping database and media..."
    rm -f backend/db.sqlite3
    find backend/media -type f -not -name ".gitkeep" -delete
fi

# 3. Backend Setup
echo "🐍 Setting up Backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

echo "🔄 Running Migrations..."
python manage.py makemigrations
python manage.py migrate

# 4. Data Seeding
echo "🌱 Seeding Core Data..."
# Priority seeding order
python manage.py shell <<EOF
from apps.core.models import HouseProject
from django.utils import timezone
if not HouseProject.objects.exists():
    HouseProject.objects.create(
        name="Mero Ghar Project",
        owner_name="Owner",
        address="Tulsipur, Dang",
        total_budget=5000000,
        start_date=timezone.now().date(),
        expected_completion_date=timezone.now().date(),
        area_sqft=1500
    )
    print("✅ Created default Project Configuration")
EOF

# Run population scripts in order
echo "📦 Populating raw data (Phases, Materials, Suppliers)..."
python populate_raw_data/01_accounts.py
python populate_raw_data/03_core_phases.py
python populate_raw_data/05_suppliers.py
python populate_raw_data/06_materials.py

cd ..

# 5. Frontend Setup
echo "⚛️ Setting up Frontend..."
cd frontend
if [ ! -f ".env" ]; then
    cp .env.example .env
fi
npm install

echo "✨ Initialization Complete!"
echo "🚀 To start development:"
echo "   Terminal 1 (Backend): cd backend && source venv/bin/activate && python manage.py runserver"
echo "   Terminal 2 (Frontend): cd frontend && npm run dev"
