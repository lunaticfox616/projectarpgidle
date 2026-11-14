import { clampFiniteNumber } from './saved-number.mjs';
import { migrate } from './saved-support-runes.mjs';
import { dropRetiredSupportGems } from './saved-gems.mjs';
import { migratePassiveSaveNodeReferences } from './saved-passive-nodes.mjs';
import { normalizeSavedCurrencies } from './saved-combat-values.mjs';
import { markLegacyEquipmentGrace, normalizeCarriedEquipmentSave } from './saved-equipment.mjs';

export function restoreInitialSnapshot(deps, context) {
    captureSavedLayout(deps, context);
    mergeSavedDefaults(deps, context);
}

export function restoreRuneAndCurrencyMigrations(deps, context) {
    context.supportRuneMigration = migrate(deps, context.merged, context.save);
    dropRetiredSupportGems(deps, context.merged);
    // Fields of removed systems (lastSkillHitElement: the old skill playback, 2026-10-18).
    ['hideout', 'abyssPassivePoints', 'abyssPassives', 'lastSkillHitElement'].forEach(key => delete context.merged[key]);
    delete context.merged.unlocks.hideout;
    delete context.merged.noti.hideout;
    migratePassiveSaveNodeReferences(deps, context.merged);
    deps.legacySummons.migrateLegacySummonGemSave(context.merged);
    (0, deps.dropRuntimeOnlySaveFields)(context.merged);
    normalizeSavedCurrencies(context.merged.currencies);
    Object.entries(typeof deps.CURRENCY_LEGACY_MERGE === 'object' ? deps.CURRENCY_LEGACY_MERGE : {}).forEach(([currentKey, legacyKeys]) => {
        let legacyAmount = (legacyKeys || []).reduce((sum, legacyKey) => sum + Math.max(0, Math.floor(Number(context.merged.currencies[legacyKey]) || 0)), 0);
        context.merged.currencies[currentKey] = Math.max(0, Math.floor(Number(context.merged.currencies[currentKey]) || 0)) + legacyAmount;
        (legacyKeys || []).forEach(legacyKey => delete context.merged.currencies[legacyKey]);
        (legacyKeys || []).forEach(legacyKey => Object.defineProperty(context.merged.currencies, legacyKey, {
            configurable: true,
            enumerable: false,
            get() { return this[currentKey] || 0; },
            set(value) { this[currentKey] = Math.max(0, Math.floor(Number(value) || 0)); }
        }));
    });
    // Removed contracts must not survive in legacy saves or later serialization.
    delete context.merged.challengeContract;
    delete context.merged.activeChallengeContract;
    const legacyHiveTrace = Math.max(0, Math.floor(Number(context.merged.currencies.hiveTrace) || 0));
    if (legacyHiveTrace > 0) {
        context.merged.currencies.colonyTrace = Math.max(0, Math.floor(Number(context.merged.currencies.colonyTrace) || 0)) + legacyHiveTrace;
    }
    delete context.merged.currencies.hiveTrace;
}

export function restoreSavedMetadata(deps, context) {
    context.merged.cosmosAtlas = (context.merged.cosmosAtlas && typeof context.merged.cosmosAtlas === 'object') ? { ...context.merged.cosmosAtlas } : {};
    delete context.merged.cosmosAtlas.starDust;
    context.merged.saveMeta.lastCloudUploadProfile = (0, deps.normalizeCloudUploadProfile)(context.merged.saveMeta.lastCloudUploadProfile);
    context.merged.saveMeta.cloudUserId = typeof context.merged.saveMeta.cloudUserId === 'string' && context.merged.saveMeta.cloudUserId.trim()
        ? context.merged.saveMeta.cloudUserId
        : null;
    context.merged.ocean = (0, deps.mergeOceanState)(context.save && context.save.ocean);
    if (typeof deps.syncPermanentTalentTabUnlock === 'function') (0, deps.syncPermanentTalentTabUnlock)(context.merged);
    if (!context.save.currencies && context.save.materials) {
        context.merged.currencies.magicBud += Math.floor(context.save.materials / 2) + Math.floor(context.save.materials / 4);
        context.merged.currencies.formlessDew += Math.floor(context.save.materials / 10);
    }
}

export function restoreCarriedEquipment(deps, context) {
    let normalizedEquipment = Object.fromEntries(Object.keys(deps.defaultGame.equipment)
        .map(slot => [slot, context.merged.equipment[slot] || null]));
    if (context.save && context.save.equipment && context.save.equipment['장갑'] && !context.save.equipment['장갑1'] && !context.save.equipment['장갑2']) {
        normalizedEquipment['장갑1'] = context.save.equipment['장갑'];
    }
    context.merged.equipment = normalizedEquipment;
    markLegacyEquipmentGrace(context.merged.equipment);
    if (deps.window.equipmentLoadoutRuntime) deps.window.equipmentLoadoutRuntime.ensureState(context.merged);
    normalizeCarriedEquipmentSave(deps, context.merged);
    if (typeof deps.equipmentInventoryGridRuntime !== 'undefined') deps.equipmentInventoryGridRuntime.ensureState(context.merged);
}

export function restoreGemRecords(deps, context) {
    context.merged.gemData = (context.merged.gemData && typeof context.merged.gemData === 'object') ? context.merged.gemData : {};
    context.merged.gemData['기본 공격'] = (0, deps.normalizeGemRecord)(context.merged.gemData['기본 공격']);
    Object.keys(context.merged.gemData).forEach(name => context.merged.gemData[name] = (0, deps.normalizeGemRecord)(context.merged.gemData[name]));
    context.merged.runeSpares = Object.fromEntries(Object.entries(context.merged.runeSpares && typeof context.merged.runeSpares === 'object' ? context.merged.runeSpares : {})
        .filter(([name, count]) => deps.SKILL_DB[name]?.isGem && Number.isInteger(count) && count > 0));
    context.merged.supportGemData = (context.merged.supportGemData && typeof context.merged.supportGemData === 'object') ? context.merged.supportGemData : {};
    Object.keys(context.merged.supportGemData).forEach(name => context.merged.supportGemData[name] = (0, deps.normalizeGemRecord)(context.merged.supportGemData[name]));
}

export function restoreLegacyZoneIds(deps, context) {
    if ((context.save.saveVersion || 0) < 9) {
        context.merged.passives = [];
        context.merged.discoveredPassives = [(0, deps.getPassiveTreeRootNodeId)(context.merged)];
    }
    if ((context.save.saveVersion || 0) < 13) {
        movePreAbyssZoneIds(deps, context);
    } else if ((context.save.saveVersion || 0) < 14) {
        removeRetiredAbyssZoneId(context);
    } else if ((context.save.saveVersion || 0) < 15) {
        removeRetiredActZoneId(context);
    }
}

function movePreAbyssZoneIds(deps, context) {
    if (typeof context.merged.currentZoneId === 'number' && context.merged.currentZoneId >= 10) context.merged.currentZoneId += (deps.ABYSS_START_ZONE_ID - 10);
    if (typeof context.merged.maxZoneId === 'number' && context.merged.maxZoneId >= 10) context.merged.maxZoneId += (deps.ABYSS_START_ZONE_ID - 10);
}

function removeRetiredAbyssZoneId(context) {
    if (typeof context.merged.currentZoneId === 'number' && context.merged.currentZoneId >= 11) context.merged.currentZoneId -= 1;
    if (typeof context.merged.maxZoneId === 'number' && context.merged.maxZoneId >= 11) context.merged.maxZoneId -= 1;
}

function removeRetiredActZoneId(context) {
    if (typeof context.merged.currentZoneId === 'number' && context.merged.currentZoneId >= 5) context.merged.currentZoneId -= 1;
    if (typeof context.merged.maxZoneId === 'number' && context.merged.maxZoneId >= 5) context.merged.maxZoneId -= 1;
}

function captureSavedLayout(deps, context) {
    if (context.save && typeof context.save === 'object') deps.itemSaveSlim.expandTree(context.save);
    context.savedHeroAppearanceMode = context.save && context.save.settings && context.save.settings.heroAppearanceMode;
    let savedColony = (context.save && context.save.colony && typeof context.save.colony === 'object') ? context.save.colony : null;
    context.savedColonyHadWardSlotVersion = !!(savedColony && Object.prototype.hasOwnProperty.call(savedColony, 'wardSlotVersion'));
}

function mergeSavedDefaults(deps, context) {
    context.merged = {
        ...JSON.parse(JSON.stringify(deps.defaultGame)),
        ...context.save,
        actExploration: context.save.actExploration == null ? null : JSON.parse(JSON.stringify(context.save.actExploration)),
        equipmentDropProgress: clampFiniteNumber(context.save.equipmentDropProgress, 0, 0, deps.EQUIPMENT_DROUGHT_RULES.threshold - 0.5),
        settings: { ...deps.defaultGame.settings, ...(context.save.settings || {}) },
        unlocks: { ...deps.defaultGame.unlocks, ...(context.save.unlocks || {}) },
        noti: { ...deps.defaultGame.noti, ...(context.save.noti || {}) },
        currencies: { ...deps.defaultGame.currencies, ...(context.save.currencies || {}) },
        equipment: { ...deps.defaultGame.equipment, ...(context.save.equipment || {}) },
        saveMeta: { ...deps.defaultGame.saveMeta, ...(context.save.saveMeta || {}) }
    };
}
