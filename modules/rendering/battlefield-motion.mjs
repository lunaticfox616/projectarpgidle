import { clampNumber } from '../common/numbers.mjs';

function swingProgress(fx, now, durationScale) {
    if (!fx || fx.type !== 'playerSwing') return null;
    const duration = Math.max(1, Number(fx.duration) || 1) * durationScale;
    const age = now - Number(fx.start);
    return Number.isFinite(age) && age >= 0 && age <= duration ? age / duration : null;
}

export function selectSwingEffects(effects, now, durationScale) {
    let latest = null, frame = null, frameProgress = -1;
    const scale = Math.max(1, Math.min(1.6, Number(durationScale) || 1));
    for (let index = effects.length - 1; index >= 0; index--) {
        const fx = effects[index], progress = swingProgress(fx, now, scale);
        if (progress === null) continue;
        if (!latest) latest = fx;
        if (progress <= frameProgress) continue;
        frame = fx;
        frameProgress = progress;
    }
    return { latest, frame };
}

export function recentBattleEffect(effects, type, now, withinMs) {
    for (let index = effects.length - 1; index >= 0; index--) {
        const fx = effects[index];
        if (fx && fx.type === type && now >= fx.start && now - fx.start < withinMs) return fx;
    }
    return null;
}

function activeReturn(effects, type, now) {
    for (let index = (effects || []).length - 1; index >= 0; index--) {
        const fx = effects[index];
        if (!fx || fx.type !== type) continue;
        const duration = Math.max(1, Number(fx.duration) || 720);
        const progress = (Number(now) - Number(fx.start)) / duration;
        if (!Number.isFinite(progress) || progress < 0 || progress > 1) continue;
        return { progress: clampNumber(progress, 0, 1), cell: fx.cell };
    }
    return null;
}

export function returnArrival(effects, now) {
    const active = activeReturn(effects, 'playerReturnWarp', now);
    if (!active) return null;
    const reveal = clampNumber(active.progress / 0.34, 0, 1);
    return {
        progress: active.progress,
        actorAlpha: 1 - Math.pow(1 - reveal, 3),
        whiteShroud: Math.sin(clampNumber(active.progress / 0.62, 0, 1) * Math.PI),
        ringScale: 0.55 + (1 - Math.pow(1 - active.progress, 2)) * 1.25,
        fade: 1 - active.progress,
        cell: active.cell
    };
}

export function returnDeparture(effects, now) {
    const active = activeReturn(effects, 'playerReturnDepart', now);
    if (!active) return null;
    const vanish = clampNumber((active.progress - 0.66) / 0.34, 0, 1);
    return {
        progress: active.progress,
        actorAlpha: 1 - vanish * vanish * (3 - 2 * vanish),
        whiteShroud: Math.sin(active.progress * Math.PI),
        fade: Math.sin(active.progress * Math.PI),
        cell: active.cell
    };
}
