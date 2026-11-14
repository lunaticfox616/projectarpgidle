import { clampNumber } from '../common/numbers.mjs';

const STATS_CACHE_MS = 150;
const SKILL_EFFECT_CAP = 56;
const KILL_HIT_STOP_MS = Object.freeze({ elite: 45, boss: 110 });

/** Cadence-adjusted load: on-time 30fps must not be treated as an overloaded 60fps frame. */
export function battleFrameLoad(frameMs, targetMs) {
    const expected = Math.max(16.7, Math.ceil(((Number(targetMs) || 16.7) - 0.5) / 16.7) * 16.7);
    return clampNumber(16.7 + Math.max(0, (Number(frameMs) || 16.7) - expected), 1, 50);
}

function impactVariant(fx, visual) {
    if (fx.chain) return 'chain';
    if (fx.pierce || fx.penetrate) return 'pierce';
    if (fx.slam) return 'slam';
    return (visual && visual.variant) || 'melee';
}

function impactScale(element, enemy, scale) {
    const screen = clampNumber(Number(scale) || 1, 0.68, 1.18);
    if (element === 'phys' || element === 'physical') return 0.68 * screen;
    if (!enemy) return 0.4 * screen;
    return (enemy.isBoss ? 0.82 : (enemy.isElite ? 0.6 : 0.44)) * screen;
}

/** Owns only the short rendering stats cache. Combat and saved data remain with the domain. */
export class BattlefieldFeedbackTiming {
    constructor(deps) { this.deps = deps; this.dispose(); }

    dispose() { this.owner = null; this.cachedStats = null; this.cachedAt = 0; }

    recentStats(owner, wallNow) {
        return owner && owner.lastCombatStats && wallNow - (owner.lastCombatStatsAt || 0) < 250;
    }

    stats(fallback = {}) {
        const provider = this.deps.playerStats;
        if (!provider) return fallback;
        const owner = this.deps.game(), now = this.deps.now(), wallNow = this.deps.combatTime();
        if (owner !== this.owner) { this.dispose(); this.owner = owner; }
        if (this.recentStats(owner, wallNow)) {
            this.cachedStats = owner.lastCombatStats;
            this.cachedAt = now;
            return this.cachedStats;
        }
        if (this.cachedStats && now - this.cachedAt < STATS_CACHE_MS) return this.cachedStats;
        this.cachedStats = provider() || fallback;
        this.cachedAt = now;
        return this.cachedStats;
    }

    targets(stats) { const provider = this.deps.skillTargets; return provider ? (provider(stats) || []) : []; }
    density() { return clampNumber(Number(this.deps.visual().vfxDensity) || 1, 0.42, 1); }

    updateDensity(frameMs, enemyCount, targetMs) {
        const visual = this.deps.visual(), elapsed = battleFrameLoad(frameMs, targetMs);
        const previousEma = clampNumber(Number(visual.frameTimeEma) || 16.7, 1, 50);
        const ema = previousEma * 0.92 + elapsed * 0.08;
        const crowd = enemyCount >= 8 ? 0.62 : (enemyCount >= 5 ? 0.78 : 1);
        const frame = ema >= 32 ? 0.42 : (ema >= 24 ? 0.56 : (ema >= 18 ? 0.74 : 1));
        const target = Math.min(crowd, frame, elapsed >= 45 ? 0.48 : 1), current = this.density();
        visual.frameTimeEma = ema;
        visual.vfxDensity = target < current ? Math.max(target, current - 0.08) : Math.min(target, current + 0.012);
        return visual.vfxDensity;
    }

    trim(list) {
        const cap = Math.max(24, Math.round(SKILL_EFFECT_CAP * this.density()));
        if (list.length > cap) list.splice(0, list.length - cap);
    }

    spawnOptions(fx, enemy, visual, viewportScale) {
        if (fx.skillName && this.deps.skillProfile(fx.skillName)) return null;
        const options = { crit: !!fx.crit, variant: impactVariant(fx, visual) };
        options.scale = impactScale(String(fx.element || 'phys').toLowerCase(), enemy, viewportScale);
        if (fx.impactTier === 'heavy') options.scale *= 1.04;
        else if (fx.impactTier === 'annihilate') {
            options.scale *= 0.82;
            options.densityMul = 0.48;
        }
        options.densityMul = (Number(options.densityMul) || 1) * this.density();
        return options;
    }

    killStopMs(fx) {
        if (fx.enemyId === undefined || fx.enemyId === null) return 0;
        const death = this.deps.effects().find(other => other && other.type === 'enemyDeath' && other.enemyId === fx.enemyId
            && Math.abs(Number(other.start) - Number(fx.start)) < 1);
        if (!death) return 0;
        return death.boss ? KILL_HIT_STOP_MS.boss : (death.elite ? KILL_HIT_STOP_MS.elite : 0);
    }

    hitStop(fx) {
        const visual = this.deps.visual();
        if (!fx || fx.dot || visual.lastHitStopFxId === fx.id) return;
        const profile = this.deps.feedbackProfile(fx), killStopMs = this.killStopMs(fx);
        const duration = Math.max(profile.hitStopMs, killStopMs);
        visual.lastHitStopFxId = fx.id;
        if (duration <= 0) return;
        const now = this.deps.now();
        if (now < visual.nextHitStopAt && killStopMs < KILL_HIT_STOP_MS.boss) return;
        visual.nextHitStopAt = now + 250;
        visual.hitStopRemainingMs = Math.max(Number(visual.hitStopRemainingMs) || 0, duration);
    }
}
