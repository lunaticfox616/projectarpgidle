// Equipment and rune selections commit together, after eligibility and bag space have been checked.
// Preset/identity restoration is a lower-level service shared with the bag, never a callback into this orchestrator.
class EquipmentLoadouts {
    constructor(items, deps) { this.items = items; this.deps = deps; }
    describeMissing(missing) {
        const names = rows => rows.map(row => row.name).join(', ');
        const lost = missing.filter(row => !row.stored);
        if (lost.length > 0) return this.deps.translate('보유하지 않은 장비가 있습니다: {lost}', { lost: names(lost) });
        return this.deps.translate('임시 보관함에서 먼저 꺼내 주세요: {missing}', { missing: names(missing) });
    }

    inspect(slotIndex, targetGame) {
        let state = this.items.ensureState(targetGame);
        let preset = state.presets[Math.floor(Number(slotIndex))];
        if (!preset) return { exists: false, count: 0, missing: [], incompatible: [], applied: false };
        let owned = this.items.getOwnedIndex(targetGame).items;
        let missing = [];
        let incompatible = [];
        let count = 0;
        let applied = true;
        this.items.slots.forEach(slot => {
            let saved = preset.slots[slot];
            let currentIdentity = targetGame.equipment && targetGame.equipment[slot]
                ? this.items.getItemIdentity(targetGame.equipment[slot]) : null;
            let savedIdentity = this.items.getSavedIdentity(saved);
            if (currentIdentity !== savedIdentity) applied = false;
            if (!saved) return;
            count++;
            let item = savedIdentity ? owned.get(savedIdentity) : null;
            if (!item) missing.push({ slot, name: saved.name, stored: this.items.isStored(targetGame, savedIdentity) });
            else if (typeof this.deps.candidateSlots === 'function' && !this.deps.candidateSlots(item, targetGame).includes(slot)) {
                incompatible.push({ slot, name: saved.name });
            }
        });
        // Rune ownership is read against the preset's own gear (a saved 칼이 된 발걸음 counts even when it is off now).
        let runes = this.deps.runes;
        let presetEquipment = Object.fromEntries(this.items.slots.map(slot =>
            [slot, owned.get(this.items.getSavedIdentity(preset.slots[slot])) || null]));
        let runeReason = runes.inspect(preset.runeLoadout, { ...targetGame, equipment: presetEquipment }).reason || '';
        return { exists: true, name: preset.name, count, missing, incompatible,
            applied: applied && runes.equals(preset.runeLoadout, targetGame), runeReason };
    }

    save(slotIndex, name, targetGame) {
        let state = this.items.ensureState(targetGame);
        let index = Math.floor(Number(slotIndex));
        if (index < 0 || index >= this.items.limit) return { ok: false, reason: this.deps.translate('프리셋 슬롯이 올바르지 않습니다.') };
        let slots = {};
        let count = 0;
        this.items.slots.forEach(slot => {
            let item = targetGame.equipment && targetGame.equipment[slot];
            slots[slot] = item ? { id: Math.floor(Number(item.id)), instanceId: this.items.ensureItemIdentity(item), name: String(item.name || '이름 없는 장비').slice(0, 40) } : null;
            if (item) count++;
        });
        let previous = state.presets[index];
        let presetName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 18) : (previous ? previous.name : this.deps.translate('세팅 {value}', { value: index + 1 }));
        state.presets[index] = { name: presetName, slots, savedAtLoop: Math.max(1, Math.floor(Number(targetGame.season) || 1)),
            runeLoadout: this.deps.runes.capture(targetGame) };
        state.selectedSlot = index;
        return { ok: true, preset: state.presets[index], count };
    }

    buildSwap(preset, slotIndex, targetGame) {
        let owned = this.items.getOwnedIndex(targetGame);
        if (owned.duplicateIdentity !== null) return { ok: false, reason: this.deps.translate('장비 인스턴스 식별자가 중복되어 세팅을 안전하게 전환할 수 없습니다.') };
        let desiredRows = this.items.slots.map(slot => preset.slots[slot]).filter(Boolean);
        let desiredIdentities = new Set(desiredRows.map(this.items.getSavedIdentity).filter(Boolean));
        if (desiredIdentities.size !== desiredRows.length) return { ok: false, reason: this.deps.translate('프리셋에 식별할 수 없거나 같은 장비가 두 슬롯 이상 저장되어 있습니다.') };
        let inspection = this.inspect(slotIndex, targetGame);
        if (inspection.missing.length > 0) return { ok: false, reason: this.describeMissing(inspection.missing) };
        if (inspection.incompatible.length > 0) return { ok: false, reason: `현재 직업으로 장착할 수 없는 장비가 있습니다: ${inspection.incompatible.map(row => row.name).join(', ')}` };
        let nextEquipment = {};
        this.items.slots.forEach(slot => {
            let saved = preset.slots[slot];
            nextEquipment[slot] = saved ? owned.items.get(this.items.getSavedIdentity(saved)) : null;
        });
        let nextInventory = (targetGame.inventory || []).filter(item => item && !desiredIdentities.has(this.items.getItemIdentity(item)));
        const eligibility = this.deps.stats.validateBuildLoadout(nextEquipment, preset.runeLoadout, targetGame);
        if (!eligibility.ok) return eligibility;
        let inventoryItems = new Set(nextInventory);
        let inventoryIdentities = new Set(nextInventory.map(this.items.getItemIdentity).filter(Boolean));
        Object.values(targetGame.equipment || {}).forEach(item => {
            let identity = this.items.getItemIdentity(item);
            if (!item || desiredIdentities.has(identity) || inventoryItems.has(item) || (identity && inventoryIdentities.has(identity))) return;
            nextInventory.push(item);
            inventoryItems.add(item);
            if (identity) inventoryIdentities.add(identity);
        });
        if (!this.deps.grid.canFitItems(nextInventory, targetGame)) return { ok: false, reason: this.deps.translate('세팅 전환 후 인벤토리 배치 공간이 부족합니다.') };
        return { ok: true, equipment: nextEquipment, inventory: nextInventory, inspection };
    }

    // An old equipment-only preset keeps current rune choices. Requirement grace is removed only on an actual swap.
    // The stats owner validates before committing, then settles invalid rune choices with the same existing rules.
    apply(slotIndex, targetGame) {
        if (targetGame.woodsmanBuildLock) return { ok: false, reason: this.deps.translate('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.') };
        let state = this.items.ensureState(targetGame);
        let index = Math.floor(Number(slotIndex));
        let preset = state.presets[index];
        if (!preset) return { ok: false, reason: this.deps.translate('저장된 빌드 세팅이 없습니다.') };
        let swap = this.buildSwap(preset, index, targetGame);
        if (!swap.ok) return swap;
        const kept = new Set(Object.values(targetGame.equipment));
        Object.values(swap.equipment).forEach(item => { if (item && !kept.has(item)) delete item.legacyRequirementGrace; });
        swap.inventory.forEach(item => { if (kept.has(item)) delete item.legacyRequirementGrace; });
        targetGame.equipment = swap.equipment;
        targetGame.inventory = swap.inventory;
        this.deps.runes.apply(preset.runeLoadout, targetGame);
        targetGame.equipmentLoadouts.selectedSlot = index;
        this.deps.stats.finishBuildLoadout(targetGame);
        return { ok: true, preset, count: swap.inspection.count };
    }

    rename(slotIndex, name, targetGame) {
        let state = this.items.ensureState(targetGame);
        let index = Math.floor(Number(slotIndex));
        let preset = state.presets[index];
        let clean = typeof name === 'string' ? name.trim().slice(0, 18) : '';
        if (!preset || !clean) return false;
        preset.name = clean;
        return true;
    }

    clear(slotIndex, targetGame) {
        let state = this.items.ensureState(targetGame);
        let index = Math.floor(Number(slotIndex));
        if (!state.presets[index]) return false;
        state.presets[index] = null;
        return true;
    }

    isReferenced(item, targetGame) {
        let state = this.items.ensureState(targetGame);
        let identity = this.items.getItemIdentity(item);
        if (!identity) return false;
        return state.presets.some(preset => preset
            && this.items.slots.some(slot => this.items.getSavedIdentity(preset.slots[slot]) === identity));
    }
}
export function createEquipmentLoadouts(items, deps) {
    const loadouts = new EquipmentLoadouts(items, deps);
    return Object.freeze(Object.fromEntries(['inspect','save','apply','rename','clear','isReferenced'].map(name => [name, loadouts[name].bind(loadouts)])));
}
