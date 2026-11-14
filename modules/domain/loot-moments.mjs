const TIERS = Object.freeze(['good', 'great', 'jackpot']);
const momentRank = tier => TIERS.indexOf(tier) + 1;
const higherMoment = (a, b) => (momentRank(a) >= momentRank(b) ? a : b);

/** A common display classification for dropped and retained loot; it never grants rewards. */
class LootMoments {
    constructor(tables, deps, policy) {
        this.tables = tables; this.deps = deps; this.policy = policy;
        this.byCurrency = new Map(TIERS.flatMap(tier => tables.LOOT_OMENS.moments[tier].map(key => [key, tier])));
        this.itemKinds = Object.freeze({
            equipment: item => this.ofEquipment(item),
            jewel: item => (item.rarity === 'unique' ? 'great' : item.rarity === 'rare' ? 'good' : null),
            talisman: item => (item.rarity === 'unique' ? 'great' : null),
            core: item => (item.perfect ? 'jackpot' : 'good') // 완전한 코어는 체이싱 티어(js/core-items.js)
        });
    }
    rank(tier) { return momentRank(tier); }
    higher(a, b) { return higherMoment(a, b); }
    ofCurrency(key) { return this.byCurrency.get(this.deps.getCanonicalCurrencyKey(key)) || null; }
    ofRune(gem) { return this.tables.SKILL_DB[typeof gem === 'string' ? gem : gem.name]?.chase ? 'jackpot' : null; }
    fineLines(item) {
        const rules = this.tables.LOOT_OMENS.fineRare, cap = Number(item.affixTierCap) || 0, floor = cap - rules.band + 1;
        return cap >= rules.minCap && Array.isArray(item.stats) ? item.stats.filter(stat => Number(stat.tier) >= floor).length : 0;
    }
    ofRare(item) {
        const lines = this.fineLines(item), rules = this.tables.LOOT_OMENS.fineRare;
        return lines >= rules.good ? 'good' : null;
    }
    ofEquipment(item) {
        if (item.rarity === 'unique') return this.deps.isChaseUniqueItem(item) ? 'jackpot' : 'great';
        if (item.exceptionalAllLines) return 'great';
        const base = item.exceptionalBase || item.corrupted || item.voidSocket ? 'good' : null;
        return item.rarity === 'rare' ? higherMoment(base, this.ofRare(item)) : base;
    }
    ofItem(item, kind = 'equipment') {
        const judge = this.itemKinds[kind];
        return item && judge ? judge(item) : null;
    }
    ofReceipt(state, receipt) {
        if (receipt.currency) return this.ofCurrency(receipt.currency);
        if (receipt.leaf) return this.deps.memoryLeaves.momentOf(state, receipt.leaf);
        if (receipt.yarn) return 'good';
        if (receipt.gem) return this.ofRune(receipt.gem);
        const tier = this.ofItem(receipt.item, receipt.itemKind || 'equipment');
        const hunted = receipt.highlight && (this.policy.highlight(receipt.item, state)?.priority || 0) >= 3;
        return hunted ? higherMoment(tier, 'great') : tier;
    }
    isNewUnique(item, state) {
        if (!item || item.rarity !== 'unique') return false;
        const key = this.deps.getUniqueCodexKeyByItem(item), entry = key && state.uniqueCodex ? state.uniqueCodex[key] : null;
        return !!key && !(entry && entry.baseName);
    }
}
export const createLootMoments = (tables, deps, policy) => new LootMoments(tables, deps, policy);
