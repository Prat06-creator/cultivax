"""
CultivaX — Dataset Preparation Script (Tomato)
================================================
Filters the PlantVillage 'color' directory down to tomato classes only,
removes exact-duplicate images (PlantVillage is known to contain some),
and splits the result into the train/val/test layout expected by
train_cultivax_disease_model.py:

    dataset/images/train/<class_name>/*.jpg
    dataset/images/val/<class_name>/*.jpg
    dataset/images/test/<class_name>/*.jpg

Note on leakage: this removes EXACT duplicate files (by content hash).
PlantVillage also contains near-duplicate augmented variants of the same
source leaf (slightly rotated/flipped copies) which a hash check won't
catch. A random split can still let near-duplicates land in different
splits, inflating validation/test scores. For your project's real field
hold-out (Section 22), rely on PlantDoc or your own captured images
instead of a PlantVillage-derived test set, since only those are truly
independent of the training distribution.

Usage:
    python prepare_tomato_dataset.py --source "path/to/plantvillage/color" --dest dataset/images
"""

import os
import shutil
import random
import hashlib
import argparse
from collections import defaultdict

SPLIT_RATIOS = {"train": 0.70, "val": 0.15, "test": 0.15}
SEED = 42


def find_tomato_classes(source_dir):
    classes = [
        d for d in os.listdir(source_dir)
        if os.path.isdir(os.path.join(source_dir, d)) and d.lower().startswith("tomato")
    ]
    if not classes:
        raise RuntimeError(
            f"No folders starting with 'Tomato' found in {source_dir}. "
            "Double-check --source points at the PlantVillage 'color' directory."
        )
    return sorted(classes)


def file_hash(path, block_size=65536):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(block_size), b""):
            h.update(block)
    return h.hexdigest()


def dedupe_images(image_paths):
    """Drop exact-duplicate files (by content hash), keeping the first seen."""
    seen_hashes = set()
    unique_paths = []
    for p in image_paths:
        h = file_hash(p)
        if h not in seen_hashes:
            seen_hashes.add(h)
            unique_paths.append(p)
    return unique_paths


def split_list(items, ratios, seed=SEED):
    rng = random.Random(seed)
    items = items[:]
    rng.shuffle(items)
    n = len(items)
    n_train = int(n * ratios["train"])
    n_val = int(n * ratios["val"])
    return {
        "train": items[:n_train],
        "val": items[n_train:n_train + n_val],
        "test": items[n_train + n_val:],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, help="Path to PlantVillage 'color' directory")
    parser.add_argument("--dest", default="dataset/images", help="Output directory (default: dataset/images)")
    args = parser.parse_args()

    classes = find_tomato_classes(args.source)
    print(f"Found {len(classes)} tomato classes:")
    for c in classes:
        print(f"  - {c}")

    summary = defaultdict(dict)

    for class_name in classes:
        class_dir = os.path.join(args.source, class_name)
        image_paths = [
            os.path.join(class_dir, f) for f in os.listdir(class_dir)
            if f.lower().endswith((".jpg", ".jpeg", ".png"))
        ]

        before = len(image_paths)
        image_paths = dedupe_images(image_paths)
        after = len(image_paths)
        if before != after:
            print(f"[{class_name}] removed {before - after} exact duplicate(s)")

        splits = split_list(image_paths, SPLIT_RATIOS)

        for split_name, paths in splits.items():
            out_dir = os.path.join(args.dest, split_name, class_name)
            os.makedirs(out_dir, exist_ok=True)
            for src_path in paths:
                shutil.copy2(src_path, out_dir)
            summary[class_name][split_name] = len(paths)

    print("\n" + "=" * 60)
    print("DATASET SUMMARY")
    print("=" * 60)
    print(f"{'Class':45s} {'train':>7s} {'val':>7s} {'test':>7s}")
    for class_name in classes:
        s = summary[class_name]
        print(f"{class_name:45s} {s['train']:7d} {s['val']:7d} {s['test']:7d}")

    print(f"\nDone. Dataset written to: {args.dest}")


if __name__ == "__main__":
    main()
