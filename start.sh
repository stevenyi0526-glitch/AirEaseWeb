#!/bin/bash
# AirEase Frontend Start Script
# Usage: ./start.sh
#
# Behavior:
#   1. Kill anything bound to port 5173 (Vite default).
#   2. Quit any existing GNU screen session named "airease-web".
#   3. Launch `npm run dev` inside a fresh detached screen session.
#
# Attach later with:  screen -r airease-web
# Detach from inside: Ctrl-A then D

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=5173
SCREEN_NAME="airease-web"

echo "🌐 AirEase Web Launcher"
echo "========================"

# --- Pre-flight: node_modules ----------------------------------------------
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo "📦 Installing dependencies (npm install)..."
    (cd "$SCRIPT_DIR" && npm install)
fi

# --- Pre-flight: screen binary ---------------------------------------------
if ! command -v screen >/dev/null 2>&1; then
    echo "❌ GNU 'screen' is required but not installed."
    echo "   Install with: brew install screen   (macOS)"
    echo "                  sudo apt install screen  (Debian/Ubuntu)"
    exit 1
fi

# --- Clean: port 5173 -------------------------------------------------------
echo "🧹 Releasing port $PORT..."
PIDS=$(lsof -ti :"$PORT" 2>/dev/null || true)
if [ -n "$PIDS" ]; then
    echo "   killing PID(s): $PIDS"
    kill -9 $PIDS 2>/dev/null || true
fi

# --- Clean: existing screen session ----------------------------------------
echo "🧹 Removing any existing screen session '$SCREEN_NAME'..."
screen -S "$SCREEN_NAME" -X quit >/dev/null 2>&1 || true
screen -wipe >/dev/null 2>&1 || true
sleep 1

# --- Launch -----------------------------------------------------------------
echo ""
echo "🚀 Starting Vite dev server in detached screen '$SCREEN_NAME'..."
echo "   URL: http://localhost:$PORT"
echo ""

screen -dmS "$SCREEN_NAME" bash -c "cd '$SCRIPT_DIR' && exec npm run dev -- --port $PORT --host"

sleep 2
if screen -list | grep -q "\.${SCREEN_NAME}\b"; then
    echo "✅ Frontend started."
    echo "   Attach : screen -r $SCREEN_NAME"
    echo "   Detach : Ctrl-A then D"
    echo "   Stop   : screen -S $SCREEN_NAME -X quit"
else
    echo "❌ Failed to launch screen session."
    exit 1
fi
