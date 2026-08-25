"""
AI Image Enhancer & Studio — background removal + lighting correction.
Self-hosted (rembg / U^2-Net) — no API key needed.
"""
import io
import numpy as np
from PIL import Image, ImageOps, ImageEnhance, ImageFilter
from rembg import remove, new_session

_session = None

def get_session():
    global _session
    if _session is None:
        _session = new_session("u2net")
    return _session


def _gray_world_white_balance(img: Image.Image) -> Image.Image:
    """Corrects color casts (e.g. yellow/orange indoor tungsten light) by
    scaling each channel so the average gray of the image is neutral."""
    arr = np.asarray(img).astype(np.float32)
    avg = arr.reshape(-1, 3).mean(axis=0)
    gray_avg = avg.mean()
    # avoid div-by-zero / runaway scaling on near-flat images
    scale = np.clip(gray_avg / np.clip(avg, 1e-6, None), 0.7, 1.4)
    arr = arr * scale
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, mode="RGB")


def _adaptive_gamma_correction(img: Image.Image) -> Image.Image:
    """Brightens underexposed photos / tones down overexposed ones by
    picking gamma based on current mean luminance, targeting mid-gray."""
    arr = np.asarray(img.convert("L")).astype(np.float32)
    mean_luma = arr.mean() / 255.0
    mean_luma = max(mean_luma, 1e-3)
    target = 0.5
    gamma = np.log(target) / np.log(mean_luma)
    gamma = np.clip(gamma, 0.6, 1.8)  # keep correction gentle, avoid artifacts

    lut = np.array([((i / 255.0) ** (1.0 / gamma)) * 255 for i in range(256)], dtype=np.uint8)
    rgb = np.asarray(img)
    corrected = lut[rgb]
    return Image.fromarray(corrected.astype(np.uint8), mode="RGB")


def _local_contrast_boost(img: Image.Image) -> Image.Image:
    """Cheap CLAHE-like local contrast: unsharp-mask style blend that
    lifts shadow/highlight detail without a heavy OpenCV dependency."""
    blurred = img.filter(ImageFilter.GaussianBlur(radius=8))
    arr = np.asarray(img).astype(np.float32)
    blur_arr = np.asarray(blurred).astype(np.float32)
    detail = arr - blur_arr
    boosted = arr + detail * 0.35
    boosted = np.clip(boosted, 0, 255).astype(np.uint8)
    return Image.fromarray(boosted, mode="RGB")


def correct_lighting(img: Image.Image) -> Image.Image:
    """Full lighting-correction pipeline for artisan product photos shot in
    inconsistent home/workshop lighting: white balance -> exposure -> local
    contrast -> global contrast/brightness/saturation polish."""
    img = _gray_world_white_balance(img)
    img = _adaptive_gamma_correction(img)
    img = _local_contrast_boost(img)

    img = ImageOps.autocontrast(img, cutoff=1)
    img = ImageEnhance.Brightness(img).enhance(1.05)
    img = ImageEnhance.Color(img).enhance(1.08)
    return img


def enhance(image_bytes: bytes) -> bytes:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    img = correct_lighting(img)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    cutout_bytes = remove(buf.getvalue(), session=get_session())
    cutout = Image.open(io.BytesIO(cutout_bytes)).convert("RGBA")

    backdrop = Image.new("RGBA", cutout.size, (245, 240, 228, 255))
    backdrop.alpha_composite(cutout)
    flat = backdrop.convert("RGB")

    side = max(flat.size)
    square = Image.new("RGB", (side, side), (245, 240, 228))
    offset = ((side - flat.width) // 2, (side - flat.height) // 2)
    square.paste(flat, offset)
    square = square.resize((1024, 1024))

    out = io.BytesIO()
    square.save(out, format="PNG")
    return out.getvalue()