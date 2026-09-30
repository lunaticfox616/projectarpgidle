'use strict';
// Minimal PNG reader/writer for the drawing scripts: RGBA 8-bit, non-interlaced (the only kind they read or write).
const zlib = require('node:zlib');

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});
function crc32(buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
    return Buffer.concat([head, data, crc]);
}

/** PNG → { width, height, data } with data = RGBA bytes, row by row. */
function decodePng(buffer) {
    let width = 0, height = 0;
    const idat = [];
    for (let at = 8; at < buffer.length;) {
        const length = buffer.readUInt32BE(at), type = buffer.toString('ascii', at + 4, at + 8), data = buffer.subarray(at + 8, at + 8 + length);
        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error('RGBA 8-bit non-interlaced PNG only');
        } else if (type === 'IDAT') idat.push(data);
        at += 12 + length;
    }
    const raw = zlib.inflateSync(Buffer.concat(idat)), stride = width * 4, out = Buffer.alloc(stride * height);
    for (let y = 0; y < height; y++) {
        const filter = raw[y * (stride + 1)], line = y * (stride + 1) + 1, row = y * stride;
        for (let x = 0; x < stride; x++) {
            const a = x >= 4 ? out[row + x - 4] : 0, b = y ? out[row - stride + x] : 0, c = x >= 4 && y ? out[row - stride + x - 4] : 0;
            const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
            const predictor = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
            out[row + x] = (raw[line + x] + predictor) & 255;
        }
    }
    return { width, height, data: out };
}

/** RGBA bytes (row by row) → PNG buffer. Rows are stored unfiltered and deflated at level 9. */
function encodePng(width, height, data) {
    const raw = Buffer.alloc((width * 4 + 1) * height);
    for (let y = 0; y < height; y++) Buffer.from(data.buffer, data.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr.set([8, 6, 0, 0, 0], 8);
    return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

module.exports = { decodePng, encodePng };
