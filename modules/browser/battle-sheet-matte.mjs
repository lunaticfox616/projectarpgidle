export function sanitizeBattleSheet(inputs, image) {
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
    let { bgDistance, isBgLike } = createBattleMatteClassifier(canvas, px);
    clearBattleMatteBorder(canvas, isBgLike, px);
    thinBattleMattePixels(px, bgDistance);
    const alphaSnapshot = new Uint8ClampedArray(canvas.width * canvas.height);
    for (let i = 0, p = 0; i < px.length; i += 4, p++) alphaSnapshot[p] = px[i + 3];
    for (let y = 1; y < canvas.height - 1; y++) {
        clearBrightMatteRow(canvas, y, alphaSnapshot, px);

    }
    for (let y = 1; y < canvas.height - 1; y++) {
        clearResidualMatteRow(canvas, y, px);

    }
    ctx.putImageData(frame, 0, 0);
    return canvas;
}

function createBattleMatteClassifier(canvas, px) {
    const samples = [];
    [
        [0, 0], [1, 1], [canvas.width - 1, 0], [canvas.width - 2, 1],
        [0, canvas.height - 1], [1, canvas.height - 2], [canvas.width - 1, canvas.height - 1], [canvas.width - 2, canvas.height - 2]
    ].forEach(([sx, sy]) => {
        let idx = (sy * canvas.width + sx) * 4;
        samples.push([px[idx], px[idx + 1], px[idx + 2]]);
    });

    function bgDistance(r, g, b) {
        let best = Infinity;
        samples.forEach(sample => {
            let dist = Math.abs(r - sample[0]) + Math.abs(g - sample[1]) + Math.abs(b - sample[2]);
            if (dist < best) best = dist;
        });
        return best;
    }

    function isBgLike(r, g, b, a, loose) {
        if (a < 18) return true;
        let dist = bgDistance(r, g, b);
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let avg = (r + g + b) / 3;
        if (avg >= 232 && (max - min) <= 26) return true;
        return loose ? dist <= 62 : dist <= 42;
    }
    return { bgDistance, isBgLike };
}

function clearBattleMatteBorder(canvas, isBgLike, px) {
    let visited = new Uint8Array(canvas.width * canvas.height);
    let queue = [];
    function pushSeed(x, y) {
        if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
        let pos = y * canvas.width + x;
        if (visited[pos]) return;
        let idx = pos * 4;
        if (!isBgLike(px[idx], px[idx + 1], px[idx + 2], px[idx + 3], true)) return;
        visited[pos] = 1;
        queue.push(pos);
    }

    for (let x = 0; x < canvas.width; x++) {
        pushSeed(x, 0);
        pushSeed(x, canvas.height - 1);
    }
    for (let y = 0; y < canvas.height; y++) {
        pushSeed(0, y);
        pushSeed(canvas.width - 1, y);
    }

    while (queue.length > 0) {
        let pos = queue.pop();
        let idx = pos * 4;
        px[idx + 3] = 0;
        let x = pos % canvas.width;
        let y = Math.floor(pos / canvas.width);
        pushSeed(x - 1, y);
        pushSeed(x + 1, y);
        pushSeed(x, y - 1);
        pushSeed(x, y + 1);
    }
}

function thinBattleMattePixels(px, bgDistance) {
    for (let i = 0; i < px.length; i += 4) {
        let r = px[i];
        let g = px[i + 1];
        let b = px[i + 2];
        let a = px[i + 3];
        if (a === 0) continue;
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let dist = bgDistance(r, g, b);
        if ((dist <= 32 && (max - min) <= 40) || a < 28) {
            px[i + 3] = 0;
        } else if (dist <= 48 && (max - min) <= 48) {
            px[i + 3] = Math.min(px[i + 3], 120);
        }
    }
}

function touchesTransparentMattePixel(alphaSnapshot, y, canvas, x) {
    let touchesTransparent = false;
    for (let oy = -1; oy <= 1 && !touchesTransparent; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
            if (ox === 0 && oy === 0) continue;
            if (alphaSnapshot[(y + oy) * canvas.width + (x + ox)] === 0) {
                touchesTransparent = true;
                break;
            }
        }
    }
    return { touchesTransparent };
}

function countResidualMatteNeighbors(px, y, canvas, x) {
    let transparentNeighbors = 0;
    for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
            if (ox === 0 && oy === 0) continue;
            if (px[((y + oy) * canvas.width + (x + ox)) * 4 + 3] === 0) transparentNeighbors++;
        }
    }
    return { transparentNeighbors };
}

function clearBrightMatteRow(canvas, y, alphaSnapshot, px) {
    for (let x = 1; x < canvas.width - 1; x++) {
        let pos = y * canvas.width + x;
        let idx = pos * 4;
        if (alphaSnapshot[pos] === 0) continue;
        let r = px[idx];
        let g = px[idx + 1];
        let b = px[idx + 2];
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let avg = (r + g + b) / 3;
        if (avg < 170 || (max - min) > 72) continue;
        let { touchesTransparent } = touchesTransparentMattePixel(alphaSnapshot, y, canvas, x);
        if (!touchesTransparent) continue;
        if (avg >= 196 && (max - min) <= 62) px[idx + 3] = 0;
        else px[idx + 3] = Math.min(px[idx + 3], 54);
    }
}

function clearResidualMatteRow(canvas, y, px) {
    for (let x = 1; x < canvas.width - 1; x++) {
        let pos = y * canvas.width + x;
        let idx = pos * 4;
        let alpha = px[idx + 3];
        if (alpha === 0) continue;
        let r = px[idx];
        let g = px[idx + 1];
        let b = px[idx + 2];
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let avg = (r + g + b) / 3;
        if ((max - min) > 52 || avg < 154) continue;
        let { transparentNeighbors } = countResidualMatteNeighbors(px, y, canvas, x);
        if (transparentNeighbors >= 2 && avg >= 182) px[idx + 3] = 0;
        else if (transparentNeighbors >= 1 && avg >= 164 && alpha < 220) px[idx + 3] = Math.min(alpha, 32);
    }
}
