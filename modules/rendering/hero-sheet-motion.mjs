import { clampNumber } from '../common/numbers.mjs';

const FRAME_MS = { walk: 285, run: 190, slash: 160, throw: 170, cast: 180, bow: 175, hit: 200, idle: 320 };

function attackMotionName(visual) {
    const effect = visual && visual.effect ? visual.effect : 'slash';
    if (['arrow', 'projectile'].includes(effect)) return 'bow';
    if (['poisonDart', 'lightSpear'].includes(effect)) return 'throw';
    if (['chain', 'storm', 'iceLance', 'nova'].includes(effect)) return 'cast';
    return 'slash';
}

function sheetMotion(input, advance) {
    const { motion, flash, swingPower, skillVisual } = input;
    const attack = clampNumber(Number.isFinite(motion.attackBlend) ? motion.attackBlend : 0, 0, 1);
    const hurt = clampNumber(Number.isFinite(motion.hurtBlend) ? motion.hurtBlend : (flash ? 1 : 0), 0, 1);
    if (hurt > 0.55) return 'idle';
    if (attack > 0.2 || Math.abs(swingPower) > 0.16) return attackMotionName(skillVisual);
    if (advance > 0.08) return advance > 0.6 ? 'run' : 'walk';
    return 'idle';
}

/** Sheet indices retain playback priority, movement progress and the old movement-speed timing. */
function sheetFrameMs(name, moving, stats) {
    const base = FRAME_MS[name] || 220;
    if (!moving) return base;
    const ratio = clampNumber((Number(stats.moveSpeed) || 100) / 100, 0.6, 3.2);
    return clampNumber(base / ratio, 62, 460);
}

export function selectHeroSheetFrame(motions, input) {
    const { motion, stats, playback, now } = input;
    const advance = clampNumber(Number.isFinite(motion.advanceBlend) ? motion.advanceBlend : 0, 0, 1);
    if (playback && advance <= 0.08) return playback.frameIndex;
    const name = sheetMotion(input, advance), frames = motions[name] || motions.idle;
    const moving = name === 'walk' || name === 'run';
    const frameMs = sheetFrameMs(name, moving, stats);
    const index = moving && Number.isFinite(motion.moveProgress)
        ? Math.floor(clampNumber(motion.moveProgress, 0, 0.999) * frames.length)
        : Math.floor(now / frameMs) % frames.length;
    return frames[index];
}
