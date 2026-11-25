const opaqueFrames = new WeakMap();

/** A visible next step comes from the live movement and attack queues, never the preview guess. */
export function ringPeekCell(deps, owner, enemy, projection) {
    if (!projection || !owner?.gridPlayer) return null;
    const flight = deps.pendingAttacks().find(attack => attack.source === enemy && attack.bossPattern?.move?.kind === 'rings');
    if (!flight) return null;
    const move = flight.bossPattern.move, stage = move.stages[move.next];
    if (!stage || move.cutAt) return null;
    // The second ring becomes the actual next strike when the first one lands.
    const lead = move.next === 1 ? Math.max(450, stage.ms - move.stages[0].ms) : 450;
    const left = flight.at - deps.getCombatTime();
    if (left >= lead) return null;
    const cell = peekTarget(deps, owner, stage.cells);
    if (!cell) return null;
    const at = projection.cellToScreen(cell.gx, cell.gy);
    const opacity = 0.24 + 0.76 * Math.max(0, (left - 320) / (lead - 320));
    return { ...at, width: projection.tileW, height: projection.tileH, opacity };
}

function peekTarget(deps, owner, cells) {
    const hero = owner.gridPlayer;
    const current = cells.find(cell => cell.gx === hero.gx && cell.gy === hero.gy);
    if (current) return current;
    const run = owner.actExploration;
    const next = run?.zoneId === owner.currentZoneId ? run.motion?.to : null;
    if (!next || !cells.some(cell => cell.gx === next.gx && cell.gy === next.gy)) return null;
    return deps.heroStepBlocked().has(deps.gridCellKey(next.gx, next.gy)) ? null : next;
}

function patchInFrame(size, at) {
    const { peek, west, footX, left, top, dot } = at;
    if (!peek) return null;
    const x = west ? footX * 2 - peek.x : peek.x, y = peek.y;
    const insetW = peek.width * 0.5 - 3, insetH = peek.height * 0.5 - 3;
    const x0 = Math.ceil((x - insetW - left) / dot), x1 = Math.floor((x + insetW - left) / dot);
    const y0 = Math.ceil((y - insetH - top) / dot), y1 = Math.floor((y + insetH - top) / dot);
    const rect = { x: x0 - size.pad, y: y0 - size.pad, w: x1 - x0, h: y1 - y0 };
    if (!withinArt(rect, size.width - 2 * size.pad, size.height - 2 * size.pad)) return null;
    const mask = at.readMask();
    if (!mask || !opaqueTile(mask, rect)) return null;
    return { x, y: y + peek.height * 0.12, rx: peek.width * 0.46, ry: peek.height * 0.35 };
}

function withinArt({x,y,w,h}, width, height) {
    return w > 0 && h > 0 && x >= 0 && y >= 0 && x + w <= width && y + h <= height;
}

function opaqueTile(mask, rect) {
    const { x, y, w, h } = rect;
    const { width, height } = mask;
    // The existing tint cache owns these immutable authored frames. A released frame also releases its mask.
    let pixels = opaqueFrames.get(mask);
    if (!pixels) {
        pixels = mask.getContext('2d').getImageData(0, 0, width, height).data;
        opaqueFrames.set(mask, pixels);
    }
    let transparent = 0;
    for (let row = y; row < y + h; row++) {
        for (let col = x; col < x + w; col++) if (pixels[(row * width + col) * 4 + 3] < 235) transparent++;
    }
    return transparent <= w * h * 0.02;
}

/** Keep all danger paint below both actors; cut only the sprite stamp over a hidden, threatened tile. */
export function paintWithRingPeek(ctx, size, at, stageDots) {
    const from = { x: 0, y: 0, w: size.width, h: size.height };
    const place = { x: at.left, y: at.top, scale: at.dot };
    const patch = patchInFrame(size, at);
    if (!patch) return stageDots.blit(ctx, size.canvas, from, place, size.fixed);
    ctx.save();
    ctx.beginPath();
    ctx.rect(place.x, place.y, from.w * at.dot, from.h * at.dot);
    ctx.moveTo(patch.x + patch.rx, patch.y);
    ctx.ellipse(patch.x, patch.y, patch.rx, patch.ry, 0, 0, Math.PI * 2);
    ctx.clip('evenodd');
    stageDots.blit(ctx, size.canvas, from, place, size.fixed);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(patch.x, patch.y, patch.rx, patch.ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha *= at.peek.opacity;
    stageDots.blit(ctx, size.canvas, from, place, size.fixed);
    ctx.restore();
}
