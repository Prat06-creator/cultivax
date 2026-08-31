"""
CultivaX — Field Test Set Preparation (PlantDoc -> CultivaX classes)
======================================================================
PlantDoc names its folders differently from PlantVillage (e.g. "Tomato
Early blight leaf" instead of "Tomato___Early_blight") and only covers
some of the 10 tomato classes trained on. This script scans PlantDoc's
train/ and test/ folders, matches tomato-related subfolders to your
training class names via keyword matching, and copies everything into
a field_dataset/test/<class_name>/ structure - kept completely separate
from the PlantVillage-derived dataset/ folder.

Usage:
    python prepare_field_test.py --source "path/to/PlantDoc-Dataset" --dest field_dataset/test
"""

import os
import shutil
import argparse

# Ordered most-specific-first: first matching keyword wins.
# Adjust the keyword lists here if your downloaded folder names differ.
KEYWORD_MAP = [
    (["mosaic"], "Tomato___Tomato_mosaic_virus"),
    (["yellow"], "Tomato___Tomato_Yellow_Leaf_Curl_Virus"),
    (["early blight"], "Tomato___Early_blight"),
    (["late blight"], "Tomato___Late_blight"),
    (["leaf mold", "mould", "mold"], "Tomato___Leaf_Mold"),
    (["septoria"], "Tomato___Septoria_leaf_spot"),
    (["target spot"], "Tomato___Target_Spot"),
    (["bacterial"], "Tomato___Bacterial_spot"),
    (["spider", "mite"], "Tomato___Spider_mites Two-spotted_spider_mite"),
]
# Folders matching none of the above but still tomato-related AND
# containing one of these tokens (and nothing else) are treated as healthy.
HEALTHY_TOKENS = ["healthy"]


def classify_folder(folder_name):
    name = folder_name.lower()
    if "tomato" not in name:
        return None
    for keywords, class_name in KEYWORD_MAP:
        if any(kw in name for kw in keywords):
            return class_name
    if any(tok in name for tok in HEALTHY_TOKENS):
        return "Tomato___healthy"
    # A bare "tomato leaf" folder with no disease keyword is PlantDoc's
    # healthy class in some releases - treat it as healthy too.
    if name.strip() in ("tomato leaf", "tomato leaves"):
        return "Tomato___healthy"
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, help="Path to extracted PlantDoc-Dataset root")
    parser.add_argument("--dest", default="field_dataset/test", help="Output directory")
    args = parser.parse_args()

    candidate_roots = [args.source]
    for sub in ("train", "test"):
        p = os.path.join(args.source, sub)
        if os.path.isdir(p):
            candidate_roots.append(p)

    matched_counts = {}
    unmatched_folders = []

    for root in candidate_roots:
        if not os.path.isdir(root):
            continue
        for entry in os.listdir(root):
            entry_path = os.path.join(root, entry)
            if not os.path.isdir(entry_path):
                continue

            class_name = classify_folder(entry)
            images = [
                f for f in os.listdir(entry_path)
                if f.lower().endswith((".jpg", ".jpeg", ".png"))
            ]
            if not images:
                continue

            if class_name is None:
                if "tomato" in entry.lower():
                    unmatched_folders.append(entry)
                continue

            out_dir = os.path.join(args.dest, class_name)
            os.makedirs(out_dir, exist_ok=True)
            for img in images:
                src = os.path.join(entry_path, img)
                dst_name = f"{os.path.basename(root)}_{img}"  # avoid collisions between train/test copies
                shutil.copy2(src, os.path.join(out_dir, dst_name))

            matched_counts[class_name] = matched_counts.get(class_name, 0) + len(images)

    print("=" * 60)
    print("FIELD TEST SET SUMMARY")
    print("=" * 60)
    if matched_counts:
        for class_name, count in sorted(matched_counts.items()):
            print(f"  {class_name:50s} {count:5d} images")
    else:
        print("  No matching tomato folders found - check --source path.")

    all_trained_classes = sorted({c for _, c in KEYWORD_MAP} | {"Tomato___healthy"})
    missing = [c for c in all_trained_classes if c not in matched_counts]
    if missing:
        print("\nTrained classes with NO field images available (will be skipped in evaluation):")
        for c in missing:
            print(f"  - {c}")

    if unmatched_folders:
        print("\nTomato-related folders found but not auto-matched (check KEYWORD_MAP if these matter):")
        for f in set(unmatched_folders):
            print(f"  - {f}")

    print(f"\nField test set written to: {args.dest}")


if __name__ == "__main__":
    main()
