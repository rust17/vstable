#!/bin/bash

# Get the root of the project
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "Generating Go Protobuf files..."
cd "$BACKEND_DIR" || exit

# Ensure output directory exists
mkdir -p internal/pb

# Generate Go code
# Note: This assumes protoc and its Go plugins are installed
protoc --go_out=. --go_opt=module=vstable-engine --go-grpc_out=. --go-grpc_opt=module=vstable-engine api/vstable.proto

echo "Syncing .proto file to frontend resources..."
# Ensure frontend resource directory exists
mkdir -p "$FRONTEND_DIR/resources/api"

# Copy the proto file to frontend for runtime loading
cp "$BACKEND_DIR/api/vstable.proto" "$FRONTEND_DIR/resources/api/vstable.proto"

echo "Protobuf generation and sync complete!"
