/** Isolated equipment comparisons. Only the supplied stats reader evaluates an owner; this module never swaps live state. */
function freezeInventoryRecord(value) {
    if (!value || typeof value !== 'object') return value;
    Object.values(value).forEach(freezeInventoryRecord);
    return Object.freeze(value);
}

class EquipmentTriageAnalysis {
  constructor(deps) {
    this.deps = deps;
    this.analyzedAs = new WeakMap();
    this.analyzable = item => !!item && item.id !== undefined && !this.deps.bagItems.isJewel(item);
  }

  getDamageScore(stats) {
      return Math.max(0, Number(stats && stats.totalDps) || Number(stats && stats.dps) || 0);
  }

  getEhpScore(stats) {
      if (typeof this.deps.calculatePlayerEhpProfile !== 'function') {
          return Math.max(1, Number(stats && stats.maxHp) + Number(stats && stats.energyShield) || 1);
      }
      const profile = this.deps.calculatePlayerEhpProfile(stats || {});
      const values = Object.values(profile.elements || {})
          .map(row => Number(row && row.entropy) || 0).filter(value => value > 0);
      return values.length > 0 ? Math.min(...values) : Math.max(1, Number(profile.pool) || 1);
  }

  getCandidateSlots(item) {
      if (!item) return [];
      const slots = typeof this.deps.getEquipCandidateSlots === 'function'
          ? this.deps.getEquipCandidateSlots(item) : [item.slot];
      return Array.from(new Set(slots.filter(Boolean)));
  }

  evaluateCandidateSlot(item, slot, work) {
      const after = this.readSnapshotStats(work.snapshot, item, slot);
      return { slot, dpsRatio: this.getDamageScore(after) / work.baseline.dps,
          ehpRatio: this.getEhpScore(after) / work.baseline.ehp };
  }

  createAnalysisWork(owner, readCombatTime, only = null) {
      // Stat providers only read inventory (e.g. the old-box jewel's rarity bonus).
      // Share its isolated, immutable copy; reparsing hundreds of full items per slot
      // would cost more than the numeric-only evaluation saves. The exploration run is no stat input
      // (js/combat-equipment-stats.js permanentSnapshot): one copy, shared by every slot.
      const inventory = freezeInventoryRecord(JSON.parse(JSON.stringify(owner.inventory)));
      const exploration = owner.actExploration === undefined ? undefined : JSON.parse(JSON.stringify(owner.actExploration));
      const snapshot = { inventory, exploration,
          gameJson: JSON.stringify({ ...owner, inventory: undefined, actExploration: undefined, combatTimeMs: readCombatTime() }) };
      const items = inventory.filter(item => this.analyzable(item) && (!only || only.has(String(item.id))))
          .map(item => ({ item, slots: this.getCandidateSlots(item), key: JSON.stringify(item) }));
      return { items, index: 0, snapshot, baseline: this.createBaseline(snapshot) };
  }

  isSpecialCandidate(item) {
      return !!(item && (item.rarity === 'unique' || item.encroached || item.corrupted
          || item.loopSealed || item.fusedRelic || item.dropOnly || item.cosmosChase || item.ultraRare));
  }

  percentGain(ratio) {
      return Math.max(0, Math.round((Math.max(0, Number(ratio) || 1) - 1) * 1000) / 10);
  }

  classifyCandidate(candidate, work) {
      const { item, slots } = candidate;
      const rows = slots.map(slot => this.evaluateCandidateSlot(item, slot, work));
      const bestDps = rows.reduce((best, row) => row.dpsRatio > best.dpsRatio ? row : best,
          { slot: '', dpsRatio: 1, ehpRatio: 1 });
      const bestEhp = rows.reduce((best, row) => row.ehpRatio > best.ehpRatio ? row : best,
          { slot: '', dpsRatio: 1, ehpRatio: 1 });
      const balanced = rows.filter(row => row.dpsRatio >= 1.01 && row.ehpRatio >= 1.01)
          .sort((a, b) => Math.min(b.dpsRatio, b.ehpRatio) - Math.min(a.dpsRatio, a.ehpRatio))[0] || null;
      const dpsGainPct = this.percentGain(bestDps.dpsRatio);
      const ehpGainPct = this.percentGain(bestEhp.ehpRatio);
      let kind = balanced ? 'balanced' : (dpsGainPct >= 1 ? 'damage' : (ehpGainPct >= 1 ? 'defense' : 'keep'));
      const upgrade = rows.some(row => (row.dpsRatio >= 1.01 && row.ehpRatio >= 0.99) || (row.ehpRatio >= 1.01 && row.dpsRatio >= 0.99));
      const result = {
          kind, dpsGainPct, ehpGainPct, upgrade, special: this.isSpecialCandidate(item),
          dpsSlot: balanced ? balanced.slot : bestDps.slot,
          ehpSlot: balanced ? balanced.slot : bestEhp.slot
      };
      this.analyzedAs.set(result, candidate.key);
      return result;
  }

  createBaseline(snapshot) {
      const stats = this.readSnapshotStats(snapshot);
      return { dps: Math.max(1, this.getDamageScore(stats)), ehp: Math.max(1, this.getEhpScore(stats)) };
  }

  readSnapshotStats(snapshot, item, slot) {
      const owner = JSON.parse(snapshot.gameJson);
      owner.inventory = snapshot.inventory;
      if (snapshot.exploration !== undefined) owner.actExploration = snapshot.exploration;
      if (item) owner.equipment[slot] = JSON.parse(JSON.stringify(item));
      return this.deps.readStats(owner);
  }
}

export function createEquipmentTriageAnalysis(deps) {
  const instance = new EquipmentTriageAnalysis(deps);
  return Object.freeze({ createWork: instance.createAnalysisWork.bind(instance), classify: instance.classifyCandidate.bind(instance), analyzable: instance.analyzable,
    candidateSlots: instance.getCandidateSlots.bind(instance), analyzedKey: result => instance.analyzedAs.get(result) });
}
