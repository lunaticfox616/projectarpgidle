/** Saved crafting preferences and resource discovery; no UI or current-game access. */
class CraftingWorkspaceState {
  constructor(deps) {
    this.deps = deps;
    this.basic = ['magicBud', 'sapBud', 'formlessDew', 'goldenRule', 'blessing', 'blightSpore', 'pruningShears', 'fairyRing'];
    this.special = ['emberBranch', 'burningEmberBranch', 'ouroboros', 'deepWhetstone', 'rootIron', 'jewelPolish', 'abyssCatalyst', 'catalystPhys', 'catalystFire', 'catalystCold', 'catalystLight', 'catalystChaos', 'catalystCrit', 'catalystSummon', 'enchantedHoney', 'venomStinger', 'voidChisel', 'oceanRerollShard', 'altarEmber', 'altarIchor', 'memoryImprint'];
    this.materials = ['fossil', 'fossilPrimal', 'fossilAncientPrimal'];
    this.separate = Object.freeze([...this.materials, ...this.deps.CRAFT_OMENS.keys, 'memoryImprint']);
  }

  group(key) {
      if (this.basic.includes(key)) return 'basic';
      if (this.deps.CRAFT_OMENS.keys.includes(key)) return 'omen';
      if (this.materials.includes(key) || this.deps.FOSSIL_DB.some(row => row.key === key)) return 'fossil';
      return this.special.includes(key) ? 'special' : '';
  }

  /** Migration boundary: only known keys and finite goal values survive; no discovery is inferred from loop. The four 주 재화 pins of
   * older saves are dropped: the stash (modules/ui/crafting-stash-view.mjs) shows every crafting currency. */
  normalize(value, currencies = {}) {
      const source = value && typeof value === 'object' ? value : {};
      const seen = Array.isArray(source.discovered) ? source.discovered : [];
      const discovered = [...new Set([...seen, ...Object.keys(currencies).filter(key => currencies[key] > 0)].filter(key => this.group(key)))];
      return { discovered, goal: this.normalizeGoal(source.goal) };
  }

  /** One option ({statId}) or a tag count ({tag, minCount}, data/affix-tags.js), with a minimum tier. */
  normalizeSingleGoal(value) {
      const goal = value && typeof value === 'object' ? value : {};
      const tag = typeof goal.tag === 'string' && this.deps.AFFIX_TAG_LABELS[goal.tag] ? goal.tag : '';
      return {
          statId: !tag && typeof goal.statId === 'string' ? goal.statId.slice(0, 80) : '', tag,
          minCount: Number.isFinite(goal.minCount) ? Math.max(1, Math.min(6, Math.floor(goal.minCount))) : 1,
          minTier: Number.isFinite(goal.minTier) ? Math.max(0, Math.min(20, Math.floor(goal.minTier))) : 0
      };
  }

  normalizeGoal(value) {
      const source = value && typeof value === 'object' ? value : {};
      return { ...this.normalizeSingleGoal(source), match: source.match === 'any' ? 'any' : 'all',
          extra: (Array.isArray(source.extra) ? source.extra : []).slice(0, 2).map(this.normalizeSingleGoal.bind(this)) };
  }

  capture(state) {
      if (!state.craftingWorkspace) state.craftingWorkspace = this.normalize(null, state.currencies);
      const seen = state.craftingWorkspace.discovered;
      Object.keys(state.currencies).forEach(key => {
          if (state.currencies[key] > 0 && this.group(key) && !seen.includes(key)) seen.push(key);
      });
      return state.craftingWorkspace;
  }

  /** Saved panel migration and preferences are restored together without opening any UI. */
  restore(state) {
      const moved={'item-tab-fossil':'item-tab-craft'}; // 옛 칸이 들어간 곳(거래와 장비 전당은 2026-11-06부터 제 창, 장비 창은 장비 칸을 연다)
      const tab=moved[state.itemSubtab]||state.itemSubtab;
      const allowed=['item-tab-equip','item-tab-craft'];
      return {craftingWorkspace:this.normalize(state.craftingWorkspace,state.currencies),itemSubtab:allowed.includes(tab)?tab:'item-tab-equip'};
  }
}

export function createCraftingWorkspaceState(deps) {
  const instance = new CraftingWorkspaceState(deps);
  return Object.freeze({ normalize: instance.normalize.bind(instance), normalizeGoal: instance.normalizeGoal.bind(instance), capture: instance.capture.bind(instance), group: instance.group.bind(instance), separate: instance.separate, restore: instance.restore.bind(instance) });
}
