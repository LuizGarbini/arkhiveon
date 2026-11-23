#!/usr/bin/env python3
"""Folhas mock × implementação no mesmo grid, 1440 e 390, e a folha da opção B."""
from __future__ import annotations
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/workspace/arkhiveon/previews/plano-pro-cota/u1-card-v2r2")
CARDS = OUT / "cards"
MOCK = Path("/workspace/arkhiveon/previews/plano-pro-cota/v2-segmentos-por-campanha/r2")

BG = (12, 13, 16)
INK = (236, 237, 240)
MUTED = (160, 164, 174)
ACCENT = (196, 181, 253)
RULE = (40, 42, 50)

MOCK_STATES = [
    ("free", "1. Free normal"),
    ("pro", "2. Pro normal"),
    ("convidado", "3. Convidado Pro"),
    ("p80", "4. 80%"),
    ("p95", "5. 95%"),
    ("p100", "6. 100% (cheio)"),
    ("over", "7. Free acima do limite (60 dias)"),
    ("pdf", "8. Free: PDF não cabe"),
    ("loading", "9. Carregando (esqueleto)"),
    ("empty", "10. Vazio"),
    ("error", "11. Erro"),
]
B_STATES = [
    ("guest_p95", "96%"),
    ("guest_p100", "Cheio"),
    ("guest_over", "Acima"),
]

def font(size: int, bold=False):
    try:
        name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
        return ImageFont.truetype(name, size)
    except Exception:
        return ImageFont.load_default()

def load(p: Path) -> Image.Image:
    return Image.open(p).convert("RGBA")

def canvas(w, h):
    im = Image.new("RGB", (w, h), BG)
    return im, ImageDraw.Draw(im)

def text(draw, xy, s, size=22, fill=INK, bold=False):
    draw.text(xy, s, font=font(size, bold), fill=fill)

def labeled_grid(items, cols, card_w, card_h, title_h=36, pad=20, label_size=16):
    rows = (len(items) + cols - 1) // cols
    w = cols * card_w + (cols + 1) * pad
    h = rows * (title_h + card_h) + (rows + 1) * pad
    im, d = canvas(w, h)
    for i, (label, path) in enumerate(items):
        col, row = i % cols, i // cols
        x = pad + col * (card_w + pad)
        y = pad + row * (title_h + card_h + pad)
        text(d, (x, y), label, label_size, MUTED)
        if path is None or not Path(path).exists():
            continue
        card = load(Path(path))
        scale = min(card_w / card.width, card_h / card.height, 1.0)
        nw, nh = max(1, int(card.width * scale)), max(1, int(card.height * scale))
        card = card.resize((nw, nh), Image.Resampling.LANCZOS)
        im.paste(card, (x, y + title_h), card)
    return im

def stack_mock_impl(mock: Image.Image, impl: Image.Image, layout: str) -> Image.Image:
    header = 88
    gap = 28
    footer = 64
    width = max(mock.width, impl.width) + 64
    height = header + mock.height + gap + impl.height + footer
    im, d = canvas(width, height)
    text(d, (32, 18), f"Mock V2 r2  ×  implementação  ·  {layout}", 26, ACCENT, True)
    text(d, (32, 52), "Mesmos 11 estados. A barra é sempre a do uso total (único desvio aceito).", 16, MUTED)
    y = header
    im.paste(mock.convert("RGBA"), ((width - mock.width) // 2, y), mock.convert("RGBA"))
    y += mock.height + gap
    d.line([(32, y - gap // 2), (width - 32, y - gap // 2)], fill=RULE, width=1)
    im.paste(impl.convert("RGBA"), ((width - impl.width) // 2, y), impl.convert("RGBA"))
    text(
        d,
        (32, height - 40),
        "Implementação embaixo, com a mesma numeração. Prova de 44px, uma linha e sem overflow em overflow.json.",
        15,
        MUTED,
    )
    return im

def main():
    # Use a card cell close to the official mock card size (~500x120 clips).
    card_w, card_h = 520, 126
    for layout in ("1440", "390"):
        items = [
            (f"{label} · {layout}", CARDS / f"mock-{sid}-{layout}.png")
            for sid, label in MOCK_STATES
        ]
        impl = labeled_grid(items, 4, card_w, card_h)
        mock = load(MOCK / f"v2r2-estados-card-{layout}.png")
        sheet = stack_mock_impl(mock, impl, layout)
        out = OUT / f"folha-mock-x-impl-{layout}.png"
        sheet.save(out, "PNG")
        print("wrote", out, sheet.size)

    # opção B: 1440 on first row, 390 on second, 3 states
    rows_imgs = []
    for layout in ("1440", "390"):
        items = [
            (f"{label} · {layout}", CARDS / f"opcao-b-{sid}-{layout}.png")
            for sid, label in B_STATES
        ]
        rows_imgs.append(labeled_grid(items, 3, 520, 126, title_h=32, pad=18))
    gap = 20
    header = 96
    w = max(r.width for r in rows_imgs) + 64
    h = header + sum(r.height for r in rows_imgs) + gap + 48
    im, d = canvas(w, h)
    text(d, (32, 20), "Opção B escolhida pelo Luiz", 26, ACCENT, True)
    text(
        d,
        (32, 54),
        "Convidado Pro em 96%, Cheio e Acima: selo por extenso, estado só no ícone (texto no title/aria), uso sem o total.",
        16,
        MUTED,
    )
    y = header
    for r in rows_imgs:
        im.paste(r.convert("RGBA"), (32, y), r.convert("RGBA"))
        y += r.height + gap
    out = OUT / "folha-opcao-b.png"
    im.save(out, "PNG")
    print("wrote", out, im.size)

if __name__ == "__main__":
    main()
