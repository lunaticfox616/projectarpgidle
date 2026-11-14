export function sanitizeWhiteBackdropSheet(inputs, image) {
    if (!image) return image;
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
    const visited = new Uint8Array(width * height);
    const queue = [];
    let { isBackdropPixel } = createWhiteMatteClassifier(width, px, height, inputs);
    clearWhiteMatteBorder({ width, height, visited, isBackdropPixel, queue, px });
    clearWhiteMattePixels(px);
    const alphaSnapshot = new Uint8ClampedArray(width * height);
    for (let i = 0, p = 0; i < px.length; i += 4, p++) alphaSnapshot[p] = px[i + 3];
    for (let y = 1; y < height - 1; y++) {
        clearWhiteMatteRow(width, y, alphaSnapshot, px);

    }
    ctx.putImageData(frame, 0, 0);
    return canvas;
}

function createWhiteMatteClassifier(width, px, height, inputs) {
    const edgeSamples = [];
    function sampleEdgePixel(x, y) {
        let idx = (y * width + x) * 4;
        let a = px[idx + 3];
        if (a < 20) return;
        let r = px[idx], g = px[idx + 1], b = px[idx + 2];
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        if ((r + g + b) / 3 >= 186 && (max - min) <= 58) edgeSamples.push([r, g, b]);
    }
    [[0, 0], [1, 1], [width - 1, 0], [width - 2, 1], [0, height - 1], [1, height - 2], [width - 1, height - 1], [width - 2, height - 2], [Math.floor(width * 0.5), 0], [0, Math.floor(height * 0.5)], [width - 1, Math.floor(height * 0.5)]].forEach(([x, y]) => {
        sampleEdgePixel(inputs.clampNumber(x, 0, width - 1), inputs.clampNumber(y, 0, height - 1));
    });
    function edgeDistance(r, g, b) {
        let best = Infinity;
        edgeSamples.forEach(sample => {
            let dist = Math.abs(r - sample[0]) + Math.abs(g - sample[1]) + Math.abs(b - sample[2]);
            if (dist < best) best = dist;
        });
        return best;
    }
    function isBackdropPixel(pos, loose) {
        let idx = pos * 4;
        let r = px[idx], g = px[idx + 1], b = px[idx + 2], a = px[idx + 3];
        if (a < 20) return true;
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let avg = (r + g + b) / 3;
        let lowSaturation = (max - min) <= (loose ? 64 : 42);
        if (avg >= 246 && lowSaturation) return true;
        if (!lowSaturation) return false;
        let dist = edgeDistance(r, g, b);
        return matchesWhiteMatteDistance(avg, dist, loose);
    }
    return { isBackdropPixel };
}

function clearWhiteMatteBorder({ width, height, visited, isBackdropPixel, queue, px }) {
    function pushSeed(x, y) {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        let pos = y * width + x;
        if (visited[pos] || !isBackdropPixel(pos, true)) return;
        visited[pos] = 1;
        queue.push(pos);
    }
    for (let x = 0; x < width; x++) {
        pushSeed(x, 0);
        pushSeed(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
        pushSeed(0, y);
        pushSeed(width - 1, y);
    }
    while (queue.length > 0) {
        let pos = queue.pop();
        px[pos * 4 + 3] = 0;
        let x = pos % width;
        let y = Math.floor(pos / width);
        [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].forEach(([nx, ny]) => pushSeed(nx, ny));
    }
}

function clearWhiteMattePixels(px) {
    for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 20) {
            px[i + 3] = 0;
            continue;
        }
        let r = px[i], g = px[i + 1], b = px[i + 2];
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let avg = (r + g + b) / 3;
        if (avg >= 236 && (max - min) <= 38) px[i + 3] = 0;
    }
}

function countWhiteMatteNeighbors(alphaSnapshot, y, width, x) {
    let transparentNeighbors = 0;
    for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
            if (ox === 0 && oy === 0) continue;
            if (alphaSnapshot[(y + oy) * width + (x + ox)] === 0) transparentNeighbors++;
        }
    }
    return { transparentNeighbors };
}

function clearWhiteMatteRow(width, y, alphaSnapshot, px) {
    for (let x = 1; x < width - 1; x++) {
        let pos = y * width + x;
        let idx = pos * 4;
        if (alphaSnapshot[pos] === 0) continue;
        let r = px[idx], g = px[idx + 1], b = px[idx + 2];
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let avg = (r + g + b) / 3;
        if (avg < 176 || (max - min) > 62) continue;
        let { transparentNeighbors } = countWhiteMatteNeighbors(alphaSnapshot, y, width, x);
        if (transparentNeighbors >= 3 && avg >= 198) px[idx + 3] = 0;
        else if (transparentNeighbors >= 1 && avg >= 186) px[idx + 3] = Math.min(px[idx + 3], 48);
    }
}

function matchesWhiteMatteDistance(avg, dist, loose) {
    if (avg >= 222 && dist <= (loose ? 92 : 72)) return true;
    if (avg >= 196 && dist <= (loose ? 64 : 46)) return true;
    return false;
}
