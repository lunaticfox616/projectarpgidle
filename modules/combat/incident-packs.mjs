import { NEIGHBORS } from '../data/incident-values.mjs';
import { incidentQuiet, incidentRule, incidentWorn, incidentOften, incidentDraw } from '../combat/incident-common.mjs';
import { incidentAddStray } from '../combat/incident-strays.mjs';
import { incidentLullPack } from '../combat/incident-sleep.mjs';
import { incidentMakeCritter } from '../combat/incident-critters.mjs';

/** 금빛 슬라임이 서고 길 잃은 몬스터가 섞이고 잠들어도 되는 무리: 보통 무리. */
export function incidentPlainPack(pack) {
    return pack.stage === null && !pack.encounter && !pack.anchor && !pack.rescue && !pack.alert && !pack.ambush && !pack.treasure
            && pack.eliteIds.length === 0 && pack.waiting.length > 0;
}

/** 무리 곁의 빈 칸(첫 몬스터의 곁부터): 새 지도(map, 아직 지금 탐험이 아니다)에서 걸을 수 있고 그 무리의 방이며 문이 아니고 어느
     * 무리도 서지 않은(taken) 칸. 없으면 null. */
export function incidentBesidePack(env, map, pack, taken) {
    for (const enemy of pack.waiting) for (const [dx, dy] of NEIGHBORS) {
        const cell = { gx: enemy.gx + dx, gy: enemy.gy + dy }, room = env.deps.actExplorationRooms.roomAt(map, cell);
        if (room && room.id === pack.roomId && env.deps.actExplorationMap.walkable(map, cell) && !env.deps.actExplorationRooms.doorAt(map, cell)
                && !taken.has(env.deps.gridCellKey(cell.gx, cell.gy))) return cell;
    }
    return null;
}

/** 지도의 무리를 모두 지은 뒤(js/combat-encounters.js createExplorationPacks, 습격방을 고르기 전): 보통 무리마다 드물게 금빛 수액 슬라임 하나를
     * 곁에 세우고(방 단위 무대에서), 그러지 않은 무리는 드물게 길 잃은 몬스터를 데리고 있거나(addStray) 잠들어 있다(lullPack, 길 잃은
     * 몬스터도 함께 잔다). @returns {object[]} 그 무리 목록 */
export function incidentDressPacks(env, zone, map, packs) {
    if (incidentQuiet(env, zone)) return packs;
    const taken = new Set(packs.flatMap(pack => pack.waiting.flatMap(((...args) => incidentBodyKeys(env, ...args)))));
    for (const pack of packs.filter(incidentPlainPack)) {
        if (map.stage && map.owner && incidentAddCritter(env, zone, map, pack, taken)) continue;
        incidentAddStray(env, zone, pack);
        incidentLullPack(env, pack);
    }
    return packs;
}

/** 몬스터가 차지한 칸들의 열쇠: 발 칸과 몸 크기로, 판의 범위는 보지 않는다(getGridUnitCells는 지금 탐험의 판 크기를 보는데, 지도를
     * 짓는 동안은 기본 9×8 판이라 목록이 비어 슬라임이 다른 몬스터와 같은 칸에 섰다, 2026-10-20 검토). */
export function incidentBodyKeys(env, enemy) {
    const size = env.deps.getGridUnitFootprint(enemy), keys = [];
    for (let dy = 0; dy < size.rows; dy++) for (let dx = 0; dx < size.columns; dx++) keys.push(env.deps.gridCellKey(enemy.gx + dx, enemy.gy + dy));
    return keys;
}

/** 금빛 수액 슬라임 하나를 무리 곁에(수액 냄새 밴 장화를 끼면 chanceMul배 자주). 세웠는지. */
export function incidentAddCritter(env, zone, map, pack, taken) {
    const C = incidentRule(env).critter, lure = incidentWorn(env, 'critterLure'), chance = C.chance * (lure ? lure.chanceMul : 1) * incidentOften(env), key = `${pack.key}:${pack.aliveIds[0]}`;
    const cell = incidentDraw(env, 'critter', key) < chance ? incidentBesidePack(env, map, pack, taken) : null;
    if (!cell) return false;
    const critter = Object.assign(incidentMakeCritter(env, zone, cell, incidentDraw(env, 'rainbow', key) < C.rainbow.chance * incidentOften(env)), { explorationPack: pack.key });
    taken.add(env.deps.gridCellKey(cell.gx, cell.gy));
    pack.waiting.push(critter);
    pack.aliveIds.push(critter.id);
    return true;
}
