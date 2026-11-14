import { clampNumber } from '../common/numbers.mjs';

const HERO_HIT_TINT_MS = 280;
const HERO_HIT_TINT_HOLD_MS = 90;
export const HERO_HIT_TINT_COLOUR = '#ff2a1f';

export function notePlayerMotionFx(found, fx, now) {
    if (fx.type === 'playerSwing') found.swing = found.swing || fx;
    else if (fx.type === 'playerHit') found.hit = found.hit || fx;
    else if (fx.type === 'playerDown' && now - fx.start <= fx.duration) found.down = found.down || fx;
}

export function getHanaSwingTiming(swing, direction) {
    if (!swing) return null;
    let windup = Math.max(1, (Number(swing.impactAt) || swing.start) - swing.start);
    let channelUntil = swing.duration > windup + 40 ? swing.start + swing.duration : 0;
    // A projectile leaves the hand before the swing's impact (js/combat-tick.js PROJECTILE_RELEASE_SHARE): the release frame plays then.
    let release = Number.isFinite(swing.releaseDelayMs) ? Math.max(1, Math.min(windup, swing.releaseDelayMs)) : windup;
    return { start: swing.start, impactAt: swing.start + release, direction, channelUntil, skillName: swing.skillName, pose: swing.pose || null, kickoff: !!swing.kickoff, contactFrame: swing.contactFrame };
}

/** A hit worth at least 6% of max life tints the body harder than chip damage from archers. */
function isHeavyPlayerHit(hit, stats) {
    if (!hit) return false;
    return Number(hit.damage) >= Math.max(1, Number(stats.maxHp) || 0) * 0.06;
}

/** Red hit tint strength (0..1) at `now`: every hit on the hero tints its body red, holds for HERO_HIT_TINT_HOLD_MS and fades by
 * HERO_HIT_TINT_MS, whatever it is doing — attacking, walking or standing (2026-10-05 user request). Heavy hits tint harder. */
export function getHeroHitTintStrength(effects, now, stats) {
    for (let index = effects.length - 1; index >= 0; index--) {
        const fx = effects[index];
        if (!fx || fx.type !== 'playerHit' || fx.start > now) continue;
        const age = now - fx.start;
        if (age >= HERO_HIT_TINT_MS) continue;
        const fade = age < HERO_HIT_TINT_HOLD_MS ? 1 : 1 - (age - HERO_HIT_TINT_HOLD_MS) / (HERO_HIT_TINT_MS - HERO_HIT_TINT_HOLD_MS);
        return (isHeavyPlayerHit(fx, stats || {}) ? 0.82 : 0.62) * fade;
    }
    return 0;
}

/** Sprite run rate from the current tile duration (ms), or movement stat outside exploration.
 * The scene supplies the configured base interval (seconds) and animation rate cap. */
export function getHeroRunRate(move, runMotion, intervalSec, maxRate) {
    const step = intervalSec * 1000;
    const rate = runMotion ? step / runMotion.duration : move / 100;
    return clampNumber(rate, 0.8, maxRate);
}
