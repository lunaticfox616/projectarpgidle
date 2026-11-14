export function combatScreenPoint(gridProj, cell, fallback) {
    if (!cell || !gridProj) return fallback;
    let pos = gridProj.cellToScreen(cell.gx, cell.gy);
    return { x: pos.x, y: pos.y - 10 };
}

export function combatEffectBounds(targets) {
    let bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    targets.forEach(target => {
        bounds.minX = Math.min(bounds.minX, target.x);
        bounds.maxX = Math.max(bounds.maxX, target.x);
        bounds.minY = Math.min(bounds.minY, target.y);
        bounds.maxY = Math.max(bounds.maxY, target.y);
    });
    bounds.x = (bounds.minX + bounds.maxX) / 2;
    bounds.y = (bounds.minY + bounds.maxY) / 2;
    return bounds;
}

export function radialEffectRadius(fx, gridProj, profiles) {
    if (!gridProj) return 120;
    let profile = profiles && profiles[fx.skillName];
    let radius = Math.max(1, Number(profile && profile.radius) || 1);
    return profile && profile.shape === 'circle' ? (radius + 0.5) * gridProj.tileW : Math.hypot(gridProj.tileW * radius, gridProj.tileH * radius);
}

export function channelEffectGeometry(source, aim, targets) {
    let dx = aim.x - source.x;
    let dy = aim.y - source.y;
    let aimLength = Math.max(1, Math.hypot(dx, dy));
    let unitX = dx / aimLength;
    let unitY = dy / aimLength;
    let length = aimLength;
    let halfWidth = 18;
    targets.forEach(target => {
        let offsetX = target.x - source.x;
        let offsetY = target.y - source.y;
        length = Math.max(length, offsetX * unitX + offsetY * unitY + 26);
        halfWidth = Math.max(halfWidth, Math.abs(offsetX * unitY - offsetY * unitX) + 22);
    });
    length = Math.max(52, length);
    return {
        x: source.x + unitX * length / 2,
        y: source.y + unitY * length / 2,
        angle: Math.atan2(dy, dx),
        length,
        width: halfWidth * 2
    };
}
