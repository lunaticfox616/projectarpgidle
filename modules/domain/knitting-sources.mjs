

export function threadOpen(env, state, row) { return (row.unlocks || []).every(id => env.deps.contentProgression.isUnlocked(id, state)); }

/** 이 지역을 가리키는 고정 키: 'type:<zone.type>', 액트는 'act:<zone.id>', 아틀라스 지도는 'atlas:<atlasRegion>'과 'node:<atlasNode>'. */
export function threadZoneKeys(zone) {
    if (!zone) return [];
    const keys = ['type:' + zone.type];
    if (zone.type === 'act' && Number.isInteger(Number(zone.id))) keys.push('act:' + Number(zone.id));
    if (zone.atlasRegion) keys.push('atlas:' + zone.atlasRegion);
    if (zone.atlasNode !== undefined && zone.atlasNode !== null) keys.push('node:' + zone.atlasNode);
    return keys;
}

export function threadSourceMatches(env, source, zone, enemy) { return Object.entries(env.sourceChecks).every(([key, test]) =>
    source[key] === undefined || test(source[key], zone, enemy)); }

export function threadDropPool(env, state, zone, enemy) {
    return env.deps.KNITTING.list.filter(row => threadOpen(env, state, row) && threadSourceMatches(env, row.source, zone, enemy)
        && !(row.source.once && state.knitting.once.includes(row.id)));
}

/** 처치 등급 확률(KNITTING.chance: 일반·정예·콘텐츠 보스, 액트의 보스는 actBoss). 어느 등급도 확정이 아니며, 나오는 종류는 아래 가치 가중치로 굴린다. */
export function threadKillChance(env, zone, enemy, level) {
    const rank = enemy.isBoss ? 'boss' : enemy.isElite ? 'elite' : 'regular';
    const chance = zone.type === 'act' && enemy.isBoss ? env.deps.KNITTING.chance.actBoss : env.deps.KNITTING.chance[rank];
    return chance * env.deps.levelProgression.rewardMultiplier(zone, enemy, level);
}
