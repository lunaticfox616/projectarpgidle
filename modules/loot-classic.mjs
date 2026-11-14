import { createLootRules } from './domain/loot-rules.mjs';
import { createCurrencyDropRules } from './domain/loot-currency.mjs';
import { createEquipmentLootPolicy } from './domain/loot-policy.mjs';
import { createEquipmentDropVariants } from './domain/loot-variants.mjs';
import { createLootMoments } from './domain/loot-moments.mjs';

// Existing public names and late item tables only. Remove after the remaining consumers use imports.
// Keep shared instances: the codex key set and currency classifications are constructed once.
const tables = {
    get TALISMAN_WILD_DROPS() { return TALISMAN_WILD_DROPS; },
    get EQUIPMENT_BASE_DROP_CHANCES() { return EQUIPMENT_BASE_DROP_CHANCES; },
    get LABYRINTH_DEEP_FOSSIL() { return LABYRINTH_DEEP_FOSSIL; },
    get LABYRINTH_FOSSIL_DROP_RATE_MULTIPLIER() { return LABYRINTH_FOSSIL_DROP_RATE_MULTIPLIER; },
    get EQUIPMENT_DROUGHT_RULES() { return EQUIPMENT_DROUGHT_RULES; },
    get EQUIPMENT_DROP_RARITY_THRESHOLDS() { return EQUIPMENT_DROP_RARITY_THRESHOLDS; },
    get REALM_BOSS_UNIQUE_DROP_RULES() { return REALM_BOSS_UNIQUE_DROP_RULES; },
    get UNDERWORLD_ORE_DROP_CHANCES() { return UNDERWORLD_ORE_DROP_CHANCES; },
    get UNIQUE_DB() { return UNIQUE_DB; },
    get BASIC_CURRENCY_DROP_CHANCES() { return BASIC_CURRENCY_DROP_CHANCES; },
    get ABYSS_START_ZONE_ID() { return ABYSS_START_ZONE_ID; },
    get MOD_DB() { return MOD_DB; },
    get AFFIX_TAG_LABELS() { return AFFIX_TAG_LABELS; },
    get EQUIPMENT_DROP_SLOTS() { return EQUIPMENT_DROP_SLOTS; },
    get ITEM_RARITY_LABELS() { return ITEM_RARITY_LABELS; },
    get WEAPON_CATEGORIES() { return WEAPON_CATEGORIES; },
    get ITEM_PICKUP_PRESETS() { return ITEM_PICKUP_PRESETS; },
    get BASE_ITEM_DB() { return BASE_ITEM_DB; },
    get EQUIPMENT_DROP_VARIANTS() { return EQUIPMENT_DROP_VARIANTS; },
    get DROPPED_AFFIX_TIER_WEIGHT_FALLOFF() { return DROPPED_AFFIX_TIER_WEIGHT_FALLOFF; },
    get LOOT_OMENS() { return LOOT_OMENS; },
    get SKILL_DB() { return SKILL_DB; }
};
const deps = {
    get canStoreEquipmentItems() { return canStoreEquipmentItems; },
    get normalizeItem() { return normalizeItem; },
    get getAbyssMonsterScales() { return getAbyssMonsterScales; },
    get getContentDropRateMultiplier() { return getContentDropRateMultiplier; },
    get capEndlessContentDropMultiplier() { return capEndlessContentDropMultiplier; },
    get levelProgression() { return levelProgression; },
    get getRealmEquipmentHiddenTierCap() { return getRealmEquipmentHiddenTierCap; },
    get uniqueDropsInZone() { return uniqueDropsInZone; },
    get generateUniqueItem() { return generateUniqueItem; },
    get rndChoice() { return rndChoice; },
    get getZone() { return getZone; },
    get getAbyssDepthFromZoneId() { return getAbyssDepthFromZoneId; },
    get getStatName() { return getStatName; },
    get getZoneEquipmentTierCap() { return getZoneEquipmentTierCap; },
    get getAffixTags() { return getAffixTags; },
    get getUniqueCodexKeyByItem() { return getUniqueCodexKeyByItem; },
    get getEquipmentLoadoutOwnedItems() { return getEquipmentLoadoutOwnedItems; },
    get getAffixTierRange() { return getAffixTierRange; },
    get getDroppedAffixTierRange() { return getDroppedAffixTierRange; },
    get createItemFromBase() { return createItemFromBase; },
    get lootOmens() { return lootOmens; },
    get getCanonicalCurrencyKey() { return getCanonicalCurrencyKey; },
    get isChaseUniqueItem() { return isChaseUniqueItem; },
    random: () => Math.random(),
    nextItemId: () => ++window.GameModules.state.session.itemIdCounter,
    isUnlocked: (key, state) => contentProgression.isUnlocked(key, state),
    canDropCurrency: (key, state) => contentProgression.canDropCurrency(key, state),
    get coreItems() { return coreItems; },
    get defaults() { return defaultGame; },
    get i18n() { return i18n; },
    get memoryLeaves() { return memoryLeaves; },
    translate: (...args) => _t(...args),
    emberDrops: enemy => typeof emberCorruption === 'object' ? emberCorruption.killDrops(enemy) : [],
    sapDrops: enemy => typeof sapCatalysts === 'object' ? sapCatalysts.killDrops(enemy) : [],
    oilDrops: enemy => typeof gardenOils === 'object' ? gardenOils.killDrops(enemy) : []
};
const rules = createLootRules(tables, deps), currencies = createCurrencyDropRules(tables, deps, rules);
window.GameModules.lootRules = rules;
const policy = createEquipmentLootPolicy(tables, deps), variants = createEquipmentDropVariants(tables, deps);
window.GameModules.equipmentLootPolicy = policy;
const moments = createLootMoments(tables, deps, policy);
const equipmentLootPolicy = Object.freeze({
    ...Object.fromEntries(['statOptions','tagOptions','ruleKey','normalizeTargets','normalizeSettings','pickupPreset','lineMatchesRule','collectHighlights']
        .map(name => [name, policy[name].bind(policy)])),
    matches: (item, state = game) => policy.matches(item, state),
    highlight: (item, state = game) => policy.highlight(item, state)
});
const equipmentDropVariants = Object.freeze({
    expand: (item, options = {}) => {
        const result = variants.expand(game, item, options);
        if (result.kind) dispatchRuntimeEvent('equipment-drop-variant', result);
        return result;
    }
});
const lootMoments = Object.freeze({
    ...Object.fromEntries(['ofCurrency','ofItem','rank','higher','fineLines'].map(name => [name, moments[name].bind(moments)])),
    ofReceipt: receipt => moments.ofReceipt(game, receipt),
    isNewUnique: (item, state = game) => moments.isNewUnique(item, state)
});
safeExposeGlobals({
    UNIQUE_CODEX_KEYS: rules.codexKeys,
    getUniqueCodexProgress: () => rules.getUniqueCodexProgress(game),
    getCodexBonusPctFromCount: rules.getCodexBonusPctFromCount.bind(rules),
    getCodexBonusPct: () => rules.getCodexBonusPct(game),
    getLabyrinthFossilDropChances: rules.getLabyrinthFossilDropChances.bind(rules),
    getEnemyLootDropMultiplier: (zone, enemy) => rules.getEnemyLootDropMultiplier(game, zone, enemy),
    getEquipmentDropChances: (zone, enemy) => rules.getEquipmentDropChances(game, zone, enemy),
    rollEquipmentDrop: (zone, enemy, chance) => rules.rollEquipmentDrop(game, zone, enemy, chance),
    getEquipmentDropRarity: rules.getEquipmentDropRarity.bind(rules),
    generateRealmBossUniqueDrop: (zone, enemy) => rules.generateRealmBossUniqueDrop(game, zone, enemy),
    getMappingTicketDrops: (enemy, zone, opened) => rules.getMappingTicketDrops(game, enemy, zone, opened),
    getUnderworldResourceDropChances: rules.getUnderworldResourceDropChances.bind(rules),
    getCurrencyDrops: enemy => currencies.getCurrencyDrops(game, enemy),
    equipmentLootPolicy, equipmentDropVariants, lootMoments
});
