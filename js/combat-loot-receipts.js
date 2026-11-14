// GENERATED from modules/combat-loot-receipts*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/combat-loot-receipts.mjs
  var HELD_ITEMS = 4;
  var MOMENT_RANK = Object.freeze({ good: 1, great: 2, jackpot: 3 });
  var RARITIES = Object.freeze(["normal", "magic", "rare", "unique"]);
  var findRank = (row) => (MOMENT_RANK[row.moment] || 0) * 2 + Number(row.rarity === "unique");
  var validItem = (row) => row && typeof row.name === "string" && typeof row.slot === "string" && RARITIES.includes(row.rarity);
  var CombatLootReceipts = class {
    constructor(deps) {
      this.deps = deps;
      this.capturedState = null;
    }
    reset(state) {
      state.explorationLoot = { currencies: {}, items: [], equipmentCount: 0, leaves: {}, yarns: {} };
    }
    /** Synchronous captures may nest; restore the outer owner even if production throws. */
    capture(state, produce) {
      if (!state.atlas.run || state.currentZoneId !== this.deps.atlasZoneId) return produce();
      if (!state.explorationLoot) this.reset(state);
      const previous = this.capturedState;
      this.capturedState = state;
      try {
        return produce();
      } finally {
        this.capturedState = previous;
      }
    }
    currency(state, key, amount) {
      if (this.capturedState !== state || !this.deps.currencies[key] || !(amount > 0)) return;
      const receipt = state.explorationLoot;
      receipt.currencies[key] = (receipt.currencies[key] || 0) + amount;
    }
    item(state, found, kind = "equipment") {
      if (this.capturedState !== state) return;
      const receipt = state.explorationLoot;
      if (kind === "equipment") receipt.equipmentCount++;
      const moment = this.deps.moments.ofItem(found, kind);
      if (!moment && !["rare", "unique"].includes(found.rarity)) return;
      receipt.items.push({
        name: String(found.name),
        rarity: found.rarity,
        slot: kind === "jewel" ? "주얼" : String(found.slot),
        moment,
        fresh: this.deps.moments.isNewUnique(found)
      });
      receipt.items.sort((a, b) => findRank(b) - findRank(a));
      receipt.items.length = Math.min(HELD_ITEMS, receipt.items.length);
    }
    leaf(state, id) {
      if (this.capturedState !== state) return;
      const leaves = state.explorationLoot.leaves;
      leaves[id] = (leaves[id] || 0) + 1;
    }
    yarn(state, id) {
      if (this.capturedState !== state) return;
      const yarns = state.explorationLoot.yarns;
      yarns[id] = (yarns[id] || 0) + 1;
    }
    floorRow(state, row) {
      if (row.kind === "yarn") this.yarn(state, row.yarn);
      else if (row.kind === "leaf") this.leaf(state, row.leaf);
      else if (!row.kind || row.kind === "jewel") this.item(state, row.item, row.kind || "equipment");
    }
    normalize(state) {
      const raw = state.explorationLoot;
      if (!raw || typeof raw !== "object") {
        state.explorationLoot = null;
        return;
      }
      this.reset(state);
      const receipt = state.explorationLoot;
      for (const key of Object.keys(this.deps.currencies)) {
        const value = raw.currencies?.[key];
        if (Number.isFinite(value) && value > 0) receipt.currencies[key] = value;
      }
      receipt.items = this.cleanItems(raw.items);
      receipt.leaves = this.cleanLeaves(raw.leaves);
      receipt.yarns = this.cleanYarns(raw.yarns);
      receipt.equipmentCount = Math.max(receipt.items.length, Math.floor(Number(raw.equipmentCount) || 0));
      if (!Number.isFinite(receipt.equipmentCount)) receipt.equipmentCount = receipt.items.length;
    }
    cleanItems(raw) {
      return (Array.isArray(raw) ? raw : []).filter(validItem).slice(0, HELD_ITEMS).map(({ name, rarity, slot, moment, fresh }) => ({
        name: name.slice(0, 100),
        rarity,
        slot: slot.slice(0, 30),
        moment: Object.hasOwn(MOMENT_RANK, moment) ? moment : null,
        fresh: fresh === true
      }));
    }
    cleanLeaves(raw) {
      const leaves = {};
      for (const [id, value] of Object.entries(raw && typeof raw === "object" ? raw : {})) {
        const count = Math.floor(Number(value));
        if (this.deps.memoryLeaves.validId(id) && count > 0) leaves[id] = Math.min(this.deps.leafCap, count);
      }
      return leaves;
    }
    cleanYarns(raw) {
      return Object.fromEntries(Object.entries(raw && typeof raw === "object" ? raw : {}).filter(([id, n]) => this.deps.knitting.validId(id) && Number.isFinite(n) && n > 0).map(([id, n]) => [id, Math.min(this.deps.yarnCap, Math.floor(n))]));
    }
  };
  function createCombatLootReceipts(deps) {
    const receipts = new CombatLootReceipts(deps);
    return Object.fromEntries(["reset", "capture", "currency", "item", "leaf", "yarn", "floorRow", "normalize", "cleanItems", "cleanLeaves", "cleanYarns"].map((name) => [name, receipts[name].bind(receipts)]));
  }

  // modules/combat-loot-receipts-classic.mjs
  var combatLootReceipts = createCombatLootReceipts({
    get atlasZoneId() {
      return ATLAS.zoneId;
    },
    get currencies() {
      return ORB_DB;
    },
    get moments() {
      return lootMoments;
    },
    get memoryLeaves() {
      return memoryLeaves;
    },
    get knitting() {
      return knitting;
    },
    get leafCap() {
      return MEMORY_LEAVES.countCap;
    },
    get yarnCap() {
      return KNITTING.countCap;
    }
  });
  safeExposeGlobals({ combatLootReceipts });
})();
