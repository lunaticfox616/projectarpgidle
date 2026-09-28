// Minimal PNG reader for import tools: 8-bit RGBA, non-interlaced (what the old art uses).
// Returns the alpha channel only. Throws on anything else rather than guessing.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

export interface Alpha { width: number; height: number; alpha: Uint8Array }

export function readAlpha(path: string): Alpha {
  const file = readFileSync(path);
  if (file.readUInt32BE(0) !== 0x89504e47) throw new Error(`${path}: not a PNG`);
  let width = 0, height = 0;
  const idat: Buffer[] = [];
  for (let at = 8; at < file.length;) {
    const length = file.readUInt32BE(at), type = file.toString('latin1', at + 4, at + 8), data = file.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error(`${path}: only 8-bit RGBA non-interlaced PNG is supported`);
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat)), stride = width * 4, rows = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!, src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? rows[dst + x - 4]! : 0, b = y > 0 ? rows[dst - stride + x]! : 0, c = x >= 4 && y > 0 ? rows[dst - stride + x - 4]! : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const predict = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
      if (predict === undefined) throw new Error(`${path}: bad filter ${filter} on row ${y}`);
      rows[dst + x] = (raw[src + x]! + predict) & 255;
    }
  }
  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = rows[i * 4 + 3]!;
  return { width, height, alpha };
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
