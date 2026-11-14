/** Saved class/appearance rules. The caller owns passive refunds, rendering and persistence. */
export function createHeroSelectionRules(defs) {
    return Object.freeze({
        definition: id => defs.classes[id] || defs.talents[id] || defs.classes.archer,
        validClass: id => !!defs.classes[id],
        appearance: owner => heroSelectionAppearance(defs, owner),
        normalize: (owner, options) => heroSelectionNormalize(defs, owner, options),
        select: (owner, id, options) => heroSelectionSetClass(defs, owner, id, options),
        cosmetic: (owner, id) => heroSelectionCosmetic(defs, owner, id),
        mode: (owner, value) => heroSelectionMode(defs, owner, value),
        markInitialized: owner => { owner.heroSelectionInitialized = true; },
        initialize: (owner, stats, hpCap) => {
            owner.playerHp = hpCap;
            owner.playerEnergyShield = stats.energyShield;
        }
    });
}

function heroSelectionAppearance(defs, owner) {
    const selected = owner && defs.classes[owner.selectedClassId] ? owner.selectedClassId : 'archer';
    if (!owner?.settings || owner.settings.heroAppearanceMode !== 'fixed') return selected;
    return defs.classes[owner.appearanceClassId] ? owner.appearanceClassId : selected;
}

function heroSelectionNormalize(defs, owner, options = {}) {
    if (!Array.isArray(owner.discoveredClassIds)) owner.discoveredClassIds = [];
    owner.discoveredClassIds = owner.discoveredClassIds.filter(id => defs.classes[id]);
    normalizeIdentity(defs, owner);
    const record = options.recordSelected || owner.heroSelectionInitialized || owner.classFreeSwitchUnlocked;
    if (record && !owner.discoveredClassIds.includes(owner.selectedClassId)) owner.discoveredClassIds.push(owner.selectedClassId);
    const wasUnlocked = !!owner.classFreeSwitchUnlocked;
    if (owner.discoveredClassIds.length >= defs.order.length) owner.classFreeSwitchUnlocked = true;
    return !wasUnlocked && !!owner.classFreeSwitchUnlocked;
}

function normalizeIdentity(defs, owner) {
    if (!defs.classes[owner.selectedClassId]) owner.selectedClassId = 'archer';
    if (!defs.talents[owner.selectedHeroId]) owner.selectedHeroId = 'hero1';
    owner.talentSelectionInitialized = !!owner.talentSelectionInitialized;
    if (owner.appearanceClassId && !defs.classes[owner.appearanceClassId]) owner.appearanceClassId = null;
}

// Called after the existing passive allocation rule has refunded the previous class's start path.
function heroSelectionSetClass(defs, owner, id, options = {}) {
    if (!defs.classes[id]) return false;
    const oldAppearance = heroSelectionAppearance(defs, owner), initialized = !!owner.heroSelectionInitialized;
    owner.selectedClassId = id;
    if (options.alignTalent || !initialized || !owner.talentSelectionInitialized) {
        owner.selectedHeroId = defs.classes[id].recommendedTalentHeroId;
        owner.talentSelectionInitialized = true;
    }
    if (owner.settings.heroAppearanceMode === 'fixed' && (!initialized || !defs.classes[owner.appearanceClassId])) {
        owner.appearanceClassId = initialized ? oldAppearance : id;
    }
    return true;
}

function heroSelectionCosmetic(defs, owner, id) {
    if (!defs.classes[id] || !owner.classFreeSwitchUnlocked || owner.settings.heroAppearanceMode !== 'fixed') return false;
    owner.appearanceClassId = id;
    return true;
}

function heroSelectionMode(defs, owner, value) {
    const next = value === 'fixed' ? 'fixed' : 'loop';
    const previous = owner.settings.heroAppearanceMode === 'fixed' ? 'fixed' : 'loop';
    const oldAppearance = heroSelectionAppearance(defs, owner);
    owner.settings.heroAppearanceMode = next;
    if (next === 'fixed') owner.appearanceClassId = oldAppearance;
    return previous !== next;
}
