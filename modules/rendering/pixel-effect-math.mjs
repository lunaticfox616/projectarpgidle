/** Local visual noise; retain the authored sequence independently of combat randomness. */
export function visualRandom(seed) {
    let s = seed >>> 0 || 1;
    return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/** Authored integer-pixel line, bounded to 2,000 points as in the original effects. */
export function pixelEffectLine(x0, y0, x1, y1, put) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (let guard = 0; guard < 2000; guard++) {
        put(x0, y0);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * e;
        if (e2 >= dy) { e += dy; x0 += sx; }
        if (e2 <= dx) { e += dx; y0 += sy; }
    }
}
