#!/usr/bin/env bash

set -e

echo "🚀 PocketBase Demo - Installation Script"
echo "=========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Node.js version is $NODE_VERSION, but 18+ is recommended."
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm $(npm -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo ""

# Check for PocketBase binary
if [ ! -f "./pocketbase" ]; then
    echo "⚠️  PocketBase binary not found!"
    echo "📥 Downloading PocketBase..."

    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)

    case "$OS" in
        darwin)
            case "$ARCH" in
                x86_64) DOWNLOAD_URL="https://github.com/pocketbase/pocketbase/releases/download/v0.30.4/pocketbase_0.30.4_darwin_amd64.zip" ;;
                arm64)  DOWNLOAD_URL="https://github.com/pocketbase/pocketbase/releases/download/v0.30.4/pocketbase_0.30.4_darwin_arm64.zip" ;;
                *) echo "❌ Unsupported architecture: $ARCH"; exit 1 ;;
            esac
            ;;
        linux)
            case "$ARCH" in
                x86_64) DOWNLOAD_URL="https://github.com/pocketbase/pocketbase/releases/download/v0.30.4/pocketbase_0.30.4_linux_amd64.zip" ;;
                aarch64|arm64) DOWNLOAD_URL="https://github.com/pocketbase/pocketbase/releases/download/v0.30.4/pocketbase_0.30.4_linux_arm64.zip" ;;
                *) echo "❌ Unsupported architecture: $ARCH"; exit 1 ;;
            esac
            ;;
        *)
            echo "❌ Unsupported OS: $OS"
            exit 1
            ;;
    esac

    curl -L "$DOWNLOAD_URL" -o pocketbase.zip
    unzip -o pocketbase.zip
    rm pocketbase.zip
    chmod +x pocketbase

    echo "✅ PocketBase downloaded successfully"
else
    echo "✅ PocketBase binary found"
fi

echo ""

# Setup database
echo "🗄️  Setting up database..."
if [ ! -d "./pb_data" ]; then
    echo "📊 Running initial setup..."
    npm run setup
else
    echo "✅ Database already exists (pb_data directory found)"
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Start PocketBase:  npm run serve"
echo "  2. Start API server:  npm run server"
echo "  3. Start web UI:      npx live-server --port=4173 --entry-file=public/index.html"
echo ""
echo "Or use the quick start script:"
echo "  ./start.sh"
echo ""


