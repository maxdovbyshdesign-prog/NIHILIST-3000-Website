from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


CANVAS = (1024, 1152)

TRACKS = (
    ("01", "ТРЕЩИНА ЛИЦА", "01-face-crack.png", "01-face-crack.png", True),
    ("02", "ПОРА В КЕМЕТ", "02-kemet-time.png", "02-kemet-time.png", False),
    (
        "03",
        "РАДОСТНЫЙ ПОДСЧЁТ ПОТЕРЬ",
        "03-joyful-casualty-count.png",
        "03-joyful-casualty-count.png",
        False,
    ),
    (
        "04",
        "КОЛЫБЕЛЬ ДЛЯ КОШКИ",
        "04-lullaby-for-a-cat.png",
        "04-lullaby-for-a-cat.png",
        False,
    ),
)


def tracked_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, tracking: int) -> int:
    if not text:
        return 0
    return sum(draw.textlength(char, font=font) for char in text) + tracking * (len(text) - 1)


def draw_tracked_text(
    draw: ImageDraw.ImageDraw,
    position: tuple[int, int],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int, int],
    tracking: int,
) -> None:
    x, y = position
    for char in text:
        draw.text((x, y), char, font=font, fill=fill)
        x += draw.textlength(char, font=font) + tracking


def wrap_title(draw: ImageDraw.ImageDraw, title: str, font: ImageFont.FreeTypeFont, width: int) -> list[str]:
    words = title.split()
    lines: list[str] = []
    line = ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if line and draw.textbbox((0, 0), candidate, font=font)[2] > width:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    return lines[:2]


def extract_checkerboard_alpha(image: Image.Image, dark: bool = False) -> Image.Image:
    """Recover the actual paper silhouette from ImageGen's baked checkerboard preview."""
    width, height = image.size
    pixels = image.convert("RGB").load()
    background_candidate = bytearray(width * height)

    for y in range(height):
        row = y * width
        for x in range(width):
            red, green, blue = pixels[x, y]
            brightness = (red + green + blue) / 3
            channel_spread = max(red, green, blue) - min(red, green, blue)
            cool_checker = blue - red >= 2 and blue >= green
            clipped_checker = brightness >= 248 and channel_spread <= 12
            dark_safe_checker = brightness >= 185 and channel_spread <= 8
            if dark_safe_checker if dark else (cool_checker or clipped_checker):
                background_candidate[row + x] = 1

    candidate_mask = Image.frombytes(
        "L",
        (width, height),
        bytes(255 if value else 0 for value in background_candidate),
    )
    candidate_mask = candidate_mask.filter(ImageFilter.MaxFilter(7))
    candidate_mask = candidate_mask.filter(ImageFilter.MinFilter(7))
    background_candidate = bytearray(
        1 if value >= 128 else 0 for value in candidate_mask.getdata()
    )

    background = bytearray(width * height)
    queue: deque[int] = deque()

    def enqueue(index: int) -> None:
        if background_candidate[index] and not background[index]:
            background[index] = 255
            queue.append(index)

    for x in range(width):
        enqueue(x)
        enqueue((height - 1) * width + x)
    for y in range(height):
        enqueue(y * width)
        enqueue(y * width + width - 1)

    while queue:
        index = queue.popleft()
        x = index % width
        if x > 0:
            enqueue(index - 1)
        if x < width - 1:
            enqueue(index + 1)
        if index >= width:
            enqueue(index - width)
        if index < width * (height - 1):
            enqueue(index + width)

    background_mask = Image.frombytes("L", (width, height), bytes(background))
    background_mask = background_mask.filter(ImageFilter.MaxFilter(3))
    alpha = ImageOps.invert(background_mask)
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.7))
    return keep_main_silhouette(alpha)


def keep_main_silhouette(alpha: Image.Image) -> Image.Image:
    """Discard detached checkerboard crumbs while retaining the torn paper edge."""
    width, height = alpha.size
    core = alpha.filter(ImageFilter.MinFilter(3))
    opaque = bytearray(1 if value >= 160 else 0 for value in core.getdata())
    visited = bytearray(width * height)
    largest: list[int] = []

    for start, value in enumerate(opaque):
        if not value or visited[start]:
            continue

        component: list[int] = []
        queue: deque[int] = deque([start])
        visited[start] = 1

        while queue:
            index = queue.popleft()
            component.append(index)
            x = index % width
            for neighbour in (
                index - 1 if x > 0 else -1,
                index + 1 if x < width - 1 else -1,
                index - width if index >= width else -1,
                index + width if index < width * (height - 1) else -1,
            ):
                if neighbour >= 0 and opaque[neighbour] and not visited[neighbour]:
                    visited[neighbour] = 1
                    queue.append(neighbour)

        if len(component) > len(largest):
            largest = component

    main = bytearray(width * height)
    for index in largest:
        main[index] = 255

    allowed = Image.frombytes("L", (width, height), bytes(main)).filter(
        ImageFilter.MaxFilter(15)
    )
    return Image.composite(alpha, Image.new("L", alpha.size, 0), allowed)


def build_texture(
    source: Path,
    output: Path,
    number: str,
    title: str,
    font_path: Path,
    dark: bool,
) -> None:
    with Image.open(source) as opened:
        source_image = opened.convert("RGB")
        source_image.putalpha(extract_checkerboard_alpha(source_image, dark=dark))
        image = ImageOps.fit(source_image, CANVAS, method=Image.Resampling.LANCZOS)

    image = ImageEnhance.Contrast(image).enhance(0.98)
    image = ImageEnhance.Color(image).enhance(0.86)

    overlay = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    ink = (232, 231, 218, 238) if dark else (20, 19, 17, 235)
    label = (8, 9, 10, 82) if dark else (224, 216, 195, 86)

    artist_font = ImageFont.truetype(str(font_path), 24)
    number_font = ImageFont.truetype(str(font_path), 188)
    title_font = ImageFont.truetype(str(font_path), 64)

    draw.rectangle((46, 46, 492, 94), fill=label)
    draw_tracked_text(draw, (56, 51), "NIHILIST3000", artist_font, ink, 6)
    draw.text((49, 98), number, font=number_font, fill=ink, stroke_width=2, stroke_fill=label)

    title_lines = wrap_title(draw, title, title_font, 904)
    title_top = 964 - (len(title_lines) - 1) * 74
    title_bounds = (45, title_top - 16, 979, title_top + len(title_lines) * 76 + 10)
    draw.rectangle(title_bounds, fill=label)
    for index, line in enumerate(title_lines):
        draw.text(
            (54, title_top + index * 76),
            line,
            font=title_font,
            fill=ink,
            stroke_width=2,
            stroke_fill=label,
        )

    image = Image.alpha_composite(image.convert("RGBA"), overlay)
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, "PNG", optimize=True, compress_level=9)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build deliberately lo-fi paper textures for the release hero.")
    parser.add_argument("source_dir", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("font", type=Path)
    args = parser.parse_args()

    for number, title, source_name, output_name, dark in TRACKS:
        build_texture(
            args.source_dir / source_name,
            args.output_dir / output_name,
            number,
            title,
            args.font,
            dark,
        )
        print(args.output_dir / output_name)


if __name__ == "__main__":
    main()
