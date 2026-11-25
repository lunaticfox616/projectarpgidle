const DANGER_FANG = [
    '##     ',
    '#:+#   ',
    ' #:+#  ',
    '  #:+# ',
    '   #+:#',
    '  #+:# ',
    ' #+:#  ',
    ' ##    '
];
const FANG_TONES = { '#': '#211925', ':': '#b67275', '+': '#e7d6f4' };
const FANG_PIXELS = Object.entries(FANG_TONES).map(([symbol, color]) => ({
    color,
    points: DANGER_FANG.flatMap((row, y) =>
        Array.from(row, (pixel, x) => pixel === symbol ? [x, y] : null).filter(Boolean))
}));

/** Screen-pixel grit leaves the underlying terrain visible inside the exact warning clip. */
export function drawGroundDangerDye(ctx, { x, y, width, height }, strength) {
    const pixel = Math.max(1, Math.round(height / 15));
    const left = Math.round(x - width / 2), top = Math.round(y - height / 2);
    ctx.globalAlpha = strength;
    ctx.fillStyle = '#ffd296';
    ctx.beginPath();
    for (let row = 1; row < 5; row++) {
        const py = Math.round(top + height * row / 5);
        for (let column = 1; column < 8; column++) {
            const px = Math.round(left + width * (column + (row % 2) * 0.35) / 9);
            ctx.rect(px, py, pixel * 2, pixel);
        }
    }
    ctx.fill();
}

/** A hazard sign stays inside its cell. Its split shape remains readable beside a standing actor. */
export function drawGroundDangerSign(ctx, tile, strength, side = 'both') {
    const { x, y, width, height } = tile;
    const pixel = Math.max(1, Math.min(3, Math.round(height / 10), Math.floor(width / 16)));
    const left = Math.round(x - width * 0.28 - pixel * 3.5);
    const right = Math.round(x + width * 0.28 + pixel * 3.5);
    const top = Math.round(y - pixel * 4.1);
    ctx.globalAlpha = strength;
    for (const { color, points } of FANG_PIXELS) {
        ctx.fillStyle = color;
        ctx.beginPath();
        for (const [dx, dy] of points) {
            if (side !== 'right') ctx.rect(left + dx * pixel, top + dy * pixel, pixel, pixel);
            if (side !== 'left') ctx.rect(right - (dx + 1) * pixel, top + dy * pixel, pixel, pixel);
        }
        ctx.fill();
    }
}
