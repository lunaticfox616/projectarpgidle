import { clampNumber } from '../common/numbers.mjs';
import { damageBodyY } from './battlefield-body.mjs';
import { recentBattleEffect } from './battlefield-motion.mjs';

const ENEMY_RECOIL = Object.freeze({ ms: 170, normal: 0.085, crit: 0.14, heavy: 0.17 });
const HERO_RECOIL = Object.freeze({ ms: 170, min: 0.035, perLife: 0.5, max: 0.13 });
const HURT_TEXT_MERGE_MS = 400;

/** Visual displacement only: neither this curve nor its offsets move combat cells. */
function recoilCurve(t) {
    if (!(t >= 0 && t < 1)) return 0;
    return t < 0.2 ? t / 0.2 : Math.pow(1 - (t - 0.2) / 0.8, 2);
}

function recoilOffset(at, from, reach) {
    const dx = at.x - from.x, dy = at.y - from.y, length = Math.hypot(dx, dy);
    if (!(length > 0.01) || !(reach > 0)) return null;
    return { x: dx / length * reach, y: dy / length * reach * 0.6 };
}

function enemyReach(fx) {
    if (fx.impactTier === 'heavy' || fx.impactTier === 'annihilate') return ENEMY_RECOIL.heavy;
    return fx.crit ? ENEMY_RECOIL.crit : ENEMY_RECOIL.normal;
}

function enemyRecoil(fx, state, tile) {
    const entry = fx.type === 'hit' && !fx.dot && fx.damage > 0 && state.enemyPosMap[fx.enemyId];
    const push = entry ? recoilCurve((state.now - fx.start) / ENEMY_RECOIL.ms) : 0;
    const weight = entry && entry.enemy && entry.enemy.isBoss ? 0.5 : 1;
    return push > 0 ? recoilOffset(entry, state.playerPos, tile * enemyReach(fx) * push * weight) : null;
}

function attackMotion(fx, enemy, target, now, distance) {
    if (!fx || !enemy || !target) return null;
    const duration = Math.max(1, Number(fx.motionMs) || Number(fx.duration) || 220);
    const progress = (Number(now) - Number(fx.start)) / duration;
    if (!(progress >= 0 && progress <= 1)) return null;
    const dx = Number(target.x) - Number(enemy.x), dy = Number(target.y) - Number(enemy.y);
    const length = Math.hypot(dx, dy);
    if (length < 0.01) return { progress, x: 0, y: 0 };
    const stride = Math.sin(progress * Math.PI) * Math.max(0, Number(distance) || 0);
    return { progress, x: dx / length * stride, y: dy / length * stride };
}

function overlaps(a, b) {
    return Math.abs(a.x - b.x) < a.halfW + b.halfW && a.top < b.bottom && b.top < a.bottom;
}

/** Owns pulse softening, not combat events. Existing visual state owns pulses and ghost positions. */
export class BattlefieldHitFeedback {
    constructor(deps, body) { this.deps = deps; this.body = body; this.softened = new WeakSet(); }

    heroText(fx, player, now) {
        this.deps.damageText({
            start: now, x: player.x, y: damageBodyY(player.y, this.body.heroHeight(player, now)),
            value: fx.damage, enemyHit: true, deflected: !!fx.deflected,
            aggregateKey: `hurt:${fx.deflected ? 'block' : 'hit'}:${Math.floor(fx.start / HURT_TEXT_MERGE_MS)}`
        });
    }

    summonText(fx, projection, player, now) {
        const summon = (this.deps.game().summons || []).find(row => row && row.id === fx.summonId);
        const at = summon && projection && this.deps.hasCell(summon) ? projection.cellToScreen(summon.gx, summon.gy) : player;
        this.deps.damageText({
            start: now, x: at.x, y: damageBodyY(at.y, 34), value: fx.damage, enemyHit: true,
            aggregateKey: `summon:${fx.summonId}:${Math.floor(fx.start / HURT_TEXT_MERGE_MS)}`
        });
    }

    flash(fx, now) {
        if (fx.dot || !['hit', 'enemyDeath'].includes(fx.type)) return 0;
        if (fx.type === 'hit' && !(fx.damage > 0)) return 0;
        const age = now - fx.start, duration = fx.crit ? 140 : 110;
        if (age < 0 || age >= duration) return 0;
        const strength = this.deps.mildHits() ? 0.42 : 0.92;
        return strength * Math.min(1, (duration - age) / (duration - 40));
    }

    /** Keep at least 80 ms of original art between direct-hit pulses, including rapid skills. */
    flashes(effects, now) {
        const pulses = this.deps.visual().enemyHitPulses, result = new Map();
        pulses.forEach((pulse, id) => { if (now < pulse.start || now - pulse.start > 1000) pulses.delete(id); });
        for (let i = effects.length - 1; i >= 0; i--) {
            const fx = effects[i];
            if (fx?.enemyId == null || !this.flash(fx, now)) continue;
            const previous = pulses.get(fx.enemyId);
            if (!previous || fx.start - previous.start >= 220) pulses.set(fx.enemyId, fx);
        }
        for (const [id, pulse] of pulses) result.set(id, this.flash(pulse, now));
        return result;
    }

    recoils(effects, state) {
        const result = {}, tile = state.gridProj ? state.gridProj.tileW : 48;
        for (let index = (effects || []).length - 1; index >= 0; index--) {
            const fx = effects[index], offset = fx && !(fx.enemyId in result) && enemyRecoil(fx, state, tile);
            if (offset) result[fx.enemyId] = offset;
        }
        return result;
    }

    hurtOffset(at, from, hit, state) {
        const life = clampNumber(HERO_RECOIL.min + (Number(hit.damageRatio) || 0) * HERO_RECOIL.perLife, HERO_RECOIL.min, HERO_RECOIL.max);
        const push = recoilCurve((state.now - hit.start) / HERO_RECOIL.ms);
        return recoilOffset(at, from, (state.gridProj ? state.gridProj.tileW : 48) * life * push);
    }

    hurtPosition(state) {
        const at = state.playerPos, hit = recentBattleEffect(this.deps.effects(), 'playerHit', state.now, HERO_RECOIL.ms);
        const from = hit && Number(hit.damage) > 0 && state.enemyPosMap && state.enemyPosMap[hit.enemyId];
        if (!from) return at;
        const offset = this.hurtOffset(at, from, hit, state);
        return offset ? { ...at, x: at.x + offset.x, y: at.y + offset.y } : at;
    }

    /** Fixed release aim lasts for the whole clip, even after the short legacy lunge ends. */
    releaseAim(fx, entry, view) {
        const { now, projection, player } = view;
        if (now < fx.start || now - fx.start > fx.duration) return null;
        const cell = fx.targetCell, point = cell && projection ? projection.cellToScreen(cell.gx, cell.gy) : null;
        if (point) point.y += Number(projection.actorGroundOffsetY) || 0;
        entry.actualAim = point || player;
        const ghost = this.deps.visual().enemyGhostPos[entry.enemy.id];
        if (ghost) ghost.actualAim = { ...entry.actualAim };
        return entry.actualAim;
    }

    attackMotions(effects, entries, player, now, projection) {
        const result = {}, view = { player, now, projection };
        (effects || []).forEach(fx => {
            if (!fx || fx.type !== 'enemyAttack' || fx.enemyId == null) return;
            const entry = entries[fx.enemyId];
            if (!entry) return;
            const distance = entry.enemy.isBoss ? 10 : (entry.enemy.isElite ? 8 : 6);
            const motion = attackMotion(fx, entry, this.releaseAim(fx, entry, view) || player, now, distance);
            if (motion) result[fx.enemyId] = motion;
        });
        return result;
    }

    crowdBody(entry, tile) {
        const size = this.deps.roster.bodySize(entry.enemy, tile)
            || { halfW: tile * .45 * this.deps.footprint(entry.enemy).columns, h: this.body.enemyHeight(entry) };
        return { id: entry.enemy.id, x: entry.x, top: entry.y - size.h, bottom: entry.y, halfW: size.halfW,
            pulse: this.deps.visual().enemyHitPulses.get(entry.enemy.id) };
    }

    markCrowdGroups(bodies) {
        const remaining = new Set(bodies);
        for (const first of remaining) {
            const group = [first];
            remaining.delete(first);
            for (let i = 0; i < group.length; i++) {
                remaining.forEach(other => {
                    if (!overlaps(group[i], other)) return;
                    group.push(other);
                    remaining.delete(other);
                });
            }
            if (group.length >= 3) group.forEach(row => this.softened.add(row.pulse));
        }
    }

    /** Latch per pulse: a neighbour finishing its flash must not brighten this enemy again. */
    softenCrowd(flashes, entries, tile) {
        const targets = entries.filter(entry => entry.enemy.hp > 0 && !entry.enemy.isBoss && flashes.get(entry.enemy.id) > 0);
        if (targets.length >= 3) this.markCrowdGroups(targets.map(entry => this.crowdBody(entry, tile)));
        for (const { enemy } of targets) if (this.softened.has(this.deps.visual().enemyHitPulses.get(enemy.id))) {
            flashes.set(enemy.id, flashes.get(enemy.id) * .4);
        }
    }

    dispose() { this.softened = new WeakSet(); }
}
