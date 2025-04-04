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
os.makedirs("app/static/uploads", exist_ok=True)
os.makedirs("app/static/models", exist_ok=True)


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        "index.html", {"request": request, "models": models}
    )


@app.post("/detect")
async def detect_tumor(request: Request):
    try:
        form = await request.form()
        file = form.get("file")

        if not file:
            return templates.TemplateResponse(
                "index.html", {"request": request, "error": "No file uploaded"}
            )

        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = f"uploads/{unique_filename}"

        # Save uploaded file
        with open(f"app/static/{file_path}", "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Process image with YOLO
        results = process_with_yolo(f"app/static/{file_path}")

        # If there's an error in processing, return it
        if "error" in results:
            return templates.TemplateResponse(
                "index.html", {"request": request, "error": results["error"]}
            )

        # Return results template with both image path and results
        return templates.TemplateResponse(
            "results.html",
            {"request": request, "image_path": file_path, "results": results},
        )

    except Exception as e:
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "error": f"Error processing image: {str(e)}"},
        )


def process_with_yolo(image_path):
    try:
        # Load and preprocess image
        img = cv2.imread(image_path)
        if img is None:
            return {"error": "Failed to load image"}

        original_height, original_width = img.shape[:2]
        input_size = 640

        # Resize image
        img_resized = cv2.resize(img, (input_size, input_size))

        # Convert to RGB and normalize
        img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)
        img_normalized = img_rgb.astype(np.float32) / 255.0

        # Prepare input tensor
        input_tensor = np.expand_dims(img_normalized, axis=0).transpose(0, 3, 1, 2)

        # Run inference
        session = ort.InferenceSession(
            models["yolo"]["path"], providers=["CPUExecutionProvider"]
        )

        input_name = session.get_inputs()[0].name
        output_names = [output.name for output in session.get_outputs()]
        outputs = session.run(output_names, {input_name: input_tensor})

        # Process detections
        results = {"detections": []}
        predictions = outputs[0]

        # Find the detection with highest confidence
        best_detection = None
        max_confidence = 0

        for pred in predictions[0]:
            confidence = float(pred[4])
            if (
                confidence > 0.25 and confidence > max_confidence
            ):  # Confidence threshold
                max_confidence = confidence
                best_detection = pred

        # If we found a valid detection, process it
        if best_detection is not None:
            x, y, w, h = best_detection[:4]
            confidence = max_confidence

            # Convert to image coordinates
            x_factor = original_width / input_size
            y_factor = original_height / input_size

            x1 = max(0, int((x - w / 2) * x_factor))
            y1 = max(0, int((y - h / 2) * y_factor))
            x2 = min(original_width, int((x + w / 2) * x_factor))
            y2 = min(original_height, int((y + h / 2) * y_factor))

            results["detections"].append(
                {
                    "bbox": [x1, y1, x2, y2],
                    "confidence": min(
                        confidence * 100, 100
                    ),  # Convert to percentage and cap at 100%
                    "class_name": "Tumor",
                }
            )

        return results

    except Exception as e:
        return {"error": f"Error processing image: {str(e)}"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
