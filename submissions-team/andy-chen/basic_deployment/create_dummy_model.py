import os
import numpy as np
import onnx
from onnx import helper, TensorProto, numpy_helper


def create_dummy_yolo_model(output_path="app/static/models/best.onnx"):
    """
    Create a dummy ONNX model that simulates a YOLO model structure.
    This is for testing purposes only.
    """
    # Create input and output tensors
    input_tensor = helper.make_tensor_value_info(
        "images", TensorProto.FLOAT, [1, 3, 640, 640]
    )
    output_tensor = helper.make_tensor_value_info(
        "output", TensorProto.FLOAT, [1, 1, 6]
    )

    # Create a node (simplified)
    node_def = helper.make_node(
        "Conv",
        inputs=["images"],
        outputs=["output"],
        kernel_shape=[3, 3],
        pads=[1, 1, 1, 1],
        name="dummy_yolo",
    )

    # Create graph and model
    graph_def = helper.make_graph(
        [node_def],
        "dummy-yolo-model",
        [input_tensor],
        [output_tensor],
    )

    model_def = helper.make_model(graph_def, producer_name="dummy-yolo-model")
    model_def.opset_import[0].version = 12

    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Save the model
    onnx.save(model_def, output_path)
    print(f"Dummy YOLO model created at: {output_path}")


if __name__ == "__main__":
    create_dummy_yolo_model()
    print("Done. You can now use this dummy model for testing the application.")
    print("Note: This is not a real YOLO model and will not provide real detections.")
