"""
CultivaX — Integrate Field Data (split for training vs. genuine holdout)
===========================================================================
Takes the field_dataset/test folder (built by prepare_field_test.py from
PlantDoc) and splits each class three ways:

  - part added into dataset/images/train/<class>/   (model learns from it)
  - part added into dataset/images/val/<class>/      (validation sees some field realism)
  - part moved into field_holdout_test/<class>/      (NEVER touched during training -
                                                        this is the real, final field check)

This is deliberately a separate step from prepare_field_test.py so the
original field_dataset/test/ can be regenerated from scratch later if
needed without losing track of which images were already used for training.

Usage:
    python integrate_field_data.py --field_source field_dataset/test --data_dir dataset/images --holdout_dir field_holdout_test
"""

import os
import shutil
import random
import argparse

SEED = 42
SPLIT = {"train": 0.60, "val": 0.15, "holdout": 0.25}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--field_source", default="field_dataset/test")
    parser.add_argument("--data_dir", default="dataset/images")
    parser.add_argument("--holdout_dir", default="field_holdout_test")
    args = parser.parse_args()

    rng = random.Random(SEED)
    classes = [
        d for d in os.listdir(args.field_source)
        if os.path.isdir(os.path.join(args.field_source, d))
    ]

    print("=" * 60)
    print("INTEGRATING FIELD DATA")
    print("=" * 60)

    for class_name in classes:
        class_dir = os.path.join(args.field_source, class_name)
        images = [
            f for f in os.listdir(class_dir)
            if f.lower().endswith((".jpg", ".jpeg", ".png"))
        ]
        rng.shuffle(images)

        n = len(images)
        n_train = int(n * SPLIT["train"])
        n_val = int(n * SPLIT["val"])

        buckets = {
            "train": images[:n_train],
            "val": images[n_train:n_train + n_val],
            "holdout": images[n_train + n_val:],
        }

        for bucket, files in buckets.items():
            if bucket == "holdout":
                out_dir = os.path.join(args.holdout_dir, class_name)
            else:
                out_dir = os.path.join(args.data_dir, bucket, class_name)
            os.makedirs(out_dir, exist_ok=True)
            for f in files:
                shutil.copy2(os.path.join(class_dir, f), os.path.join(out_dir, f"field_{f}"))

        print(f"{class_name:50s} train+={len(buckets['train']):3d}  val+={len(buckets['val']):3d}  holdout={len(buckets['holdout']):3d}")

    print(f"\nDone. Training/val folders updated in place under {args.data_dir}.")
    print(f"Final untouched field test set written to: {args.holdout_dir}")
    print("\nIMPORTANT: from now on, evaluate field performance using --field_dir "
          f"{args.holdout_dir} (NOT {args.field_source}, which has been partially absorbed into training).")


if __name__ == "__main__":
    main()
