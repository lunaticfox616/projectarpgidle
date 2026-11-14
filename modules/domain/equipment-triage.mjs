import { createEquipmentTriageAnalysis } from './equipment-triage-analysis.mjs';
export const EQUIPMENT_TRIAGE_FILTER_IDS = Object.freeze(['all', 'balanced', 'damage', 'defense', 'special', 'keep']);

/** One analysis service owns results, cancellation tokens and snapshots. Timers, DOM and notifications belong to the controller. */
class EquipmentTriage {
  constructor(deps) {
    this.deps = deps;
    this.analysis = createEquipmentTriageAnalysis(this.deps);
    this.state = { status: 'idle', filter: 'all', results: new Map(), signature: '', token: 0, work: null, lastSyncAt: 0 };
    this.freshGearAt = 0;
    this.getBuildSignature = owner => this.deps.getPersistentBuildSignature(owner, false);
  }

  getCounts() {
      const rows = Array.from(this.state.results.values());
      return {
          all: rows.length,
          balanced: rows.filter(row => row.kind === 'balanced').length,
          damage: rows.filter(row => row.dpsGainPct >= 1).length,
          defense: rows.filter(row => row.ehpGainPct >= 1).length,
          special: rows.filter(row => row.special).length,
          keep: rows.filter(row => row.kind === 'keep' && !row.special).length
      };
  }

  getRecommendedCandidate(owner) {
      if (this.state.status !== 'ready' || ['special', 'keep'].includes(this.state.filter)) return null;
      const candidates = (Array.isArray(owner.inventory) ? owner.inventory : []).map(item => ({ item, result: this.getResult(item) }));
      const ranked = candidates.map(candidate => {
          const result = candidate.result;
          if (!result) return null;
          if (this.state.filter === 'damage' && result.dpsGainPct >= 1) return { ...candidate, slot: result.dpsSlot, score: result.dpsGainPct };
          if (this.state.filter === 'defense' && result.ehpGainPct >= 1) return { ...candidate, slot: result.ehpSlot, score: result.ehpGainPct };
          if (['all', 'balanced'].includes(this.state.filter) && result.kind === 'balanced') {
              return { ...candidate, slot: result.dpsSlot, score: Math.min(result.dpsGainPct, result.ehpGainPct) };
          }
          return null;
      }).filter(Boolean).sort((a, b) => b.score - a.score);
      return ranked[0] || null;
  }

  matchesFilter(result) {
      if (this.state.filter === 'all') return true;
      if (!result) return false;
      if (this.state.filter === 'balanced') return result.kind === 'balanced';
      if (this.state.filter === 'damage') return result.dpsGainPct >= 1;
      if (this.state.filter === 'defense') return result.ehpGainPct >= 1;
      if (this.state.filter === 'special') return result.special;
      return result.kind === 'keep' && !result.special;
  }

  filterRows(rows) {
      if (this.state.status !== 'ready' || this.state.filter === 'all') return rows;
      return rows.map(row => ({ ...row, filterActive: true,
          filterMatched: row.filterMatched !== false && this.matchesFilter(this.getResult(row.item)) }));
  }

  getResult(item) {
      if (this.state.status !== 'ready' || !item || item.id === undefined) return null;
      return this.state.results.get(String(item.id)) || null;
  }

  currentFilter() {
      return this.state.status === 'ready' ? this.state.filter : 'all';
  }

  clearResults(status) {
      this.state.token += 1;
      this.state.status = status;
      this.state.filter = 'all';
      this.state.results = new Map();
      this.state.signature = '';
      this.state.work = null;
      this.state.lastSyncAt = 0;
  }

  sync(owner, force, now) {
      if (this.state.status !== 'ready' && this.state.status !== 'running') return false;
      if (!force && now - this.state.lastSyncAt < 500) return false;
      this.state.lastSyncAt = now;
      return this.getBuildSignature(owner) !== this.state.signature;
  }

  prepareStart() {
      this.state.status = 'running';
      this.state.filter = 'all';
      this.state.results = new Map();
  }

  begin(owner, readCombatTime, ids, clock) {
      this.state.token += 1;
      if (!ids) this.state.signature = this.getBuildSignature(owner);
      this.state.work = this.analysis.createWork(owner, readCombatTime, ids);
      this.state.lastSyncAt = clock();
  }

  finish(owner, token, clock) {
      if (token !== this.state.token || !this.state.work) return false;
      if (this.getBuildSignature(owner) !== this.state.signature) return 'stale';
      this.state.status = 'ready';
      this.state.work = null;
      this.state.lastSyncAt = clock();
      return true;
  }

  /** At least three items per chunk; after that yield when 10 ms has elapsed. */
  step(token, clock, started) {
      if (token !== this.state.token || !this.state.work) return;
      const first = this.state.work.index;
      do {
          const candidate = this.state.work.items[this.state.work.index++];
          this.state.results.set(String(candidate.item.id), this.analysis.classify(candidate, this.state.work));
      } while (this.state.work.index < this.state.work.items.length && (this.state.work.index - first < 3 || clock() - started < 10));
  }

  changedIds(owner) {
      const live = new Map();
      (owner.inventory || []).forEach(item => { if (this.analysis.analyzable(item)) live.set(String(item.id), item); });
      Array.from(this.state.results.keys()).forEach(id => { if (!live.has(id)) this.state.results.delete(id); });
      const changed = Array.from(live).filter(([id, item]) => this.analysis.analyzedKey(this.state.results.get(id)) !== JSON.stringify(item));
      return new Set(changed.map(([id]) => id));
  }

  setFilter(filterId) {
      if (this.state.status !== 'ready' || !EQUIPMENT_TRIAGE_FILTER_IDS.includes(filterId)) return false;
      this.state.filter = filterId;
      return true;
  }

  rate(owner, item, readCombatTime) {
      return this.analysis.analyzable(item) ? this.analysis.classify({ item, slots: this.analysis.candidateSlots(item), key: '' },
          this.analysis.createWork(owner, readCombatTime, new Set())) : null;
  }

  /** Four newly acquired items per four seconds; never during background settlement. */
  checkFreshGear(owner, now, readCombatTime) {
      if (now < this.freshGearAt || owner.isBackgroundCalculation) return;
      this.freshGearAt = now + 4000;
      const ids = new Set(this.deps.takeFreshGearIds(4).map(String));
      if (!ids.size) return;
      const work = this.analysis.createWork(owner, readCombatTime, ids);
      const keep = this.state.status === 'ready' && !this.state.work && this.getBuildSignature(owner) === this.state.signature;
      const results = work.items.map(candidate => [String(candidate.item.id), this.analysis.classify(candidate, work)]);
      if (keep) results.forEach(([id, result]) => this.state.results.set(id, result));
      if (results.some(([, result]) => result.upgrade)) owner.noti.items = true;
  }
}

export function createEquipmentTriage(deps) {
  const instance = new EquipmentTriage(deps);
  return Object.freeze({ view: instance.state, getCounts: instance.getCounts.bind(instance), getRecommendedCandidate: instance.getRecommendedCandidate.bind(instance), filterRows: instance.filterRows.bind(instance), currentFilter: instance.currentFilter.bind(instance), getResult: instance.getResult.bind(instance),
    clearResults: instance.clearResults.bind(instance), sync: instance.sync.bind(instance), prepareStart: instance.prepareStart.bind(instance), begin: instance.begin.bind(instance), finish: instance.finish.bind(instance), step: instance.step.bind(instance), changedIds: instance.changedIds.bind(instance), setFilter: instance.setFilter.bind(instance), rate: instance.rate.bind(instance), checkFreshGear: instance.checkFreshGear.bind(instance) });
}
