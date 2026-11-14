import { skillGetSkillGridProfile } from './grid-skill-profile.mjs';
import { cellGetGridUnitCells, cellGetClosestGridUnitCell, cellIsGridCellInBounds, cellGetGridUnitFootprint, cellGridCellKey } from './grid-units.mjs';
import { cellGetHeroStepBlockedCells } from './grid-movement.mjs';
import { cellGetGridPlacementTerrain, cellCanPlaceGridFootprint } from './grid-terrain.mjs';
import { GRID_CARDINAL_STEPS } from './combat-grid-values.mjs';
import { effectExpansionStageGrid } from '../domain/skill-effect-expansion.mjs';

/** 그 룬의 띠({rows, reach}): 판정 표의 것이나, 없으면 band가 있는 단계 판정(혹한의 지진의 얼음 기둥)의 것. 옆으로 치지 않으면 rows 0. */
export function skillGetSkillBand(env, skillName, skill) {
    const base = skillGetSkillGridProfile(env, skillName, skill);
    if (base.band) return skillGetGridBandOf(base);
    const stage = ((skill.combatPattern || {}).stages || []).find(row => row.grid && row.grid.band);
    return stage ? skillGetGridBandOf({ ...base, ...effectExpansionStageGrid(stage.grid, skill) }) : { rows: 0, reach: 0 };
}

/** 이번 공격의 칠 쪽(1 오른쪽, -1 왼쪽). 옆으로 치지 않는 룬이면 0. 무대의 주인공이 휘두르는 동안 이 쪽을 본다. */
export function skillGetSkillBandSide(env, skillName, skill) {
    return skillGetSkillBand(env, skillName, skill).rows ? env.memo.gridBandSide : 0;
}

/** 적의 칸 가운데 하나가 띠 안에 있는가. side가 있으면 그 쪽 옆 칸만(바로 위나 아래는 빼고), 없으면 양쪽과 바로 위나 아래. */
export function skillIsGridUnitInBand(env, attacker, unit, band, side) {
    return cellGetGridUnitCells(env, unit).some(cell => {
        const dx = cell.gx - attacker.gx, dy = Math.abs(cell.gy - attacker.gy), ahead = side ? dx * side : Math.abs(dx);
        return dy <= band.rows && ahead <= band.reach && (side ? ahead > 0 : ahead + dy > 0);
    });
}

/** 대상을 고르며 칠 쪽을 정해 둔다: 대상이 선 쪽, 대상이 바로 위나 아래면 띠 안의 적이 더 많은 쪽(같으면 지난번 쪽). */
export function skillNoteGridBandSide(env, skillName, skill, attackerCell, {primaryEnemy, candidates}) {
    const band = skillGetSkillBand(env, skillName, skill);
    if (!band.rows) return;
    const dx = cellGetClosestGridUnitCell(env, attackerCell, primaryEnemy).gx - attackerCell.gx;
    const lead = dx || candidates.reduce((sum, row) => sum + skillIsGridUnitInBand(env, attackerCell, row.enemy, band, 1) - skillIsGridUnitInBand(env, attackerCell, row.enemy, band, -1), 0);
    if (lead) env.memo.gridBandSide = Math.sign(lead);
}

/** 띠의 칸: 칠 쪽으로 0..reach칸, 주인공 줄이 먼저이고 위아래 줄이 뒤다(가장 먼 칸을 고르는 그림이 주인공 줄의 끝을 잡는다). */
export function skillGetGridBandAreaCells(env, profile, attacker, target) {
    const side = skillGetGridBandSide(env, attacker, target), band = skillGetGridBandOf(profile), rows = [0], cells = [];
    for (let dy = 1; dy <= band.rows; dy++) rows.push(-dy, dy);
    for (let d = 0; d <= band.reach; d++) {
        rows.forEach(dy => {
            const gx = attacker.gx + side * d, gy = attacker.gy + dy;
            if ((d || dy) && cellIsGridCellInBounds(env, gx, gy)) cells.push({ gx, gy });
        });
    }
    return cells;
}

/** 그 적이 띠 안에 드는, 걸어서 닿는 가장 가까운 칸(걸음 수로). 붙으러 가면 옆으로 먼저 걸어 줄을 늦게 맞췄다. 이미 띠 안에 섰거나
 * 그런 칸이 없으면 적 자신(예전처럼 붙으러 간다): 막힌 자리를 겨누면 그 앞에서 멈춘 채 치지도 걷지도 못했다. */
export function skillGetGridBandApproachCell(env, hero, enemy, band) {
    if (skillIsGridUnitInBand(env, hero, enemy, band, 0)) return enemy;
    const blocked = cellGetHeroStepBlockedCells(env), terrain = cellGetGridPlacementTerrain(env), footprint = cellGetGridUnitFootprint(env, hero);
    const placement = { env, footprint, terrain };
    const seen = new Set([cellGridCellKey(hero.gx, hero.gy)]), queue = [{ gx: hero.gx, gy: hero.gy }];
    for (let head = 0; head < queue.length; head++) {
        const at = queue[head];
        if (head && skillIsGridUnitInBand(env, at, enemy, band, 0)) return at;
        for (const step of GRID_CARDINAL_STEPS) {
            const gx = at.gx + step.dx, gy = at.gy + step.dy, key = cellGridCellKey(gx, gy);
            if (seen.has(key) || !cellCanPlaceGridFootprint(blocked, gx, gy, placement)) continue;
            seen.add(key);
            queue.push({ gx, gy });
        }
    }
    return enemy;
}

export function skillGetGridBandOf(profile) { return { rows: profile.band || 0, reach: Math.max(1, profile.range || 1) }; }

export function skillGetGridBandSide(env, attacker, target) { return Math.sign(target.gx - attacker.gx) || env.memo.gridBandSide; }
