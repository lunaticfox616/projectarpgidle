// Saved slot identities; shared by bag storage and sockets without a bag <-> socket cycle.
export const JEWEL = '주얼', CORE = '코어';
export const isJewel = item => !!item && item.slot === JEWEL;
export const isCore = item => !!item && item.slot === CORE;
export const ownShape = item => isJewel(item) || isCore(item);
export const asJewel = jewel => Object.assign(jewel, { slot: JEWEL, baseStats: jewel.baseStats || [], locked: !!jewel.locked });
export const asCore = core => Object.assign(core, { slot: CORE, rarity: core.rarity || 'rare', stats: core.stats || [], baseStats: core.baseStats || [], locked: !!core.locked });
export const jewels = state => (state.inventory || []).filter(isJewel);
export const cores = state => (state.inventory || []).filter(isCore);
