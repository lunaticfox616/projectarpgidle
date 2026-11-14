import { readCombatTime } from '../common/combat-clock.mjs';

// A gap of more than eight seconds starts a new fight. This ledger is not serialized.
const FIGHT_GAP_MS = 8000;
const DAMAGE_AILMENT_SOURCES = ['점화', '중독', '출혈'];

/** Recent events stay in the existing save field; whole-fight summaries belong to each game instance. */
export class DeathDamageHistory {
    constructor(deps) {
        this.deps = deps;
        this.ledgers = new WeakMap();
    }

    snapshotAilments(owner) {
        return (Array.isArray(owner.playerAilments) ? owner.playerAilments : [])
            .filter(ail => ail && (ail.time || 0) > 0)
            .map(ail => ({
                type: ail.type || 'unknown',
                label: this.deps.ailmentLabel(ail.type),
                time: Math.max(0, Math.ceil(ail.time || 0)),
                power: Math.max(0, Number(ail.power) || 0),
                sourceHitDamage: Math.max(0, Math.floor(this.deps.storedHitDamage(ail))),
                sourceEnemyName: ail.sourceEnemyName || ''
            }));
    }

    prune(owner, now) {
        const threshold = now - 3200;
        owner.recentDamageEvents = Array.isArray(owner.recentDamageEvents)
            ? owner.recentDamageEvents.filter(entry => entry && entry.at >= threshold) : [];
    }

    record(owner, ele, amount, sourceName, options) {
        const now = readCombatTime(owner, Date.now);
        const opts = options && typeof options === 'object' ? options : {};
        this.prune(owner, now);
        const entry = {
            at: now,
            ele: this.deps.elementKey(ele),
            amount: Math.max(0, Math.floor(amount || 0)),
            source: sourceName || '',
            sourceType: opts.sourceType || 'hazard',
            sourceId: opts.sourceId === undefined ? null : opts.sourceId,
            sourceName: opts.sourceName || sourceName || '',
            ailmentType: opts.ailmentType || ''
        };
        owner.recentDamageEvents.push(entry);
        this.accumulate(owner, entry);
    }

    accumulate(owner, entry) {
        let ledger = this.ledgers.get(owner);
        if (!ledger || entry.at < ledger.lastAt || entry.at - ledger.lastAt > FIGHT_GAP_MS) {
            ledger = { startedAt: entry.at, lastAt: entry.at, rows: new Map() };
            this.ledgers.set(owner, ledger);
        }
        ledger.lastAt = entry.at;
        const key = [entry.ele, entry.sourceType, entry.sourceId, entry.sourceName, entry.source, entry.ailmentType].join('|');
        const row = ledger.rows.get(key);
        if (row) row.amount += entry.amount;
        else ledger.rows.set(key, { ...entry });
    }

    takeFight(owner) {
        const ledger = this.ledgers.get(owner);
        this.ledgers.delete(owner);
        if (!ledger) return null;
        const rows = [...ledger.rows.values()];
        return {
            seconds: Math.max(1, Math.round((ledger.lastAt - ledger.startedAt) / 1000)),
            damageSummary: this.summarizeElements(owner, Infinity, { events: rows }),
            ailmentDamageSummary: this.summarizeElements(owner, Infinity, { events: rows, ailmentOnly: true }),
            monsterSummary: this.summarizeMonsters(owner, Infinity, rows)
        };
    }

    summarizeElements(owner, windowMs, opts) {
        const now = readCombatTime(owner, Date.now);
        this.prune(owner, now);
        const options = opts || {};
        const totals = { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0, other: 0 };
        (options.events || owner.recentDamageEvents || []).forEach(entry => {
            if (!entry || entry.at < now - (windowMs || 3000)) return;
            if (options.ailmentOnly && !entry.ailmentType && !DAMAGE_AILMENT_SOURCES.includes(entry.source || '')) return;
            totals[this.deps.elementKey(entry.ele)] += Math.max(0, Math.floor(entry.amount || 0));
        });
        return Object.keys(totals)
            .map(key => ({ ele: key, value: totals[key] }))
            .filter(entry => entry.value > 0)
            .sort((a, b) => b.value - a.value);
    }

    summarizeMonsters(owner, windowMs, events) {
        const now = readCombatTime(owner, Date.now);
        this.prune(owner, now);
        const grouped = new Map();
        (events || owner.recentDamageEvents || []).forEach(entry => {
            if (!entry || entry.at < now - (windowMs || 3000) || entry.sourceType !== 'monster') return;
            this.addMonsterDamage(grouped, entry);
        });
        return Array.from(grouped.values()).map(row => {
            const dominant = Object.entries(row.byElement).sort((a, b) => b[1] - a[1])[0];
            return { ...row, primaryElement: dominant ? dominant[0] : 'phys' };
        }).sort((a, b) => b.value - a.value);
    }

    addMonsterDamage(grouped, entry) {
        const key = entry.sourceId === null || entry.sourceId === undefined
            ? `name:${entry.sourceName || entry.source}` : `id:${entry.sourceId}`;
        const row = grouped.get(key) || { sourceId: entry.sourceId, name: entry.sourceName || entry.source || '알 수 없는 몬스터', value: 0, byElement: {} };
        const element = this.deps.elementKey(entry.ele);
        const value = Math.max(0, Math.floor(entry.amount || 0));
        row.value += value;
        row.byElement[element] = (row.byElement[element] || 0) + value;
        grouped.set(key, row);
    }
}
