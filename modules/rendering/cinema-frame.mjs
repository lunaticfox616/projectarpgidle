/** Screen framing shared by the boss scenes and the story scenes (2026-11-19 연출 보강): letterbox bars, a soft edge shade and a
 * floor ring of square dots. Drawing only; the callers decide when and how strongly. */

/** Bars from the top and the bottom edge. area = { width, height }, look = { bar (px), fill, edge (px, optional), edgeColor }.
 * The bars reach 40 px past the sides and the edges so a shaken camera never shows a gap. */
export function letterbox(ctx, area, look) {
    const bar = Math.round(look.bar);
    if (!(bar > 0)) return;
    ctx.fillStyle = look.fill;
    ctx.fillRect(-40, -40, area.width + 80, bar + 40);
    ctx.fillRect(-40, area.height - bar, area.width + 80, bar + 40);
    if (!(look.edge > 0)) return;
    ctx.fillStyle = look.edgeColor;
    ctx.fillRect(-40, bar, area.width + 80, look.edge);
    ctx.fillRect(-40, area.height - bar - look.edge, area.width + 80, look.edge);
}

/** A dark shade that deepens toward the corners; alpha is the shade at the corners. */
export function vignette(ctx, area, alpha) {
    if (!(alpha > 0)) return;
    const cx = area.width / 2, cy = area.height / 2, reach = Math.hypot(cx, cy);
    const shade = ctx.createRadialGradient(cx, cy, reach * 0.45, cx, cy, reach);
    shade.addColorStop(0, 'rgba(4,3,2,0)');
    shade.addColorStop(1, `rgba(4,3,2,${alpha.toFixed(3)})`);
    ctx.fillStyle = shade;
    ctx.fillRect(-40, -40, area.width + 80, area.height + 80);
}

/** An ellipse outline of square dots lying on the floor around at = { x, y }: ring = { radius (px), flat (height / width),
 * dot (px), color }. Callers set globalAlpha. */
export function floorRing(ctx, at, ring) {
    const dot = Math.max(1, Math.round(ring.dot)), rx = ring.radius, ry = ring.radius * ring.flat;
    if (!(rx >= dot)) return;
    const steps = Math.max(16, Math.round((rx + ry) / dot * 2));
    ctx.fillStyle = ring.color;
    for (let step = 0; step < steps; step++) {
        const angle = step / steps * Math.PI * 2;
        ctx.fillRect(Math.round((at.x + Math.cos(angle) * rx) / dot) * dot, Math.round((at.y + Math.sin(angle) * ry) / dot) * dot, dot, dot);
    }
}
