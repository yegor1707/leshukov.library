#!/bin/bash
set -e

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Building frontend..."
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/library run build

echo "Building API server..."
pnpm --filter @workspace/api-server run build

echo "Build complete!"
