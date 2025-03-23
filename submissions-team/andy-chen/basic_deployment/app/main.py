from fastapi import FastAPI, Request, File, UploadFile, Form
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import shutil
import os
import uuid
import numpy as np
import cv2
import onnxruntime as ort
from PIL import Image
import io

app = FastAPI(title="Brain MRI Tumor Detection")

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Templates
templates = Jinja2Templates(directory="app/templates")

# Available models
models = {
    "yolo": {
        "path": "app/static/models/best.onnx",
        "name": "YOLO Model",
        "description": "YOLOv8 model trained for brain tumor detection. This model uses single-stage object detection architecture providing a good balance between speed and accuracy.",
    },
    "vgg16": {
        "path": "app/static/models/vgg16_finetuned.onnx",  # This will be added later
        "name": "VGG-16 Fine-tuned Model",
        "description": "VGG-16 model fine-tuned for brain tumor detection. This model is based on a deep CNN architecture known for its good feature extraction capabilities.",
    },
}

# Ensure the uploads directory exists
os.makedirs("app/static/img/uploads", exist_ok=True)
os.makedirs("app/static/models", exist_ok=True)


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        "index.html", {"request": request, "models": models}
    )


@app.post("/detect")
async def detect_tumor(
    request: Request, file: UploadFile = File(...), model_type: str = Form(...)
):
    # Save uploaded file
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = f"app/static/img/uploads/{unique_filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Process image with selected model
    if model_type == "yolo":
        results = process_with_yolo(file_path)
    elif model_type == "vgg16":
        # This will be implemented later
        results = {"message": "VGG-16 model not yet implemented"}
    else:
        results = {"error": "Invalid model selected"}

    # Add the image path to the results
    results["image_path"] = f"/static/img/uploads/{unique_filename}"
    results["model_info"] = models[model_type]

    return templates.TemplateResponse(
        "results.html", {"request": request, "results": results}
    )


def process_with_yolo(image_path):
    # Check if the model exists
    model_path = models["yolo"]["path"]
    if not os.path.exists(model_path):
        return {
            "message": "YOLO model file not found. Please add the model file to app/static/models/best.onnx. This is a simulation mode for now."
        }

    try:
        # Load and preprocess image
        img = cv2.imread(image_path)
        if img is None:
            return {"error": "Failed to load image"}

        original_height, original_width = img.shape[:2]

        # Resize and normalize image for YOLO (assuming 640x640 input)
        input_size = 640
        img_resized = cv2.resize(img, (input_size, input_size))
        img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)

        # Normalize to 0-1
        img_normalized = img_rgb.astype(np.float32) / 255.0
        # Expand dimensions to create batch size of 1 [batch_size, height, width, channels]
        blob = np.expand_dims(img_normalized, axis=0).transpose(0, 3, 1, 2)

        # Run inference with ONNX Runtime
        session = ort.InferenceSession(model_path)
        input_name = session.get_inputs()[0].name
        output_names = [output.name for output in session.get_outputs()]
        outputs = session.run(output_names, {input_name: blob})

        # Process output (assuming YOLOv8 format)
        # For YOLOv8, output shape is typically [batch, num_detections, 85]
        # where 85 = 4 (bbox) + 1 (confidence) + 80 (class scores for COCO)
        # For brain tumor detection, we might have fewer classes

        # Extract boxes and scores
        detections = outputs[0]  # Assuming first output contains detections

        # Initialize the results list
        results = {"detections": []}

        # Process detections
        for detection in detections[0]:  # Process first image in batch
            confidence = float(detection[4])  # Detection confidence

            # Only consider detections with confidence above threshold
            if confidence > 0.25:  # Adjustable threshold
                # Get bounding box coordinates (YOLO format)
                x, y, w, h = detection[:4]

                # Convert to original image coordinates
                x_factor = original_width / input_size
                y_factor = original_height / input_size

                x1 = int((x - w / 2) * x_factor)
                y1 = int((y - h / 2) * y_factor)
                x2 = int((x + w / 2) * x_factor)
                y2 = int((y + h / 2) * y_factor)

                # Get class probabilities (assuming one class for brain tumor)
                class_prob = float(detection[5])  # Probability of first class

                # Add detection to results
                results["detections"].append(
                    {
                        "bbox": [x1, y1, x2, y2],
                        "confidence": confidence,
                        "class_probability": class_prob,
                        "class_name": "Tumor",  # Assuming class name
                    }
                )

        return results

    except Exception as e:
        return {"error": f"Error during processing: {str(e)}"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
