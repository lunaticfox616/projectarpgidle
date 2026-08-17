/**
 * @typedef {{ id: number, name: string }} EquipmentLoadoutItemReference
 * @typedef {{ name: string, slots: Object<string, EquipmentLoadoutItemReference|null>, savedAtLoop: number }} EquipmentLoadoutPreset
 * @typedef {{ ok: boolean, reason?: string, preset?: EquipmentLoadoutPreset, count?: number }} EquipmentLoadoutResult
 */
const EQUIPMENT_LOADOUT_PRESET_LIMIT = 3;
const EQUIPMENT_LOADOUT_SLOT_KEYS = Object.freeze(Object.keys(defaultGame.equipment));

function normalizeEquipmentLoadoutSlot(record) {
    if (!record || !Number.isFinite(Number(record.id)) || Number(record.id) <= 0) return null;
    return {
        id: Math.floor(Number(record.id)),
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

function ensureEquipmentLoadoutState(targetGame = game) {
    let source = targetGame.equipmentLoadouts && typeof targetGame.equipmentLoadouts === 'object'
        ? targetGame.equipmentLoadouts : {};
    let presets = Array.from({ length: EQUIPMENT_LOADOUT_PRESET_LIMIT }, (_, index) =>
        normalizeEquipmentLoadoutPreset((Array.isArray(source.presets) ? source.presets : [])[index], index));
    targetGame.equipmentLoadouts = {
        selectedSlot: Math.max(0, Math.min(EQUIPMENT_LOADOUT_PRESET_LIMIT - 1, Math.floor(Number(source.selectedSlot) || 0))),
        presets
    };
    return targetGame.equipmentLoadouts;
}

function getEquipmentLoadoutOwnedIndex(targetGame = game) {
    let items = new Map();
    let duplicateId = null;
    let add = item => {
        if (!item || !Number.isFinite(Number(item.id))) return;
        let id = Math.floor(Number(item.id));
        if (items.has(id)) duplicateId = id;
        items.set(id, item);
    };
    (targetGame.inventory || []).forEach(add);
    Object.values(targetGame.equipment || {}).forEach(add);
    return { items, duplicateId };
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
        let currentId = targetGame.equipment && targetGame.equipment[slot] ? Number(targetGame.equipment[slot].id) : null;
        let savedId = saved ? Number(saved.id) : null;
        if (currentId !== savedId) applied = false;
        if (!saved) return;
        count++;
        let item = owned.get(savedId);
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
        slots[slot] = item ? { id: Math.floor(Number(item.id)), name: String(item.name || '이름 없는 장비').slice(0, 40) } : null;
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
    if (owned.duplicateId !== null) return { ok: false, reason: '장비 식별자가 중복되어 세팅을 안전하게 전환할 수 없습니다.' };
    let desiredRows = EQUIPMENT_LOADOUT_SLOT_KEYS.map(slot => preset.slots[slot]).filter(Boolean);
    let desiredIds = new Set(desiredRows.map(row => Number(row.id)));
    if (desiredIds.size !== desiredRows.length) return { ok: false, reason: '프리셋에 같은 장비가 두 슬롯 이상 저장되어 있습니다.' };
    let inspection = getEquipmentLoadoutInspection(slotIndex, targetGame);
    if (inspection.missing.length > 0) return { ok: false, reason: `보유하지 않은 장비가 있습니다: ${inspection.missing.map(row => row.name).join(', ')}` };
    if (inspection.incompatible.length > 0) return { ok: false, reason: `현재 직업으로 장착할 수 없는 장비가 있습니다: ${inspection.incompatible.map(row => row.name).join(', ')}` };
    let nextEquipment = {};
    EQUIPMENT_LOADOUT_SLOT_KEYS.forEach(slot => {
        let saved = preset.slots[slot];
        nextEquipment[slot] = saved ? owned.items.get(Number(saved.id)) : null;
    });
    let nextInventory = (targetGame.inventory || []).filter(item => item && !desiredIds.has(Number(item.id)));
    let inventoryIds = new Set(nextInventory.map(item => Number(item.id)));
    Object.values(targetGame.equipment || {}).forEach(item => {
        if (!item || desiredIds.has(Number(item.id)) || inventoryIds.has(Number(item.id))) return;
        nextInventory.push(item);
        inventoryIds.add(Number(item.id));
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

function isEquipmentLoadoutItemReferenced(itemId, targetGame = game) {
    let id = Number(itemId);
    if (!Number.isFinite(id)) return false;
    return ensureEquipmentLoadoutState(targetGame).presets.some(preset => preset
        && EQUIPMENT_LOADOUT_SLOT_KEYS.some(slot => preset.slots[slot] && Number(preset.slots[slot].id) === id));
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
