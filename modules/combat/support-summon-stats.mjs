

export function liveSummonRuntimeDefs(env, defs, stats) { return env.deps.plans.runtimeDefs(defs, stats, env.owner,
    stats?.passiveKeystoneFlags?.soleMinion ? undefined : env.deps.getSummonRuntimeCap(stats)); }

export function liveSummonAttackPlan(env, summon, targets, stats) { return env.deps.plans.attackPlan(summon, targets, liveSummonLocalStats(env, summon, stats).summonSupportEffects, env.owner); }

export function liveSummonApi(env) { return env.deps.supportRules; }

export function liveSummonSkill(env, summon) {
    const name = summon?.gemName, def = env.deps.SKILL_DB[name];
    if (!def) return { tags: [], supportEffects: { applied: [], damageMultiplier: 1, speedMultiplier: 1 } };
    const tags = def.tags.slice();
    if (env.deps.wispSummons.elements(name)) {
        ['fire', 'cold', 'lightning'].forEach(tag => { const index = tags.indexOf(tag); if (index >= 0) tags.splice(index, 1); });
    }
    return liveSummonApi(env).prepare({ ...def, tags, ele: summon.ele || def.ele });
}

export function liveSummonSummonKey(env, summon) { return `${summon?.gemName || ''}:${summon?.ele || env.deps.SKILL_DB[summon?.gemName]?.ele || ''}`; }

export function liveSummonLocalStats(env, summon, stats) {
    const key = liveSummonSummonKey(env, summon);
    if (stats.summonSupportOwner === key) return stats;
    let byKey = env.locals.get(stats);
    if (!byKey) env.locals.set(stats, byKey = new Map());
    if (!byKey.has(key)) byKey.set(key, liveSummonBuildLocalStats(env, summon, stats, key));
    return byKey.get(key);
}

export function liveSummonBuildLocalStats(env, summon, stats, key) {
    const prepared = liveSummonSkill(env, summon), result = { ...stats, summonSupportOwner: key,
        summonSupportSkill: prepared, summonSupportEffects: prepared.supportEffects, summonSupportApplied: {} };
    Object.entries(stats.summonSupportApplied || {}).forEach(([stat, amount]) => { result[stat] -= amount; });
    // Every local addition is noted in summonSupportApplied, so a local built from another summon's local takes it back out first.
    const add = (target, amount) => {
        result[target] = (result[target] || 0) + amount;
        result.summonSupportApplied[target] = (result.summonSupportApplied[target] || 0) + amount;
    };
    prepared.supportEffects.applied.forEach(name => {
        const def = env.deps.SUPPORT_GEM_DB[name], target = liveSummonApi(env).summonStatMap[def.stat];
        if (!target) return;
        add(target, stats.supportValues?.[name] ?? env.deps.getSupportGemPresentation(name, stats, { total: 0 }, env.deps.getSupportActiveTier).value);
    });
    // 그 소환 룬의 강화(data/gem-core-forge.js): 피해 증가와 속도 증가는 이 소환수의 피해, 공격 속도 증가에 합한다. 증폭은 combat.js가 곱한다.
    const forge = env.deps.gemCoreForge.forSkill(summon && summon.gemName);
    add('summonPctDmg', forge.damageInc);
    add('summonAspd', forge.speedInc);
    return result;
}

export function liveSummonPlayerSupportValue(env, stats, stat) {
    const prepared = liveSummonApi(env).prepare(env.deps.SKILL_DB[env.owner.activeSkill] || env.deps.SKILL_DB['기본 공격']);
    return (env.owner.equippedSupports || []).reduce((sum, name) => {
        const def = env.deps.SUPPORT_GEM_DB[name];
        if (!def || def.stat !== stat || !liveSummonApi(env).matches(name, prepared, 'main')) return sum;
        return sum + (stats.supportValues?.[name] ?? liveSummonApi(env).value(name));
    }, 0);
}

export function liveSummonAilmentStats(env, summon, stats, element) {
    const local = liveSummonLocalStats(env, summon, stats), prepared = local.summonSupportSkill;
    const result = env.deps.getSummonAilmentStats(local, element);
    result.sSkill = { ...prepared, ele: element };
    return result;
}
