#!/bin/bash

# Start Docker Compose
echo "Starting brain MRI tumor detection application..."
docker-compose up -d

echo "Application started! Access it at http://localhost:8000" 