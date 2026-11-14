import { skillGetGridBandAreaCells, skillIsGridUnitInBand, skillGetGridBandOf, skillGetGridBandSide } from './grid-bands.mjs';
import { skillGetGridConeAreaCells, skillIsGridAreaOffset, skillGetGridFanRayEnds, skillGetGridFanRayTips, skillGetGridConeGeometry } from './grid-area-geometry.mjs';
import { cellGetClosestGridUnitCell, cellIsGridCellInBounds, cellGridChebyshevDist, cellGetGridUnitCells } from './grid-units.mjs';
import { cellGridProjectedLineEnd, cellGridLineCells } from './grid-lines.mjs';
import { skillGetSkillGridProfile } from './grid-skill-profile.mjs';

/** 모양이 따로 정해진 범위: 옆으로 치는 띠, 부채꼴 숨결. 아니면 null. */
export function skillGetGridShapedAreaCells(env, profile, attacker, targetCell) {
    if (profile.band) return skillGetGridBandAreaCells(env, profile, attacker, targetCell);
    return profile.kind === 'cone' ? skillGetGridConeAreaCells(env, profile, attacker, targetCell) : null;
}

/** 1차 대상이 될 수 있는 거리: 띠가 있으면 띠 안, 아니면 사거리 안. */
export function skillIsGridPrimaryInReach(env, row, profile, attackerCell) {
    return profile.band ? skillIsGridUnitInBand(env, attackerCell, row.enemy, skillGetGridBandOf(profile), 0) : row.dist <= Math.max(1, profile.range || 1);
}

/**
 * 범위 프로필이 실제로 덮는 칸 목록을 계산한다(chain 제외 — 연쇄는 칸이 아니라 유닛 간 점프).
 * @param {{kind:string, range:number, radius?:number, shape?:string}} profile
 * @param {{gx:number, gy:number}} attacker
 * @param {{gx:number, gy:number}} target 1차 대상 칸
 * @returns {Array<{gx:number, gy:number}>}
 */
export function skillGetGridAttackAreaCells(env, profile, attacker, target) {
    let targetCell = cellGetClosestGridUnitCell(env, attacker, target);
    let shaped = skillGetGridShapedAreaCells(env, profile, attacker, targetCell);
    if (shaped) return shaped;
    let cells = ['nova', 'fan'].includes(profile.kind) ? [] : [{ gx: targetCell.gx, gy: targetCell.gy }];
    let pushArea = (center, radius, excludeSelf, shape) => {
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                let gx = center.gx + dx, gy = center.gy + dy;
                if (excludeSelf && gx === center.gx && gy === center.gy) continue;
                if (!skillIsGridAreaOffset(shape, dx, dy, radius)) continue;
                if (skillIsGridPrimaryAreaCell(profile.kind, targetCell, gx, gy)) continue;
                if (cellIsGridCellInBounds(env, gx, gy)) cells.push({ gx, gy });
            }
        }
    };
    if (profile.kind === 'arc') {
        // 전방 부채꼴: 플레이어와 대상 모두에 인접한 칸까지 휩쓸린다.
        pushArea({ gx: attacker.gx, gy: attacker.gy }, 1, true, 'diamond');
        cells = cells.filter(cell => cellGridChebyshevDist(cell.gx, cell.gy, targetCell.gx, targetCell.gy) <= 1);
    } else if (profile.kind === 'nova') {
        pushArea({ gx: attacker.gx, gy: attacker.gy }, Math.max(1, profile.radius || 1), true, profile.shape);
    } else if (profile.kind === 'blast') {
        if ((profile.radius || 0) > 0) pushArea(targetCell, profile.radius, false, profile.shape);
    } else {
        skillAppendGridAttackRays(env, cells, profile, attacker, targetCell);
    }
    return cells;
}

// The primary cell is already first in every targeted area. A caster-centered nova has no such entry.
function skillIsGridPrimaryAreaCell(kind, targetCell, gx, gy) {
    return kind !== 'nova' && gx === targetCell.gx && gy === targetCell.gy;
}

function skillAppendGridAttackRays(env, cells, profile, attacker, targetCell) {
    if (profile.kind === 'line') {
        let end = cellGridProjectedLineEnd(attacker.gx, attacker.gy, targetCell.gx, targetCell.gy, profile.range || 7);
        cellGridLineCells(env, {ax:attacker.gx, ay:attacker.gy, tx:end.gx, ty:end.gy, maxLen:profile.range || 7}).forEach(cell => cells.push(cell));
    } else if (profile.kind === 'fan') {
        skillGetGridFanRayEnds(attacker, targetCell, profile).forEach(end => {
            cellGridLineCells(env, {ax:attacker.gx, ay:attacker.gy, tx:end.gx, ty:end.gy, maxLen:profile.range}).forEach(cell => cells.push(cell));
        });
    }
}

/** Snapshot potential attack geometry at cast time; rendering never recomputes it from victims.
 * @param {string} skillName
 * @param {(typeof SKILL_DB)[string]} skill Resolved skill, including range modifiers.
 * @param {{targets:Array<{enemy:{gx:number,gy:number}}>,impactCells?:Array<{gx:number,gy:number}>}} stage Nonempty confirmed stage.
 * @param {{gx:number,gy:number}} source Cast-time origin.
 * @returns {{kind:string,cells:Array<{gx:number,gy:number}>,shape:string|undefined,radius:number|undefined,cone:ReturnType<typeof getGridConeGeometry>|null,band:{side:number,rows:number,reach:number}|null,center:{gx:number,gy:number}}}
 */
export function skillGetSkillStageFootprint(env, skillName, skill, stage, source) {
    let primary = stage.aimCell || stage.targets[0].enemy;
    let profile = stage.gridProfile || skillGetSkillGridProfile(env, skillName, skill);
    let cells = stage.impactCells;
    if (!cells) cells = skillGetGridAttackAreaCells(env, profile, source, primary);
    // Melee spill can select additional cells outside the base profile.
    if (['melee', 'arc', 'chain'].includes(profile.kind)) {
        cells = cells.concat(stage.targets.flatMap(entry => cellGetGridUnitCells(env, entry.enemy)));
    }
    return { cells: Array.from(new Map(cells.map(cell => [`${cell.gx},${cell.gy}`, { gx: cell.gx, gy: cell.gy }])).values()),
        kind: profile.kind, shape: profile.shape, radius: profile.radius,
        ...skillGetGridFootprintAim(env, profile, source, cellGetClosestGridUnitCell(env, source, primary)),
        // 부채꼴은 화살마다 끝 칸(그림이 화살 하나씩 그린다: js/canvas-world-tree-fx.js fanRays)
        rays: profile.kind === 'fan' ? skillGetGridFanRayTips(env, source, cellGetClosestGridUnitCell(env, source, primary), profile) : undefined,
        // 중심은 칸 좌표만: 보스 예고에서는 source가 보스 자신이라 { ...source }가 보스 전체(이전 예고 포함)를 겹겹이 복사했다(검토 5차).
        center: profile.kind === 'nova' ? { gx: source.gx, gy: source.gy } : { ...cellGetClosestGridUnitCell(env, source, primary) } };
}

/** 그림이 읽는 겨냥: 부채꼴 숨결의 모양(cone), 옆으로 치는 룬의 칠 쪽과 띠(band: {side, rows, reach}). 옆으로 치는 부채꼴은
 * 칠 쪽으로 곧게 그린다. */
export function skillGetGridFootprintAim(env, profile, source, aim) {
    const band = profile.band ? { side: skillGetGridBandSide(env, source, aim), ...skillGetGridBandOf(profile) } : null;
    const toward = band ? { gx: source.gx + band.side, gy: source.gy } : aim;
    return { band, cone: profile.kind === 'cone' ? skillGetGridConeGeometry(profile, source, toward) : null };
}
