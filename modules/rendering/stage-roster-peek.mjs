import { bossWarningFirstWaveCells } from '../combat/boss-move-stages.mjs';

// The boss body stays this visible over a cell of its own wave, so the warned ground reads through its legs.
const PEEK_OPACITY = 0.32;

/** The Rootlet's wave that strikes next (live attack queue first, else the warning before release), as cells. */
function nextWaveCells(deps, enemy) {
    const flight = deps.pendingAttacks().find(attack => attack.source === enemy && attack.bossPattern?.move?.kind === 'rings');
    if (flight) {
        const move = flight.bossPattern.move;
        return move.cutAt ? null : move.stages[move.next]?.cells;
    }
    const area = enemy.patternArea;
    if (!area || area.shape !== 'diamond' || area.radius < 2 || !deps.bossAttackView.timing.isLiveWarning(enemy)) return null;
    return area.firstWaveCells ?? bossWarningFirstWaveCells(area);
}

/** Screen cells of the boss's next wave; drawing cuts the body over them (paintWithRingPeek). */
export function ringPeekCells(deps, owner, enemy, projection) {
    if (!projection || !owner?.gridPlayer) return null;
    const cells = nextWaveCells(deps, enemy);
    if (!cells?.length) return null;
    return cells.map(cell => ({ ...projection.cellToScreen(cell.gx, cell.gy), width: projection.tileW, height: projection.tileH }));
}

/** The struck cells themselves (tile-shaped windows), so every warned cell under the body reads the same way. */
function patchPath(ctx, peek, { west, footX }) {
    for (const cell of peek) {
        const x = west ? footX * 2 - cell.x : cell.x;
        ctx.rect(Math.round(x - cell.width / 2), Math.round(cell.y - cell.height / 2), Math.round(cell.width), Math.round(cell.height));
    }
}

/** Keep all danger paint below both actors; the body is drawn faint over the cells its next wave strikes. */
export function paintWithRingPeek(ctx, size, at, stageDots) {
    const from = { x: 0, y: 0, w: size.width, h: size.height };
    const place = { x: at.left, y: at.top, scale: at.dot };
    ctx.save();
    ctx.beginPath();
    ctx.rect(place.x, place.y, from.w * at.dot, from.h * at.dot);
    patchPath(ctx, at.peek, at);
    ctx.clip('evenodd');
    stageDots.blit(ctx, size.canvas, from, place, size.fixed);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    patchPath(ctx, at.peek, at);
    ctx.clip();
    ctx.globalAlpha *= PEEK_OPACITY;
    stageDots.blit(ctx, size.canvas, from, place, size.fixed);
    ctx.restore();
}
