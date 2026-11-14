import { JEWEL, CORE, isJewel, isCore, ownShape, asJewel, asCore, jewels, cores } from '../common/bag-item-shape.mjs';
import { putBagItem, takeBagItem } from './bag-storage.mjs';
const RARITIES = ['normal', 'magic', 'rare', 'unique'];
// Special-item orchestration sits above core rules, sockets and stateless storage. State is supplied by callers.
class BagItems {
    constructor(deps) { this.deps = deps; }
    isSpecial(item) { return ownShape(item) || (!!this.deps.wards && this.deps.wards.isWard(item)); }
    /** Unique jewel art uses its saved identity, including loose drops that do not have a bag slot yet. */
    jewelArt(item) {
        const visuals = this.deps.visuals;
        return item && item.rarity === 'unique' && Object.hasOwn(visuals.uniqueJewelAssets, item.uniqueId)
            ? visuals.uniqueJewelAssets[item.uniqueId] : visuals.jewel;
    }
    /** Picture in the bag grid (js/items.js getEquipmentGridVisualAsset); '' for gear. */
    artOf(item) { return (isJewel(item) ? this.jewelArt(item) : isCore(item) ? this.deps.cores.icon(item) : ''); }
    /** Picked up whatever the pickup filter and the rarity auto-salvage say: jewels and cores always (they never had a filter),
     * wards while their always-pick chip is on. */
    keptOnPickup(item, state) { return ownShape(item) || this.deps.wards.keptOnPickup(item, state); }
    /** A jewel that drops is salvaged at once when the rarity auto-salvage takes its rarity (2026-10-12 사용자: 가방에 들어가게 된
     * 것들이 자동해체로 해체가 안 된다), unless the target rules want it, as with gear. Cores have no rarity to go by and are
     * always kept; wards follow their always-pick chip (this.keptOnPickup). */
    salvagedOnDrop(jewel, state) {
        const settings = state.settings || {};
        return !!settings.autoSalvageEnabled && !!(settings.autoSalvageRarities || {})[jewel.rarity || 'normal']
            && !this.deps.policy.matches(jewel, state);
    }
    /** "주얼 2개, 코어 1개, 액막이 1개": the special items among `items`, named in the bulk salvage confirms ('' when none). */
    countNote(items) {
        const counts = [[JEWEL, items.filter(isJewel).length], [CORE, items.filter(isCore).length],
            ['액막이', items.filter(item => this.deps.wards.isWard(item)).length]];
        return counts.filter(([, count]) => count > 0).map(([label, count]) => this.deps.translate('{label} {count}개', { label, count })).join(', ');
    }

    /** Load boundary of a jewel or a core in the bag or a slot (the old jewel store's rule: lines from getJewelStats, at most four,
     * five when waxed). A broken one keeps its place with no lines rather than vanishing. Neither has requirements, so the load's
     * requirement grace (js/save-migrations.js markLegacyEquipmentGrace) never sticks to a worn core. */
    normalize(item) {
        if (isCore(item)) Object.assign(item, this.deps.cores.normalizeCore(item) || { lines: [] });
        else {
            const stats = this.deps.jewelStats(item), waxed = !!item.waxedByBeeswax || stats.some(stat => stat && stat.waxBonus);
            Object.assign(item, { rarity: RARITIES.includes(item.rarity) ? item.rarity : 'normal', waxedByBeeswax: waxed, stats: stats.slice(0, waxed ? 5 : 4),
                hiddenTier: Math.max(1, ...stats.map(stat => Math.floor(stat.tier || 1))) });
        }
        delete item.legacyRequirementGrace;
        if (!item.id) item.id = this.deps.nextId();
        return isCore(item) ? asCore(item) : asJewel(item);
    }

    /** Puts the item into the bag at its first free place (the same way unequipping does). force: a full bag sends it to the
     * temporary storage instead, so it is never lost. @returns {boolean} */
    put(item, state, force = false) {
        return putBagItem(item, state, force, this.deps.placement);
    }
    /** Takes this item out of the bag. @returns {boolean} false when it is no longer there */
    take(item, state) { return takeBagItem(item, state); }

    /** A new jewel into the bag. With the bag full a rare or unique jewel waits in the temporary storage and the rest turn into
     * jewel shards (the old jewel store's rule). @returns {{ stored, protectOverflow, shardGain }} */
    addJewel(jewel, state) {
        asJewel(jewel);
        if (this.put(jewel, state)) return this.noted(state, { stored: true, protectOverflow: false, shardGain: 0 });
        if (['rare', 'unique'].includes(jewel.rarity)) return this.noted(state, { stored: this.put(jewel, state, true), protectOverflow: true, shardGain: 0 });
        return { stored: false, protectOverflow: false, shardGain: this.deps.salvageJewel(jewel, true, state) };
    }
    /** A new core into the bag; a full bag sends it to the temporary storage (cores are always kept). */
    addCore(core, state) { return this.noted(state, this.put(asCore(core), state, true)); }
    /** Something new came in: the bag tab's notice dot. */
    noted(state, result) {
        if (state.noti) state.noti.items = true;
        return result;
    }

    /** The equipped slots a jewel can go into: items with an empty socket, in paperdoll order. */
    jewelSlots(state) {
        return Object.entries(state.equipment || {})
            .filter(([, item]) => item && !this.isSpecial(item) && this.deps.sockets.list(item).some(this.deps.sockets.takesJewel)).map(([slot]) => slot);
    }
    /** js/items.js getEquipCandidateSlots for the special kinds: a jewel goes to worn items with an empty socket, a core to the
     * core slot (once cores are open), a ward to the open ward slots. null for plain gear. */
    candidateSlots(item, state) {
        if (isJewel(item)) return this.jewelSlots(state);
        if (isCore(item)) return this.deps.isUnlocked('cube', state) ? [CORE] : [];
        return this.deps.wards.isWard(item) ? this.deps.wards.openSlots(state) : null;
    }
    /** Sockets a bag jewel into the item in `slot` (or the first worn item with an empty socket). '' when done, otherwise why not. */
    socketFromBag(jewel, slot, state) {
        const target = slot || this.jewelSlots(state)[0];
        const item = target ? (state.equipment || {})[target] : null;
        if (!item || this.isSpecial(item)) return '빈 소켓이 있는 장비가 없습니다.';
        const result = this.deps.sockets.insert(item, jewel.id, state);
        return result.ok ? '' : result.reason;
    }

    /** Salvage rewards of the special kinds (js/item-rolls.js getItemSalvageRewardProfile): jewels give jewel shards as before,
     * wards colony shards, cores nothing (a core was only ever thrown away). */
    salvageProfile(item) {
        if (isJewel(item)) return { guaranteed: { jewelShard: this.deps.jewelShardGain(item) }, chances: [] };
        return isCore(item) ? { guaranteed: {}, chances: [] } : this.deps.wards.salvageProfile(item);
    }

    // ---------------------------------------------------------------- saves from before 2026-10-10
    /** The jewel store goes into the bag (past a full bag into the temporary storage); store expansions come back as the golden
     * rules they cost (1, 2, 3, ...). */
    migrateJewels(state) {
        (Array.isArray(state.jewelInventory) ? state.jewelInventory : []).filter(jewel => jewel && typeof jewel === 'object')
            .forEach(jewel => this.put(asJewel(jewel), state, true));
        state.jewelInventory = [];
        const bought = Math.max(0, Math.floor(Number(state.jewelInventoryExpandLevel) || 0));
        if (bought && state.currencies) state.currencies.goldenRule = (Number(state.currencies.goldenRule) || 0) + bought * (bought + 1) / 2;
        state.jewelInventoryExpandLevel = 0;
    }
    /** The worn core goes into the equipment slot '코어' (into the bag when that slot is taken), the stored ones into the bag. */
    migrateCores(state) {
        const store = state.cores && typeof state.cores === 'object' ? state.cores : {};
        const worn = this.deps.cores.normalizeCore(store.equipped);
        if (worn && state.equipment[CORE]) this.put(asCore(worn), state, true);
        else if (worn) state.equipment[CORE] = asCore(worn);
        (Array.isArray(store.owned) ? store.owned : []).map(this.deps.cores.normalizeCore).filter(Boolean).forEach(core => this.put(asCore(core), state, true));
        state.cores = this.deps.cores.defaultState();
    }
    /** Both old stores into the bag and the slot. Twice is the same: the stores empty. */
    migrate(state) {
        if (!state || !state.equipment) return;
        this.migrateJewels(state);
        this.migrateCores(state);
    }

}
export function createBagItems(deps) {
    const bag = new BagItems(deps);
    return Object.freeze({ JEWEL, CORE, isJewel, isCore, ownShape, asJewel, asCore, jewels, cores, ...Object.fromEntries(["isSpecial","jewelArt","artOf","keptOnPickup","salvagedOnDrop","countNote","normalize","put","take","addJewel","addCore","jewelSlots","candidateSlots","socketFromBag","salvageProfile","migrate"].map(name => [name, bag[name].bind(bag)])) });
}
