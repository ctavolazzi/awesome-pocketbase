#!/usr/bin/env bash

set -e

echo "🚀 Starting PocketBase Demo"
echo "==========================="
echo ""

# Check if pocketbase exists
if [ ! -f "./pocketbase" ]; then
    echo "❌ PocketBase not found. Run ./install.sh first."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "./node_modules" ]; then
    echo "❌ Dependencies not installed. Run ./install.sh first."
    exit 1
fi

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    jobs -p | xargs -r kill 2>/dev/null || true
    wait
    echo "✅ All processes stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Start PocketBase
echo -e "${BLUE}📦 Starting PocketBase...${NC}"
./pocketbase serve --http=127.0.0.1:8090 > pocketbase.log 2>&1 &
PB_PID=$!
echo "   PID: $PB_PID"
echo "   URL: http://127.0.0.1:8090"
echo ""

# Wait for PocketBase to be ready
echo "⏳ Waiting for PocketBase to start..."
for i in {1..30}; do
    if curl -s http://127.0.0.1:8090/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PocketBase is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ PocketBase failed to start within 30 seconds"
        cat pocketbase.log
        exit 1
    fi
    sleep 1
done

echo ""

# Start Express API Server
echo -e "${PURPLE}🔧 Starting API Server...${NC}"
npm run server > server.log 2>&1 &
SERVER_PID=$!
echo "   PID: $SERVER_PID"
echo "   URL: http://127.0.0.1:3030"
echo ""

# Wait for API server to be ready
echo "⏳ Waiting for API Server to start..."
for i in {1..20}; do
    if curl -s http://127.0.0.1:3030/healthz > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API Server is ready${NC}"
        break
    fi
    if [ $i -eq 20 ]; then
        echo "❌ API Server failed to start within 20 seconds"
        cat server.log
        exit 1
    fi
    sleep 1
done

echo ""

# Start Web UI
echo -e "${GREEN}🌐 Starting Web UI...${NC}"
echo "   Opening browser at http://localhost:4173"
echo ""

# Check if live-server is installed
if ! command -v npx &> /dev/null; then
    echo "⚠️  npx not found. Please run the following manually:"
    echo "   npx live-server --port=4173 --entry-file=public/index.html"
else
    npx live-server --port=4173 --entry-file=public/index.html --no-browser &
    UI_PID=$!
    echo "   PID: $UI_PID"

    # Wait a moment then open browser
    sleep 2

    # Open browser
    if command -v open &> /dev/null; then
        open http://localhost:4173
    elif command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:4173
    else
        echo "   Please open http://localhost:4173 in your browser"
    fi
fi

echo ""
echo "=========================================="
echo "✨ All services running!"
echo "=========================================="
echo ""
echo "📦 PocketBase:    http://127.0.0.1:8090"
echo "🔧 API Server:    http://127.0.0.1:3030"
echo "🌐 Web UI:        http://localhost:4173"
echo ""
echo "📊 Admin Panel:   http://127.0.0.1:8090/_/"
echo "🔍 Health Check:  http://127.0.0.1:3030/healthz"
echo ""
echo "📝 Logs:"
echo "   PocketBase: tail -f pocketbase.log"
echo "   API Server: tail -f server.log"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Keep script running and wait for processes
wait


