# Brain MRI Tumor Detection Web App

A web application for detecting tumors in brain MRI scans using deep learning models.

## Features

- Upload brain MRI images for tumor detection
- Choose between different detection models:
  - YOLOv8 model (available)
  - VGG-16 fine-tuned model (coming soon)
- View detection results with bounding boxes
- Display classification probabilities and confidence scores

## Setup Instructions

### Option 1: Docker (Recommended)

1. Clone this repository:

```bash
git clone <repository-url>
cd <repository-name>
```

2. Start the application using the provided script:

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

**Windows:**
```powershell
.\start.ps1
```

This will:
- Create a dummy YOLO model for testing (if you don't have a real model)
- Build and start the Docker container
- Make the application available at http://localhost:8000

3. Open your browser and navigate to http://localhost:8000

To stop the container:

```bash
docker-compose down
```

### Using Your Own YOLO Model

If you have a trained YOLO model file (best.onnx):

1. Place it in the `app/static/models/` directory before running the start script
2. The application will automatically use your model instead of the dummy one

### Option 2: Local Installation

1. Clone this repository:

```bash
git clone <repository-url>
cd <repository-name>
```

2. Install the required dependencies:

```bash
pip install -r requirements.txt
```

3. Create a dummy model or add your own model:

```bash
python create_dummy_model.py
```

Or place your trained YOLO model file (best.onnx) in `app/static/models/`

4. Run the application:

```bash
python -m app.main
```

5. Open your browser and navigate to http://localhost:8000

## Technologies Used

- Backend: FastAPI
- Frontend: HTML, CSS, JavaScript
- Models: YOLOv8 (ONNX format), VGG-16 (coming soon)
- Image Processing: OpenCV, NumPy
- Deployment: Docker, Docker Compose

## Directory Structure

```
app/
├── static/
│   ├── css/
│   ├── js/
│   ├── img/
│   └── models/
├── templates/
│   ├── base.html
│   ├── index.html
│   └── results.html
└── main.py
Dockerfile
docker-compose.yml
requirements.txt
start.sh
start.ps1
```

## Model Information

### YOLOv8

YOLOv8 is a state-of-the-art object detection model that provides excellent balance between speed and accuracy. In this application, we use a version of YOLOv8 trained specifically for detecting tumors in brain MRI scans.

### VGG-16 (Coming Soon)

VGG-16 is a deep convolutional neural network architecture known for its strong feature extraction capabilities. We will implement a fine-tuned version of VGG-16 trained specifically for brain tumor detection in a future update. 