// Item identity and preset restoration sit below both bag layout and loadout application.
// One instance per runtime owns the ID sequence; callers supply the state being restored.
/** @typedef {{id:number, instanceId:string|null, name:string}} EquipmentLoadoutItemReference */
/** @typedef {{name:string, slots:Object<string, EquipmentLoadoutItemReference|null>, savedAtLoop:number, runeLoadout:object|null}} EquipmentLoadoutPreset */
// runeLoadout records selections, not ownership, level, experience or unlock progress. null denotes legacy equipment-only presets.
class EquipmentLoadoutState {
    constructor(slots, deps) { this.slots = Object.freeze(slots.slice()); this.deps = deps; this.sequence = 0; }
    ensureItemIdentity(item) {
        if (!item || typeof item !== 'object') return null;
        if (typeof item.instanceId === 'string' && item.instanceId.trim()) return item.instanceId;
        this.sequence += 1;
        let randomPart = Math.floor(this.deps.random() * 0x100000000).toString(36);
        item.instanceId = `gear-${this.deps.now().toString(36)}-${this.sequence.toString(36)}-${randomPart}`;
        return item.instanceId;
    }

    getItemIdentity(item) {
        return item && typeof item.instanceId === 'string' && item.instanceId.trim() ? item.instanceId.trim() : null;
    }

    normalizeSlot(record) {
        if (!record || !Number.isFinite(Number(record.id)) || Number(record.id) <= 0) return null;
        return {
            id: Math.floor(Number(record.id)),
            instanceId: typeof record.instanceId === 'string' && record.instanceId.trim() ? record.instanceId.trim().slice(0, 96) : null,
            name: typeof record.name === 'string' && record.name.trim() ? record.name.trim().slice(0, 40) : '이름 없는 장비'
        };
    }

    normalizePreset(preset, index) {
        if (!preset || typeof preset !== 'object' || !preset.slots || typeof preset.slots !== 'object') return null;
        let slots = {};
        this.slots.forEach(slot => { slots[slot] = this.normalizeSlot(preset.slots[slot]); });
        let fallbackName = this.deps.translate('세팅 {value}', { value: index + 1 });
        let name = typeof preset.name === 'string' && preset.name.trim() ? preset.name.trim().slice(0, 18) : fallbackName;
        return { name, slots, savedAtLoop: Math.max(1, Math.floor(Number(preset.savedAtLoop) || 1)),
            runeLoadout: this.deps.runes.normalize(preset.runeLoadout) };
    }

    isStored(targetGame, identity) {
        return !!identity && (targetGame.equipmentTemporaryStorage || []).some(item => this.getItemIdentity(item) === identity);
    }

    getOwnedItems(targetGame) {
        return Array.from(new Set((targetGame.inventory || []).concat(Object.values(targetGame.equipment || {}).filter(Boolean))));
    }

    repairDuplicates(targetGame, presets) {
        let savedRows = presets.flatMap(preset => preset
            ? this.slots.map(slot => preset.slots[slot]).filter(Boolean)
            : []);
        let groups = new Map();
        this.getOwnedItems(targetGame).forEach(item => {
            let identity = this.getItemIdentity(item);
            if (!identity) return;
            let group = groups.get(identity) || [];
            group.push(item);
            groups.set(identity, group);
        });
        groups.forEach((items, identity) => {
            if (items.length < 2) return;
            let savedForIdentity = savedRows.filter(row => this.getSavedIdentity(row) === identity);
            let keeper = items.find(item => savedForIdentity.some(row => Number(row.id) === Number(item.id))) || items[0];
            items.forEach(item => {
                if (item === keeper) return;
                item.instanceId = null;
                let replacement = this.ensureItemIdentity(item);
                let itemIdIsUnique = items.filter(candidate => Number(candidate.id) === Number(item.id)).length === 1;
                savedForIdentity.forEach(row => {
                    if (itemIdIsUnique && Number(row.id) === Number(item.id)) row.instanceId = replacement;
                });
            });
        });
    }

    ensureState(targetGame) {
        let source = targetGame.equipmentLoadouts && typeof targetGame.equipmentLoadouts === 'object'
            ? targetGame.equipmentLoadouts : {};
        let presets = Array.from({ length: 3 }, (_, index) =>
            this.normalizePreset((Array.isArray(source.presets) ? source.presets : [])[index], index));
        this.repairDuplicates(targetGame, presets);
        if (Math.floor(Number(source.identityVersion) || 0) < 1) {
            let owned = this.getOwnedItems(targetGame);
            presets.forEach(preset => {
                if (!preset) return;
                this.slots.forEach(slot => {
                    let saved = preset.slots[slot];
                    if (!saved || saved.instanceId) return;
                    let matches = owned.filter(item => item && Number(item.id) === Number(saved.id));
                    if (matches.length === 1) saved.instanceId = this.ensureItemIdentity(matches[0]);
                });
            });
        }
        targetGame.equipmentLoadouts = {
            identityVersion: 1,
            selectedSlot: Math.max(0, Math.min(3 - 1, Math.floor(Number(source.selectedSlot) || 0))),
            presets
        };
        return targetGame.equipmentLoadouts;
    }

    getOwnedIndex(targetGame) {
        let items = new Map();
        let duplicateIdentity = null;
        let add = item => {
            let identity = this.getItemIdentity(item);
            if (!identity) return;
            if (items.has(identity)) duplicateIdentity = identity;
            items.set(identity, item);
        };
        this.getOwnedItems(targetGame).forEach(add);
        return { items, duplicateIdentity };
    }

    getSavedIdentity(saved) {
        return saved && typeof saved.instanceId === 'string' && saved.instanceId ? saved.instanceId : null;
    }
}
export function createEquipmentLoadoutState(slots, deps) {
    const state = new EquipmentLoadoutState(slots, deps);
    return Object.freeze({ limit: 3, slots: state.slots,
        ...Object.fromEntries(["ensureItemIdentity","getItemIdentity","isStored","getOwnedItems","ensureState","getOwnedIndex","getSavedIdentity"].map(name => [name, state[name].bind(state)])) });
}
