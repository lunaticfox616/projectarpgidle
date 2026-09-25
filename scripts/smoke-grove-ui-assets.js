// 그루브(나무·매듭) UI 자산이 manifest.json의 좌표와 실제 PNG 픽셀이 맞는지 확인한다.
// 특히 그루터기 함 판은 25칸이 모두 같은 크기·같은 간격이어야 DOM 칸을 한 pitch로 겹칠 수 있다.
// 자산 재생성: python scripts/process-grove-ui-assets.py
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DIR = path.join(__dirname, '..', 'assets', 'ui', 'grove');
const manifest = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));

// 8비트 RGBA, 비인터레이스 PNG만 읽는다(process-grove-ui-assets.py의 출력 형식).
function readRgbaPng(file) {
    const bytes = fs.readFileSync(file);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    assert.deepStrictEqual([bytes[24], bytes[25], bytes[28]], [8, 6, 0], `${file} must be 8-bit RGBA non-interlaced`);
    const chunks = [];
    for (let offset = 8; offset < bytes.length;) {
        const length = bytes.readUInt32BE(offset);
        const type = bytes.toString('ascii', offset + 4, offset + 8);
        if (type === 'IDAT') chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
        offset += length + 12;
    }
    const raw = zlib.inflateSync(Buffer.concat(chunks));
    const stride = width * 4;
    const pixels = Buffer.alloc(stride * height);
    for (let y = 0; y < height; y++) {
        const filter = raw[y * (stride + 1)];
        for (let x = 0; x < stride; x++) {
            const value = raw[y * (stride + 1) + 1 + x];
            const left = x >= 4 ? pixels[y * stride + x - 4] : 0;
            const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
            const upLeft = x >= 4 && y > 0 ? pixels[(y - 1) * stride + x - 4] : 0;
            const paeth = () => {
                const p = left + up - upLeft;
                const [pa, pb, pc] = [Math.abs(p - left), Math.abs(p - up), Math.abs(p - upLeft)];
                return pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
            };
            const predictor = [0, left, up, (left + up) >> 1, filter === 4 ? paeth() : 0][filter];
            assert.notStrictEqual(predictor, undefined, `${file} has unknown PNG filter ${filter}`);
            pixels[y * stride + x] = (value + predictor) & 0xff;
        }
    }
    return { width, height, alpha: (x, y) => pixels[(y * width + x) * 4 + 3] };
}

function checkSizes() {
    const entries = [...Object.values(manifest.kit), manifest.orb, manifest.stumpBoard];
    for (const entry of entries) {
        const png = readRgbaPng(path.join(DIR, entry.file));
        assert.deepStrictEqual([png.width, png.height], entry.size, `${entry.file} size must match manifest`);
        if (!entry.slice) continue;
        const [top, right, bottom, left] = entry.slice;
        assert.ok(top + bottom < png.height && left + right < png.width, `${entry.file} slice must leave a stretchable centre`);
    }
}

function checkStumpGrid() {
    const { file, grid } = manifest.stumpBoard;
    const board = readRgbaPng(path.join(DIR, file));
    const [originX, originY] = grid.origin;
    const span = grid.cell * grid.columns + grid.divider * (grid.columns - 1);
    assert.strictEqual(grid.pitch, grid.cell + grid.divider);
    for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.columns; col++) {
            const left = originX + col * grid.pitch;
            const top = originY + row * grid.pitch;
            // 모서리 둥근 픽셀(원본 1px = 출력 scale px)은 제외하고 칸 안쪽이 전부 비어 있어야 한다.
            const corner = manifest.scale;
            for (let y = top; y < top + grid.cell; y++) {
                for (let x = left; x < left + grid.cell; x++) {
                    const inCorner = (x - left < corner || left + grid.cell - 1 - x < corner)
                        && (y - top < corner || top + grid.cell - 1 - y < corner);
                    if (!inCorner) assert.strictEqual(board.alpha(x, y), 0, `cell ${row},${col} must be transparent at ${x},${y}`);
                }
            }
            // 칸 바로 바깥 한 줄은 칸막이나 틀이라 불투명해야 한다(칸 크기가 정확히 cell이라는 뜻).
            const middle = Math.floor(grid.cell / 2);
            assert.ok(board.alpha(left - 1, top + middle) > 0, `cell ${row},${col} must end on the left`);
            assert.ok(board.alpha(left + grid.cell, top + middle) > 0, `cell ${row},${col} must end on the right`);
            assert.ok(board.alpha(left + middle, top - 1) > 0, `cell ${row},${col} must end at the top`);
            assert.ok(board.alpha(left + middle, top + grid.cell) > 0, `cell ${row},${col} must end at the bottom`);
        }
    }
    for (let index = 1; index < grid.columns; index++) {
        const start = index * grid.pitch - grid.divider;
        for (let along = 0; along < span; along++) {
            for (let offset = 0; offset < grid.divider; offset++) {
                assert.ok(board.alpha(originX + start + offset, originY + along) > 0, `vertical divider ${index} must be solid`);
                assert.ok(board.alpha(originX + along, originY + start + offset) > 0, `horizontal divider ${index} must be solid`);
            }
        }
    }
}

function checkOrbHole() {
    const { file, hole } = manifest.orb;
    const orb = readRgbaPng(path.join(DIR, file));
    const centerX = hole.x + Math.floor(hole.width / 2);
    const centerY = hole.y + Math.floor(hole.height / 2);
    assert.strictEqual(orb.alpha(centerX, centerY), 0, 'HP orb centre must be transparent for the liquid fill');
    assert.ok(orb.alpha(hole.x - 1, centerY) > 0 && orb.alpha(hole.x + hole.width, centerY) > 0, 'HP orb ring must close left/right');
    assert.ok(orb.alpha(centerX, hole.y - 1) > 0 && orb.alpha(centerX, hole.y + hole.height) > 0, 'HP orb ring must close top/bottom');
}

checkSizes();
checkStumpGrid();
checkOrbHole();
console.log('grove UI assets: sizes, uniform stump grid and HP orb hole match manifest');
