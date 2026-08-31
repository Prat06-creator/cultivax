"""
CultivaX — Pool Multiple Field Data Sources
==============================================
Consolidates four real-world tomato image sources into one pool,
mapped to your 10 trained class names:

  1. field_dataset/test        - PlantDoc (already canonical names, just copied through)
  2. TomatoDataset              - PlantVillage-style naming (already canonical, just copied through)
  3. "Tomato Leaf" (Mendeley)   - needs keyword mapping; Cercospora leaf mold + Leaf Mold
                                  both map to Leaf_Mold; Insect Damage/Leaf Miner skipped
                                  (no equivalent trained class)
  4. Tomato-Village Variant-a   - needs keyword mapping; train+val+test folders all pooled
                                  together (we do our own split later anyway); only
                                  Early_blight/Healthy/Late_blight have trained-class
                                  equivalents, everything else skipped

Output: field_pool/<canonical_class>/<source>_<original_filename>

This does NOT touch dataset/images or field_holdout_test - run
integrate_field_data.py against field_pool/ afterward to do the actual
60/15/25 split into train/val/holdout.

Usage:
    python pool_field_sources.py \
        --plantdoc field_dataset/test \
        --tomatodataset "C:/path/to/TomatoDataset" \
        --tomatoleaf "C:/path/to/Tomato Leaf" \
        --tomatovillage "C:/path/to/Tomato-Village-main/Variant-a(Multiclass Classification)" \
        --dest field_pool
"""

import os
import shutil
import argparse

CANONICAL_CLASSES = [
    "Tomato___Bacterial_spot", "Tomato___Early_blight", "Tomato___Late_blight",
    "Tomato___Leaf_Mold", "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite", "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus", "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy",
]

TOMATOLEAF_MAP = {
    "bacterial spot": "Tomato___Bacterial_spot",
    "early blight": "Tomato___Early_blight",
    "late blight": "Tomato___Late_blight",
    "cercospora leaf mold": "Tomato___Leaf_Mold",
    "leaf mold": "Tomato___Leaf_Mold",
    "healthy": "Tomato___healthy",
    "spider mites": "Tomato___Spider_mites Two-spotted_spider_mite",
    "tomato leaf curl virus": "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    # "Insect Damage" and "Leaf Miner" intentionally have no mapping - skipped
}

TOMATOVILLAGE_MAP = {
    "early_blight": "Tomato___Early_blight",
    "healthy": "Tomato___healthy",
    "late_blight": "Tomato___Late_blight",
    # Leaf Miner, Magnesium/Nitrogen/Potassium Deficiency, Spotted Wilt Virus -
    # no trained-class equivalent, intentionally skipped
}


def copy_direct(source_root, dest_root, source_tag, counts):
    """For sources already using canonical class folder names."""
    if not source_root or not os.path.isdir(source_root):
        return
    for class_name in os.listdir(source_root):
        if class_name not in CANONICAL_CLASSES:
            continue
        class_dir = os.path.join(source_root, class_name)
        if not os.path.isdir(class_dir):
            continue
        images = [f for f in os.listdir(class_dir) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
        out_dir = os.path.join(dest_root, class_name)
        os.makedirs(out_dir, exist_ok=True)
        for f in images:
            shutil.copy2(os.path.join(class_dir, f), os.path.join(out_dir, f"{source_tag}_{f}"))
        counts[class_name] = counts.get(class_name, 0) + len(images)


def copy_mapped(source_root, dest_root, mapping, source_tag, counts, recurse_subdirs=None):
    """For sources needing keyword-based folder name mapping. recurse_subdirs, if
    given, is a list of subfolder names to also scan (e.g. train/val/test)."""
    if not source_root or not os.path.isdir(source_root):
        return

    roots_to_scan = [source_root]
    if recurse_subdirs:
        roots_to_scan += [os.path.join(source_root, s) for s in recurse_subdirs
                           if os.path.isdir(os.path.join(source_root, s))]

    for root in roots_to_scan:
        for folder_name in os.listdir(root):
            folder_path = os.path.join(root, folder_name)
            if not os.path.isdir(folder_path):
                continue
            key = folder_name.lower().strip()
            canonical = mapping.get(key)
            if canonical is None:
                continue
            images = [f for f in os.listdir(folder_path) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
            out_dir = os.path.join(dest_root, canonical)
            os.makedirs(out_dir, exist_ok=True)
            for f in images:
                shutil.copy2(os.path.join(folder_path, f), os.path.join(out_dir, f"{source_tag}_{f}"))
            counts[canonical] = counts.get(canonical, 0) + len(images)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--plantdoc", default="field_dataset/test")
    parser.add_argument("--tomatodataset", default=None)
    parser.add_argument("--tomatoleaf", default=None)
    parser.add_argument("--tomatovillage", default=None)
    parser.add_argument("--dest", default="field_pool")
    args = parser.parse_args()

    counts = {}

    print("Pooling PlantDoc...")
    copy_direct(args.plantdoc, args.dest, "plantdoc", counts)

    print("Pooling TomatoDataset...")
    copy_direct(args.tomatodataset, args.dest, "tomatodataset", counts)

    print("Pooling Tomato Leaf (Mendeley)...")
    copy_mapped(args.tomatoleaf, args.dest, TOMATOLEAF_MAP, "mendeley2", counts)

    print("Pooling Tomato-Village...")
    copy_mapped(args.tomatovillage, args.dest, TOMATOVILLAGE_MAP, "village", counts,
                recurse_subdirs=["train", "val", "test"])

    print("\n" + "=" * 60)
    print("POOLED FIELD DATA SUMMARY")
    print("=" * 60)
    total = 0
    for c in CANONICAL_CLASSES:
        n = counts.get(c, 0)
        total += n
        print(f"{c:50s} {n:5d} images")
    print(f"\nTotal pooled field images: {total}")
    print(f"Written to: {args.dest}")
    print("\nNext step: run integrate_field_data.py with --field_source "
          f"{args.dest} to do the final train/val/holdout split.")


if __name__ == "__main__":
    main()
