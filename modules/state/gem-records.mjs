// Save-boundary normalization. Preserve old boss/sky upgrades and clamp corrupt numeric fields.
function normalizeGemCoreFailures(value, level, rules) {
    const most = Math.ceil(rules.pityMaxOfBase / rules.pityStepOfBase);
    return level === rules.maxLevel || !Number.isFinite(value) ? 0 : Math.min(most, Math.max(0, Math.floor(value)));
}

function normalizeRuneEnhanceLevel(raw, rules) {
    const old = key => (Number.isFinite(raw[key]) ? Math.min(5, Math.max(0, Math.floor(raw[key]))) : 0);
    const level = Number.isFinite(raw.enhanceLevel) ? Math.floor(raw.enhanceLevel) : old('bossCoreLevel') + old('skyCoreLevel');
    return Math.min(rules.maxLevel, Math.max(0, level));
}

export function normalizeGemRecord(raw, rules) {
    if (!raw || typeof raw !== 'object') return { level: 1, exp: 0, enhanceLevel: 0, enhanceFailures: 0, skyEnhanceCap: 1, unlockedTier: 1, activeTier: 1, quality: 0, awakened: false };
    let level = Number.isFinite(raw.level) ? Math.max(1, Math.floor(raw.level)) : 1;
    let exp = Number.isFinite(raw.exp) ? Math.max(0, raw.exp) : 0;
    const enhanceLevel = normalizeRuneEnhanceLevel(raw, rules);
    const enhanceFailures = normalizeGemCoreFailures(raw.enhanceFailures, enhanceLevel, rules);
    let skyEnhanceCap = Number.isFinite(raw.skyEnhanceCap) ? Math.min(5, Math.max(1, Math.floor(raw.skyEnhanceCap))) : 1;
    let unlockedTier = Number.isFinite(raw.unlockedTier) ? Math.max(1, Math.min(3, Math.floor(raw.unlockedTier))) : 1;
    let activeTier = Number.isFinite(raw.activeTier) ? Math.max(1, Math.min(unlockedTier, Math.floor(raw.activeTier))) : 1;
    let quality = Number.isFinite(raw.quality) ? Math.max(0, Math.min(20, Math.floor(raw.quality))) : 0;
    let awakened = !!raw.awakened;
    return { level: level, exp: exp, enhanceLevel, enhanceFailures, skyEnhanceCap: skyEnhanceCap, unlockedTier: unlockedTier, activeTier: activeTier, quality: quality, awakened: awakened };
}
