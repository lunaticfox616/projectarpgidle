export function isSummonAttackSkillGem(runtime, name) {
    let gemDef = runtime.deps.SKILL_DB[name] || {};
    return !!(gemDef && Array.isArray(gemDef.tags) && gemDef.tags.includes('summon'));
}

export function normalizeEquippedSummonAttackSkills(runtime) {
    runtime.deps.game.equippedSummonSkills = Array.isArray(runtime.deps.game.equippedSummonSkills) ? runtime.deps.game.equippedSummonSkills : [];
    runtime.deps.game.summonSkillCounts = (runtime.deps.game.summonSkillCounts && typeof runtime.deps.game.summonSkillCounts === 'object') ? runtime.deps.game.summonSkillCounts : {};
    let owned = Array.isArray(runtime.deps.game.skills) ? runtime.deps.game.skills : [];
    runtime.deps.game.equippedSummonSkills = Array.from(new Set(runtime.deps.game.equippedSummonSkills.filter(gemName => isSummonAttackSkillGem(runtime, gemName) && owned.includes(gemName))));
    // 가호(사역룬)는 하나만 걸린다: 전령 둘이 가호 둘로 이관된 저장은 첫 가호만 끼운 채로 둔다(나머지는 보유로 남는다)
    let blessing = runtime.deps.game.equippedSummonSkills.find(gemName => runtime.deps.SKILL_DB[gemName].aura);
    runtime.deps.game.equippedSummonSkills = runtime.deps.game.equippedSummonSkills.filter(gemName => !runtime.deps.SKILL_DB[gemName].aura || gemName === blessing);
    Object.keys(runtime.deps.game.summonSkillCounts).forEach(gemName => {
        if (!runtime.deps.game.equippedSummonSkills.includes(gemName)) delete runtime.deps.game.summonSkillCounts[gemName];
    });
    runtime.deps.game.equippedSummonSkills.forEach(gemName => {
        let count = Math.max(1, Math.floor(Number(runtime.deps.game.summonSkillCounts[gemName]) || 1));
        runtime.deps.game.summonSkillCounts[gemName] = runtime.deps.SKILL_DB[gemName].tags.includes('summon_attack') ? count : 1;
    });
    return runtime.deps.game.equippedSummonSkills;
}

export function getSummonSkillCount(runtime, name) {
    normalizeEquippedSummonAttackSkills(runtime);
    return Math.max(0, Math.floor(Number((runtime.deps.game.summonSkillCounts || {})[name]) || 0));
}

export function getEquippedSummonAttackCount(runtime) {
    return normalizeEquippedSummonAttackSkills(runtime).reduce((sum, name) => sum + getSummonSkillCount(runtime, name), 0);
}

export function getEquippedSummonCount(runtime) {
    return getEquippedSummonAttackCount(runtime);
}

export function getSummonEquipCapFromStats(runtime, stats) {
    let maximum = typeof runtime.deps.getSummonCapMaximum === 'function'
        ? (0, runtime.deps.getSummonCapMaximum)()
        : (typeof runtime.deps.hasKeystone === 'function' && (0, runtime.deps.hasKeystone)('sb9') ? 12 : 8);
    return Math.max(1, Math.min(maximum, Math.floor((stats && stats.summonCap) || 1)));
}

/** 가호(사역룬)는 하나만 걸린다(2026-10-24 스킬룬 추가본 v54 "가호는 하나만(새로 쓰면 바뀜)"): name이 가호면 끼워져 있는 다른 가호, 아니면 null. */
export function getOtherWornBlessing(runtime, name) {
    if (!runtime.deps.SKILL_DB[name].aura) return null;
    return runtime.deps.game.equippedSummonSkills.find(gemName => gemName !== name && runtime.deps.SKILL_DB[gemName]?.aura) || null;
}

export function getSupportTierResonanceCost(runtime, name) {
    return (0, runtime.deps.getSupportResonanceCostAtTier)(name,getSupportActiveTier(runtime, name));
}

export function getSupportActiveTier(runtime, name) {
    let rec = (0, runtime.deps.normalizeGemRecord)(((runtime.deps.game.supportGemData || {})[name]) || { level: 1, exp: 0 });
    let cap = typeof runtime.deps.getSupportTierCap === 'function' ? (0, runtime.deps.getSupportTierCap)(name) : 3;
    let unlocked = Math.max(1, Math.min(cap, Math.floor(rec.unlockedTier || 1)));
    let active = Math.max(1, Math.min(unlocked, Math.floor(rec.activeTier || 1)));
    rec.unlockedTier = unlocked;
    rec.activeTier = active;
    runtime.deps.game.supportGemData = runtime.deps.game.supportGemData || {};
    runtime.deps.game.supportGemData[name] = rec;
    return active;
}

export function prepareSupportTierChange(runtime, name, tier) {
    let rec = (0, runtime.deps.normalizeGemRecord)(((runtime.deps.game.supportGemData || {})[name]) || { level: 1, exp: 0 });
    let cap = typeof runtime.deps.getSupportTierCap === 'function' ? (0, runtime.deps.getSupportTierCap)(name) : 3;
    rec.unlockedTier = Math.max(1, Math.min(cap, Math.floor(rec.unlockedTier || 1)));
    let nextTier = Math.max(1, Math.min(rec.unlockedTier, Math.floor(tier || 1)));
    let prevTier = Math.max(1, Math.min(rec.unlockedTier, Math.floor(rec.activeTier || 1)));
    let equipped = (runtime.deps.game.equippedSupports || []).includes(name);
    return { rec, nextTier, prevTier, equipped };
}
