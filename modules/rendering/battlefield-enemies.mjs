import { clampNumber } from '../common/numbers.mjs';

const SPAWN_STAMP_FUTURE_MS = 1000;
const SIGHT_GATED_FX = new Set(['hit', 'enemyEvade', 'statusText']);

export function sortBattleActorsByDepth(actors) {
    return (actors || []).slice().sort((left, right) => {
        const difference = Number(left.y) - Number(right.y);
        if (Math.abs(difference) > 0.01) return difference;
        if (left.kind !== right.kind) return left.kind === 'player' ? 1 : -1;
        return Number(left.id) - Number(right.id);
    });
}

function crowdScale(enemy, count) {
    const row = count >= 9 ? [3.25, 1.72, 1.46] : (count >= 6 ? [3.45, 1.9, 1.62] : [3.65, 2.2, 1.95]);
    return enemy.isBoss ? row[0] : (enemy.isElite ? row[1] : row[2]);
}

function veilPose(veil) {
    if (!veil) return { flash: 0, shade: 0, rim: null };
    return { flash: veil.flash, shade: veil.shade, rim: veil.rim > 0 ? { color: veil.color, alpha: veil.rim } : null };
}

/** Presentation consumes combat state. Only existing visual positions/ghosts and side memory are written. */
export class BattlefieldEnemies {
    constructor(deps, facing) { this.deps = deps; this.facing = facing; }

    bossScale(enemy) { return enemy && enemy.isBoss ? this.deps.bossDrawScale : 1; }

    /** Old-session/future stamps must not leave a restored enemy invisible indefinitely. */
    spawnAge(enemy, now, duration) {
        const rising = this.deps.entrance.enemyAge(enemy, now);
        if (rising !== null) return rising;
        if (!enemy.spawnStamp || enemy.spawnStamp > now + SPAWN_STAMP_FUTURE_MS) return 1;
        return clampNumber((now - enemy.spawnStamp) / duration, 0, 1);
    }

    entering(ctx, entry, state, veil) {
        ctx.save();
        ctx.globalAlpha = veil.alpha;
        this.sprite(ctx, entry, state, { y: entry.y, scale: crowdScale(entry.enemy, state.enemyCount) * state.gridUnitScale, spawnScale: 1, veil });
        ctx.restore();
    }

    sprite(ctx, entry, state, pose) {
        const enemy = entry.enemy, veil = veilPose(pose.veil), facing = this.facing.direction(entry, state.playerPos);
        const flash = Math.max(state.enemyHitFlashes.get(enemy.id) || 0, veil.flash);
        const tile = state.gridProj && state.gridProj.tileW, recoil = (state.enemyHitRecoil || {})[enemy.id] || { x: 0, y: 0 };
        const x = entry.x + recoil.x, y = pose.y + recoil.y, boss = this.bossScale(enemy);
        const sheet = { x, y, tile, now: state.now, facing, flash, spawnScale: pose.spawnScale * boss, moving: entry.moving === true,
            shade: veil.shade, rim: veil.rim, awakened: pose.awakened, openingFrame: pose.openingFrame };
        if (this.deps.wisps.draw(ctx, enemy, sheet) || this.deps.monsters.draw(ctx, enemy, sheet)) return;
        this.facing.note(enemy, entry, state.playerPos, tile);
        this.deps.drawSprite(ctx, enemy, x, y, pose.scale * boss, flash, state.now, entry.moving, state.enemyAttackMotions[enemy.id], facing);
    }

    afterimage(ctx, enemy, pose) {
        if (this.deps.woodsman.owns(enemy)) return;
        const tile = pose.gridProj && pose.gridProj.tileW, boss = this.bossScale(enemy);
        const sheet = { x: pose.x, y: pose.y, tile, now: pose.now, facing: pose.facing, flash: !!pose.flash, spawnScale: boss, afterimage: true };
        if (this.deps.wisps.draw(ctx, enemy, sheet) || this.deps.monsters.draw(ctx, enemy, sheet)) return;
        this.deps.drawSprite(ctx, enemy, pose.x, pose.y, pose.scale * boss, !!pose.flash, pose.now);
    }

    sparks(ctx, entry, state, color) {
        const tile = (state.gridProj && state.gridProj.tileW) || 32, dot = Math.max(1, Math.round(tile / 16));
        const seed = Math.abs(entry.enemy.id || 0) * 97;
        ctx.save();
        ctx.fillStyle = color;
        const alpha = ctx.globalAlpha;
        for (let index = 0; index < 3; index++) {
            const t = ((state.now + seed + index * 433) % 1300) / 1300, size = dot * (t < 0.5 ? 2 : 1);
            const x = entry.x + Math.sin((seed + index * 71) % 628 / 100 + t * 3) * tile * 0.22;
            const y = entry.y - tile * (0.3 + t * 0.9);
            ctx.globalAlpha = alpha * (1 - t) * 0.9;
            ctx.fillRect(Math.round(x), Math.round(y), size, size);
        }
        ctx.restore();
    }

    draw(ctx, entry, state) {
        if (this.deps.woodsmanView.active(entry.enemy)) return;
        const enemy = entry.enemy, veil = this.deps.entrance.stageLook(enemy, state.now);
        if (veil) { this.entering(ctx, entry, state, veil); return; }
        const duration = enemy.isBoss ? 640 : (enemy.isElite ? 460 : 360);
        const age = this.spawnAge(enemy, state.now, duration), eased = 1 - Math.pow(1 - age, 3);
        let spawnScale = (enemy.isBoss ? 0.46 : 0.68) + eased * (enemy.isBoss ? 0.54 : 0.32);
        if (enemy.isBoss) spawnScale += Math.sin(age * Math.PI) * 0.08;
        const scale = crowdScale(enemy, state.enemyCount), observer = this.deps.entrance.observer;
        const awakening = observer.frame(enemy), awakened = observer.body(awakening);
        observer.seal(ctx, entry, awakening);
        ctx.save();
        ctx.globalAlpha = eased * this.deps.ambush.alphaOf(enemy, state.now) * this.deps.bossMoves.shiftAlpha(enemy);
        this.sprite(ctx, entry, state, { y: entry.y - (1 - eased) * (enemy.isBoss ? 28 : 18),
            scale: scale * state.gridUnitScale * spawnScale, spawnScale, ...awakened });
        if (enemy.encounterSparks) this.sparks(ctx, entry, state, enemy.encounterSparks);
        ctx.restore();
        observer.globe(ctx, enemy, awakening);
        observer.caption(ctx, entry, awakening);
    }

    /** Project the grid stride each frame; no screen-space follower that drags during camera scroll. */
    glide(entry, frame) {
        const stride = this.deps.stride.read(entry.enemy, frame.now) || { dx: 0, dy: 0, moving: false };
        const at = { x: entry.x + stride.dx * frame.gridProj.tileW, y: entry.y + stride.dy * frame.gridProj.tileH };
        this.deps.visual().enemySmoothPos[entry.enemy.id] = at;
        const heading = stride.moving && Math.abs(stride.dx) > 0.02 ? (stride.dx < 0 ? 'east' : 'west') : null;
        return { enemy: entry.enemy, x: at.x, y: at.y, moving: stride.moving, heading };
    }

    /** All living positions remain targetable; unseen enemies get neither ghosts nor one-shot combat text. */
    positions(layout, effects, now, projection) {
        const map = {}, hidden = new Set(), visual = this.deps.visual();
        layout.forEach(entry => {
            map[entry.enemy.id] = entry;
            const cell = this.deps.attackRules.aimCell(entry.enemy);
            if (cell && projection) {
                entry.actualAim = projection.cellToScreen(cell.gx, cell.gy);
                entry.actualAim.y += Number(projection.actorGroundOffsetY) || 0;
            }
            if (!entry.seen) {
                hidden.add(entry.enemy.id);
                delete visual.enemyGhostPos[entry.enemy.id];
                return;
            }
            visual.enemyGhostPos[entry.enemy.id] = { x: entry.x, y: entry.y, actualAim: entry.actualAim && { ...entry.actualAim },
                stamp: now, enemy: this.facing.copy(entry.enemy, { ...entry.enemy }) };
        });
        if (hidden.size) effects.forEach(fx => {
            if (fx && SIGHT_GATED_FX.has(fx.type) && hidden.has(fx.enemyId)) visual.processedFxIds.add(fx.id);
        });
        return map;
    }
}
