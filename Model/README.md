# CultivaX — Tomato Leaf Disease Detection Model

This folder contains the trained AI model that powers CultivaX's crop-disease detection feature, along with the full training pipeline used to produce it.

## What this model does

Given a photo of a tomato leaf, the model classifies it into one of 10 categories (9 diseases + healthy) and returns a confidence score for each. It's built as the vision component of CultivaX's larger multimodal risk-fusion system — this model's output (disease class + confidence) is meant to be combined downstream with soil/environment sensor data, not used as a standalone diagnosis.

**Classes (in the exact order the model outputs them — see `classes.json`):**

| Index | Class |
|---|---|
| 0 | Bacterial Spot |
| 1 | Early Blight |
| 2 | Late Blight |
| 3 | Leaf Mold |
| 4 | Septoria Leaf Spot |
| 5 | Spider Mites (Two-spotted) |
| 6 | Target Spot |
| 7 | Tomato Yellow Leaf Curl Virus |
| 8 | Tomato Mosaic Virus |
| 9 | Healthy |

## Architecture

- **Backbone:** MobileNetV2, pretrained on ImageNet — chosen for edge-deployment feasibility (small, fast, TFLite-exportable) rather than raw accuracy.
- **Head:** GlobalAveragePooling2D → Dense(128, ReLU) → Dropout(0.3) → Dense(10, Softmax)
- **Built into the model itself:** data augmentation layers (random flip/rotation/zoom/contrast/brightness, active only during training) and MobileNetV2's input rescaling — both run inside the model graph, not as separate preprocessing, so the exported model is self-contained.
- **Input:** 224×224 RGB, center-cropped to the target aspect ratio before resizing (not stretched) to avoid distorting leaf shape.

## Training procedure

Training happens in two phases, both handled automatically by `train_cultivax_disease_model.py`:

1. **Phase 1 — head training:** MobileNetV2 is frozen; only the classification head learns. Runs until validation loss plateaus or shows overfitting.
2. **Phase 2 — fine-tuning:** the best Phase 1 checkpoint is reloaded, the last 60 layers of MobileNetV2 are unfrozen, and training continues at a much lower learning rate so the backbone itself can adapt to leaf-specific features.

Both phases use a custom callback that distinguishes two different stopping signals rather than a single generic early-stopping rule:
- **Plateau** (validation metric barely moving) → learning rate is reduced once automatically before considering a stop.
- **Overfitting** (training loss still falling while validation loss stalls/rises) → training pauses and asks for confirmation before continuing, since pushing past this point risks keeping a worse model than an earlier checkpoint.

Class weighting (inverse frequency) is applied throughout, since the underlying dataset classes are not evenly sized.

## Dataset

The model is trained on a combination of lab-condition and real-world field images, since a model trained on lab images alone was found to generalize poorly to real photos (a well-documented issue for PlantVillage-style datasets).

**Lab-condition base:** PlantVillage (tomato subset only, ~18,000 images across the 10 classes).

**Real-world field images (pooled from four independent sources, ~5,700 images):**
- PlantDoc
- A PlantVillage-style-named Kaggle/Mendeley tomato dataset
- A second Mendeley real-world tomato leaf dataset
- Tomato-Village (real field images collected from farms in Rajasthan, India)

Field images were split 60% into training, 15% into validation, and 25% held back completely untouched for final evaluation — this untouched split is what the reported field accuracy below is measured on.

Raw datasets are **not** included in this repo — see `prepare_tomato_dataset.py`, `prepare_field_test.py`, `pool_field_sources.py`, and `integrate_field_data.py` for how to rebuild the full dataset from the original public sources.

## Results

| Evaluation set | Accuracy |
|---|---|
| PlantVillage test set (lab-condition, held out) | 97.0% |
| Field holdout (real-world images, never seen during training) | **80.5%** |

The field holdout number is the one that matters for real deployment — it reflects performance on the kind of photos an actual user would take, not clean lab photos.

**Known weak points (see `field_evaluation.json` for full per-class breakdown):**
- `Early_blight` draws in a disproportionate share of misclassifications from several other classes, likely due to visual similarity in early-stage lesions across diseases.
- Classes with the smallest amount of field data (`Target_Spot`, `Tomato_mosaic_virus`) have wider uncertainty in their reported numbers due to smaller sample sizes.

## Files in this folder

| File | Purpose |
|---|---|
| `best_model_finetuned.keras` | The final trained model — use this one for inference. |
| `classes.json` | Maps the model's output index (0–9) to class names. Required for interpreting predictions correctly. |
| `config.json` | Training hyperparameters used for this run. |
| `test_evaluation.json` / `field_evaluation.json` | Full per-class metrics and confusion matrices from evaluation. |
| `train_cultivax_disease_model.py` | Main training script (both phases, augmentation, class weighting, plateau/overfitting guard). |
| `prepare_tomato_dataset.py` | Filters PlantVillage down to tomato classes and creates the train/val/test split. |
| `prepare_field_test.py` | Maps PlantDoc's folder names to our class names. |
| `pool_field_sources.py` | Combines all four field-image sources into one pool with consistent class names. |
| `integrate_field_data.py` | Splits pooled field images into train/val/holdout. |
| `evaluate_model.py` | Runs the model against the PlantVillage test set. |
| `evaluate_field.py` | Runs the model against the field holdout set. |
| `predict_images.py` | Quick manual check — run the model on any folder of loose images and see predictions + confidence. |

## Environment

Trained and tested with:

| Package | Version |
|---|---|
| Python | 3.10.10 |
| TensorFlow | 2.10.1 |
| Keras | 2.10.0 |
| NumPy | 1.26.4 |
| scikit-learn | 1.7.2 |
| Pillow | 12.3.0 |
| h5py | 3.16.0 |
| scipy | 1.15.3 |

**Two version pins matter and must be respected, or things will break:**
- **TensorFlow must stay below 2.11** — this was the last release with native Windows GPU support (2.11+ requires WSL2 on Windows). Install with `pip install "tensorflow<2.11"`.
- **NumPy must stay below 2.0** — TensorFlow 2.10 was compiled against NumPy 1.x and will throw `AttributeError: _ARRAY_API not found` if NumPy 2.x gets installed. Install with `pip install "numpy<2"`, and re-pin it again after installing any new package that might upgrade it.

To recreate the environment:
```
pip install "tensorflow<2.11" "numpy<2" scikit-learn pillow
```

## Setup



```
python predict_images.py --checkpoint best_model_finetuned.keras --classes_json classes.json --image_dir "path/to/your/images"
```

This prints the top-3 predicted classes with confidence percentages for every image in the given folder — no dataset setup required, just point it at any folder of photos.

## Reproducing training from scratch

1. Download PlantVillage and run `prepare_tomato_dataset.py` to build the base train/val/test split.
2. Download the four field-image sources (see script comments in `pool_field_sources.py` for the exact folder-mapping expectations of each) and run `pool_field_sources.py` to combine them.
3. Run `integrate_field_data.py` to split the pooled field data into train/val/holdout.
4. Run `train_cultivax_disease_model.py`. Training pauses interactively when the plateau/overfitting guard triggers — respond `y` to continue or `n` to stop and proceed to fine-tuning.
5. Run `evaluate_model.py` and `evaluate_field.py` to verify results before deploying a new checkpoint.
