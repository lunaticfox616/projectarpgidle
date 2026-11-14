import { GameRuntimeState } from './state/game-state.mjs';
import { CloudAccountState } from './state/cloud-account.mjs';
import { PassiveTreeRuntime } from './state/passive-tree-runtime.mjs';
import { MAX_PLAYER_LEVEL } from './data/player-level-limit.mjs';
import { EquipmentInventoryCapacity } from './domain/equipment-inventory-capacity.mjs';
import { StatText } from './common/stat-text.mjs';
import { snapCanvasRectToDevicePixels, drawCrispCanvasText } from './common/canvas-pixels.mjs';
import { installLegacyPolyfills } from './browser/legacy-polyfills.mjs';
import { LegacyGlobalBridge } from './browser/legacy-global-bridge.mjs';
import { installStartupFallbacks } from './browser/legacy-startup-fallbacks.mjs';
import { dispatchBrowserRuntimeEvent } from './browser/runtime-events.mjs';
import {
    normalizeUiSkin, normalizeUiScale, clampNumber, pixelFontSize, lerpNumber, approachNumber,
    rndChoice, hashSeed, createSeededRng, getAdditiveDropBonusMultiplier
} from './common/numbers.mjs';
import {
    getExceptionalBaseStarCount, getExceptionalBaseStars, getExceptionalBaseStarsHtml,
    COMPARE_STAT_META, formatSupportGemEffectValue, TENTH_STAT_IDS, isTenthStat, WHOLE_ROLL_STAT_IDS,
    formatValue, formatSignedValue, formatPercentMultiplier, getRarityColor, getRarityRank
} from './common/formatting.mjs';
import { dedupeList, getLastBatchim, KOREAN_DIGIT_BATCHIM, speakerShortName, escapeHTML, stripDecorativeEmoji } from './common/text.mjs';
import * as particles from './common/text.mjs';
import {
    TAGGED_DAMAGE_STAT_BY_TAG, createEmptyStatBucket, DIRECT_STAT_BUCKET_KEYS, COMPOSITE_STAT_BUCKET_LINES,
    addStatToBucket, applyStatsToBucket, getTaggedDamageBreakdown
} from './common/stat-bucket.mjs';
import { addPassiveLineToBucket as addPassiveLine } from './common/stat-bucket.mjs';
import { SKILL_TAG_LABELS, createStatDisplayNames } from './common/stat-labels.mjs';
import * as supports from './common/support-gems.mjs';
import { writeHtmlIfChanged, isTextEntryElement } from './common/dom-controls.mjs';

// Temporary compatibility inputs: the common modules never read game or the active locale.
// Retire this entry's aliases with the remaining classic consumers during final composition.
installLegacyPolyfills({
    NodeList: typeof NodeList === 'undefined' ? undefined : NodeList,
    HTMLCollection: typeof HTMLCollection === 'undefined' ? undefined : HTMLCollection
});
const bridge = new LegacyGlobalBridge(window, console);
const safeExposeGlobals = bridge.safeExposeGlobals, exposeFileGlobals = bridge.exposeFileGlobals;
bridge.installPublicApi(globalThis);
const STAT_DISPLAY_NAMES = createStatDisplayNames(WEAPON_CONDITION_STATS, SKILL_RUNE_STANCE_LABELS);
const isTextEntryTarget = target => isTextEntryElement(target, Element);
const pickParticle = (word, consonant, vowel) => particles.pickParticle(word, consonant, vowel, typeof i18n === 'object' ? i18n.language : 'ko');
const withDirectionParticle = word => particles.withDirectionParticle(word, typeof i18n === 'object' ? i18n.language : 'ko');
const withObjectParticle = word => particles.withObjectParticle(word, typeof i18n === 'object' ? i18n.language : 'ko');
const withSubjectParticle = word => particles.withSubjectParticle(word, typeof i18n === 'object' ? i18n.language : 'ko');
const addPassiveLineToBucket = (bucket, id, value, stance) => addPassiveLine(bucket, id, value, stance, WEAPON_CONDITION_STATS);
const isTierlessSupportGem = name => supports.isTierlessSupportGem(name, typeof SUPPORT_GEM_DB !== 'undefined' ? SUPPORT_GEM_DB : undefined);
const getSupportTierCap = name => supports.getSupportTierCap(name, typeof SUPPORT_GEM_DB !== 'undefined' ? SUPPORT_GEM_DB : undefined);
const getSupportResonanceCost = name => supports.getSupportResonanceCost(name, SUPPORT_GEM_DB);
const getSupportResonanceCostAtTier = (name, tier) => supports.getSupportResonanceCostAtTier(name, tier, SUPPORT_GEM_DB);
const getSupportTierLabel = (name, tier) => supports.getSupportTierLabel(name, tier, typeof SUPPORT_GEM_DB !== 'undefined' ? SUPPORT_GEM_DB : undefined);
const getSupportTierMultiplier = (name, tier) => supports.getSupportTierMultiplier(name, tier, typeof SUPPORT_GEM_DB !== 'undefined' ? SUPPORT_GEM_DB : undefined);
const getOwnedSkillGemNames = state => supports.getOwnedSkillGemNames(state || (typeof game !== 'undefined' ? game : {}));
const getOwnedSupportGemNames = state => supports.getOwnedSupportGemNames(state || (typeof game !== 'undefined' ? game : {}));
const hasSkillGemOwned = (name, state) => supports.hasSkillGemOwned(name, state || (typeof game !== 'undefined' ? game : {}));
const hasSupportGemOwned = (name, state) => supports.hasSupportGemOwned(name, state || (typeof game !== 'undefined' ? game : {}));

const existingNames = {
    writeHtmlIfChanged, isTextEntryTarget,
    normalizeUiSkin, normalizeUiScale, clampNumber, pixelFontSize, lerpNumber, approachNumber,
    rndChoice, hashSeed, createSeededRng, getAdditiveDropBonusMultiplier,
    getExceptionalBaseStarCount, getExceptionalBaseStars, getExceptionalBaseStarsHtml,
    COMPARE_STAT_META, formatSupportGemEffectValue, TENTH_STAT_IDS, isTenthStat, WHOLE_ROLL_STAT_IDS,
    formatValue, formatSignedValue, formatPercentMultiplier, getRarityColor, getRarityRank,
    dedupeList, getLastBatchim, KOREAN_DIGIT_BATCHIM, speakerShortName, escapeHTML, stripDecorativeEmoji,
    pickParticle, withDirectionParticle, withObjectParticle, withSubjectParticle,
    TAGGED_DAMAGE_STAT_BY_TAG, createEmptyStatBucket, DIRECT_STAT_BUCKET_KEYS, COMPOSITE_STAT_BUCKET_LINES,
    addStatToBucket, applyStatsToBucket, getTaggedDamageBreakdown, addPassiveLineToBucket,
    SKILL_TAG_LABELS, STAT_DISPLAY_NAMES, isTierlessSupportGem, getSupportTierCap, getSupportResonanceCost,
    getSupportResonanceCostAtTier, getSupportTierLabel, getSupportTierMultiplier,
    getOwnedSkillGemNames, getOwnedSupportGemNames, hasSkillGemOwned, hasSupportGemOwned
};
// The VM loader may supply a distinct window shim; both must resolve the same function/table.
Object.assign(globalThis, existingNames);
safeExposeGlobals(existingNames);

// Retire these aliases with the last classic game consumers. Both aliases always read the same current save.
const presetGame = Object.getOwnPropertyDescriptor(window, 'game');
const state = new GameRuntimeState(presetGame && 'value' in presetGame ? presetGame.value : undefined, () => window.defaultGame);
safeExposeGlobals({ GameState: state, GameModules: window.GameModules || {} });
window.GameModules.state = state;
window.GameModules.cloudAccountState = new CloudAccountState();
const gameDescriptor = { configurable: true, get() { return state.game; }, set(value) { state.game = value; } };
Object.defineProperty(window, 'game', gameDescriptor);
if (globalThis !== window) Object.defineProperty(globalThis, 'game', gameDescriptor);
safeExposeGlobals({ game: state.game });

const inventory = new EquipmentInventoryCapacity({
    get game() { return state.game; },
    get CONTENT_UNLOCK_SERIES_VERSION() { return CONTENT_UNLOCK_SERIES_VERSION; },
    get CONTENT_UNLOCK_CATALOG() { return CONTENT_UNLOCK_CATALOG; },
    get EQUIPMENT_INVENTORY_MAX_PAGES() { return EQUIPMENT_INVENTORY_MAX_PAGES; },
    get EQUIPMENT_INVENTORY_CELLS_PER_PAGE() { return EQUIPMENT_INVENTORY_CELLS_PER_PAGE; },
    get getEquipmentInventoryFootprint() { return typeof getEquipmentInventoryFootprint === 'undefined' ? undefined : getEquipmentInventoryFootprint; },
    get equipmentInventoryGridRuntime() { return typeof equipmentInventoryGridRuntime === 'undefined' ? undefined : equipmentInventoryGridRuntime; }
});
const text = new StatText({
    skillTags: SKILL_TAG_LABELS, statNames: STAT_DISPLAY_NAMES,
    get stats() { return P_STATS; },
    get translate() { return _t; }
});
const passiveTree = new PassiveTreeRuntime();
const treeAccessors = {
    PASSIVE_WORLD_SCALE: { configurable: true, get() { return passiveTree.worldScale; }, set(value) { passiveTree.worldScale = value; } },
    PASSIVE_BOUNDS: { configurable: true, get() { return passiveTree.bounds; }, set(value) { passiveTree.bounds = value; } },
    reachableNodes: { configurable: true, get() { return passiveTree.reachableNodes; }, set(value) { passiveTree.reachableNodes = value; } },
    discoveredPassiveNodes: { configurable: true, get() { return passiveTree.discoveredNodes; }, set(value) { passiveTree.discoveredNodes = value; } },
    previewPassiveNodes: { configurable: true, get() { return passiveTree.previewNodes; }, set(value) { passiveTree.previewNodes = value; } }
};
Object.defineProperties(window, treeAccessors);
if (globalThis !== window) Object.defineProperties(globalThis, treeAccessors);
const utilityNames = {
    safeExposeGlobals, exposeFileGlobals, MAX_PLAYER_LEVEL, snapCanvasRectToDevicePixels, drawCrispCanvasText,
    getEquipmentInventoryPageCount: inventory.getEquipmentInventoryPageCount,
    getInventoryLimit: inventory.getInventoryLimit,
    getInventoryUsedCellCount: inventory.getInventoryUsedCellCount,
    canStoreEquipmentItems: inventory.canStoreEquipmentItems,
    translateSkillTag: text.translateSkillTag, getSkillTagList: text.getSkillTagList,
    getStatName: text.getStatName, makeSourceLine: text.makeSourceLine,
    dispatchRuntimeEvent: (name, detail) => dispatchBrowserRuntimeEvent(window, state.game, name, detail),
    get PASSIVE_WORLD_SCALE() { return passiveTree.worldScale; },
    get PASSIVE_BOUNDS() { return passiveTree.bounds; },
    get reachableNodes() { return passiveTree.reachableNodes; },
    get discoveredPassiveNodes() { return passiveTree.discoveredNodes; },
    get previewPassiveNodes() { return passiveTree.previewNodes; }
};
safeExposeGlobals(utilityNames);
if (globalThis !== window) Object.assign(globalThis, utilityNames);
window.GameModules.passiveTree = passiveTree;
window.GameModules.inventoryCapacity = inventory;
installStartupFallbacks(bridge, {
    get game() { return state.game; },
    get supports() { return typeof SUPPORT_GEM_DB === 'undefined' ? undefined : SUPPORT_GEM_DB; },
    get skills() { return typeof SKILL_DB === 'undefined' ? undefined : SKILL_DB; },
    getSkillTagList: text.getSkillTagList, logger: console
});
