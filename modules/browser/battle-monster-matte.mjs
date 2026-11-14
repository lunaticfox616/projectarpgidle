import { isLocalRuntimeHost } from './battle-image-environment.mjs';

export function sanitizeLocalMonsterBackdropSheet(inputs, image) {
    if (!image || !isLocalRuntimeHost(inputs)) return image;
    const canvas = inputs.document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    let frame;
    try {
        frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch {
        return image;
    }
    const px = frame.data;
    const width = canvas.width;
    const height = canvas.height;
    const samples = [];
    sampleMonsterMatteBorder({ inputs, width, height, px, samples });
    if (samples.length === 0) return image;
    let { bgDistance, isLocalBackdropPixel } = createMonsterMatteClassifier(samples, px);
    clearMonsterMatteBorder(width, height, isLocalBackdropPixel, px);
    thinMonsterMattePixels(px, bgDistance);
    const alphaSnapshot = new Uint8ClampedArray(width * height);
    for (let i = 0, p = 0; i < px.length; i += 4, p++) alphaSnapshot[p] = px[i + 3];
    for (let y = 1; y < height - 1; y++) {
        clearMonsterMatteRow({ width, y, alphaSnapshot, isLocalBackdropPixel, px });

    }
    ctx.putImageData(frame, 0, 0);
    return canvas;
}

function sampleMonsterMatteBorder({ inputs, width, height, px, samples }) {
    function addSample(x, y) {
        x = inputs.clampNumber(Math.round(x), 0, width - 1);
        y = inputs.clampNumber(Math.round(y), 0, height - 1);
        let idx = (y * width + x) * 4;
        if (px[idx + 3] < 24) return;
        samples.push([px[idx], px[idx + 1], px[idx + 2]]);
    }
    let step = Math.max(4, Math.round(Math.min(width, height) / 36));
    for (let x = 0; x < width; x += step) { addSample(x, 0); addSample(x, height - 1); }
    for (let y = 0; y < height; y += step) { addSample(0, y); addSample(width - 1, y); }
}

function createMonsterMatteClassifier(samples, px) {
    function bgDistance(r, g, b) {
        let best = Infinity;
        samples.forEach(sample => {
            let dist = Math.abs(r - sample[0]) + Math.abs(g - sample[1]) + Math.abs(b - sample[2]);
            if (dist < best) best = dist;
        });
        return best;
    }
    function isLocalBackdropPixel(pos, loose) {
        let idx = pos * 4;
        let r = px[idx], g = px[idx + 1], b = px[idx + 2], a = px[idx + 3];
        if (a < 24) return true;
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let avg = (r + g + b) / 3;
        let saturation = max - min;
        let dist = bgDistance(r, g, b);
        if (avg >= 232 && saturation <= 58) return true;
        if (saturation <= 46 && dist <= (loose ? 88 : 62)) return true;
        return dist <= (loose ? 54 : 38) && saturation <= 72;
    }
    return { bgDistance, isLocalBackdropPixel };
}

function clearMonsterMatteBorder(width, height, isLocalBackdropPixel, px) {
    const visited = new Uint8Array(width * height);
    const queue = [];
    function pushSeed(x, y) {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        let pos = y * width + x;
        if (visited[pos] || !isLocalBackdropPixel(pos, true)) return;
        visited[pos] = 1;
        queue.push(pos);
    }
    for (let x = 0; x < width; x++) { pushSeed(x, 0); pushSeed(x, height - 1); }
    for (let y = 0; y < height; y++) { pushSeed(0, y); pushSeed(width - 1, y); }
    while (queue.length > 0) {
        let pos = queue.pop();
        px[pos * 4 + 3] = 0;
        let x = pos % width;
        let y = Math.floor(pos / width);
        pushSeed(x - 1, y);
        pushSeed(x + 1, y);
        pushSeed(x, y - 1);
        pushSeed(x, y + 1);
    }
}

function thinMonsterMattePixels(px, bgDistance) {
    for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] === 0) continue;
        let r = px[i], g = px[i + 1], b = px[i + 2];
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let avg = (r + g + b) / 3;
        let saturation = max - min;
        let dist = bgDistance(r, g, b);
        if (avg >= 224 && saturation <= 76) px[i + 3] = 0;
        else if (avg >= 204 && saturation <= 54 && dist <= 86) px[i + 3] = Math.min(px[i + 3], 28);
    }
}

function countMonsterMatteNeighbors(alphaSnapshot, y, width, x) {
    let transparentNeighbors = 0;
    for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
            if (ox === 0 && oy === 0) continue;
            if (alphaSnapshot[(y + oy) * width + (x + ox)] === 0) transparentNeighbors++;
        }
    }
    return { transparentNeighbors };
}

function clearMonsterMatteRow({ width, y, alphaSnapshot, isLocalBackdropPixel, px }) {
    for (let x = 1; x < width - 1; x++) {
        let pos = y * width + x;
        if (alphaSnapshot[pos] === 0) continue;
        let { transparentNeighbors } = countMonsterMatteNeighbors(alphaSnapshot, y, width, x);
        if (transparentNeighbors <= 0) continue;
        let idx = pos * 4;
        if (isLocalBackdropPixel(pos, false)) px[idx + 3] = transparentNeighbors >= 3 ? 0 : Math.min(px[idx + 3], 40);
    }
}
