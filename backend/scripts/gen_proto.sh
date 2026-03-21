#!/bin/bash

# Get the root of the project
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

echo "Generating Go Protobuf files..."
cd "$BACKEND_DIR" || exit

# Ensure output directory exists
mkdir -p internal/pb

# Generate Go code
# Note: This assumes protoc and its Go plugins are installed
protoc --go_out=. --go_opt=module=vstable-engine --go-grpc_out=. --go-grpc_opt=module=vstable-engine api/vstable.proto

echo "Protobuf generation complete!"
