#!/bin/bash
# Run this from anywhere with:  bash frontend/start.sh
# It figures out its own location, so it always works no matter where
# the project folder lives on your computer.

cd "$(dirname "$0")"   # move into the frontend/ folder (where this script sits)

if [ ! -d "node_modules" ]; then
  echo "No node_modules found — running npm install (first-time setup, takes ~1-2 min)..."
  npm install
fi

echo "Starting frontend on http://localhost:5173 ..."
npm run dev
