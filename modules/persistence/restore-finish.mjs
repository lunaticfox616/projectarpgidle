import { stripBossPatternRuntime } from './saved-woodsman.mjs';
import { stripRemovedGrowthBoard, stripRemovedFlasks, stripRemovedStarWedges, stripRetiredSpores, stripRemovedAuxSystems, normalizeContentProgressionSave } from './saved-retired-systems.mjs';
import { migrateRetiredWoodMonsters, migrateRetiredRealmMonsters } from './saved-monster-identity.mjs';
import { reconcileUniqueEquipmentSave, normalizeStoredEquipmentSave, normalizeEquipmentCraftChoiceSave } from './saved-equipment.mjs';
import { normalizeSavedCombatRuntime } from './saved-combat-runtime.mjs';

export function restoreRetiredSystems(deps, context) {
    // 보물사냥은 삭제된 콘텐츠: 남은 진행·예약 보물은 지급 없이 버리고, 표적이던 적은 표시만 지운다.
    delete context.merged.bountyHunt;
    const explorationPacks = Array.isArray(context.merged.actExploration?.packs) ? context.merged.actExploration.packs : [];
    [context.merged.enemies, ...explorationPacks.map(pack => pack?.waiting)].filter(Array.isArray).flat()
        .forEach(enemy => { if (enemy) { delete enemy.isBountyTarget; delete enemy.bountyId; } });
    [context.merged.enemies, ...explorationPacks.map(pack => pack?.waiting)].filter(Array.isArray).flat().forEach(((...args) => stripBossPatternRuntime(deps, ...args)));
    stripRemovedGrowthBoard(context.merged);
    stripRemovedFlasks(context.merged);
    stripRemovedStarWedges(context.merged);
    stripRetiredSpores(context.merged);
    stripRemovedAuxSystems(deps, context.merged);
    migrateRetiredWoodMonsters(deps, context.merged);
    migrateRetiredRealmMonsters(deps, context.merged);
    // Removed battlefield shrines: discard pending encounters and temporary blessings on every load.
    delete context.merged.shrineState;
    delete context.merged.shrineBuff;
    reconcileUniqueEquipmentSave(deps, context.merged);
    (0, deps.enforcePassiveEquipmentRestrictions)(context.merged);
}

export function finishRestoredSave(deps, context) {
    const normalized = normalizeContentProgressionSave(deps, normalizeSavedCombatRuntime(deps, context.merged), context.save);
    normalizeStoredEquipmentSave(deps, normalized);
    // Escrow identity checks need the migrated exploration loot containers first.
    deps.playerStall.restore(normalized);
    normalized.craftOmen = (0, deps.normalizeCraftOmen)(normalized.craftOmen);
    normalizeEquipmentCraftChoiceSave(deps, normalized);
    return normalized;
}
