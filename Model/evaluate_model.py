"""
CultivaX — Model Evaluation Script
====================================
Loads the best checkpoint from a training run and evaluates it on the
held-out test set (dataset/images/test), which the model has never seen
during training or validation. Reports per-class precision/recall/F1,
a confusion matrix, and overall accuracy/loss.

Usage:
    python evaluate_model.py --checkpoint checkpoints/20260829_134821/best_model.keras --data_dir dataset/images
"""

import os
import json
import argparse
import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix


def load_test_dataset(data_dir, img_size, batch_size):
    test_dir = os.path.join(data_dir, "test")
    ds = tf.keras.utils.image_dataset_from_directory(
        test_dir,
        image_size=img_size,
        batch_size=batch_size,
        label_mode="categorical",
        shuffle=False,
        crop_to_aspect_ratio=True,
    )
    class_names = ds.class_names
    # No preprocess_input here - the model now rescales internally
    # (see train_cultivax_disease_model.py), so feed raw [0,255] images.
    return ds, class_names


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", required=True, help="Path to the .keras checkpoint file")
    parser.add_argument("--data_dir", default="dataset/images", help="Dataset root (default: dataset/images)")
    parser.add_argument("--img_size", type=int, nargs=2, default=[224, 224])
    parser.add_argument("--batch_size", type=int, default=16)
    args = parser.parse_args()

    img_size = tuple(args.img_size)

    print(f"Loading model from: {args.checkpoint}")
    model = tf.keras.models.load_model(args.checkpoint)

    test_ds, class_names = load_test_dataset(args.data_dir, img_size, args.batch_size)
    print(f"Classes: {class_names}")

    print("\nRunning overall loss/accuracy evaluation...")
    results = model.evaluate(test_ds, verbose=1)
    print(f"Test loss: {results[0]:.4f} | Test accuracy: {results[1]:.4f}")

    print("\nRunning predictions for per-class metrics...")
    y_true_all, y_pred_all = [], []
    for x_batch, y_batch in test_ds:
        preds = model.predict(x_batch, verbose=0)
        y_true_all.append(np.argmax(y_batch.numpy(), axis=1))
        y_pred_all.append(np.argmax(preds, axis=1))
    y_true_all = np.concatenate(y_true_all)
    y_pred_all = np.concatenate(y_pred_all)

    report = classification_report(
        y_true_all, y_pred_all, target_names=class_names, digits=3, output_dict=True
    )
    report_text = classification_report(y_true_all, y_pred_all, target_names=class_names, digits=3)
    print("\n" + "=" * 70)
    print("PER-CLASS CLASSIFICATION REPORT (test set)")
    print("=" * 70)
    print(report_text)

    cm = confusion_matrix(y_true_all, y_pred_all)
    print("\nCONFUSION MATRIX (rows=true, cols=predicted)")
    header = "".join(f"{i:>6d}" for i in range(len(class_names)))
    print(" " * 30 + header)
    for i, row in enumerate(cm):
        row_str = "".join(f"{v:>6d}" for v in row)
        print(f"{class_names[i]:30s}{row_str}")

    # Flag any class whose recall is notably low relative to the others -
    # these are the classes most likely to produce dangerous false negatives
    # in the field (per the project's safety principle).
    recalls = {class_names[i]: report[class_names[i]]["recall"] for i in range(len(class_names))}
    avg_recall = sum(recalls.values()) / len(recalls)
    print("\nClasses notably below average recall (possible weak spots):")
    flagged = False
    for cname, r in recalls.items():
        if r < avg_recall - 0.10:
            print(f"  {cname}: recall={r:.3f} (avg={avg_recall:.3f})")
            flagged = True
    if not flagged:
        print("  None - recall is fairly even across classes.")

    out_dir = os.path.dirname(args.checkpoint)
    out_path = os.path.join(out_dir, "test_evaluation.json")
    with open(out_path, "w") as f:
        json.dump({
            "test_loss": results[0],
            "test_accuracy": results[1],
            "classification_report": report,
            "confusion_matrix": cm.tolist(),
            "class_names": class_names,
        }, f, indent=2)
    print(f"\nFull results saved to: {out_path}")


if __name__ == "__main__":
    main()