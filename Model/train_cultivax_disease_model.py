"""
CultivaX — Leaf Disease Classifier Training Script
====================================================
Transfer-learning training pipeline (MobileNetV2 backbone) for the CultivaX
disease-detection model, with a custom training guard that distinguishes:

  1. PLATEAU   -> val metric barely moving (<1% relative change) for
                  N consecutive epochs. First response: reduce LR.
                  Only escalate to a pause-and-ask if the plateau
                  persists after the LR drop.

  2. OVERFITTING -> train loss still falling while val loss stagnates/
                     rises (train-val gap widening) for N consecutive
                     epochs. Always pauses and asks before continuing,
                     since resuming blindly risks keeping a bad model.

Per-class recall is logged every epoch (not just aggregate accuracy),
because CultivaX's own safety principle is to protect against false
negatives on individual disease classes, not just optimize aggregate
accuracy.

Expected dataset layout (classification, per Section 22 of the master doc):

    dataset/
        images/train/<class_name>/*.jpg
        images/val/<class_name>/*.jpg
        images/test/<class_name>/*.jpg

Adjust CONFIG below to match your actual paths/classes before running.
"""

import os
import json
import argparse
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, mixed_precision
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.callbacks import Callback, ModelCheckpoint
from datetime import datetime


def configure_gpu(require_gpu=True, use_mixed_precision=True):
    """
    Configures TensorFlow to use the GPU only (per project requirement) and
    turns on memory growth so TF doesn't grab all VRAM up front. Also enables
    mixed precision (float16 compute / float32 storage), which the RTX 3050's
    Ampere Tensor Cores accelerate significantly and which roughly halves
    activation memory — useful given the 3050's limited VRAM.
    """
    gpus = tf.config.list_physical_devices("GPU")
    if not gpus:
        if require_gpu:
            raise RuntimeError(
                "No GPU detected by TensorFlow. Training is configured to "
                "run on GPU only. Check your CUDA/cuDNN install and driver "
                "before re-running (see setup steps)."
            )
        print("WARNING: No GPU detected — falling back to CPU.")
        return

    for gpu in gpus:
        tf.config.experimental.set_memory_growth(gpu, True)
    print(f"GPU(s) detected and configured: {[g.name for g in gpus]}")

    if use_mixed_precision:
        mixed_precision.set_global_policy("mixed_float16")
        print("Mixed precision enabled (mixed_float16).")

# =====================================================================
# CONFIG — edit these to match your dataset and run
# =====================================================================
CONFIG = {
    "data_dir": "dataset/images",        # reverted from dataset_bg/images - background removal made field accuracy worse
    "img_size": (224, 224),
    "batch_size": 16,                   # kept modest for 4GB VRAM (RTX 3050 laptop); raise if headroom allows
    "epochs": 100,
    "initial_lr": 1e-4,
    "finetune_lr": 1e-5,                # much lower LR for the fine-tuning phase
    "finetune_unfreeze_layers": 60,     # unfreeze last N layers of MobileNetV2 (raised from 30)
    "finetune_epochs": 50,
    "checkpoint_dir": "checkpoints",

    # --- plateau detection ---
    "plateau_rel_threshold": 0.01,      # <1% relative change counts as "flat"
    "plateau_patience": 3,              # consecutive epochs required
    "lr_reduce_factor": 0.5,            # LR cut applied once when plateau first hits

    # --- overfitting detection ---
    "overfit_patience": 3,              # consecutive epochs of divergence required
    "train_improve_threshold": 0.0,     # train_loss must be strictly decreasing
                                         # (i.e. train_loss[t] < train_loss[t-1])

    "monitor_metric": "val_loss",       # metric used for plateau + checkpointing
}


# =====================================================================
# Data pipeline
# =====================================================================
def build_datasets(cfg):
    train_dir = os.path.join(cfg["data_dir"], "train")
    val_dir = os.path.join(cfg["data_dir"], "val")

    train_ds = tf.keras.utils.image_dataset_from_directory(
        train_dir,
        image_size=cfg["img_size"],
        batch_size=cfg["batch_size"],
        label_mode="categorical",
        shuffle=True,
        crop_to_aspect_ratio=True,  # center-crop instead of squish - stops aspect
                                    # ratio (which differs systematically across
                                    # source datasets) from being a shortcut cue
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        val_dir,
        image_size=cfg["img_size"],
        batch_size=cfg["batch_size"],
        label_mode="categorical",
        shuffle=False,  # keep order stable so per-class recall aligns each epoch
        crop_to_aspect_ratio=True,
    )

    class_names = train_ds.class_names

    # NOTE: no preprocess_input here anymore. Images stay in raw [0,255]
    # range through the tf.data pipeline; rescaling to MobileNetV2's
    # expected [-1,1] range now happens INSIDE the model, after augmentation
    # (see build_model). Augmentation layers like RandomBrightness assume
    # a [0,255]-ish input by default and will clip/corrupt data if fed
    # already-rescaled [-1,1] values - that was the source of a real bug
    # (near-random accuracy) in an earlier version of this script.
    train_ds = train_ds.prefetch(tf.data.AUTOTUNE)
    val_ds_for_fit = val_ds.prefetch(tf.data.AUTOTUNE)
    val_ds_for_eval = val_ds

    return train_ds, val_ds_for_fit, val_ds_for_eval, class_names


def compute_class_weights(train_dir, class_names):
    """
    Inverse-frequency class weights, so rare classes (e.g. a disease with
    far fewer images than the others) contribute proportionally more to
    the loss instead of being drowned out by well-represented classes.
    """
    counts = {}
    for class_name in class_names:
        class_dir = os.path.join(train_dir, class_name)
        counts[class_name] = len(
            [f for f in os.listdir(class_dir) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
        )

    total = sum(counts.values())
    n_classes = len(class_names)

    weights = {}
    print("\nClass weights (based on training-set frequency):")
    for idx, class_name in enumerate(class_names):
        w = total / (n_classes * counts[class_name])
        weights[idx] = w
        print(f"  {class_name:45s} count={counts[class_name]:5d}  weight={w:.3f}")

    return weights


# =====================================================================
# Model
# =====================================================================
def build_model(num_classes, cfg, unfreeze_top_n=0):
    base = MobileNetV2(
        weights="imagenet",
        include_top=False,
        input_shape=cfg["img_size"] + (3,),
    )
    base.trainable = unfreeze_top_n > 0
    if unfreeze_top_n > 0:
        # Freeze everything except the last `unfreeze_top_n` layers, so
        # fine-tuning adapts high-level features to field conditions
        # without destroying the low-level filters transfer learning relies on.
        for layer in base.layers[:-unfreeze_top_n]:
            layer.trainable = False

    # Real, field-realistic augmentation (Section 23 of the master doc) —
    # only active during training (model.fit), automatically bypassed
    # during evaluate()/predict().
    data_augmentation = tf.keras.Sequential([
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(0.08),          # small rotations
        layers.RandomZoom(0.1),               # crop/scale variation
        layers.RandomContrast(0.15),
        layers.RandomBrightness(0.15),
    ], name="augmentation")

    inputs = layers.Input(shape=cfg["img_size"] + (3,))
    x = data_augmentation(inputs)  # operates on raw [0,255] images, as it expects
    # Equivalent to MobileNetV2's preprocess_input (x/127.5 - 1.0), done here
    # so augmentation always sees the [0,255] range it was designed for.
    x = layers.Rescaling(scale=1.0 / 127.5, offset=-1.0, name="mobilenet_rescale")(x)
    x = base(x, training=(unfreeze_top_n > 0))
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(128, activation="relu")(x)
    x = layers.Dropout(0.3)(x)
    # Keep the final layer in float32 even under mixed precision — softmax
    # probabilities and the loss computed from them are numerically safer
    # at full precision.
    outputs = layers.Dense(num_classes, activation="softmax", dtype="float32")(x)

    model = models.Model(inputs, outputs)
    lr = cfg["finetune_lr"] if unfreeze_top_n > 0 else cfg["initial_lr"]
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=lr),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


# =====================================================================
# The training guard: plateau vs. overfitting, with pause-and-ask
# =====================================================================
class PlateauOverfitGuard(Callback):
    """
    Tracks train_loss / val_loss history each epoch and separates two
    distinct signals:

      - plateau: val metric barely moving -> try an LR cut first, only
        pause-and-ask if the plateau persists after that cut.
      - overfitting: train loss still improving while val loss stalls
        or worsens (gap widening) -> always pause-and-ask.

    Also logs per-class recall every epoch using the provided validation
    dataset, so that whenever a pause happens there's enough information
    to judge whether the model is genuinely done or a minority disease
    class is still learning.
    """

    def __init__(self, val_ds_for_eval, class_names, cfg, run_dir):
        super().__init__()
        self.val_ds_for_eval = val_ds_for_eval
        self.class_names = class_names
        self.cfg = cfg
        self.run_dir = run_dir

        self.val_loss_history = []
        self.train_loss_history = []
        self.gap_history = []  # val_loss - train_loss, each epoch
        self.recall_log = []   # per-epoch per-class recall, for the run log

        self.lr_already_reduced = False
        self.log_path = os.path.join(run_dir, "training_log.jsonl")

    # -- helpers ---------------------------------------------------
    def _compute_per_class_recall(self):
        y_true_all = []
        y_pred_all = []
        for x_batch, y_batch in self.val_ds_for_eval:
            preds = self.model.predict(x_batch, verbose=0)
            y_true_all.append(np.argmax(y_batch.numpy(), axis=1))
            y_pred_all.append(np.argmax(preds, axis=1))
        y_true_all = np.concatenate(y_true_all)
        y_pred_all = np.concatenate(y_pred_all)

        recalls = {}
        for idx, cname in enumerate(self.class_names):
            mask = y_true_all == idx
            if mask.sum() == 0:
                recalls[cname] = None  # class absent from this val batch
                continue
            correct = (y_pred_all[mask] == idx).sum()
            recalls[cname] = float(correct / mask.sum())
        return recalls

    def _is_plateau(self):
        p = self.cfg["plateau_patience"]
        thr = self.cfg["plateau_rel_threshold"]
        if len(self.val_loss_history) < p + 1:
            return False
        recent = self.val_loss_history[-(p + 1):]
        for i in range(1, len(recent)):
            prev, curr = recent[i - 1], recent[i]
            rel_change = abs(curr - prev) / (abs(prev) + 1e-8)
            if rel_change >= thr:
                return False
        return True

    def _is_overfitting(self):
        p = self.cfg["overfit_patience"]
        if len(self.train_loss_history) < p + 1 or len(self.val_loss_history) < p + 1:
            return False

        recent_train = self.train_loss_history[-(p + 1):]
        recent_val = self.val_loss_history[-(p + 1):]

        # Condition A: training loss strictly decreasing across the window
        train_improving = all(
            recent_train[i] < recent_train[i - 1] - self.cfg["train_improve_threshold"]
            for i in range(1, len(recent_train))
        )
        # Condition B: validation loss is NOT improving (flat or rising) across
        # the same window. This is the actual overfitting signature — train
        # still learning while val stops. A shrinking gap that starts negative
        # (val below train, e.g. from dropout noise) is normal and must not
        # trigger this on its own, which is why we check val_loss directly
        # rather than just the gap's trend.
        val_stalling = all(
            recent_val[i] >= recent_val[i - 1] - self.cfg["plateau_rel_threshold"] * abs(recent_val[i - 1])
            for i in range(1, len(recent_val))
        )
        return train_improving and val_stalling

    def _print_report(self, epoch, reason, recalls):
        print("\n" + "=" * 60)
        print(f"TRAINING PAUSED at epoch {epoch + 1} — reason: {reason}")
        print("-" * 60)
        print("Recent val_loss:  ", [round(v, 4) for v in self.val_loss_history[-5:]])
        print("Recent train_loss:", [round(v, 4) for v in self.train_loss_history[-5:]])
        print("Recent gap (val-train):", [round(v, 4) for v in self.gap_history[-5:]])
        print("Per-class recall (this epoch):")
        for cname, r in recalls.items():
            r_str = f"{r:.3f}" if r is not None else "N/A (no val samples)"
            print(f"    {cname}: {r_str}")
        print("=" * 60)

    def _ask_to_continue(self):
        while True:
            resp = input("Continue training? [y/n]: ").strip().lower()
            if resp in ("y", "yes"):
                return True
            if resp in ("n", "no"):
                return False
            print("Please answer y or n.")

    # -- Keras callback hooks ---------------------------------------
    def on_epoch_end(self, epoch, logs=None):
        logs = logs or {}
        val_loss = logs.get("val_loss")
        train_loss = logs.get("loss")

        self.val_loss_history.append(val_loss)
        self.train_loss_history.append(train_loss)
        self.gap_history.append(val_loss - train_loss)

        recalls = self._compute_per_class_recall()
        self.recall_log.append({"epoch": epoch + 1, "recall": recalls})

        # persist a running log to disk so nothing is lost if training
        # is interrupted
        with open(self.log_path, "a") as f:
            f.write(json.dumps({
                "epoch": epoch + 1,
                "train_loss": train_loss,
                "val_loss": val_loss,
                "gap": val_loss - train_loss,
                "recall": recalls,
            }) + "\n")

        overfitting = self._is_overfitting()
        plateau = self._is_plateau()

        if overfitting:
            self._print_report(epoch, "possible overfitting (train improving, val gap widening)", recalls)
            if not self._ask_to_continue():
                print("Stopping training on user request.")
                self.model.stop_training = True
            else:
                # reset the divergence window so we don't re-trigger next epoch
                self.train_loss_history = self.train_loss_history[-1:]
                self.gap_history = self.gap_history[-1:]

        elif plateau:
            if not self.lr_already_reduced:
                old_lr = float(self.model.optimizer.learning_rate.numpy())
                new_lr = old_lr * self.cfg["lr_reduce_factor"]
                self.model.optimizer.learning_rate.assign(new_lr)
                self.lr_already_reduced = True
                print(f"\n[Plateau detected] Reducing learning rate: {old_lr:.2e} -> {new_lr:.2e}")
                # reset the plateau window so we give the new LR a fair chance
                self.val_loss_history = self.val_loss_history[-1:]
            else:
                self._print_report(epoch, "plateau persists after LR reduction", recalls)
                if not self._ask_to_continue():
                    print("Stopping training on user request.")
                    self.model.stop_training = True
                else:
                    self.val_loss_history = self.val_loss_history[-1:]
                    self.lr_already_reduced = False  # allow another LR cut later if needed


# =====================================================================
# Main
# =====================================================================
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--resume", default=None,
                         help="Path to a .keras checkpoint to resume from (e.g. after a crash/power loss), "
                              "instead of starting from ImageNet weights.")
    parser.add_argument("--resume_phase", type=int, choices=[1, 2], default=1,
                         help="Which phase the resumed checkpoint belongs to. If 2, Phase 1 is skipped entirely "
                              "and training resumes directly into fine-tuning.")
    args = parser.parse_args()

    configure_gpu(require_gpu=True, use_mixed_precision=True)

    cfg = CONFIG
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = os.path.join(cfg["checkpoint_dir"], run_id)
    os.makedirs(run_dir, exist_ok=True)

    with open(os.path.join(run_dir, "config.json"), "w") as f:
        json.dump(cfg, f, indent=2)

    train_ds, val_ds_for_fit, val_ds_for_eval, class_names = build_datasets(cfg)
    print(f"Detected classes: {class_names}")

    with open(os.path.join(run_dir, "classes.json"), "w") as f:
        json.dump(class_names, f, indent=2)

    class_weights = compute_class_weights(os.path.join(cfg["data_dir"], "train"), class_names)

    if args.resume and args.resume_phase == 2:
        print(f"Resuming DIRECTLY into Phase 2 from: {args.resume}")
        print("(Phase 1 skipped entirely - the loaded checkpoint is treated as the finished Phase 1 result.)")
        best_head_path = args.resume
    else:
        if args.resume:
            print(f"Resuming Phase 1 from: {args.resume}")
            model = tf.keras.models.load_model(args.resume)
        else:
            model = build_model(num_classes=len(class_names), cfg=cfg)
        model.summary()

        checkpoint_cb = ModelCheckpoint(
            filepath=os.path.join(run_dir, "best_model.keras"),
            monitor=cfg["monitor_metric"],
            save_best_only=True,
            mode="min",
            verbose=1,
        )
        # Saves every epoch regardless of improvement, so a crash mid-run
        # loses at most one epoch's progress instead of everything since
        # the last improvement. Use this with --resume if training is
        # interrupted (power loss, etc.).
        latest_checkpoint_cb = ModelCheckpoint(
            filepath=os.path.join(run_dir, "latest_model.keras"),
            save_best_only=False,
            save_freq="epoch",
            verbose=0,
        )
        guard_cb = PlateauOverfitGuard(val_ds_for_eval, class_names, cfg, run_dir)

        model.fit(
            train_ds,
            validation_data=val_ds_for_fit,
            epochs=cfg["epochs"],
            callbacks=[checkpoint_cb, latest_checkpoint_cb, guard_cb],
            class_weight=class_weights,
        )

        head_final_path = os.path.join(run_dir, "final_model_head_only.keras")
        model.save(head_final_path)
        print(f"\nPhase 1 (frozen backbone) finished. Saved to: {head_final_path}")
        best_head_path = os.path.join(run_dir, "best_model.keras")

    # ------------------------------------------------------------------
    # Phase 2: fine-tuning. Reload the BEST head-trained checkpoint (not
    # necessarily the final epoch), unfreeze the top of the backbone, and
    # continue training at a much lower LR so the backbone's features can
    # adapt toward field conditions without being destroyed by a large
    # gradient step.
    # ------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("PHASE 2: FINE-TUNING (unfreezing top of backbone)")
    print("=" * 60)

    print(f"Loading best Phase 1 checkpoint from: {best_head_path}")
    finetune_model = tf.keras.models.load_model(best_head_path)

    # Locate the MobileNetV2 sub-model inside the loaded model and unfreeze
    # its top layers in place, rather than rebuilding a second model and
    # transferring weights into it (which hit a Keras weight-format
    # mismatch when tried directly between two separately-built models).
    base_submodel = None
    for layer in finetune_model.layers:
        if "mobilenetv2" in layer.name.lower():
            base_submodel = layer
            break
    if base_submodel is None:
        raise RuntimeError(
            "Could not locate the MobileNetV2 base layer inside the loaded "
            "model - check layer names with finetune_model.summary() if this fires."
        )

    base_submodel.trainable = True
    for layer in base_submodel.layers[:-cfg["finetune_unfreeze_layers"]]:
        layer.trainable = False

    finetune_model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=cfg["finetune_lr"]),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    print(f"Unfroze last {cfg['finetune_unfreeze_layers']} layers of the backbone. "
          f"Fine-tuning at lr={cfg['finetune_lr']}.")

    finetune_checkpoint_cb = ModelCheckpoint(
        filepath=os.path.join(run_dir, "best_model_finetuned.keras"),
        monitor=cfg["monitor_metric"],
        save_best_only=True,
        mode="min",
        verbose=1,
    )
    finetune_latest_cb = ModelCheckpoint(
        filepath=os.path.join(run_dir, "latest_model_finetuned.keras"),
        save_best_only=False,
        save_freq="epoch",
        verbose=0,
    )
    finetune_guard_cb = PlateauOverfitGuard(val_ds_for_eval, class_names, cfg, run_dir)

    finetune_model.fit(
        train_ds,
        validation_data=val_ds_for_fit,
        epochs=cfg["finetune_epochs"],
        callbacks=[finetune_checkpoint_cb, finetune_latest_cb, finetune_guard_cb],
        class_weight=class_weights,
    )

    final_path = os.path.join(run_dir, "final_model.keras")
    finetune_model.save(final_path)
    print(f"\nTraining finished. Best fine-tuned checkpoint: {os.path.join(run_dir, 'best_model_finetuned.keras')}")
    print(f"(Best frozen-backbone-only checkpoint also kept at: {best_head_path})")


# =====================================================================
# Optional — run this separately once you're happy with a checkpoint.
# Not called automatically; per the master plan, edge export/quantization
# is its own workflow stage (Section 30/9), done after model selection.
# =====================================================================
def export_to_tflite_int8(keras_model_path, representative_data_dir, img_size, out_path):
    model = tf.keras.models.load_model(keras_model_path)

    def representative_dataset():
        ds = tf.keras.utils.image_dataset_from_directory(
            representative_data_dir, image_size=img_size, batch_size=1
        )
        # No preprocess_input here - rescaling is now a layer inside the
        # model itself, so raw [0,255] images are the correct input here too.
        for images, _ in ds.take(100):
            yield [images]

    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.representative_dataset = representative_dataset
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
    converter.inference_input_type = tf.int8
    converter.inference_output_type = tf.int8

    tflite_model = converter.convert()
    with open(out_path, "wb") as f:
        f.write(tflite_model)
    print(f"INT8 TFLite model written to: {out_path}")


if __name__ == "__main__":
    main()