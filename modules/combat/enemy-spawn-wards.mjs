

/**
 * Tier-20 defense values of a boss (data/maps.js ENEMY_DEFENSE_TIER20, BOSS_DEFENSE_SPECIALTIES): one or two of physical damage
 * reduction and the fire, cold and lightning resistances reach the specialty value, the rest match an elite. Fixed and
 * other-content bosses use the specialty value for every defense.
 * @returns {{dr:number,resF:number,resC:number,resL:number,resChaos:number}} percent values reached at zone tier 20
 */
export function buildGetBossDefenseTargets(env, zone, ele) {
    const rules = env.deps.BOSS_DEFENSE_SPECIALTIES, values = env.deps.ENEMY_DEFENSE_TIER20;
    const byValues = ({ dr, res }) => ({ dr, resF: res, resC: res, resL: res, resChaos: res });
    const special = byValues(values.bossSpecialty);
    const fixed = zone.loopScaleExempt || Number.isFinite(zone.fixedSeason) || zone.difficultyBenchmark || zone.milestonePinnacle;
    if (fixed || !['act', 'abyss'].includes(zone.type)) return special;
    const seed = env.deps.hashSeed(String(zone.id) + ':boss-guard') >>> 0;
    const first = rules.byElement[ele] || rules.stats[seed % rules.stats.length];
    const rest = rules.stats.filter(stat => stat !== first);
    const second = (seed >>> 8) % 1000 < rules.secondChance * 1000 ? rest[(seed >>> 16) % rest.length] : null;
    const targets = byValues(values.elite);
    [first, second].filter(Boolean).forEach(stat => { targets[stat] = special[stat]; });
    return targets;
}

export function buildGetZoneDefenseVariance(env, zone) {
    let key = String((zone && zone.id) || 'zone');
    let seed = Math.abs(env.deps.hashSeed(key + ':def-var')) % 7;
    return (seed - 3) * 0.02;
}

/** A zone's element ward (the resistance its monsters share), fixed by the zone's id or name; built once per zone (two string hashes
 * for every spawned monster before). */
export function buildGetZoneElementWardProfile(env, zone) {
    if (!zone) return null;
    const cacheKey = zone.type + '|' + zone.id + '|' + zone.name;
    if (env.memory.wards.has(cacheKey)) return env.memory.wards.get(cacheKey);
    if (env.memory.wards.size >= 512) env.memory.wards.clear();
    const profile = buildRollZoneElementWardProfile(env, zone);
    env.memory.wards.set(cacheKey, profile);
    return profile;
}

export function buildRollZoneElementWardProfile(env, zone) {
    let specialBossZone = zone.type === 'outsideChaos'
        || zone.id === 'beehive_run'
        || zone.id === 'grand_breach_run'
        || zone.type === 'meteor'
        || zone.type === 'seasonBoss'
        || zone.type === 'trial';
    if (specialBossZone) return null;
    let key = String(zone.id || zone.name || 'zone');
    let elemList = ['fire', 'cold', 'light'];
    let elem = elemList[Math.abs(env.deps.hashSeed(key + ':elem-ward')) % elemList.length];
    let strength = 6 + (Math.abs(env.deps.hashSeed(key + ':elem-ward-strength')) % 13);
    return { elem: elem, strength: strength };
}
// One bounded, read-only zone-profile cache per application instance.
export function createEnemyWardMemory() { return { wards: new Map() }; }
