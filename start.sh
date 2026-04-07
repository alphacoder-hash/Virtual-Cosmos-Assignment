#!/bin/bash

echo ""
echo " ==========================================="
echo "   VIRTUAL COSMOS - ONE CLICK LAUNCHER"
echo " ==========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo " [ERROR] Node.js is not installed!"
    echo " Please install it from: https://nodejs.org/"
    exit 1
fi

echo " [OK] Node.js found: $(node -v)"

# Setup server .env if missing
if [ ! -f "server/.env" ]; then
    echo ""
    echo " [SETUP] Creating server/.env from example..."
    cp server/.env.example server/.env
    echo " [OK] server/.env created. Edit it if you need a custom MongoDB URI."
fi

# Install dependencies
echo ""
echo " [1/3] Installing root dependencies..."
npm install --silent

echo " [2/3] Installing server dependencies..."
cd server && npm install --silent && cd ..

echo " [3/3] Installing client dependencies..."
cd client && npm install --silent && cd ..

echo ""
echo " ==========================================="
echo "   All dependencies installed!"
echo "   Starting Virtual Cosmos..."
echo ""
echo "   Backend  -> http://localhost:3001"
echo "   Frontend -> http://localhost:5173"
echo " ==========================================="
echo ""

# Launch server in background
cd server && npm run dev &
SERVER_PID=$!
cd ..

sleep 2

# Launch client in background
cd client && npm run dev &
CLIENT_PID=$!
cd ..

# Open browser
sleep 3
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5173
elif command -v open &> /dev/null; then
    open http://localhost:5173
fi

echo " Both services are running!"
echo " Press Ctrl+C to stop everything."
echo ""

# Wait and cleanup on Ctrl+C
trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null; echo ''; echo ' Stopped.'; exit 0" INT
wait
