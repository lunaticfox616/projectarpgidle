// Minimal PNG reading and writing for build tools: 8-bit RGB or RGBA, non-interlaced (what the old
// art uses). Throws on anything else rather than guessing.
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';

export interface Alpha { width: number; height: number; alpha: Uint8Array }
export interface Rgba { width: number; height: number; pixels: Uint8Array }

export function readRgba(path: string): Rgba {
  const file = readFileSync(path);
  if (file.readUInt32BE(0) !== 0x89504e47) throw new Error(`${path}: not a PNG`);
  let width = 0, height = 0, channels = 4;
  const idat: Buffer[] = [];
  for (let at = 8; at < file.length;) {
    const length = file.readUInt32BE(at), type = file.toString('latin1', at + 4, at + 8), data = file.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || (data[9] !== 6 && data[9] !== 2) || data[12] !== 0) throw new Error(`${path}: only 8-bit RGB/RGBA non-interlaced PNG is supported`);
      channels = data[9] === 6 ? 4 : 3;
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat)), stride = width * channels, rows = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!, src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? rows[dst + x - channels]! : 0, b = y > 0 ? rows[dst - stride + x]! : 0, c = x >= channels && y > 0 ? rows[dst - stride + x - channels]! : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const predict = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
      if (predict === undefined) throw new Error(`${path}: bad filter ${filter} on row ${y}`);
      rows[dst + x] = (raw[src + x]! + predict) & 255;
    }
  }
  if (channels === 4) return { width, height, pixels: rows };
  const pixels = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) pixels.set([rows[i * 3]!, rows[i * 3 + 1]!, rows[i * 3 + 2]!, 255], i * 4);
  return { width, height, pixels };
}

export function readAlpha(path: string): Alpha {
  const { width, height, pixels } = readRgba(path);
  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = pixels[i * 4 + 3]!;
  return { width, height, alpha };
}

/** Box-filter an image down to width × height (area average, alpha-weighted colour). */
export function downscale(src: Rgba, width: number, height: number): Rgba {
  const out = new Uint8Array(width * height * 4), sx = src.width / width, sy = src.height / height;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx)), y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
      const i = (yy * src.width + xx) * 4, w = src.pixels[i + 3]!;
      r += src.pixels[i]! * w; g += src.pixels[i + 1]! * w; b += src.pixels[i + 2]! * w; a += w; n++;
    }
    const o = (y * width + x) * 4;
    out.set(a ? [r / a, g / a, b / a, a / n] : [0, 0, 0, 0], o);
  }
  return { width, height, pixels: out };
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  let crc = 0xffffffff;
  for (const byte of Buffer.concat([head.subarray(4), data])) crc = CRC_TABLE[(crc ^ byte) & 255]! ^ (crc >>> 8);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 0);
  return Buffer.concat([head, data, tail]);
}

export function writeRgba(path: string, { width, height, pixels }: Rgba): void {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) raw.set(pixels.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  writeFileSync(path, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}

/** Tight box of pixels with alpha >= 12 inside a region: [x, y, w, h]. */
export function visibleBox({ width, alpha }: Alpha, [x, y, w, h]: [number, number, number, number]): [number, number, number, number] {
  let left = w, top = h, right = -1, bottom = -1;
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    if (alpha[(y + yy) * width + x + xx]! < 12) continue;
    left = Math.min(left, xx); right = Math.max(right, xx); top = Math.min(top, yy); bottom = Math.max(bottom, yy);
  }
  if (right < 0) throw new Error(`empty prop region ${x},${y},${w},${h}`);
  return [x + left, y + top, right - left + 1, bottom - top + 1];
}
