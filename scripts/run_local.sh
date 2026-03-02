#!/bin/bash

# Exit on error
set -e

# Configuration
BACKEND_PORT=8001
FRONTEND_PORT=5174
VITE_API_URL="http://localhost:$BACKEND_PORT/api/v1"

echo "🚀 Starting Local Development Environment (Non-Docker)..."
echo "⚠️  Note: Docker containers are running on 8000/5173. This script uses $BACKEND_PORT/$FRONTEND_PORT."

# Function to kill child processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit
}

trap cleanup INT TERM

# 1. Start Backend
echo "📡 Starting Django Backend on port $BACKEND_PORT..."
cd backend
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment (venv) not found in backend directory."
    exit 1
fi

source venv/bin/activate

# Set environment variables for the host run
export CORS_ALLOWED_ORIGINS="http://localhost:$FRONTEND_PORT,http://127.0.0.1:$FRONTEND_PORT"
export PORT=$BACKEND_PORT

python manage.py runserver 0.0.0.0:$BACKEND_PORT &
BACKEND_PID=$!

# 1.5 Auto-create Admin User if not exists
echo "👤 Ensuring default admin user (admin@gmail.com) exists..."
python manage.py shell <<EOF
from apps.accounts.models import User, Role
for code, name in Role.ROLE_CODES:
    Role.objects.get_or_create(code=code, defaults={'name': name})
admin_email = 'admin@gmail.com'
admin_pass = 'adminpass'
if not User.objects.filter(email=admin_email).exists():
    print(f"Creating superuser: {admin_email}...")
    super_admin_role = Role.objects.get(code=Role.SUPER_ADMIN)
    User.objects.create_superuser(
        username='admin',
        email=admin_email,
        password=admin_pass,
        role=super_admin_role
    )
    print("Superuser created successfully.")
else:
    print(f"Ensuring password is correct for {admin_email}...")
    u = User.objects.get(email=admin_email)
    u.set_password(admin_pass)
    u.is_superuser = True
    u.is_staff = True
    u.save()
    print("Password updated/verified.")
EOF

cd ..

# 2. Start Frontend
echo "🌐 Starting Vite Frontend on port $FRONTEND_PORT..."
cd frontend

# Set environment variables for the frontend build/run
export VITE_API_URL=$VITE_API_URL

# Use bun if available, otherwise npm
if command -v bun &> /dev/null; then
    bun run dev -- --port $FRONTEND_PORT &
else
    npm run dev -- --port $FRONTEND_PORT &
fi
FRONTEND_PID=$!
cd ..

echo "------------------------------------------------"
echo "🎉 Local App (Non-Docker) is ready!"
echo "📡 Backend: http://localhost:$BACKEND_PORT/api/v1"
echo "🌐 Frontend: http://localhost:$FRONTEND_PORT"
echo "------------------------------------------------"
echo "Press Ctrl+C to stop both services."

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
