#!/usr/bin/env python3
"""KISS: character plates → transparent PNG (Universal-LPC-style multi-frame swap)."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "art" / "characters"
STORE = Path(
    "/cursor/stores/store-024ebf5b-6ade-4751-87db-59c57f95df60"
    "/grok-bot/agents/1771461b-6809-469d-8da1-4754e7daf994/assets"
)
COCOS = Path("/workspace/bajie-downhill/assets/art/characters")

PURPLE_KEYS = [
    np.array([0x1A, 0x12, 0x20], dtype=np.float32),
    np.array([0x36, 0x1E, 0x50], dtype=np.float32),
    np.array([0x22, 0x18, 0x30], dtype=np.float32),
]


def flood_mask(rgb: np.ndarray, tol: float = 52.0) -> np.ndarray:
    h, w, _ = rgb.shape
    visited = np.zeros((h, w), dtype=bool)
    bg = np.zeros((h, w), dtype=bool)
    seeds = [
        (0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1),
        (0, w // 2), (h - 1, w // 2), (h // 2, 0), (h // 2, w - 1),
    ]
    stack: list[tuple[int, int]] = []
    for sy, sx in seeds:
        visited[sy, sx] = True
        bg[sy, sx] = True
        stack.append((sy, sx))
    flat = rgb.astype(np.float32)
    chroma = np.full((h, w), False)
    for key in PURPLE_KEYS:
        chroma |= np.linalg.norm(flat - key, axis=2) < tol
    lum = 0.299 * flat[:, :, 0] + 0.587 * flat[:, :, 1] + 0.114 * flat[:, :, 2]
    chroma &= lum < 95
    while stack:
        y, x = stack.pop()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = y + dy, x + dx
            if ny < 0 or nx < 0 or ny >= h or nx >= w or visited[ny, nx]:
                continue
            visited[ny, nx] = True
            d = float(np.linalg.norm(flat[ny, nx] - flat[y, x]))
            if chroma[ny, nx] or d < tol * 0.85:
                bg[ny, nx] = True
                stack.append((ny, nx))
    return bg


def soft_alpha(bg: np.ndarray, feather: int = 2) -> np.ndarray:
    alpha = (~bg).astype(np.uint8) * 255
    a = Image.fromarray(alpha, mode="L")
    a = a.filter(ImageFilter.MinFilter(3))
    a = a.filter(ImageFilter.GaussianBlur(radius=feather))
    return np.array(a)


def crop_content(rgba: np.ndarray, pad: int = 10) -> np.ndarray:
    a = rgba[:, :, 3]
    ys, xs = np.where(a > 20)
    if len(xs) == 0:
        raise ValueError("empty after chroma — check source / tol")
    y0, y1 = max(0, int(ys.min()) - pad), min(rgba.shape[0], int(ys.max()) + 1 + pad)
    x0, x1 = max(0, int(xs.min()) - pad), min(rgba.shape[1], int(xs.max()) + 1 + pad)
    return rgba[y0:y1, x0:x1]


def place_on_canvas(rgba: np.ndarray, canvas_h: int = 512, foot_pad: int = 10) -> Image.Image:
    h, w = rgba.shape[:2]
    scale = (canvas_h - foot_pad * 2) / h
    nh, nw = int(h * scale), int(w * scale)
    im = Image.fromarray(rgba, "RGBA").resize((nw, nh), Image.Resampling.LANCZOS)
    rgb = ImageEnhance.Contrast(ImageEnhance.Brightness(im.convert("RGB")).enhance(1.35)).enhance(1.15)
    lifted = Image.new("RGBA", im.size)
    lifted.paste(rgb, (0, 0))
    lifted.putalpha(im.split()[-1])
    canvas_w = max(nw + 16, int(canvas_h * 0.75))
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    canvas.paste(lifted, ((canvas_w - nw) // 2, canvas_h - nh - foot_pad), lifted)
    return canvas


def process(src: Path, dst: Path) -> None:
    if not src.exists():
        raise FileNotFoundError(f"missing art source: {src}")
    rgb = np.array(Image.open(src).convert("RGB"))
    bg = flood_mask(rgb)
    alpha = soft_alpha(bg)
    rgba = np.dstack([rgb, alpha])
    rgba[alpha < 8, 3] = 0
    canvas = place_on_canvas(crop_content(rgba))
    dst.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dst, optimize=True)
    print(f"ok {dst.relative_to(ROOT)} {canvas.size} ← {src.name}")


def split_two(src: Path, left_dst: Path, right_dst: Path) -> None:
    if not src.exists():
        raise FileNotFoundError(f"missing art source: {src}")
    rgb = np.array(Image.open(src).convert("RGB"))
    bg = flood_mask(rgb)
    alpha = soft_alpha(bg)
    rgba = np.dstack([rgb, alpha])
    rgba[alpha < 8, 3] = 0
    xs = np.where(rgba[:, :, 3] > 20)[1]
    if len(xs) == 0:
        raise ValueError(f"empty after chroma: {src}")
    col = (rgba[:, :, 3] > 20).sum(axis=0)
    lo = int(xs.min() + 0.3 * (xs.max() - xs.min()))
    hi = int(xs.min() + 0.7 * (xs.max() - xs.min()))
    best, best_score = (lo + hi) // 2, 10**9
    for x in range(lo, hi):
        score = int(col[max(0, x - 4) : x + 5].sum())
        if score < best_score:
            best_score, best = score, x
    left_dst.parent.mkdir(parents=True, exist_ok=True)
    place_on_canvas(crop_content(rgba[:, :best, :])).save(left_dst, optimize=True)
    place_on_canvas(crop_content(rgba[:, best:, :])).save(right_dst, optimize=True)
    print(f"split {src.name} → {left_dst.name} / {right_dst.name} @{best}")


def main() -> int:
    jobs = [
        ("bajie/bajie_idle.png", COCOS / "bajie/bajie_idle.png"),
        ("bajie/bajie_atk.png", STORE / "f2d0a359bb4c71e0de9f004872acac98bbf7eb18d59764b2582a2c26bc1c87b8.jpg"),
        ("bajie/bajie_hurt.png", STORE / "68f3844ccdaa33943111f04e4539da03a6680b4068fc5921cf99ec389dcf96bd.jpg"),
        ("lianniang/lianniang_idle.png", COCOS / "lianniang/lianniang_idle.png"),
        ("jinghua/boss_jinghua_idle.png", COCOS / "jinghua/boss_jinghua_idle.png"),
        ("jinghua/boss_jinghua_atk.png", STORE / "a2a993e2cf3c075235c9f6dd8440b3f630c38c8bf6223e27f9059938e98abe46.jpg"),
        ("xiaoyao/mobs_trash.png", COCOS / "xiaoyao/mobs_trash.png"),
        ("xiaoyao/mobs_atk.png", STORE / "795e8ca1740abfa117a212754b0a2362df028b9b0364c39b85f736983d970e75.jpg"),
    ]
    for rel, src in jobs:
        process(src, OUT / rel)
    split_two(
        COCOS / "xiaoyao/mobs_trash.png",
        OUT / "xiaoyao/mobs_melee.png",
        OUT / "xiaoyao/mobs_ranged.png",
    )
    split_two(
        STORE / "795e8ca1740abfa117a212754b0a2362df028b9b0364c39b85f736983d970e75.jpg",
        OUT / "xiaoyao/mobs_melee_atk.png",
        OUT / "xiaoyao/mobs_ranged_atk.png",
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
