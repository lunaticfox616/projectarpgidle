import { groundLootKind } from './exploration-ground-loot.mjs';

/** Deliver already rolled rewards. No DOM, logging, FX or event dispatch; callers consume notices in order.
 * The inventory/currency ports still belong to their existing owners. A caller must use the same active state as those ports.
 * Floor clocks remain in the existing exploration owner, never in a second instance here. */
class LootDelivery {
    constructor(deps) { this.deps = deps; }
    floorFor(state, enemy) {
        const run = this.deps.exploration.current(state);
        return run && !run.arrival && !run.completionApplied && run.status !== 'failed' && !state.isBackgroundCalculation
            && this.deps.hasGridCell(enemy) ? run : null;
    }
    /** Hold encounter payouts, except uniques/guaranteed drops which must survive a failed run. */
    holdEquipment(state, enemy, item, options, { highlight, guaranteed }) {
        if (guaranteed || item.rarity === 'unique') return false;
        return this.deps.floor.reserve({ gx: enemy.gx, gy: enemy.gy, item, highlight: !!highlight, guaranteed,
            filterOnPickup: !options?.ignoreFilter, ignoreAutoSalvage: !!options?.ignoreAutoSalvage }, state);
    }
    keepEquipment(state, enemy, item, options) {
        const highlight = this.deps.policy.highlight(item, state);
        const keep = this.deps.previewEquipmentPickup(item, options) === 'kept';
        const guaranteed = this.deps.isGuaranteedEquipmentPickup(item, options);
        if (keep && this.holdEquipment(state, enemy, item, options, { highlight, guaranteed })) return { status: 'floor' };
        const run = this.floorFor(state, enemy);
        if (run && keep) {
            this.deps.floor.place(run, enemy, item, { highlight: !!highlight, guaranteed });
            return { status: 'floor', celebrate: true, highlight };
        }
        if (!this.deps.addItemToInventory(item, options)) return { status: null };
        return { status: 'kept', receipt: { item, itemKind: 'equipment', highlight } };
    }
    placeItem(state, enemy, kind, { item, overflow }) {
        if (this.deps.floor.reserve({ gx: enemy.gx, gy: enemy.gy, kind, item, overflow }, state)) return true;
        const run = this.floorFor(state, enemy);
        if (!run || (kind === 'jewel' && this.deps.bagItems.salvagedOnDrop(item))) return false;
        this.deps.floor.placeItem(run, enemy, kind, item, overflow);
        return true;
    }
    placeRune(state, enemy, gem) {
        if (this.deps.floor.reserve({ gx: enemy.gx, gy: enemy.gy, kind: 'rune', gem }, state)) return true;
        const run = this.floorFor(state, enemy);
        if (!run) return false;
        this.deps.floor.placeRune(run, enemy, gem);
        return true;
    }
    keepCurrency(state, enemy, key, amount) {
        const award = this.deps.resolveCurrencyAward(key, amount, 'drop');
        if (award.refused || award.gain <= 0) return { gain: 0, floor: false };
        if (this.deps.floor.reserve({ gx: enemy.gx, gy: enemy.gy, currency: award.key, count: award.gain }, state))
            return { gain: award.gain, floor: true };
        const run = this.floorFor(state, enemy);
        if (run) {
            this.deps.floor.placeCurrency(run, enemy, award.key, award.gain);
            return { gain: award.gain, floor: true };
        }
        this.deps.commitCurrencyGain(award.key, award.gain);
        return { gain: award.gain, floor: false, receipt: { currency: award.key, count: award.gain } };
    }
    awardCurrency(state, key, amount, source = 'reward') {
        const award = this.deps.resolveCurrencyAward(key, amount, source);
        if (award.refused || award.gain <= 0) return 0;
        if (!this.deps.floor.reserve({ gx: state.gridPlayer.gx, gy: state.gridPlayer.gy, currency: award.key, count: award.gain }, state))
            this.deps.commitCurrencyGain(award.key, award.gain);
        return award.gain;
    }
    /** Held and lying runes affect the next roll without granting skills before pickup. */
    reservedRuneState(state) {
        const held = this.deps.floor.encounterOwner(state)?.pendingLoot || [];
        const lying = this.deps.exploration.current(state)?.groundLoot || [];
        const waiting = [...held, ...lying].filter(row => row.kind === 'rune');
        if (!waiting.length) return state;
        const owner = { ...state, skills: [...state.skills], supports: [...state.supports],
            gemData: { ...state.gemData }, supportGemData: { ...state.supportGemData } };
        for (const row of waiting) Object.assign(owner, this.deps.gems.prepare(owner, [row.gem]));
        return owner;
    }
    receiveStump(state, row) {
        const { item, compost } = this.deps.stumpBox.receiveDrop(state, row.item);
        if (state.noti) state.noti.stump = true;
        return { ripened: compost ? compost.ripened : [], drop: item, compost };
    }
    receiveRune(state, row) {
        this.deps.gems.grant(state, row.gem, row.gem.kind === 'support' ? this.deps.gems.resonanceCap(state, this.deps.getPlayerStats()) : 0);
        this.deps.statCache.invalidate();
        return { kind: row.gem.kind, gem: row.gem, deferred: true };
    }
    receiveYarn(state, id) {
        const result = this.deps.knitting.receive(state, id);
        if (!result) return null;
        this.deps.receipts.yarn(state, id);
        return result;
    }
    rollYarn(state, enemy, zone) {
        const id = this.deps.knitting.rollKill(state, zone, enemy);
        if (!id) return null;
        this.deps.knitting.markDrop(state, id);
        if (this.deps.floor.reserve({ gx: enemy.gx, gy: enemy.gy, kind: 'yarn', yarn: id }, state)) return null;
        const run = this.floorFor(state, enemy);
        if (!run) return id;
        this.deps.floor.placeYarn(run, enemy, id);
        return null;
    }
    /** Resume only after presenting each notice: listeners may update state before the next reward. */
    *collect(state, rows) {
        const currencies = rows.filter(row => groundLootKind(row) === 'currency');
        currencies.forEach(row => this.deps.commitCurrencyGain(row.currency, row.count));
        // Match forEach's captured length: notices may append rows, but cannot add a second acquisition in this pass.
        const length = rows.length;
        for (let index = 0; index < length; index++) if (index in rows) yield* this.receiveRow(state, rows[index]);
        const fresh = rows.filter(row => groundLootKind(row) === 'equipment' && this.deps.moments.isNewUnique(row.item, state)).map(row => row.item.id);
        const kept = rows.filter(row => groundLootKind(row) === 'equipment'
            && this.deps.addItemToInventory(row.item, { ignoreFilter: !row.filterOnPickup, ignoreAutoSalvage: !!row.ignoreAutoSalvage,
                guaranteedKeep: row.guaranteed })).map(row => row.item);
        if (kept.length || currencies.length) yield { event: 'floor-loot-collected', detail: {
            items: kept, fresh: fresh.filter(id => kept.some(item => item.id === id)),
            currencies: currencies.map(row => ({ key: row.currency, count: row.count })) } };
        return kept.length + currencies.length;
    }
    *receiveRow(state, row) {
        const kind = groundLootKind(row);
        if (kind === 'core') {
            if (this.deps.coreItems.keep(row.item, state)) yield { event: 'core-item-received', detail: row.item };
        } else if (kind === 'talisman') {
            yield { action: 'talisman', detail: this.deps.talismans.receiveWild(state, { talisman: row.item, overflow: row.overflow }) };
        } else if (kind === 'leaf') {
            // Atlas still owns leaf acquisition and its notification; do not duplicate that implementation here.
            yield { action: 'leaf', detail: row.leaf };
        } else yield* this.receiveNamedRow(state, row, kind);
    }
    *receiveNamedRow(state, row, kind) {
        if (kind === 'jewel') yield { event: 'jewel-drop-received', detail: this.deps.receiveJewelDrop(row.item) };
        else if (kind === 'stump') yield { event: 'stump-box-changed', detail: this.receiveStump(state, row) };
        else if (kind === 'rune') yield { event: 'gem-loot-received', detail: this.receiveRune(state, row) };
        else if (kind === 'yarn') yield { action: 'yarn', detail: row.yarn };
    }
}

export const createLootDelivery = deps => new LootDelivery(deps);
