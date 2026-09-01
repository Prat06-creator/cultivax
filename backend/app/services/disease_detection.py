

import os

os.environ["TF_USE_LEGACY_KERAS"] = "1"

import json
from pathlib import Path

import numpy as np
import tensorflow as tf

# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = (
    BASE_DIR
    / "models"
    / "disease"
    / "best_model_finetuned.h5"
)

CLASSES_PATH = (
    BASE_DIR
    / "models"
    / "disease"
    / "classes.json"
)

IMG_SIZE = (224, 224)


# --------------------------------------------------
# Load model and classes ONCE
# --------------------------------------------------

print("Loading CultivaX disease detection model...")

model = tf.keras.models.load_model(MODEL_PATH)

with open(CLASSES_PATH, "r") as f:
    class_names = json.load(f)

print("CultivaX disease model loaded successfully.")
print(f"Number of classes: {len(class_names)}")


# --------------------------------------------------
# Image preprocessing
# Same logic as predict_images.py
# --------------------------------------------------

def preprocess_image(image_bytes):

    img = tf.io.decode_image(
        image_bytes,
        channels=3,
        expand_animations=False
    )

    img = tf.cast(img, tf.float32)

    h = tf.shape(img)[0]
    w = tf.shape(img)[1]

    target_h, target_w = IMG_SIZE

    target_ratio = target_w / target_h

    current_ratio = (
        tf.cast(w, tf.float32)
        / tf.cast(h, tf.float32)
    )

    def crop_width():

        new_w = tf.cast(
            tf.cast(h, tf.float32) * target_ratio,
            tf.int32
        )

        offset_w = (w - new_w) // 2

        return tf.image.crop_to_bounding_box(
            img,
            0,
            offset_w,
            h,
            new_w
        )

    def crop_height():

        new_h = tf.cast(
            tf.cast(w, tf.float32) / target_ratio,
            tf.int32
        )

        offset_h = (h - new_h) // 2

        return tf.image.crop_to_bounding_box(
            img,
            offset_h,
            0,
            new_h,
            w
        )

    img = tf.cond(
        current_ratio > target_ratio,
        crop_width,
        crop_height
    )

    img = tf.image.resize(
        img,
        IMG_SIZE,
        method="bilinear",
        antialias=True
    )

    return img.numpy()


# --------------------------------------------------
# Prediction
# --------------------------------------------------

def predict_disease(image_bytes, top_k=3):

    img = preprocess_image(image_bytes)

    batch = np.expand_dims(img, axis=0)

    predictions = model.predict(
        batch,
        verbose=0
    )[0]

    top_indices = np.argsort(predictions)[::-1][:top_k]

    top_predictions = []

    for idx in top_indices:

        top_predictions.append({
            "class_id": int(idx),
            "class_name": class_names[idx],
            "confidence": float(predictions[idx])
        })

    top_prediction = top_predictions[0]

    return {
        "predicted_class": top_prediction["class_name"],
        "confidence": top_prediction["confidence"],
        "top_predictions": top_predictions
    }