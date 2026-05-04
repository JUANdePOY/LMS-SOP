@echo off
REM PAFR Authentication System Test Script

echo.
echo ====== PAFR Authentication System Testing ======
echo.

REM Test 1: Health Check
echo [TEST 1] Testing health endpoint...
curl -s http://localhost:3000/health
echo.
echo.

REM Test 2: Root endpoint
echo [TEST 2] Testing root endpoint...
curl -s http://localhost:3000/
echo.
echo.

REM Test 3: Login with invalid credentials
echo [TEST 3] Testing login with invalid credentials...
curl -s -X POST http://localhost:3000/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"password\":\"wrongpassword\"}"
echo.
echo.

REM Test 4: Login with empty credentials
echo [TEST 4] Testing login with empty email...
curl -s -X POST http://localhost:3000/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"\",\"password\":\"password123\"}"
echo.
echo.

REM Test 5: Get profile without token
echo [TEST 5] Testing profile endpoint without token...
curl -s http://localhost:3000/auth/profile
echo.
echo.

REM Test 6: Get profile with invalid token
echo [TEST 6] Testing profile endpoint with invalid token...
curl -s -H "Authorization: Bearer invalid_token_here" ^
  http://localhost:3000/auth/profile
echo.
echo.

echo ====== Authentication System Testing Complete ======
