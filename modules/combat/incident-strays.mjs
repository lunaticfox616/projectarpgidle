import { incidentDraw, incidentRule, incidentOften } from '../combat/incident-common.mjs';

/** 무리의 첫 보통 몬스터(액트 그림을 쓰고 무기를 든 뿌리촉수가 아닌)를 다른 액트의 몬스터로: 그 그림과 이름, 테, 그 그림의 싸우는
     * 방식(js/combat-grid.js assignEnemyGridCombatProfile), 경험치 expMul배. */
export function incidentAddStray(env, zone, pack) {
    const key = `${pack.key}:${pack.aliveIds[0]}`;
    const enemy = incidentDraw(env, 'stray', key) < incidentRule(env).stray.chance * incidentOften(env) ? pack.waiting.find(((...args) => incidentStrayable(env, ...args))) : null;
    const look = enemy ? incidentStrayLook(env, zone, key) : null;
    if (look) incidentDressStray(env, enemy, look);
}

export function incidentPlainLook(env, enemy) { const def = env.deps.ACT_MONSTER_VISUAL_BY_ID[enemy.spriteVariantId]; return !!def && !def.weapon && !enemy.monsterVisualId; }

/** 길 잃은 몬스터가 될 수 있는 몬스터: 정예도, 이름표를 단 몬스터(뿌리를 품은 craftOmen)도 아니고 액트 그림을 쓴다. */
export function incidentStrayable(env, enemy) { return !enemy.isElite && !enemy.isBoss && !enemy.craftOmen && incidentPlainLook(env, enemy); }

/** 영웅이 가 본 액트(game.maxZoneId까지)의 몬스터 그림 가운데 이 지역 목록에 없는 것 하나. 없으면(1액트만 가 봤으면) null. */
export function incidentStrayLook(env, zone, key) {
    const here = new Set(env.deps.getActMonsterPool(zone)), reached = Math.min(Math.floor(Number(env.owner.maxZoneId) || 0), env.deps.MAP_ZONES.length - 1);
    const acts = env.deps.MAP_ZONES.slice(0, reached + 1).filter(row => row && row.type === 'act');
    const ids = [...new Set(acts.flatMap(row => env.deps.getActMonsterPool(row)))].filter(id => !here.has(id));
    return ids.length ? env.deps.ACT_MONSTER_VISUAL_BY_ID[ids[Math.floor(incidentDraw(env, 'strayLook', key) * ids.length)]] || null : null;
}

/** 그 몬스터를 길 잃은 몬스터로: 그 그림(look)과 이름 앞에 prefix, 테, 경험치 expMul배, 그 그림의 싸우는 방식. true. */
export function incidentDressStray(env, enemy, look) {
    const S = incidentRule(env).stray;
    Object.assign(enemy, { stray: true, name: `${S.prefix} ${look.name}`, baseMonsterName: look.name, spriteVariantId: look.id, encounterOutline: S.outline,
        expMul: (Number(enemy.expMul) || 1) * S.expMul });
    env.deps.assignEnemyGridCombatProfile(enemy);
    return true;
}
