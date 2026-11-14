const SPREADS = Object.freeze([
    ['poison', 'regionPoisonSpread', '독 번짐', 'chaos'],
    ['shock', 'regionShockSpread', '감전 번짐', 'light'],
    ['ignite', 'regionIgniteSpread', '불씨 옮김', 'fire']
]);

/** Living targets other than the source, in stable nearest-first order. */
export function regionNearby(env, source, range) {
    return (env.owner.enemies || []).filter(target => target && target.id !== source.id && target.hp > 0)
        .map(target => ({ target, distance: env.deps.getGridUnitDistance(source, target) })).filter(row => row.distance <= range)
        .sort((a, b) => a.distance - b.distance).map(row => row.target);
}

/** Resource damage precedes its visible hit, which precedes normal death handling. */
export function* regionStrike(env, target, pStats, { element, raw, from }) {
    const tier = (env.deps.getZone(env.owner.currentZoneId) || {}).tier || 1;
    const damage = Math.floor(Math.max(1, Math.floor(raw * (1 - env.deps.getEffectiveEnemyMitigation(element, tier, target, pStats) / 100)))
        * env.deps.loopMutation.takenMul(target, element));
    env.deps.applyDamageToEnemyResource(target, damage);
    yield { kind: 'addBattleFx', args: ['hit', { enemyId: target.id, color: env.deps.getElementColor(element), damage, element,
        ...(from ? { stageKind: 'chainJump', chainFromEnemyId: from.id } : {}) }] };
    if (target.hp <= 0) env.deps.handleEnemyDeath(target, pStats);
}

export function* regionChainLightning(env, pStats, enemy, hit) {
    const chance = env.stats.value(pStats, 'regionShockChain');
    if (chance <= 0 || Math.random() * 100 >= chance) return;
    const target = regionNearby(env, enemy, env.rules.chainRange)[0];
    if (target) yield* regionStrike(env, target, pStats, { element: 'light', raw: env.stats.num(hit.damage) * env.rules.chainDamagePct / 100, from: enemy });
}

export function* regionAfterHit(env, pStats, enemy, hit) {
    if (!enemy || !pStats || !pStats.regionAffix) return;
    env.stats.stackChaosShred(pStats, enemy);
    if (env.stats.hasAilment(enemy, 'shock')) yield* regionChainLightning(env, pStats, enemy, hit);
    const move = env.stats.value(pStats, 'regionCritMove');
    if (hit.crit && move > 0) env.owner.regionCritMove = { pct: move, until: env.deps.getCombatTime() + env.rules.critMoveMs };
    const leech = env.stats.hasAilment(enemy, 'poison') ? env.stats.value(pStats, 'regionPoisonedLeech') : 0;
    if (leech > 0 && env.stats.num(hit.damage) > 0)
        env.deps.addPlayerLeechInstance(env.stats.num(hit.damage) * leech / 100, pStats, env.deps.getPlayerHitLeechTarget(pStats));
}

export function* regionSpreadAilment(env, enemy, pStats, [type, id, text, element]) {
    const share = env.stats.value(pStats, id) / 100, row = share > 0 ? env.stats.activeRow(enemy, type) : null;
    const copy = row && env.deps.cloneEnemyAilmentForSpread(row, pStats);
    if (!copy) return;
    copy.power *= share;
    if (copy.sourceHitDamage) copy.sourceHitDamage = Math.floor(copy.sourceHitDamage * share);
    if (copy.ailmentDotScore) copy.ailmentDotScore *= share;
    const targets = regionNearby(env, enemy, env.rules.spreadRange);
    targets.forEach(target => env.deps.mergeEnemyAilment(target, { ...copy }, pStats));
    if (targets.length) yield { kind: 'addBattleFx', args: ['statusText', { enemyId: enemy.id, text,
        color: env.deps.getElementColor(element), duration: 320, dedupeKey: `region-spread-${type}` }] };
}

export function* regionShatter(env, enemy, pStats) {
    const pct = env.stats.value(pStats, 'regionShatter');
    if (pct <= 0 || !env.stats.hasAilment(enemy, 'freeze')) return;
    const raw = Math.floor(env.stats.num(enemy.maxHp) * pct / 100);
    const targets = regionNearby(env, enemy, env.rules.shatterRange);
    for (const target of targets) yield* regionStrike(env, target, pStats, { element: 'cold', raw, from: null });
}

export function* regionOnEnemyDeath(env, enemy, pStats) {
    if (!enemy || !pStats || !pStats.regionAffix) return;
    for (const spread of SPREADS) yield* regionSpreadAilment(env, enemy, pStats, spread);
    yield* regionShatter(env, enemy, pStats);
}
