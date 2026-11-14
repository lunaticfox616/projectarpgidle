export function activeSupportTier(name, state, database) {
    const def = database[name];
    if (!def || def.noTiers) return 1;
    const record = (state.supportGemData || {})[name] || {};
    const unlocked = Math.max(1, Math.min(3, Math.floor(Number(record.unlockedTier) || 1)));
    return Math.max(1, Math.min(unlocked, Math.floor(Number(record.activeTier) || unlocked)));
}

function isTierlessSupportGem(name, database) {
    let db = (typeof database !== 'undefined' && database) ? database[name] : null;
    return !!(db && db.noTiers);
}

function getSupportTierCap(name, database) {
    return isTierlessSupportGem(name, database) ? 1 : 3;
}

function getSupportResonanceCost(name, database) {
    let db = database[name] || {};
    if (Array.isArray(db.resonanceCosts) && Number.isFinite(db.resonanceCosts[0])) return Math.max(1, Math.floor(db.resonanceCosts[0]));
    if (Number.isFinite(db.resonanceCost)) return Math.max(1, Math.floor(db.resonanceCost));
    let stat = db.stat || '';
    if (['flatDmg', 'critDmg', 'resPen', 'physIgnore', 'ds'].includes(stat)) return 3;
    if (['aspd', 'crit', 'dotPctDmg', 'elementalPctDmg', 'meleePctDmg', 'projectilePctDmg'].includes(stat)) return 2;
    return 1;
}

function getSupportResonanceCostAtTier(name,tier, database) {
    const base=getSupportResonanceCost(name, database),db=database[name]||{};
    if(Array.isArray(db.resonanceCosts)&&Number.isFinite(db.resonanceCosts[tier-1]))return Math.max(1,Math.floor(db.resonanceCosts[tier-1]));
    if(tier<=1)return base;
    if(tier===2)return Math.max(base+2,Math.floor(base*2.4));
    return Math.max(base+5,Math.floor(base*3.8));
}

function getSupportTierLabel(name, tier, database) {
    if (isTierlessSupportGem(name, database)) return '통합';
    return tier === 3 ? '상급' : (tier === 2 ? '중급' : '하급');
}

function getSupportTierMultiplier(name, tier, database) {
    let db = (typeof database !== 'undefined' && database) ? (database[name] || {}) : {};
    if (isTierlessSupportGem(name, database)) return Number.isFinite(Number(db.tierMul)) ? Number(db.tierMul) : 1;
    tier = Math.max(1, Math.min(3, Math.floor(Number(tier) || 1)));
    return tier === 1 ? 1 : (tier === 2 ? 1.55 : 2.2);
}

function getOwnedSkillGemNames(state) {
    let source = state || {};
    return Array.from(new Set([].concat(
        Array.isArray(source.skills) ? source.skills : [],
        Array.isArray(source.sealedSkills) ? source.sealedSkills : []
    ).filter(name => !!name)));
}

function getOwnedSupportGemNames(state) {
    let source = state || {};
    return Array.from(new Set([].concat(
        Array.isArray(source.supports) ? source.supports : [],
        Array.isArray(source.sealedSupports) ? source.sealedSupports : []
    ).filter(name => !!name)));
}

function hasSkillGemOwned(name, state) {
    return !!name && getOwnedSkillGemNames(state).includes(name);
}

function hasSupportGemOwned(name, state) {
    return !!name && getOwnedSupportGemNames(state).includes(name);
}

export { isTierlessSupportGem, getSupportTierCap, getSupportResonanceCost, getSupportResonanceCostAtTier, getSupportTierLabel, getSupportTierMultiplier, getOwnedSkillGemNames, getOwnedSupportGemNames, hasSkillGemOwned, hasSupportGemOwned };
