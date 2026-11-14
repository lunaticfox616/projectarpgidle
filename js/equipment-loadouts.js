// GENERATED from modules/equipment-loadouts*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/equipment-loadout-state.mjs
  var EquipmentLoadoutState = class {
    constructor(slots, deps) {
      this.slots = Object.freeze(slots.slice());
      this.deps = deps;
      this.sequence = 0;
    }
    ensureItemIdentity(item) {
      if (!item || typeof item !== "object") return null;
      if (typeof item.instanceId === "string" && item.instanceId.trim()) return item.instanceId;
      this.sequence += 1;
      let randomPart = Math.floor(this.deps.random() * 4294967296).toString(36);
      item.instanceId = `gear-${this.deps.now().toString(36)}-${this.sequence.toString(36)}-${randomPart}`;
      return item.instanceId;
    }
    getItemIdentity(item) {
      return item && typeof item.instanceId === "string" && item.instanceId.trim() ? item.instanceId.trim() : null;
    }
    normalizeSlot(record) {
      if (!record || !Number.isFinite(Number(record.id)) || Number(record.id) <= 0) return null;
      return {
        id: Math.floor(Number(record.id)),
        instanceId: typeof record.instanceId === "string" && record.instanceId.trim() ? record.instanceId.trim().slice(0, 96) : null,
        name: typeof record.name === "string" && record.name.trim() ? record.name.trim().slice(0, 40) : "이름 없는 장비"
      };
    }
    normalizePreset(preset, index) {
      if (!preset || typeof preset !== "object" || !preset.slots || typeof preset.slots !== "object") return null;
      let slots = {};
      this.slots.forEach((slot) => {
        slots[slot] = this.normalizeSlot(preset.slots[slot]);
      });
      let fallbackName = this.deps.translate("세팅 {value}", { value: index + 1 });
      let name = typeof preset.name === "string" && preset.name.trim() ? preset.name.trim().slice(0, 18) : fallbackName;
      return {
        name,
        slots,
        savedAtLoop: Math.max(1, Math.floor(Number(preset.savedAtLoop) || 1)),
        runeLoadout: this.deps.runes.normalize(preset.runeLoadout)
      };
    }
    isStored(targetGame, identity) {
      return !!identity && (targetGame.equipmentTemporaryStorage || []).some((item) => this.getItemIdentity(item) === identity);
    }
    getOwnedItems(targetGame) {
      return Array.from(new Set((targetGame.inventory || []).concat(Object.values(targetGame.equipment || {}).filter(Boolean))));
    }
    repairDuplicates(targetGame, presets) {
      let savedRows = presets.flatMap((preset) => preset ? this.slots.map((slot) => preset.slots[slot]).filter(Boolean) : []);
      let groups = /* @__PURE__ */ new Map();
      this.getOwnedItems(targetGame).forEach((item) => {
        let identity = this.getItemIdentity(item);
        if (!identity) return;
        let group = groups.get(identity) || [];
        group.push(item);
        groups.set(identity, group);
      });
      groups.forEach((items, identity) => {
        if (items.length < 2) return;
        let savedForIdentity = savedRows.filter((row) => this.getSavedIdentity(row) === identity);
        let keeper = items.find((item) => savedForIdentity.some((row) => Number(row.id) === Number(item.id))) || items[0];
        items.forEach((item) => {
          if (item === keeper) return;
          item.instanceId = null;
          let replacement = this.ensureItemIdentity(item);
          let itemIdIsUnique = items.filter((candidate) => Number(candidate.id) === Number(item.id)).length === 1;
          savedForIdentity.forEach((row) => {
            if (itemIdIsUnique && Number(row.id) === Number(item.id)) row.instanceId = replacement;
          });
        });
      });
    }
    ensureState(targetGame) {
      let source = targetGame.equipmentLoadouts && typeof targetGame.equipmentLoadouts === "object" ? targetGame.equipmentLoadouts : {};
      let presets = Array.from({ length: 3 }, (_, index) => this.normalizePreset((Array.isArray(source.presets) ? source.presets : [])[index], index));
      this.repairDuplicates(targetGame, presets);
      if (Math.floor(Number(source.identityVersion) || 0) < 1) {
        let owned = this.getOwnedItems(targetGame);
        presets.forEach((preset) => {
          if (!preset) return;
          this.slots.forEach((slot) => {
            let saved = preset.slots[slot];
            if (!saved || saved.instanceId) return;
            let matches = owned.filter((item) => item && Number(item.id) === Number(saved.id));
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
      let items = /* @__PURE__ */ new Map();
      let duplicateIdentity = null;
      let add = (item) => {
        let identity = this.getItemIdentity(item);
        if (!identity) return;
        if (items.has(identity)) duplicateIdentity = identity;
        items.set(identity, item);
      };
      this.getOwnedItems(targetGame).forEach(add);
      return { items, duplicateIdentity };
    }
    getSavedIdentity(saved) {
      return saved && typeof saved.instanceId === "string" && saved.instanceId ? saved.instanceId : null;
    }
  };
  function createEquipmentLoadoutState(slots, deps) {
    const state = new EquipmentLoadoutState(slots, deps);
    return Object.freeze({
      limit: 3,
      slots: state.slots,
      ...Object.fromEntries(["ensureItemIdentity", "getItemIdentity", "isStored", "getOwnedItems", "ensureState", "getOwnedIndex", "getSavedIdentity"].map((name) => [name, state[name].bind(state)]))
    });
  }

  // modules/domain/equipment-loadouts.mjs
  var EquipmentLoadouts = class {
    constructor(items, deps) {
      this.items = items;
      this.deps = deps;
    }
    describeMissing(missing) {
      const names = (rows) => rows.map((row) => row.name).join(", ");
      const lost = missing.filter((row) => !row.stored);
      if (lost.length > 0) return this.deps.translate("보유하지 않은 장비가 있습니다: {lost}", { lost: names(lost) });
      return this.deps.translate("임시 보관함에서 먼저 꺼내 주세요: {missing}", { missing: names(missing) });
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
      this.items.slots.forEach((slot) => {
        let saved = preset.slots[slot];
        let currentIdentity = targetGame.equipment && targetGame.equipment[slot] ? this.items.getItemIdentity(targetGame.equipment[slot]) : null;
        let savedIdentity = this.items.getSavedIdentity(saved);
        if (currentIdentity !== savedIdentity) applied = false;
        if (!saved) return;
        count++;
        let item = savedIdentity ? owned.get(savedIdentity) : null;
        if (!item) missing.push({ slot, name: saved.name, stored: this.items.isStored(targetGame, savedIdentity) });
        else if (typeof this.deps.candidateSlots === "function" && !this.deps.candidateSlots(item, targetGame).includes(slot)) {
          incompatible.push({ slot, name: saved.name });
        }
      });
      let runes = this.deps.runes;
      let presetEquipment = Object.fromEntries(this.items.slots.map((slot) => [slot, owned.get(this.items.getSavedIdentity(preset.slots[slot])) || null]));
      let runeReason = runes.inspect(preset.runeLoadout, { ...targetGame, equipment: presetEquipment }).reason || "";
      return {
        exists: true,
        name: preset.name,
        count,
        missing,
        incompatible,
        applied: applied && runes.equals(preset.runeLoadout, targetGame),
        runeReason
      };
    }
    save(slotIndex, name, targetGame) {
      let state = this.items.ensureState(targetGame);
      let index = Math.floor(Number(slotIndex));
      if (index < 0 || index >= this.items.limit) return { ok: false, reason: this.deps.translate("프리셋 슬롯이 올바르지 않습니다.") };
      let slots = {};
      let count = 0;
      this.items.slots.forEach((slot) => {
        let item = targetGame.equipment && targetGame.equipment[slot];
        slots[slot] = item ? { id: Math.floor(Number(item.id)), instanceId: this.items.ensureItemIdentity(item), name: String(item.name || "이름 없는 장비").slice(0, 40) } : null;
        if (item) count++;
      });
      let previous = state.presets[index];
      let presetName = typeof name === "string" && name.trim() ? name.trim().slice(0, 18) : previous ? previous.name : this.deps.translate("세팅 {value}", { value: index + 1 });
      state.presets[index] = {
        name: presetName,
        slots,
        savedAtLoop: Math.max(1, Math.floor(Number(targetGame.season) || 1)),
        runeLoadout: this.deps.runes.capture(targetGame)
      };
      state.selectedSlot = index;
      return { ok: true, preset: state.presets[index], count };
    }
    buildSwap(preset, slotIndex, targetGame) {
      let owned = this.items.getOwnedIndex(targetGame);
      if (owned.duplicateIdentity !== null) return { ok: false, reason: this.deps.translate("장비 인스턴스 식별자가 중복되어 세팅을 안전하게 전환할 수 없습니다.") };
      let desiredRows = this.items.slots.map((slot) => preset.slots[slot]).filter(Boolean);
      let desiredIdentities = new Set(desiredRows.map(this.items.getSavedIdentity).filter(Boolean));
      if (desiredIdentities.size !== desiredRows.length) return { ok: false, reason: this.deps.translate("프리셋에 식별할 수 없거나 같은 장비가 두 슬롯 이상 저장되어 있습니다.") };
      let inspection = this.inspect(slotIndex, targetGame);
      if (inspection.missing.length > 0) return { ok: false, reason: this.describeMissing(inspection.missing) };
      if (inspection.incompatible.length > 0) return { ok: false, reason: `현재 직업으로 장착할 수 없는 장비가 있습니다: ${inspection.incompatible.map((row) => row.name).join(", ")}` };
      let nextEquipment = {};
      this.items.slots.forEach((slot) => {
        let saved = preset.slots[slot];
        nextEquipment[slot] = saved ? owned.items.get(this.items.getSavedIdentity(saved)) : null;
      });
      let nextInventory = (targetGame.inventory || []).filter((item) => item && !desiredIdentities.has(this.items.getItemIdentity(item)));
      const eligibility = this.deps.stats.validateBuildLoadout(nextEquipment, preset.runeLoadout, targetGame);
      if (!eligibility.ok) return eligibility;
      let inventoryItems = new Set(nextInventory);
      let inventoryIdentities = new Set(nextInventory.map(this.items.getItemIdentity).filter(Boolean));
      Object.values(targetGame.equipment || {}).forEach((item) => {
        let identity = this.items.getItemIdentity(item);
        if (!item || desiredIdentities.has(identity) || inventoryItems.has(item) || identity && inventoryIdentities.has(identity)) return;
        nextInventory.push(item);
        inventoryItems.add(item);
        if (identity) inventoryIdentities.add(identity);
      });
      if (!this.deps.grid.canFitItems(nextInventory, targetGame)) return { ok: false, reason: this.deps.translate("세팅 전환 후 인벤토리 배치 공간이 부족합니다.") };
      return { ok: true, equipment: nextEquipment, inventory: nextInventory, inspection };
    }
    // An old equipment-only preset keeps current rune choices. Requirement grace is removed only on an actual swap.
    // The stats owner validates before committing, then settles invalid rune choices with the same existing rules.
    apply(slotIndex, targetGame) {
      if (targetGame.woodsmanBuildLock) return { ok: false, reason: this.deps.translate("☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.") };
      let state = this.items.ensureState(targetGame);
      let index = Math.floor(Number(slotIndex));
      let preset = state.presets[index];
      if (!preset) return { ok: false, reason: this.deps.translate("저장된 빌드 세팅이 없습니다.") };
      let swap = this.buildSwap(preset, index, targetGame);
      if (!swap.ok) return swap;
      const kept = new Set(Object.values(targetGame.equipment));
      Object.values(swap.equipment).forEach((item) => {
        if (item && !kept.has(item)) delete item.legacyRequirementGrace;
      });
      swap.inventory.forEach((item) => {
        if (kept.has(item)) delete item.legacyRequirementGrace;
      });
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
      let clean = typeof name === "string" ? name.trim().slice(0, 18) : "";
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
      return state.presets.some((preset) => preset && this.items.slots.some((slot) => this.items.getSavedIdentity(preset.slots[slot]) === identity));
    }
  };
  function createEquipmentLoadouts(items, deps) {
    const loadouts2 = new EquipmentLoadouts(items, deps);
    return Object.freeze(Object.fromEntries(["inspect", "save", "apply", "rename", "clear", "isReferenced"].map((name) => [name, loadouts2[name].bind(loadouts2)])));
  }

  // modules/equipment-loadouts-classic.mjs
  var itemState = createEquipmentLoadoutState(Object.keys(defaultGame.equipment), {
    translate: (...args) => _t(...args),
    random: () => Math.random(),
    now: () => Date.now(),
    get runes() {
      return window.GameModules.skills.loadouts;
    }
  });
  var loadouts = createEquipmentLoadouts(itemState, {
    translate: (...args) => _t(...args),
    get runes() {
      return window.GameModules.skills.loadouts;
    },
    get stats() {
      return combatEquipmentStats;
    },
    get grid() {
      return equipmentInventoryGridRuntime;
    },
    get candidateSlots() {
      return typeof getEquipCandidateSlots === "function" ? getEquipCandidateSlots : void 0;
    }
  });
  var ensureEquipmentLoadoutItemIdentity = itemState.ensureItemIdentity;
  var getEquipmentLoadoutItemIdentity = itemState.getItemIdentity;
  var getEquipmentLoadoutOwnedItems = itemState.getOwnedItems;
  var ensureEquipmentLoadoutState = (state = game) => itemState.ensureState(state);
  var getEquipmentLoadoutInspection = (slot, state = game) => loadouts.inspect(slot, state);
  var saveEquipmentLoadoutPreset = (slot, name, state = game) => loadouts.save(slot, name, state);
  var applyEquipmentLoadoutPreset = (slot, state = game) => {
    const result = loadouts.apply(slot, state);
    if (result.ok && state === game) normalizeSupportLoadout(true);
    return result;
  };
  var renameEquipmentLoadoutPreset = (slot, name, state = game) => loadouts.rename(slot, name, state);
  var clearEquipmentLoadoutPreset = (slot, state = game) => loadouts.clear(slot, state);
  var isEquipmentLoadoutItemReferenced = (item, state = game) => loadouts.isReferenced(item, state);
  var equipmentLoadoutRuntime = Object.freeze({
    limit: itemState.limit,
    slots: itemState.slots,
    itemState,
    ensureState: ensureEquipmentLoadoutState,
    inspect: getEquipmentLoadoutInspection,
    save: saveEquipmentLoadoutPreset,
    apply: applyEquipmentLoadoutPreset,
    rename: renameEquipmentLoadoutPreset,
    clear: clearEquipmentLoadoutPreset,
    isReferenced: isEquipmentLoadoutItemReferenced,
    getItemIdentity: getEquipmentLoadoutItemIdentity,
    ensureItemIdentity: ensureEquipmentLoadoutItemIdentity
  });
  safeExposeGlobals({
    equipmentLoadoutRuntime,
    ensureEquipmentLoadoutItemIdentity,
    getEquipmentLoadoutItemIdentity,
    getEquipmentLoadoutOwnedItems,
    ensureEquipmentLoadoutState,
    getEquipmentLoadoutInspection,
    saveEquipmentLoadoutPreset,
    applyEquipmentLoadoutPreset,
    renameEquipmentLoadoutPreset,
    clearEquipmentLoadoutPreset,
    isEquipmentLoadoutItemReferenced
  });
})();
