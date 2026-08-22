"""Convert the generated six-cell combat-log atlas into a compact transparent WebP."""

from argparse import ArgumentParser
from pathlib import Path

from PIL import Image


OUTPUT_SIZE = (192, 128)


def get_background_alpha(pixel):
    red, green, blue = pixel
    darkest = min(pixel)
    chroma = max(pixel) - darkest
    if darkest >= 232 and chroma <= 14:
        return 0
    if darkest >= 215 and chroma <= 20:
        return max(0, min(255, round((232 - darkest) * 15)))
    return 255


def extract_icons(source):
    image = Image.open(source).convert('RGB')
    alpha = Image.new('L', image.size)
    alpha.putdata([get_background_alpha(pixel) for pixel in image.get_flattened_data()])
    rgba = image.convert('RGBA')
    rgba.putalpha(alpha)
    return rgba.resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)


def main():
    parser = ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    args.destination.parent.mkdir(parents=True, exist_ok=True)
    extract_icons(args.source).save(args.destination, 'WEBP', quality=82, method=6, exact=True)


if __name__ == '__main__':
    main()
