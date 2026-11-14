import { skillGetSkillGridProfile } from './grid-skill-profile.mjs';
import { cellGetClosestGridUnitCell, cellGridCellKey, cellGetGridUnitCells } from './grid-units.mjs';
import { cellGetGridUnitStepSec } from './grid-movement.mjs';
import { linearStepLag } from '../common/step-interpolation.mjs';

/** 대지의 함성 · 서리바람 내지르기: the wave hurts where its drawn ring touches a monster, in the order it spreads (js/combat.js
 * pickWaveFrontTargets). The ring grows one cell per msPerCell up to reach; the stages, every half cell, are only the moments it is
 * checked. One wave strikes a monster once (shared state). The hits used to be fixed on the cells the targets stood on at the cast,
 * so a monster that stepped to another cell inside the burst right after the cast was missed as if it had dodged (2026-10-02).
 * @param {{attacker:object, primary:object, impactCells:Array<{gx:number,gy:number}>}} area */
export function skillBuildRadialBurstHitSequence(env, skillName, skill, targets, area) {
    if (!area.attacker || !area.primary) return null;
    let gridProfile = skillGetSkillGridProfile(env, skillName, skill), { center, reach, cells } = skillGetRadialWaveShape(env, gridProfile, area);
    let msPerCell = Math.max(50, Math.floor(Number(skill.combatPattern.waveMsPerCell) || 90)), waveDurationMs = Math.round(reach * msPerCell);
    let wave = { center, shape: gridProfile.shape, reach, msPerCell, struck: [], checkedAt: null, cells,
        limit: Math.max(1, Number(skill.targets) || targets.length), mults: Object.fromEntries(targets.map(entry => [entry.enemy.id, entry.mult])) };
    let checks = Array.from({ length: Math.round(reach * 2) + 1 }, (_, step) => step / 2);
    return checks.map((front, index) => ({
        kind: 'radialBurstWave', label: `서리 파동 ${index + 1}단계`, delayMs: Math.round(front * msPerCell), damageMultiplier: 1,
        singleRepeat: true, aimCell: center, waveDurationMs, targets, wave, impactCells: area.impactCells
    }));
}

/** Where a round wave starts, how far it spreads (cells) and, for a cone, the only cells it strikes (null: everything it reaches).
 * 자신 중심(nova)과 원뿔(cone: 서리바람 내지르기)은 시전자에서 퍼지고, 그 밖은 겨눈 대상에서 퍼진다. 둥근 파동의 거리는 반지름이다
 * (원은 그려지는 고리처럼 반 칸 더). 원뿔 파동은 시전 때 대상을 고른 칸(지금은 옆으로 치는 띠, getGridBandAreaCells) 안만 치고 그 가장 먼
 * 칸까지 퍼진다: 원뿔 길이만큼
 * 시전자 둘레를 모두 치면서 원뿔의 먼 귀퉁이(앞 네 칸, 옆 세 줄)는 닿지 않아, 그곳의 몬스터를 고른 주인공이 맞히지 못한 채 거듭
 * 휘둘렀다(2026-10-17 사용자 "범위 안에 몬스터가 없는데 계속 공격함").
 * @returns {{center:{gx:number,gy:number}, reach:number, cells:?Set<string>}} */
export function skillGetRadialWaveShape(env, gridProfile, area) {
    const fromCaster = gridProfile.kind === 'nova' || gridProfile.kind === 'cone';
    const center = fromCaster ? { ...area.attacker } : cellGetClosestGridUnitCell(env, area.attacker, area.primary);
    if (gridProfile.kind === 'cone') {
        const cells = area.impactCells || [];
        return { center, cells: new Set(cells.map(cell => cellGridCellKey(cell.gx, cell.gy))),
            reach: Math.max(1, ...cells.map(cell => Math.hypot(cell.gx - center.gx, cell.gy - center.gy))) };
    }
    const radius = Math.max(1, Number(gridProfile.radius) || 1);
    return { center, cells: null, reach: gridProfile.shape === 'circle' ? radius + 0.5 : radius };
}

/** How far the drawn unit still trails its cell at time t (combat ms): the renderer glides it from the cell it left
 * (js/canvas-battlefield.js approachNumber at COMBAT_GRID_CONFIG.enemyGlideRate), so just after a step it stands between the two. */
export function skillGetGridUnitDrawnDelta(env, unit, t) {
    const from = unit.gridStepFrom, at = Number(unit.gridStepAt);
    if (!from || !Number.isFinite(at)) return { dx: 0, dy: 0 };
    // The entry selects the existing stage/headless motion model. Hit rules never call a renderer.
    const lag = env.deps.gridMotion === 'linear'
        ? linearStepLag(t - at, cellGetGridUnitStepSec(env, unit) * 1000)
        : Math.exp(-env.deps.COMBAT_GRID_CONFIG.enemyGlideRate * Math.max(0, t - at) / 1000);
    return { dx: (from.gx - unit.gx) * lag, dy: (from.gy - unit.gy) * lag };
}

/** The wave's distance to the drawn unit at time t, in the drawn ring's metric (circle or diamond), to its nearest cell. */
export function skillGetGridWaveDrawnDistance(env, wave, unit, t) {
    const delta = skillGetGridUnitDrawnDelta(env, unit, t);
    return Math.min(...cellGetGridUnitCells(env, unit).map(cell => {
        const x = cell.gx + delta.dx - wave.center.gx, y = cell.gy + delta.dy - wave.center.gy;
        return wave.shape === 'diamond' ? Math.abs(x) + Math.abs(y) : Math.hypot(x, y);
    }));
}
