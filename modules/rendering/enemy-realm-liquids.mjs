const LIQUIDS = Object.freeze({
    'hive-nurse': { element: 'chaos', body: 0, splash: 1, lift: 4.5, width: 0.87, height: 0.52 },
    'ocean-oracle': { element: 'cold', body: 2, splash: 3, lift: 3.1, width: 1.03, height: 0.41 }
});

export const REALM_LIQUID_ASSET = 'skillFxEnemyRealmLiquids';

// Keep authored colors tied to the real incoming element, including saves with a different element.
export function realmLiquid(attack) {
    const profile = LIQUIDS[attack?.source?.monsterVisualId];
    return profile && profile.element === attack.groundElement ? profile : null;
}

/** Four packed frames share the existing grid projection and render passes. */
function drawFrame(ctx, image, frame, width, height) {
    const cellW = image.naturalWidth / 2, cellH = image.naturalHeight / 2;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, frame % 2 * cellW, Math.floor(frame / 2) * cellH, cellW, cellH,
        -Math.round(width / 2), -Math.round(height / 2), width, height);
}

export function paintRealmFlight(ctx, image, profile, {from, to, tileW, progress}) {
    const t = progress, dx = to.x - from.x, dy = to.y - from.y;
    const lift = profile.lift * t * (1 - t);
    const x = Math.round(from.x + dx * t), y = Math.round(from.y + dy * t - tileW * (0.78 * (1 - t) + lift));
    const width = Math.max(18, Math.round(tileW * profile.width));
    const height = Math.max(11, Math.round(tileW * profile.height * (1 - Math.max(0, t - 0.72))));
    const tangent = dy + tileW * (0.78 - profile.lift * (1 - 2 * t));
    const direction = Math.atan2(tangent, dx);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(direction);
    drawFrame(ctx, image, profile.body, width, height);
    ctx.restore();
    if (t >= 0.75) {
        const cos = Math.abs(Math.cos(direction)), sin = Math.abs(Math.sin(direction));
        const w = width * cos + height * sin, h = width * sin + height * cos;
        return { x: x - w / 2, y: y - h / 2, w, h };
    }
}

export function paintRealmContact(ctx, image, profile, {x, y, width, height}, progress) {
    const w = Math.round(width * (0.92 + progress * 0.08));
    const h = Math.max(4, Math.round(height * (0.84 - progress * 0.4)));
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + height * 0.14));
    ctx.globalAlpha = (1 - progress) ** 0.7;
    drawFrame(ctx, image, profile.splash, w, h);
    ctx.restore();
}
