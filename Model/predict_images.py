"""
CultivaX — Quick Manual Prediction Check
===========================================
Runs the trained model on a folder of loose images (no class subfolders
needed) and prints the predicted class + confidence for each - useful
for eyeballing real photos you already know the answer for.

Usage:
    python predict_images.py --checkpoint checkpoints\\20260831_093245\\best_model_finetuned.keras \
        --classes_json checkpoints\\20260831_093245\\classes.json \
        --image_dir "C:\\Users\\Saraswata\\Pictures\\random test"
"""

import os
import json
import argparse
import numpy as np
import tensorflow as tf


def load_image(path, img_size):
    img = tf.io.read_file(path)
    img = tf.io.decode_image(img, channels=3, expand_animations=False)
    img = tf.cast(img, tf.float32)

    h = tf.shape(img)[0]
    w = tf.shape(img)[1]
    target_h, target_w = img_size
    target_ratio = target_w / target_h
    current_ratio = tf.cast(w, tf.float32) / tf.cast(h, tf.float32)

    def crop_width():
        new_w = tf.cast(tf.cast(h, tf.float32) * target_ratio, tf.int32)
        offset_w = (w - new_w) // 2
        return tf.image.crop_to_bounding_box(img, 0, offset_w, h, new_w)

    def crop_height():
        new_h = tf.cast(tf.cast(w, tf.float32) / target_ratio, tf.int32)
        offset_h = (h - new_h) // 2
        return tf.image.crop_to_bounding_box(img, offset_h, 0, new_h, w)

    img = tf.cond(current_ratio > target_ratio, crop_width, crop_height)
    img = tf.image.resize(img, img_size, method="bilinear", antialias=True)
    return img.numpy()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--classes_json", required=True)
    parser.add_argument("--image_dir", required=True, help="Folder of loose images, no subfolders needed")
    parser.add_argument("--img_size", type=int, nargs=2, default=[224, 224])
    parser.add_argument("--top_k", type=int, default=3, help="How many alternative predictions to show")
    args = parser.parse_args()

    img_size = tuple(args.img_size)

    with open(args.classes_json) as f:
        class_names = json.load(f)

    print(f"Loading model from: {args.checkpoint}")
    model = tf.keras.models.load_model(args.checkpoint)

    image_files = [
        f for f in os.listdir(args.image_dir)
        if f.lower().endswith((".jpg", ".jpeg", ".png"))
    ]

    if not image_files:
        print("No images found in that folder.")
        return

    print("\n" + "=" * 70)
    print("PREDICTIONS")
    print("=" * 70)

    for fname in sorted(image_files):
        path = os.path.join(args.image_dir, fname)
        img = load_image(path, img_size)
        batch = np.expand_dims(img, axis=0)
        preds = model.predict(batch, verbose=0)[0]

        top_indices = np.argsort(preds)[::-1][:args.top_k]

        print(f"\n{fname}")
        for rank, idx in enumerate(top_indices, start=1):
            marker = " <-- top pick" if rank == 1 else ""
            print(f"  {rank}. {class_names[idx]:50s} {preds[idx] * 100:5.1f}%{marker}")


if __name__ == "__main__":
    main()
