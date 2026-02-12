#!/bin/bash
# Production Login Diagnostic Script

echo "=== Production Frontend Login Diagnostic ==="
echo ""

API_URL="${API_URL}"
FRONTEND_URL="${FRONTEND_URL}"

echo "1. Testing API Endpoint Accessibility..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "$API_URL/api/"

echo ""
# Credentials (must be provided via environment variables)
if [ -z "$TEST_PASSWORD" ]; then
  echo "❌ Error: TEST_PASSWORD environment variable is not set."
  echo "Usage: API_URL=... FRONTEND_URL=... TEST_EMAIL=... TEST_PASSWORD=... ./test_production_login.sh"
  exit 1
fi

TEST_EMAIL="${TEST_EMAIL}"
TEST_USERNAME="${TEST_USERNAME}"

echo "2. Testing Login Endpoint..."
curl -s -X POST "$API_URL/api/auth/login/" \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONTEND_URL" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
  -w "\nHTTP Status: %{http_code}\n" | head -20

echo ""
echo "3. Checking CORS Headers..."
curl -s -I -X OPTIONS "$API_URL/api/auth/login/" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" | grep -i "access-control"

echo ""
echo "4. Testing with Username..."
curl -s -X POST "$API_URL/api/auth/login/" \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONTEND_URL" \
  -d "{\"username\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\"}" \
  -w "\nHTTP Status: %{http_code}\n" | head -20

echo ""
echo "=== Diagnostic Complete ==="
echo ""
echo "Next steps:"
echo "1. Check browser console on $FRONTEND_URL for errors"
echo "2. Check Network tab for failed requests"
echo "3. Verify .env.production is being used in build"
