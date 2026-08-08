#!/bin/bash
set -e

# Directory that holds uploaded files. Keep this OUTSIDE the deployed app
# directory so redeploys (git clone / rsync) never wipe user images.
# Override with UPLOAD_ROOT in the environment / .env if you prefer a custom path.
UPLOAD_DIR="${UPLOAD_ROOT:-/var/lib/lms-sop/uploads}"

echo "=== LMS-SOP Hostinger Deployment ==="
echo "Upload storage root: $UPLOAD_DIR"
echo ""

# Ensure the persistent upload directory exists (and survives redeploys).
mkdir -p "$UPLOAD_DIR"

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

echo "Step 4: Pointing the server at the persistent upload directory..."
# Persist the chosen upload root so `config/storage.js` uses it on boot.
if [ -f server/.env ]; then
  if grep -q '^UPLOAD_ROOT=' server/.env; then
    sed -i "s#^UPLOAD_ROOT=.*#UPLOAD_ROOT=$UPLOAD_DIR#" server/.env
  else
    echo "UPLOAD_ROOT=$UPLOAD_DIR" >> server/.env
  fi
else
  echo "UPLOAD_ROOT=$UPLOAD_DIR" >> server/.env
fi

echo "Step 5: Running database migrations..."
cd server
node -e 'const db = require("./config/database"); console.log("Database connected. Migrations applied automatically on connection."); process.exit(0);'
cd ..

echo "Step 6: Seeding demo data..."
npm run seed

echo ""
echo "=== Deployment Complete ==="
echo "Uploads are stored at: $UPLOAD_DIR (persists across redeploys)"
echo "For live<->local image sync, set STORAGE_DRIVER=s3 with a shared bucket in server/.env"
echo "Start the server with: npm run hostinger:start"
echo "Or with: cd server && npm start"
