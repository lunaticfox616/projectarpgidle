

/** 지금 걸린 가호(사역룬, 2026-10-24 스킬룬 추가본 v54): 소환 칸 차례대로 소환 한도(cap) 안에 든 룬 가운데 첫 가호 하나. 가호는 하나만 걸린다.
     * 보유하지 않았거나 지금 무기로 못 쓰는(맨손) 룬은 자리를 차지하지 않는다(js/combat.js getActiveSummonGemDefs와 같은 차례). 없으면 null.
     * cap을 주지 않으면(무대의 발밑 표시) 한도를 보지 않는다. */
export function liveSupportActiveBlessing(env, state, cap = Infinity) {
    let used = 0;
    for (const name of state.equippedSummonSkills || []) {
        const def = liveSupportSummonPlaceOf(env, state, name);
        if (!def) continue;
        if (used >= cap) return null;
        if (def.aura) return name;
        used += liveSupportSummonPlaces(state, name, def);
    }
    return null;
}

/** 소환 칸에 끼운 룬이 자리를 차지하면 그 정의(보유하고 지금 무기로 쓸 수 있는 소환 룬), 아니면 null. */
export function liveSupportSummonPlaceOf(env, state, name) {
    const def = env.deps.SKILL_DB[name];
    return def && (def.tags || []).includes('summon') && state.skills.includes(name) && env.deps.canUseSkillWithCurrentEquipment(name) ? def : null;
}

/** 소환 룬 하나가 차지하는 자리: 공격 소환수는 소환 수만큼, 그 밖에는 하나. */
export function liveSupportSummonPlaces(state, name, def) {
    return def.tags.includes('summon_attack') ? Math.max(1, Math.floor(Number((state.summonSkillCounts || {})[name]) || 1)) : 1;
}

/** 걸린 가호의 탐욕(탐욕의 광기 greed: 처치 드랍률과 맵 줍기, 2026-11-08 전달본 V3.13), 아니면 null. */
export function liveSupportBlessingGreed(env, state) {
    const name = liveSupportActiveBlessing(env, state);
    return (name && env.deps.SKILL_DB[name].greed) || null;
}

export function liveSupportAuraValues(env, state, bonus, cap) {
    const values = {}, name = liveSupportActiveBlessing(env, state, cap), aura = name && env.deps.SKILL_DB[name].aura;
    if (!aura) return values;
    const steps = env.deps.getGemLevelGrowthSteps(liveSupportAuraLevel(env, state, name, bonus(name)));
    if (aura.flatStat) values[aura.flatStat] = aura.flatBase + steps * aura.flatScale;
    for (const row of aura.stats) liveSupportAddAuraStat(values, row, steps);
    return values;
}

export function liveSupportAuraLevel(env, state,name,bonus) {
    return env.deps.getSkillGemLevels(name,env.deps.SKILL_DB[name],env.deps.normalizeGemRecord(state.gemData[name]),{total:bonus}).finalLevel;
}

export function liveSupportAddAuraStat(values,row,steps) { values[row.stat]=(values[row.stat]||0)+row.base+steps*row.scale; }

export function liveSupportAuraFlat(values) { return Object.fromEntries(['phys','fire','cold','light','chaos'].map(ele=>[ele,values[ele+'FlatDmg'] || 0])); }
