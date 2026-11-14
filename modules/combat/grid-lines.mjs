import { cellIsGridCellInBounds } from './grid-units.mjs';

export function cellGridLineCells(env, {ax, ay, tx, ty, maxLen}) {
    let cells = [];
    let dx = Math.abs(tx - ax), dy = Math.abs(ty - ay);
    let sx = ax < tx ? 1 : -1, sy = ay < ty ? 1 : -1;
    let err = dx - dy;
    let gx = ax, gy = ay;
    while (cells.length < maxLen && (gx !== tx || gy !== ty)) {
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; gx += sx; }
        if (e2 < dx) { err += dx; gy += sy; }
        if (!cellIsGridCellInBounds(env, gx, gy)) break;
        cells.push({ gx, gy });
    }
    return cells;
}

export function cellGridProjectedLineEnd(ax, ay, tx, ty, range) {
    let dx = tx - ax, dy = ty - ay;
    let len = Math.max(Math.abs(dx), Math.abs(dy));
    if (len <= 0) return { gx: tx, gy: ty };
    let scale = range / len;
    return { gx: ax + Math.round(dx * scale), gy: ay + Math.round(dy * scale) };
}
