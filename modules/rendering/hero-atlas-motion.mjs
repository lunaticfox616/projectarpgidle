import { clampNumber } from '../common/numbers.mjs';
import { pickAttackVariantCycle } from './hero-atlas-tuning.mjs';

function nonemptyCycle(cycle) { return Array.isArray(cycle) && cycle.length > 0; }
function preferredCycle(first, second, fallback) {
    if (nonemptyCycle(first)) return first;
    return nonemptyCycle(second) ? second : fallback;
}
function fallbackFrame(frames) { return frames.attack || frames.sideIdle || frames.sideWalk; }

function cyclesFor(frames, motion) {
    const clips = frames.characterAnimations || {};
    const idleDirections = clips.idleDirections || frames.idleDirections || {};
    const walkDirections = clips.walkDirections || frames.walkDirections || {};
    const facing = motion.facingDirection || motion.attackDirection || 'east';
    const idle = preferredCycle(clips.idle, frames.idle, [frames.sideIdle, frames.frontIdle, frames.frontGuard].filter(Boolean));
    const walk = preferredCycle(clips.walk_or_run, frames.walk, [frames.sideWalk, frames.sideIdle, frames.frontGuard].filter(Boolean));
    const hurt = preferredCycle(clips.hurt, frames.hurt, [frames.frontGuard, frames.sideIdle].filter(Boolean));
    return {
        facing, hurt,
        idle: preferredCycle(idleDirections[facing], null, idle),
        walk: preferredCycle(walkDirections[motion.moveDirection], null, walk),
        down: preferredCycle(clips.down_or_knockdown, frames.down, hurt)
    };
}

function downPhaseAt(effects, now) {
    const effect = effects.filter(fx => fx.type === 'playerDown' && now - fx.start <= fx.duration).slice(-1)[0];
    return effect ? clampNumber((now - effect.start) / effect.duration, 0, 0.999) : null;
}

export function heroAtlasPose(motion, effects, now, flash) {
    const advanceBlend = clampNumber(Number.isFinite(motion.advanceBlend) ? motion.advanceBlend : 0, 0, 1);
    const hurtBlend = clampNumber(Number.isFinite(motion.hurtBlend) ? motion.hurtBlend : (flash ? 1 : 0), 0, 1);
    const downPhase = downPhaseAt(effects, now);
    const downBlend = clampNumber(Number.isFinite(motion.downBlend) ? motion.downBlend : (downPhase !== null ? 1 : 0), 0, 1);
    return { advanceBlend, hurtBlend, downPhase, downBlend,
        moveProgress: clampNumber(Number(motion.moveProgress) || 0, 0, 1),
        isAttacking: !(advanceBlend > 0.08) && motion.attackActive === true };
}

function cycleFrame(frames, list, now, speed) {
    const sequence = (list || []).filter(Boolean);
    if (!sequence.length) return fallbackFrame(frames);
    const timingScale = sequence.length <= 3 ? 1.32 : (sequence.length <= 5 ? 1.14 : 1);
    return sequence[Math.floor((now / ((speed || 110) * timingScale)) % sequence.length)];
}

function progressFrame(frames, list, phase) {
    const sequence = (list || []).filter(Boolean);
    if (!sequence.length) return fallbackFrame(frames);
    const index = Math.floor(clampNumber(phase, 0, 0.999) * sequence.length);
    return sequence[clampNumber(index, 0, sequence.length - 1)];
}

function attackCycle(frames, motion, tags) {
    const clips = frames.characterAnimations || {};
    const directions = clips.attackDirections || frames.attackDirections || {};
    const directional = directions[motion.attackDirection];
    const variant = pickAttackVariantCycle(Array.isArray(directional) ? directional : frames.attackVariants,
        frames.attackVariantWeights, motion.attackVariantSeed);
    return variant || skillAttackCycle(clips, frames, tags);
}

function skillAttackCycle(clips, frames, tags) {
    if (tags.includes('slam') && nonemptyCycle(frames.greatswordCombo)) return frames.greatswordCombo;
    if (!tags.includes('slam') && nonemptyCycle(frames.quakeCombo)) return frames.quakeCombo;
    if (nonemptyCycle(clips.sword_attack_body)) return clips.sword_attack_body;
    return defaultAttackCycle(frames);
}

function defaultAttackCycle(frames) {
    return frames.swordCombo || frames.greatswordCombo || frames.quakeCombo || frames.castCombo
        || frames.bowCombo || frames.projectileCombo || frames.whirlCombo;
}

function attackFrame(frames, list, input) {
    const sequence = (list || []).filter(Boolean);
    if (!sequence.length) return fallbackFrame(frames);
    const { motion, stats, now, swingPower } = input;
    const progress = Number.isFinite(motion.attackProgress) ? motion.attackProgress : Math.abs(swingPower);
    let index = Math.floor(clampNumber(progress, 0, 0.999) * sequence.length);
    if ((frames.clipLoop || {}).sword_attack_body === true) {
        const aspd = Math.max(0.1, Number(stats.aspd) || 1);
        index = Math.floor((now / clampNumber(120 / aspd, 38, 170)) % sequence.length);
    }
    return sequence[clampNumber(index, 0, sequence.length - 1)];
}

function moveFrame(frames, walk, pose, input) {
    const ratio = clampNumber(Math.max(70, Number(input.stats.move) || 100) / 100, 0.85, 2.25);
    const duration = clampNumber(960 / ratio, 560, 1130);
    const frameMs = clampNumber(duration / Math.max(1, walk.length || 1), 45, 105);
    if (Number.isFinite(input.motion.moveProgress)) return progressFrame(frames, walk, pose.moveProgress);
    return cycleFrame(frames, walk, input.now, frameMs);
}

function restingFrame(frames, cycles, pose, input) {
    if (pose.downPhase !== null || pose.downBlend > 0.24) {
        const phase = pose.downPhase !== null ? pose.downPhase : clampNumber(pose.downBlend * 0.999, 0, 0.999);
        return progressFrame(frames, cycles.down, phase);
    }
    return pose.advanceBlend > 0.08 ? moveFrame(frames, cycles.walk, pose, input) : cycleFrame(frames, cycles.idle, input.now, 920);
}

/** These selectors read rendering inputs only: no combat advancement or save mutation. */
export function selectHeroAtlasFrame(frames, pose, input, activeTags) {
    const cycles = cyclesFor(frames, input.motion);
    if (pose.downPhase === null && pose.isAttacking) return attackFrame(frames, attackCycle(frames, input.motion, activeTags), input);
    if (pose.downPhase === null && pose.hurtBlend > 0.8 && cycles.hurt.length > 0) {
        return ['north', 'south'].includes(cycles.facing) ? cycleFrame(frames, cycles.idle, input.now, 920) : cycles.hurt[0];
    }
    return restingFrame(frames, cycles, pose, input);
}

export function heroWalkOffset(heroId, moveProgress, advanceBlend) {
    let blend = clampNumber(Number(advanceBlend) || 0, 0, 1);
    if (blend <= 0) return { x: 0, y: 0 };
    let phase = clampNumber(Number(moveProgress) || 0, 0, 1) * Math.PI * 2;
    let heavyStep = ['hero2', 'hero5', 'hero8'].includes(heroId) ? 1.16 : 1;
    return {
        x: Math.sin(phase) * 0.9 * heavyStep * blend,
        y: -Math.abs(Math.sin(phase * 2)) * 1.15 * heavyStep * blend
    };
}
