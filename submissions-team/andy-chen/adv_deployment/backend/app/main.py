import os
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import numpy as np
import io
import cv2
from typing import List
import json
import base64

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://neurovision.andy-chen.dev"
    ],  # Only allow your frontend domain
    allow_credentials=True,
    allow_methods=["GET", "POST"],  # Only allow methods you need
    allow_headers=["*"],
)


class VGG16Transfer(nn.Module):
    def __init__(self):
        super(VGG16Transfer, self).__init__()

        # Create VGG16 model without pre-trained weights
        self.vgg16 = models.vgg16(pretrained=False)

        # Replace the classifier with our custom classifier
        self.vgg16.classifier = nn.Sequential(
            nn.Linear(25088, 256),  # VGG16's last conv layer outputs 25088 features
            nn.ReLU(),
            nn.Dropout(0.3),  # Dropout after dense layer and ReLU
            nn.Linear(256, 1),  # Binary classification (1 output neuron)
            nn.Sigmoid(),  # Sigmoid activation for binary classification
        )

    def forward(self, x):
        return self.vgg16(x)


# Load the model
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = VGG16Transfer()

# Load the checkpoint and extract the model state dict
checkpoint = torch.load("model_weights.pth", map_location=device)
if "model_state_dict" in checkpoint:
    model.load_state_dict(checkpoint["model_state_dict"])
else:
    model.load_state_dict(checkpoint)

model = model.to(device)
model.eval()

# Image preprocessing
preprocess = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]
)


class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None

        def backward_hook(module, grad_input, grad_output):
            self.gradients = grad_output[0]

        def forward_hook(module, input, output):
            self.activations = output

        target_layer.register_forward_hook(forward_hook)
        target_layer.register_backward_hook(backward_hook)

    def generate_cam(self, input_tensor, prediction):
        self.model.zero_grad()
        output = self.model(input_tensor)

        # For binary classification, we want to generate CAM for the predicted class
        # If prediction is 1 (tumor), we want to maximize the output
        # If prediction is 0 (no tumor), we want to minimize the output
        target = output[0, 0] if prediction == 1 else -output[0, 0]
        target.backward()

        gradients = self.gradients.detach().cpu().numpy()[0]
        activations = self.activations.detach().cpu().numpy()[0]

        weights = np.mean(gradients, axis=(1, 2))
        cam = np.zeros(activations.shape[1:], dtype=np.float32)

        for i, w in enumerate(weights):
            cam += w * activations[i]

        cam = np.maximum(cam, 0)
        cam = cv2.resize(cam, (224, 224))
        cam = cam - np.min(cam)
        cam = cam / np.max(cam)

        return cam


# Get the target layer for Grad-CAM
# Find the last convolutional layer in features
for layer in reversed(model.vgg16.features):
    if isinstance(layer, nn.Conv2d):
        target_layer = layer
        break
grad_cam = GradCAM(model, target_layer)


def overlay_grad_cam(image, cam):
    # Resize original image to match CAM size
    image = cv2.resize(image, (224, 224))

    # Convert CAM to heatmap
    heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)

    # Blend original image with heatmap
    alpha = 0.5
    overlay = cv2.addWeighted(image, 1 - alpha, heatmap, alpha, 0)

    return overlay


@app.get("/models")
async def get_available_models():
    return {
        "models": [
            {
                "name": "VGG16",
                "available": True,
                "description": "VGG16 with Grad-CAM visualization",
            },
            {
                "name": "YOLOv12",
                "available": False,
                "description": "Currently unavailable",
            },
        ]
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...), model_name: str = Form(...)):
    try:
        if model_name != "VGG16":
            raise HTTPException(
                status_code=400, detail="Only VGG16 is currently available"
            )

        # Read and preprocess the image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        input_tensor = preprocess(image).unsqueeze(0).to(device)

        # Get prediction
        with torch.no_grad():
            output = model(input_tensor)
            # For binary classification with sigmoid, output is already a probability
            confidence = output.item()
            # If confidence > 0.5, predict tumor (1), else no tumor (0)
            prediction = 1 if confidence > 0.5 else 0

        # Generate Grad-CAM
        cam = grad_cam.generate_cam(input_tensor, prediction)

        # Convert original image to numpy array
        original_image = np.array(image)
        original_image = cv2.cvtColor(original_image, cv2.COLOR_RGB2BGR)

        # Create overlay image
        overlay_image = overlay_grad_cam(original_image, cam)

        # Convert both images to base64
        def image_to_base64(image):
            _, buffer = cv2.imencode(".png", image)
            return base64.b64encode(buffer).decode("utf-8")

        original_base64 = image_to_base64(original_image)
        overlay_base64 = image_to_base64(overlay_image)

        return JSONResponse(
            {
                "prediction": int(prediction),
                "confidence": float(confidence),
                "original_image": original_base64,
                "overlay_image": overlay_base64,
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
