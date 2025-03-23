# Check if dummy model exists, create it if not
if (-not (Test-Path -Path "app/static/models/best.onnx")) {
    Write-Host "Dummy model not found. Creating one for testing..."
    python create_dummy_model.py
}

# Start Docker Compose
Write-Host "Starting brain MRI tumor detection application..."
docker-compose up -d

Write-Host "Application started! Access it at http://localhost:8000" 