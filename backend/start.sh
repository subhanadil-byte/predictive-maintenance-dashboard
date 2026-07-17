#!/bin/bash
# Run this from anywhere with:  bash backend/start.sh
# It figures out its own location, so it always works no matter where
# the project folder lives on your computer.

cd "$(dirname "$0")"   # move into the backend/ folder (where this script sits)

if [ ! -d ".venv" ]; then
  echo "No .venv found — creating one (first-time setup, takes ~1-2 min)..."
  python3.12 -m venv .venv
  source .venv/bin/activate
  pip install --upgrade pip
  pip install -r requirements.txt
else
  source .venv/bin/activate
fi

echo "Starting backend on http://localhost:8000 ..."
uvicorn main:app --reload --port 8000
