

export function cubeCoveredCells(env, x, y, w, h) {
    if (x + w > env.SIZE || y + h > env.SIZE) return null;
    const cells = [];
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) cells.push((y + dy) * env.SIZE + x + dx);
    return cells;
}

export function cubeSpotFits(env, taken, x, y, ...selection) {
const [w, h] = selection;
    const cells = cubeCoveredCells(env, x, y, w, h);
    return !!cells && !cells.some(cell => taken.has(cell));
}
