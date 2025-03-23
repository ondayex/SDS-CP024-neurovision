#!/bin/bash

# Check if dummy model exists, create it if not
if [ ! -f app/static/models/best.onnx ]; then
    echo "Dummy model not found. Creating one for testing..."
    python create_dummy_model.py
fi

# Start Docker Compose
echo "Starting brain MRI tumor detection application..."
docker-compose up -d

echo "Application started! Access it at http://localhost:8000" 