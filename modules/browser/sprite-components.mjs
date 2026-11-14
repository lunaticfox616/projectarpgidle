export function sortSheetComponents(list) {
    let avgHeight = list.length > 0 ? list.reduce((sum, entry) => sum + entry.height, 0) / list.length : 48;
    return [...list].sort((a, b) => {
        if (Math.abs(a.y - b.y) > avgHeight * 0.45) return a.y - b.y;
        return a.x - b.x;
    });
}

export function padSpriteRect(rect, image, pad) {
    return {
        x: Math.max(0, rect.x - pad),
        y: Math.max(0, rect.y - pad),
        width: Math.min(image.width - Math.max(0, rect.x - pad), rect.width + pad * 2),
        height: Math.min(image.height - Math.max(0, rect.y - pad), rect.height + pad * 2)
    };
}

export function detectSpriteComponents(inputs, image, minArea) {
    const canvas = inputs.document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    let data;
    try {
        data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    } catch {
        return [];
    }
    const visited = new Uint8Array(canvas.width * canvas.height);
    const components = [];
    const backgroundSamples = [];
    [
        [0, 0], [1, 1], [canvas.width - 1, 0], [canvas.width - 2, 1],
        [0, canvas.height - 1], [1, canvas.height - 2], [canvas.width - 1, canvas.height - 1], [canvas.width - 2, canvas.height - 2],
        [Math.floor(canvas.width * 0.5), 0], [0, Math.floor(canvas.height * 0.5)], [canvas.width - 1, Math.floor(canvas.height * 0.5)]
    ].forEach(([sx, sy]) => {
        let idx = (sy * canvas.width + sx) * 4;
        backgroundSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    });
    function isBackgroundPixel(pixelIndex) {
        let r = data[pixelIndex * 4];
        let g = data[pixelIndex * 4 + 1];
        let b = data[pixelIndex * 4 + 2];
        let a = data[pixelIndex * 4 + 3];
        if (a < 20) return true;
        if (r > 247 && g > 247 && b > 247) return true;
        return backgroundSamples.some(sample => Math.abs(r - sample[0]) + Math.abs(g - sample[1]) + Math.abs(b - sample[2]) <= 28);
    }
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            let idx = y * canvas.width + x;
            if (visited[idx]) continue;
            visited[idx] = 1;
            if (isBackgroundPixel(idx)) continue;
            let { minX, maxX, minY, maxY, area } = measureSpriteComponent({ x, y, canvas, visited, isBackgroundPixel });
            if (area >= minArea) {
                components.push({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, area: area });
            }
        }
    }
    return components;
}

function measureSpriteComponent({ x, y, canvas, visited, isBackgroundPixel }) {
    let qx = [x];
    let qy = [y];
    let head = 0;
    let minX = x, maxX = x, minY = y, maxY = y, area = 0;
    while (head < qx.length) {
        let px = qx[head];
        let py = qy[head];
        head++;
        area++;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        let neighbors = [
            [px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]
        ];
        neighbors.forEach(([nx, ny]) => {
            if (nx < 0 || ny < 0 || nx >= canvas.width || ny >= canvas.height) return;
            let nIdx = ny * canvas.width + nx;
            if (visited[nIdx]) return;
            visited[nIdx] = 1;
            if (isBackgroundPixel(nIdx)) return;
            qx.push(nx);
            qy.push(ny);
        });
    }
    return { minX, maxX, minY, maxY, area };
}
