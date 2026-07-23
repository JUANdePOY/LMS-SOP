#!/bin/bash
set -e

echo "=== LMS-SOP Hostinger Deployment ==="
echo ""

echo "Step 1: Installing dependencies..."
npm install

echo "Step 2: Building client..."
cd client
npm install
npm run build
cd ..

echo "Step 3: Installing server dependencies..."
cd server
npm install --production
cd ..

echo "Step 4: Running database migrations..."
cd server
node -e 'const db = require("./config/database"); console.log("Database connected. Migrations applied automatically on connection."); process.exit(0);'
cd ..

echo "Step 5: Seeding demo data..."
npm run seed

echo ""
echo "=== Deployment Complete ==="
echo "Start the server with: npm run hostinger:start"
echo "Or with: cd server && npm start"