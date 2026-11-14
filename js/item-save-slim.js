// GENERATED from modules/item-save-slim*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/persistence/item-save-slim.mjs
  var RANGE_PAIRS = [["valMin", "valMax"], ["baseRollMin", "baseRollMax"]];
  var ItemSaveSlim = class {
    constructor(deps) {
      this.deps = deps;
      this.modById = null;
      this.baseById = null;
      this.explicitCache = /* @__PURE__ */ new Map();
      this.baseCache = /* @__PURE__ */ new Map();
      for (const name of ["modOf", "baseStatDef", "explicitFields", "baseFields", "isLine", "slimLine", "expandLine", "isEquipment", "mapShared", "mapObjectShared", "slimItem", "expandItem", "slimTree", "expandTree"]) this[name] = this[name].bind(this);
    }
    // (mod, tier)와 (base, line)마다 한 번만 만든다(저장마다 수천 줄)
    modOf(stat) {
      if (!this.modById) this.modById = new Map(this.deps.MOD_DB.map((mod2) => [mod2.id, mod2]));
      const mod = this.modById.get(stat.sourceModId || stat.id);
      return mod && (mod.statId || mod.id) === stat.id ? mod : null;
    }
    baseStatDef(item, stat) {
      if (!this.baseById) this.baseById = new Map(this.deps.BASE_ITEM_DB.map((base2) => [base2.id, base2]));
      const base = this.baseById.get(item.baseId);
      return base ? (base.baseStats || []).find((row) => row && row.id === stat.id) || null : null;
    }
    /** What the game writes on an explicit line of its mod at the line's tier (rollTierValueAffix), or null when the mod is unknown. */
    explicitFields(stat) {
      const mod = Number(stat.tier) >= 1 ? this.modOf(stat) : null;
      if (!mod) return null;
      const key = mod.id + "#" + Math.floor(Number(stat.tier));
      if (!this.explicitCache.has(key)) {
        const range = this.deps.getAffixTierRange(mod, stat.id, stat.tier);
        this.explicitCache.set(key, { valMin: range.min, valMax: range.max, valueStep: range.step, fixedValue: !!mod.fixedValue, statName: mod.statName || this.deps.getStatName(stat.id) });
      }
      return this.explicitCache.get(key);
    }
    /** What rollBaseStat writes on a base line of the item's base, or null when the base or its line is unknown. */
    baseFields(item, stat) {
      const key = item.baseId + "#" + stat.id;
      if (!this.baseCache.has(key)) {
        const def = this.baseStatDef(item, stat), bounds = def ? this.deps.baseStatRollBounds(def) : null;
        this.baseCache.set(key, bounds ? { valMin: bounds.min, valMax: bounds.max, baseRollMin: bounds.min, baseRollMax: bounds.max, statName: this.deps.getStatName(stat.id) } : null);
      }
      return this.baseCache.get(key);
    }
    isLine(stat) {
      return !!stat && typeof stat === "object" && typeof stat.id === "string";
    }
    /** The line without the fields that equal their remade values; the line itself when nothing goes. A range goes only as a pair
         * (both ends equal), so the server never sees one end without the other (db/equipment-hall.sql hall_line_bounds). */
    slimLine(stat, fields) {
      if (!this.isLine(stat)) return stat;
      const gone = new Set(fields ? Object.keys(fields).filter((key) => stat[key] === fields[key]) : []);
      RANGE_PAIRS.forEach(([low, high]) => {
        if (gone.has(low) !== gone.has(high)) {
          gone.delete(low);
          gone.delete(high);
        }
      });
      if (stat.originalVal === null) gone.add("originalVal");
      if (!gone.size) return stat;
      const copy = { ...stat };
      gone.forEach((key) => delete copy[key]);
      return copy;
    }
    expandLine(stat, fields) {
      if (!this.isLine(stat)) return;
      if (fields) Object.keys(fields).forEach((key) => {
        if (stat[key] === void 0) stat[key] = fields[key];
      });
      if (stat.originalVal === void 0) stat.originalVal = null;
    }
    isEquipment(value) {
      return typeof value.slot === "string" && Array.isArray(value.stats) && Array.isArray(value.baseStats);
    }
    mapShared(list, map) {
      let out = null;
      for (let i = 0; i < list.length; i++) {
        const next = map(list[i]);
        if (next !== list[i]) {
          if (!out) out = list.slice();
          out[i] = next;
        }
      }
      return out || list;
    }
    mapObjectShared(object, map) {
      let out = null;
      for (const key of Object.keys(object)) {
        const next = map(object[key]);
        if (next !== object[key]) {
          if (!out) out = { ...object };
          out[key] = next;
        }
      }
      return out || object;
    }
    /** A copy of the item with its explicit and base lines slimmed; the item itself when no field goes. Fields other than the two lists are shared. */
    slimItem(item) {
      const stats = this.mapShared(item.stats, (stat) => this.slimLine(stat, this.isLine(stat) ? this.explicitFields(stat) : null));
      const baseStats = this.mapShared(item.baseStats, (stat) => this.slimLine(stat, this.isLine(stat) ? this.baseFields(item, stat) : null));
      return stats === item.stats && baseStats === item.baseStats ? item : { ...item, stats, baseStats };
    }
    /** Puts the slimmed fields back on the item's lines, in place. A line whose mod or base is unknown keeps what it has. */
    expandItem(item) {
      if (!item || typeof item !== "object" || !this.isEquipment(item)) return item;
      item.stats.forEach((stat) => this.expandLine(stat, this.isLine(stat) ? this.explicitFields(stat) : null));
      item.baseStats.forEach((stat) => this.expandLine(stat, this.isLine(stat) ? this.baseFields(item, stat) : null));
      return item;
    }
    /** The save with every equipment anywhere in it (bag, worn, stashes, presets, stall, altar, floor loot, codex) slimmed. Unchanged
         * branches are shared with the source, so it costs about the item copies and nothing else. */
    slimTree(value) {
      if (!value || typeof value !== "object") return value;
      if (Array.isArray(value)) return this.mapShared(value, this.slimTree);
      return this.isEquipment(value) ? this.slimItem(value) : this.mapObjectShared(value, this.slimTree);
    }
    /** Expands every equipment in a parsed save in place (the reverse of slimTree). Walked with a stack, not recursion. */
    expandTree(root) {
      const stack = [root];
      while (stack.length) {
        const value = stack.pop();
        if (!value || typeof value !== "object") continue;
        if (!Array.isArray(value) && this.isEquipment(value)) {
          this.expandItem(value);
          continue;
        }
        const children = Array.isArray(value) ? value : Object.values(value);
        for (let i = 0; i < children.length; i++) stack.push(children[i]);
      }
      return root;
    }
  };

  // modules/item-save-slim-classic.mjs
  var instance = new ItemSaveSlim({
    get MOD_DB() {
      return MOD_DB;
    },
    get BASE_ITEM_DB() {
      return BASE_ITEM_DB;
    },
    get getAffixTierRange() {
      return getAffixTierRange;
    },
    get getStatName() {
      return getStatName;
    },
    get baseStatRollBounds() {
      return baseStatRollBounds;
    }
  });
  window.GameModules.itemSaveSlim = instance;
  safeExposeGlobals({ itemSaveSlim: {
    slimTree: instance.slimTree,
    expandTree: instance.expandTree,
    slimItem: instance.slimItem,
    expandItem: instance.expandItem,
    isEquipment: instance.isEquipment
  } });
})();
