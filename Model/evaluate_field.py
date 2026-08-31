"""
CultivaX — Field Evaluation Script (partial-class safe)
==========================================================
Unlike evaluate_model.py (which assumes every trained class has test
images present), this script is built for the field-test case where
PlantDoc (or your own captured photos) may not cover every one of your
10 trained classes. It loads the FIXED class order from your training
run's classes.json - never re-inferring it from folder names - so
predictions stay correctly aligned with the model's output even when
some class folders are missing or empty.

Usage:
    python evaluate_field.py --checkpoint checkpoints/20260829_134821/best_model.keras \
        --classes_json checkpoints/20260829_134821/classes.json \
        --field_dir field_dataset/test
"""

import os
import json
import argparse
import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix


def load_image(path, img_size):
    img = tf.io.read_file(path)
    img = tf.io.decode_image(img, channels=3, expand_animations=False)
    img = tf.cast(img, tf.float32)

    # Center-crop to the target aspect ratio, THEN resize - this matches
    # image_dataset_from_directory's crop_to_aspect_ratio=True behavior used
    # in training and evaluate_model.py. Keeping this consistent matters more
    # than which strategy (crop vs pad) is "better" in isolation - a model
    # trained on center-cropped images should also be evaluated on
    # center-cropped images, not padded ones.
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
    parser.add_argument("--classes_json", required=True, help="classes.json saved during training - fixes class order")
    parser.add_argument("--field_dir", required=True, help="Folder containing one subfolder per class (e.g. field_dataset/test)")
    parser.add_argument("--img_size", type=int, nargs=2, default=[224, 224])
    args = parser.parse_args()

    img_size = tuple(args.img_size)

    with open(args.classes_json) as f:
        class_names = json.load(f)  # fixed order, matches model output index exactly

    print(f"Loading model from: {args.checkpoint}")
    model = tf.keras.models.load_model(args.checkpoint)

    y_true_all, y_pred_all = [], []
    available_classes = []
    missing_classes = []

    for true_idx, class_name in enumerate(class_names):
        class_dir = os.path.join(args.field_dir, class_name)
        if not os.path.isdir(class_dir):
            missing_classes.append(class_name)
            continue
        images = [
            f for f in os.listdir(class_dir)
            if f.lower().endswith((".jpg", ".jpeg", ".png"))
        ]
        if not images:
            missing_classes.append(class_name)
            continue

        available_classes.append(class_name)
        batch = np.stack([load_image(os.path.join(class_dir, f), img_size) for f in images])
        preds = model.predict(batch, verbose=0)
        pred_idx = np.argmax(preds, axis=1)

        y_true_all.extend([true_idx] * len(images))
        y_pred_all.extend(pred_idx.tolist())

    if not available_classes:
        print("No field images found for any trained class. Check --field_dir.")
        return

    print("\n" + "=" * 60)
    print("FIELD EVALUATION - CLASSES CHECKED")
    print("=" * 60)
    for c in available_classes:
        print(f"  {c}")
    if missing_classes:
        print("\nClasses SKIPPED (no field images available for these):")
        for c in missing_classes:
            print(f"  - {c}")

    y_true_all = np.array(y_true_all)
    y_pred_all = np.array(y_pred_all)

    # Restrict the report to classes that actually had field images as the
    # true label, but keep the model's FULL label space so a prediction
    # into a missing class still shows up as a (visible) misclassification
    # rather than being silently dropped.
    present_indices = sorted({class_names.index(c) for c in available_classes})
    report_text = classification_report(
        y_true_all, y_pred_all,
        labels=list(range(len(class_names))),
        target_names=class_names,
        digits=3,
        zero_division=0,
    )
    print("\n" + "=" * 60)
    print("FIELD PER-CLASS CLASSIFICATION REPORT")
    print("(rows for skipped classes will show 0 support - ignore those rows)")
    print("=" * 60)
    print(report_text)

    overall_acc = (y_true_all == y_pred_all).mean()
    print(f"Overall field accuracy (checked classes only): {overall_acc:.4f}")

    cm = confusion_matrix(y_true_all, y_pred_all, labels=list(range(len(class_names))))
    print("\nCONFUSION MATRIX (rows=true, cols=predicted; full 10-class label space)")
    header = "".join(f"{i:>6d}" for i in range(len(class_names)))
    print(" " * 45 + header)
    for i, row in enumerate(cm):
        row_str = "".join(f"{v:>6d}" for v in row)
        marker = "" if class_names[i] in available_classes else "  (skipped)"
        print(f"{class_names[i]:45s}{row_str}{marker}")

    out_path = os.path.join(os.path.dirname(args.checkpoint), "field_evaluation.json")
    with open(out_path, "w") as f:
        json.dump({
            "overall_field_accuracy": float(overall_acc),
            "classes_checked": available_classes,
            "classes_skipped": missing_classes,
            "confusion_matrix": cm.tolist(),
            "class_names": class_names,
        }, f, indent=2)
    print(f"\nFull results saved to: {out_path}")


if __name__ == "__main__":
    main()