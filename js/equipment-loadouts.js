/**
 * @typedef {{ id: number, instanceId: string|null, name: string }} EquipmentLoadoutItemReference
 * @typedef {{ name: string, slots: Object<string, EquipmentLoadoutItemReference|null>, savedAtLoop: number }} EquipmentLoadoutPreset
 * @typedef {{ ok: boolean, reason?: string, preset?: EquipmentLoadoutPreset, count?: number }} EquipmentLoadoutResult
 */
const EQUIPMENT_LOADOUT_PRESET_LIMIT = 3;
const EQUIPMENT_LOADOUT_SLOT_KEYS = Object.freeze(Object.keys(defaultGame.equipment));
const EQUIPMENT_LOADOUT_IDENTITY_VERSION = 1;
let equipmentLoadoutIdentitySequence = 0;

function ensureEquipmentLoadoutItemIdentity(item) {
    if (!item || typeof item !== 'object') return null;
    if (typeof item.instanceId === 'string' && item.instanceId.trim()) return item.instanceId;
    equipmentLoadoutIdentitySequence += 1;
    let randomPart = Math.floor(Math.random() * 0x100000000).toString(36);
    item.instanceId = `gear-${Date.now().toString(36)}-${equipmentLoadoutIdentitySequence.toString(36)}-${randomPart}`;
    return item.instanceId;
}

function getEquipmentLoadoutItemIdentity(item) {
    return item && typeof item.instanceId === 'string' && item.instanceId.trim() ? item.instanceId.trim() : null;
}

function normalizeEquipmentLoadoutSlot(record) {
    if (!record || !Number.isFinite(Number(record.id)) || Number(record.id) <= 0) return null;
    return {
        id: Math.floor(Number(record.id)),
        instanceId: typeof record.instanceId === 'string' && record.instanceId.trim() ? record.instanceId.trim().slice(0, 96) : null,
        name: typeof record.name === 'string' && record.name.trim() ? record.name.trim().slice(0, 40) : '이름 없는 장비'
    };
}

function normalizeEquipmentLoadoutPreset(preset, index) {
    if (!preset || typeof preset !== 'object' || !preset.slots || typeof preset.slots !== 'object') return null;
    let slots = {};
    EQUIPMENT_LOADOUT_SLOT_KEYS.forEach(slot => { slots[slot] = normalizeEquipmentLoadoutSlot(preset.slots[slot]); });
    let fallbackName = `세팅 ${index + 1}`;
    let name = typeof preset.name === 'string' && preset.name.trim() ? preset.name.trim().slice(0, 18) : fallbackName;
    return { name, slots, savedAtLoop: Math.max(1, Math.floor(Number(preset.savedAtLoop) || 1)) };
}

function getEquipmentLoadoutOwnedItems(targetGame) {
    return Array.from(new Set((targetGame.inventory || []).concat(Object.values(targetGame.equipment || {}).filter(Boolean))));
}

function repairEquipmentLoadoutDuplicateIdentities(targetGame, presets) {
    let savedRows = presets.flatMap(preset => preset
        ? EQUIPMENT_LOADOUT_SLOT_KEYS.map(slot => preset.slots[slot]).filter(Boolean)
        : []);
    let groups = new Map();
    getEquipmentLoadoutOwnedItems(targetGame).forEach(item => {
        let identity = getEquipmentLoadoutItemIdentity(item);
        if (!identity) return;
        let group = groups.get(identity) || [];
        group.push(item);
        groups.set(identity, group);
    });
    groups.forEach((items, identity) => {
        if (items.length < 2) return;
        let savedForIdentity = savedRows.filter(row => getEquipmentLoadoutSavedIdentity(row) === identity);
        let keeper = items.find(item => savedForIdentity.some(row => Number(row.id) === Number(item.id))) || items[0];
        items.forEach(item => {
            if (item === keeper) return;
            item.instanceId = null;
            let replacement = ensureEquipmentLoadoutItemIdentity(item);
            let itemIdIsUnique = items.filter(candidate => Number(candidate.id) === Number(item.id)).length === 1;
            savedForIdentity.forEach(row => {
                if (itemIdIsUnique && Number(row.id) === Number(item.id)) row.instanceId = replacement;
            });
        });
    });
}

function ensureEquipmentLoadoutState(targetGame = game) {
    let source = targetGame.equipmentLoadouts && typeof targetGame.equipmentLoadouts === 'object'
        ? targetGame.equipmentLoadouts : {};
    let presets = Array.from({ length: EQUIPMENT_LOADOUT_PRESET_LIMIT }, (_, index) =>
        normalizeEquipmentLoadoutPreset((Array.isArray(source.presets) ? source.presets : [])[index], index));
    repairEquipmentLoadoutDuplicateIdentities(targetGame, presets);
    if (Math.floor(Number(source.identityVersion) || 0) < EQUIPMENT_LOADOUT_IDENTITY_VERSION) {
        let owned = getEquipmentLoadoutOwnedItems(targetGame);
        presets.forEach(preset => {
            if (!preset) return;
            EQUIPMENT_LOADOUT_SLOT_KEYS.forEach(slot => {
                let saved = preset.slots[slot];
                if (!saved || saved.instanceId) return;
                let matches = owned.filter(item => item && Number(item.id) === Number(saved.id));
                if (matches.length === 1) saved.instanceId = ensureEquipmentLoadoutItemIdentity(matches[0]);
            });
        });
    }
    targetGame.equipmentLoadouts = {
        identityVersion: EQUIPMENT_LOADOUT_IDENTITY_VERSION,
        selectedSlot: Math.max(0, Math.min(EQUIPMENT_LOADOUT_PRESET_LIMIT - 1, Math.floor(Number(source.selectedSlot) || 0))),
        presets
    };
    return targetGame.equipmentLoadouts;
}

function getEquipmentLoadoutOwnedIndex(targetGame = game) {
    let items = new Map();
    let duplicateIdentity = null;
    let add = item => {
        let identity = getEquipmentLoadoutItemIdentity(item);
        if (!identity) return;
        if (items.has(identity)) duplicateIdentity = identity;
        items.set(identity, item);
    };
    getEquipmentLoadoutOwnedItems(targetGame).forEach(add);
    return { items, duplicateIdentity };
}

function getEquipmentLoadoutSavedIdentity(saved) {
    return saved && typeof saved.instanceId === 'string' && saved.instanceId ? saved.instanceId : null;
}

function getEquipmentLoadoutInspection(slotIndex, targetGame = game) {
    let state = ensureEquipmentLoadoutState(targetGame);
    let preset = state.presets[Math.floor(Number(slotIndex))];
    if (!preset) return { exists: false, count: 0, missing: [], incompatible: [], applied: false };
    let owned = getEquipmentLoadoutOwnedIndex(targetGame).items;
    let missing = [];
    let incompatible = [];
    let count = 0;
    let applied = true;
    EQUIPMENT_LOADOUT_SLOT_KEYS.forEach(slot => {
        let saved = preset.slots[slot];
        let currentIdentity = targetGame.equipment && targetGame.equipment[slot]
            ? getEquipmentLoadoutItemIdentity(targetGame.equipment[slot]) : null;
        let savedIdentity = getEquipmentLoadoutSavedIdentity(saved);
        if (currentIdentity !== savedIdentity) applied = false;
        if (!saved) return;
        count++;
        let item = savedIdentity ? owned.get(savedIdentity) : null;
        if (!item) missing.push({ slot, name: saved.name });
        else if (typeof getEquipCandidateSlots === 'function' && !getEquipCandidateSlots(item).includes(slot)) {
            incompatible.push({ slot, name: saved.name });
        }
    });
    return { exists: true, name: preset.name, count, missing, incompatible, applied };
}

function saveEquipmentLoadoutPreset(slotIndex, name, targetGame = game) {
    let state = ensureEquipmentLoadoutState(targetGame);
    let index = Math.floor(Number(slotIndex));
    if (index < 0 || index >= EQUIPMENT_LOADOUT_PRESET_LIMIT) return { ok: false, reason: '프리셋 슬롯이 올바르지 않습니다.' };
    let slots = {};
    let count = 0;
    EQUIPMENT_LOADOUT_SLOT_KEYS.forEach(slot => {
        let item = targetGame.equipment && targetGame.equipment[slot];
        slots[slot] = item ? { id: Math.floor(Number(item.id)), instanceId: ensureEquipmentLoadoutItemIdentity(item), name: String(item.name || '이름 없는 장비').slice(0, 40) } : null;
        if (item) count++;
    });
    if (count === 0) return { ok: false, reason: '저장할 장착 장비가 없습니다.' };
    let previous = state.presets[index];
    let presetName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 18) : (previous ? previous.name : `세팅 ${index + 1}`);
    state.presets[index] = { name: presetName, slots, savedAtLoop: Math.max(1, Math.floor(Number(targetGame.season) || 1)) };
    state.selectedSlot = index;
    return { ok: true, preset: state.presets[index], count };
}

function buildEquipmentLoadoutSwap(preset, slotIndex, targetGame) {
    let owned = getEquipmentLoadoutOwnedIndex(targetGame);
    if (owned.duplicateIdentity !== null) return { ok: false, reason: '장비 인스턴스 식별자가 중복되어 세팅을 안전하게 전환할 수 없습니다.' };
    let desiredRows = EQUIPMENT_LOADOUT_SLOT_KEYS.map(slot => preset.slots[slot]).filter(Boolean);
    let desiredIdentities = new Set(desiredRows.map(getEquipmentLoadoutSavedIdentity).filter(Boolean));
    if (desiredIdentities.size !== desiredRows.length) return { ok: false, reason: '프리셋에 식별할 수 없거나 같은 장비가 두 슬롯 이상 저장되어 있습니다.' };
    let inspection = getEquipmentLoadoutInspection(slotIndex, targetGame);
    if (inspection.missing.length > 0) return { ok: false, reason: `보유하지 않은 장비가 있습니다: ${inspection.missing.map(row => row.name).join(', ')}` };
    if (inspection.incompatible.length > 0) return { ok: false, reason: `현재 직업으로 장착할 수 없는 장비가 있습니다: ${inspection.incompatible.map(row => row.name).join(', ')}` };
    let nextEquipment = {};
    EQUIPMENT_LOADOUT_SLOT_KEYS.forEach(slot => {
        let saved = preset.slots[slot];
        nextEquipment[slot] = saved ? owned.items.get(getEquipmentLoadoutSavedIdentity(saved)) : null;
    });
    let nextInventory = (targetGame.inventory || []).filter(item => item && !desiredIdentities.has(getEquipmentLoadoutItemIdentity(item)));
    let inventoryItems = new Set(nextInventory);
    let inventoryIdentities = new Set(nextInventory.map(getEquipmentLoadoutItemIdentity).filter(Boolean));
    Object.values(targetGame.equipment || {}).forEach(item => {
        let identity = getEquipmentLoadoutItemIdentity(item);
        if (!item || desiredIdentities.has(identity) || inventoryItems.has(item) || (identity && inventoryIdentities.has(identity))) return;
        nextInventory.push(item);
        inventoryItems.add(item);
        if (identity) inventoryIdentities.add(identity);
    });
    if (nextInventory.length > getInventoryLimit()) return { ok: false, reason: `세팅 전환 후 인벤토리가 ${nextInventory.length - getInventoryLimit()}칸 초과합니다.` };
    return { ok: true, equipment: nextEquipment, inventory: nextInventory, inspection };
}

function applyEquipmentLoadoutPreset(slotIndex, targetGame = game) {
    let state = ensureEquipmentLoadoutState(targetGame);
    let index = Math.floor(Number(slotIndex));
    let preset = state.presets[index];
    if (!preset) return { ok: false, reason: '저장된 장비 세팅이 없습니다.' };
    state.selectedSlot = index;
    let swap = buildEquipmentLoadoutSwap(preset, index, targetGame);
    if (!swap.ok) return swap;
    targetGame.equipment = swap.equipment;
    targetGame.inventory = swap.inventory;
    return { ok: true, preset, count: swap.inspection.count };
}

function renameEquipmentLoadoutPreset(slotIndex, name, targetGame = game) {
    let state = ensureEquipmentLoadoutState(targetGame);
    let index = Math.floor(Number(slotIndex));
    let preset = state.presets[index];
    let clean = typeof name === 'string' ? name.trim().slice(0, 18) : '';
    if (!preset || !clean) return false;
    preset.name = clean;
    return true;
}

function clearEquipmentLoadoutPreset(slotIndex, targetGame = game) {
    let state = ensureEquipmentLoadoutState(targetGame);
    let index = Math.floor(Number(slotIndex));
    if (!state.presets[index]) return false;
    state.presets[index] = null;
    return true;
}

function isEquipmentLoadoutItemReferenced(item, targetGame = game) {
    let state = ensureEquipmentLoadoutState(targetGame);
    let identity = getEquipmentLoadoutItemIdentity(item);
    if (!identity) return false;
    return state.presets.some(preset => preset
        && EQUIPMENT_LOADOUT_SLOT_KEYS.some(slot => getEquipmentLoadoutSavedIdentity(preset.slots[slot]) === identity));
}

const equipmentLoadoutRuntime = Object.freeze({
    limit: EQUIPMENT_LOADOUT_PRESET_LIMIT,
    slots: EQUIPMENT_LOADOUT_SLOT_KEYS,
    ensureState: ensureEquipmentLoadoutState,
    inspect: getEquipmentLoadoutInspection,
    save: saveEquipmentLoadoutPreset,
    apply: applyEquipmentLoadoutPreset,
    rename: renameEquipmentLoadoutPreset,
    clear: clearEquipmentLoadoutPreset,
    isReferenced: isEquipmentLoadoutItemReferenced
});

safeExposeGlobals({ equipmentLoadoutRuntime });
