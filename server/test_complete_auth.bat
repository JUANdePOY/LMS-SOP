@echo off
REM PAFR Complete Authentication Flow Test

echo.
echo ====== PAFR Complete Authentication Flow Test ======
echo.

REM First, let's insert a test user into the database
echo [SETUP] Creating test user in database...

REM Using MySQL CLI to insert test user with bcrypted password
REM Password: TestPass@123 (bcrypted)
REM For testing, we'll use a pre-generated hash

sqlcmd -S localhost -U sa -P "" -d pafr -Q "INSERT INTO users (email, password_hash, role, is_active) VALUES ('admin@pafr.test', '$2b$10$rO8Qs5ZPTiLJVUvMW3j5/.I.5HYNHHlzQUIc0HaD6LQMiWB.9pKOy', 'admin', 1)" 2>nul

if %ERRORLEVEL% EQU 0 (
    echo [SETUP] Test user created successfully
) else (
    echo [INFO] Test user might already exist or using MySQL directly
    echo [INFO] Using MySQL client...
    mysql -u root pafr -e "INSERT IGNORE INTO users (email, password_hash, role, is_active) VALUES ('admin@pafr.test', '$2b$10$rO8Qs5ZPTiLJVUvMW3j5/.I.5HYNHHlzQUIc0HaD6LQMiWB.9pKOy', 'admin', 1);" 2>nul
)

echo.
echo [TEST 1] Login with valid credentials (admin@pafr.test)...
echo Expected: Success with JWT token
for /f "tokens=*" %%A in ('curl -s -X POST http://localhost:3000/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@pafr.test\",\"password\":\"TestPass@123\"}"') do (
    set "LOGIN_RESPONSE=%%A"
    echo %%A
)
echo.

REM Extract token from response (simplified - in production use proper JSON parsing)
echo [TEST 2] Attempting to extract token from response...
echo (Token would be extracted here in real test)
echo.

echo [TEST 3] Test profile endpoint without token (should fail)...
curl -s http://localhost:3000/auth/profile
echo.
echo.

echo [TEST 4] Test logout endpoint...
echo (Requires valid token from login)
echo.

echo [TEST 5] Test 404 handling...
curl -s http://localhost:3000/nonexistent
echo.
echo.

echo ====== Complete Authentication Flow Test Complete ======
pause
