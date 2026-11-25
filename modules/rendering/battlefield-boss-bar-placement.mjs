const GAP = 6;
const WIDTH = 122;
// Includes the fatal cast label above the cast bar, and the HP border below it.
const TOP = 38;
const HEIGHT = TOP + 10;

const intersects = (a, b, margin = 0) => a.x < b.x + b.w + margin && b.x < a.x + a.w + margin &&
    a.y < b.y + b.h + margin && b.y < a.y + a.h + margin;

function centered(x, y) { return { x: x - WIDTH / 2, y: y - TOP, w: WIDTH, h: HEIGHT }; }

function roomBounds(ctx, scene) {
    const { a, d, e, f } = ctx.getTransform();
    const left = -e / a, top = -f / d;
    return { x: left + GAP, y: top + GAP, w: ctx.canvas.width / a - GAP * 2,
        h: ctx.canvas.height / d - GAP * 2, overlays: scene.enemyOverlays.map(box => ({
            x: left + box.x * scene.renderScale / a, y: top + box.y * scene.renderScale / d,
            w: box.w * scene.renderScale / a, h: box.h * scene.renderScale / d })) };
}

function fit(box, bounds) {
    return box.x >= bounds.x && box.y >= bounds.y && box.x + box.w <= bounds.x + bounds.w && box.y + box.h <= bounds.y + bounds.h;
}

function possible(box, hero, bounds, blockers) {
    return fit(box, bounds) && !intersects(box, hero, GAP) &&
        !bounds.overlays.some(other => intersects(box, other, GAP)) && !blockers.some(other => intersects(box, other, GAP));
}

function belowHud(box, bounds) {
    let y = Math.max(box.y, bounds.y);
    for (const overlay of bounds.overlays) {
        if (intersects({ ...box, y }, overlay, GAP)) y = overlay.y + overlay.h + GAP;
    }
    return { ...box, y };
}

export class BattlefieldBossBarPlacement {
    constructor() { this.held = new WeakMap(); }

    next(ctx, enemy, origin, {hero, scene, blockers:readBlockers}) {
        if (!hero) return null;
        const natural = centered(origin.x, origin.y);
        const occupied = { x: origin.x - origin.width / 2, y: origin.y - origin.top, w: origin.width, h: origin.top + 8 };
        const previous = this.held.get(enemy);
        if (!intersects(occupied, hero, previous ? 15 : 1)) { this.held.delete(enemy); return null; }
        const bounds = roomBounds(ctx, scene), blockers = readBlockers();
        if (previous && Math.abs(previous.x - natural.x) < WIDTH * 0.65 && possible(previous, hero, bounds, blockers)) return previous;
        const match = this.candidates(natural, hero, bounds).find(box => possible(box, hero, bounds, blockers));
        if (match) this.held.set(enemy, match);
        return match || null;
    }

    candidates(natural, hero, bounds) {
        const x = Math.round(Math.max(bounds.x, Math.min(bounds.x + bounds.w - WIDTH, natural.x)));
        const y = Math.floor((hero.y - HEIGHT - GAP - 2) / 4) * 4;
        const left = hero.x - WIDTH - GAP, right = hero.x + hero.w + GAP;
        const sides = (natural.x + WIDTH / 2 >= hero.x + hero.w / 2 ? [right, left] : [left, right])
            .map(side => ({ ...natural, x: side }));
        return [{ ...natural, x, y }, ...sides, ...sides.map(side => belowHud(side, bounds)),
            { ...natural, x, y: y - HEIGHT - GAP }];
    }
}

export function shiftedBossBar(box, width) {
    return { x: Math.round(box.x + (box.w - width) / 2), y: Math.round(box.y + TOP) };
}
