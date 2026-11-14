import { tickAddPendingSkillTravelFx } from './skill-travel-effects.mjs';
import { tickBuildRadialBurstVisualRow, tickGroupsSkillTravelOnRay, tickBuildLinearSkillVisualRow } from './skill-travel-paths.mjs';

/** 발마다 제 길로 난다(js/combat-projectile-shots.js). 더 나가는 발이 없으면 전부 한 발이다. */
export function* tickAddPendingSkillTravelFxRows(env, rows, attackContext, now) {
    const shots = new Map();
    (rows || []).filter(Boolean).forEach(row => shots.set(row.shot, (shots.get(row.shot) || []).concat(row)));
    for (const shotRows of shots.values()) yield* tickAddShotTravelFx(env, shotRows, attackContext, now);
}

export function* tickAddShotTravelFx(env, queuedRows, attackContext, now) {
    let firstRow = queuedRows[0];
    if (attackContext.skillName === '빙결 침식') {
        const last = queuedRows[queuedRows.length - 1];
        yield* tickAddPendingSkillTravelFx(env, {
            ...firstRow, options: { ...firstRow.options, attackFootprint: last.options.attackFootprint },
            fieldDurationMs: Math.max(last.at - now + 160, firstRow.at - now + 1000 / Math.max(0.01, firstRow.pStats.aspd))
        }, attackContext, now);
        return;
    }
    if (firstRow.patternKind === 'radialBurst') {
        yield* tickAddPendingSkillTravelFx(env, tickBuildRadialBurstVisualRow(queuedRows, now), attackContext, now);
        return;
    }
    if (!tickGroupsSkillTravelOnRay(firstRow)) {
        for (let i = 0, length = queuedRows.length; i < length; i++) {
            if (i in queuedRows) yield* tickAddPendingSkillTravelFx(env, queuedRows[i], attackContext, now);
        }
        return;
    }
    yield* tickAddPendingSkillTravelFx(env, tickBuildLinearSkillVisualRow(env, queuedRows), attackContext, now);
}
