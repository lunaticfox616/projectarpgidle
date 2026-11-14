import { createEquipmentTriage } from './domain/equipment-triage.mjs';
import { createEquipmentTriageUi } from './ui/equipment-triage.mjs';

const analysis = createEquipmentTriage({
    get bagItems() { return bagItems; },
    get calculatePlayerEhpProfile() { return typeof calculatePlayerEhpProfile === 'function' ? calculatePlayerEhpProfile : undefined; },
    get getEquipCandidateSlots() { return typeof getEquipCandidateSlots === 'function' ? getEquipCandidateSlots : undefined; },
    get getPersistentBuildSignature() { return getPersistentBuildSignature; },
    get takeFreshGearIds() { return takeFreshGearIds; },
    readStats: owner => combatEquipmentStats.read(false, owner)
});
const equipmentTriage = createEquipmentTriageUi(analysis, {
    getOwner: () => game,
    get document() { return document; }, get i18n() { return i18n; },
    get _t() { return _t; }, get Date() { return Date; }, get performance() { return performance; }, get console() { return console; },
    get setTimeout() { return setTimeout.bind(globalThis); },
    get clearTimeout() { return clearTimeout.bind(globalThis); },
    get getCombatTime() { return getCombatTime; },
    get getInventoryLimit() { return typeof getInventoryLimit === 'function' ? getInventoryLimit : undefined; },
    get getInventoryUsedCellCount() { return typeof getInventoryUsedCellCount === 'function' ? getInventoryUsedCellCount : undefined; },
    get countFillableEmptySlots() { return countFillableEmptySlots; },
    get updateStaticUI() { return typeof updateStaticUI === 'function' ? updateStaticUI : undefined; },
    get showGameToast() { return typeof showGameToast === 'function' ? showGameToast : undefined; },
    get equipItemById() { return typeof equipItemById === 'function' ? equipItemById : undefined; }
});
safeExposeGlobals({ equipmentTriage });
