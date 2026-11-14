// Core lines, rolling and legacy-store normalization. State, ID allocation and random draws are explicit inputs.
const PERFECT = Object.freeze({ perfect: true, rarity: 'unique', chaseUnique: true });
class CoreItems {
    constructor(tables, deps) { this.tables = tables; this.deps = deps; this.pool = new Map(tables.options.map(def => [def.id, def])); }

    defaultState() {
        return { equipped: null, owned: [] };
    }

    clampValue(def, value) {
        const number = Number(value);
        const clamped = Math.min(def.max, Math.max(def.min, Number.isFinite(number) ? number : def.min));
        return def.decimals ? Number(clamped.toFixed(def.decimals)) : Math.round(clamped);
    }

    // Derived numbers come from the option pool, so a saved line can never carry more than its range allows.
    makeLine(def, value, extraValue) {
        const line = { id: def.id, value: this.clampValue(def, value) };
        if (def.extraMin) line.extraValue = this.clampValue({ min: def.extraMin, max: def.extraMax }, extraValue);
        if (def.pairedStat) line.pairedValue = def.extraMin ? line.extraValue : line.value * (def.pairedMul || 1);
        return line;
    }

    nameFor(lines, perfect = false) {
        const name = this.deps.translate('{groupNames}의 코어', { groupNames: this.tables.rules.groupNames[this.pool.get(lines[0].id).group] });
        return perfect ? `${this.tables.rules.perfect.prefix} ${name}` : name;
    }

    isCoreShape(raw) {
        return !!raw && typeof raw === 'object' && Number.isSafeInteger(raw.id) && raw.id > 0 && Array.isArray(raw.lines);
    }

    normalizeCore(raw) {
        if (!this.isCoreShape(raw)) return null;
        const lines = [];
        for (const row of raw.lines) {
            const def = row && this.pool.get(row.id);
            if (def && !lines.some(line => line.id === def.id)) lines.push(this.makeLine(def, row.value, row.extraValue));
        }
        const kept = lines.slice(0, this.tables.rules.lines);
        if (!kept.length) return null;
        return raw.perfect === true ? { id: raw.id, name: this.nameFor(kept, true), lines: kept, ...PERFECT } : { id: raw.id, name: this.nameFor(kept), lines: kept };
    }

    /** The store of saves from before 2026-10-10 (bagItems.migrate empties it): unknown lines drop, values clamp to the pool, ids
     * stay unique. Normalizing twice changes nothing. */
    normalize(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        const equipped = this.normalizeCore(source.equipped);
        const ids = new Set(equipped ? [equipped.id] : []);
        const owned = [];
        for (const core of (Array.isArray(source.owned) ? source.owned : []).map(core => this.normalizeCore(core))) {
            if (core && !ids.has(core.id) && owned.length < this.tables.rules.savedLimit) { ids.add(core.id); owned.push(core); }
        }
        return { equipped, owned };
    }

    /** A value on the line's own step: whole numbers, or 0.1 steps for a decimals: 1 line (2026-10-27: no longer any value in between). */
    rollValue(min, max, decimals, random) {
        const unit = decimals ? 10 ** -decimals : 1;
        return Number((min + Math.floor(random() * (Math.round((max - min) / unit) + 1)) * unit).toFixed(decimals || 0));
    }

    /** 완전한 코어: a group with four lines or more, four distinct lines of it, each at its max. */
    rollPerfect(random = this.deps.random) {
        const groups = Object.keys(this.tables.rules.groupNames).filter(group => this.tables.options.filter(def => def.group === group).length >= this.tables.rules.lines);
        const group = groups[Math.floor(random() * groups.length)];
        const defs = this.tables.options.filter(def => def.group === group), lines = [];
        while (lines.length < this.tables.rules.lines) {
            const def = defs.splice(Math.floor(random() * defs.length), 1)[0];
            lines.push(this.makeLine(def, def.max, def.extraMax));
        }
        const id = this.deps.nextId();
        return { id, name: this.nameFor(lines, true), lines, ...PERFECT };
    }
    /** Four distinct lines from the whole this.pool, each value rolled inside its own range; now and then (this.tables.rules.perfect) a
     * 완전한 코어 instead. */
    roll(random = this.deps.random) {
        if (random() < this.tables.rules.perfect.chance) return this.rollPerfect(random);
        const defs = [...this.tables.options];
        const lines = [];
        while (lines.length < this.tables.rules.lines && defs.length) lines.push(this.rollLine(defs.splice(Math.floor(random() * defs.length), 1)[0], random));
        const id = this.deps.nextId();
        return { id, name: this.nameFor(lines), lines };
    }
    rollLine(def, random) {
        const extra = def.extraMin ? this.rollValue(def.extraMin, def.extraMax, 0, random) : undefined;
        return this.makeLine(def, this.rollValue(def.min, def.max, def.decimals, random), extra);
    }
    /** 그루터기 조합 코어 옵션 리롤(2026-10-30): one line of a core (never a 완전한 코어) becomes a line of the this.pool the other lines do not
     * hold, its value rolled inside its range. The name follows the first line. @returns {boolean} */
    rerollLine(core, random = this.deps.random) {
        if (!core || core.perfect || !Array.isArray(core.lines) || !core.lines.length) return false;
        const index = Math.floor(random() * core.lines.length), held = new Set(core.lines.filter((line, at) => at !== index).map(line => line.id));
        const defs = this.tables.options.filter(def => !held.has(def.id));
        core.lines[index] = this.rollLine(defs[Math.floor(random() * defs.length)], random);
        core.name = this.nameFor(core.lines);
        return true;
    }

    /** Pixel this.icon by the first line's group; ground loot and log rows carry only the lines. */
    icon(core) {
        const first = core && Array.isArray(core.lines) && core.lines[0] && this.pool.get(core.lines[0].id);
        return this.deps.visuals.coreAssets[first ? first.group : 'empty'];
    }

    describe(line) {
        const def = this.pool.get(line.id);
        if (def.text) return def.text.replace('{value}', line.value).replace('{extra}', line.extraValue).replace('{paired}', line.pairedValue);
        return `${def.label} +${line.value}${def.unit}`;
    }

    /** The worn core's lines (equipment slot '코어') as stat rows; cores in the bag do not count. */
    stats(state) {
        const core = (state.equipment || {})['코어'];
        if (!core || !Array.isArray(core.lines)) return [];
        return core.lines.filter(line => this.pool.has(line.id)).flatMap(line => {
            const def = this.pool.get(line.id);
            const rows = [{ id: def.stat, val: line.value, source: 'core' }];
            if (def.pairedStat) rows.push({ id: def.pairedStat, val: line.pairedValue, source: 'core' });
            return rows;
        });
    }

    /** Drops follow the former cube: the core unlock plus clearing underworld floor 10. */
    canDrop(state) {
        const floor = Math.floor(Number(state.underworldProgress && state.underworldProgress.highestFloor) || 1);
        return this.deps.isUnlocked('cube', state) && floor >= this.tables.rules.underworldFloor;
    }

    /** Loop transition: the old store empties (the worn core and the bag reset with the equipment). */
    resetForLoop(state) {
        state.cores = this.defaultState();
    }

    /** Cores still in the old store (a save from before 2026-10-10 that has not been migrated yet). */
    ownedItems(state) {
        const store = state.cores || {};
        return [store.equipped, ...(Array.isArray(store.owned) ? store.owned : [])].filter(Boolean);
    }

}
export function createCoreItems(tables, deps) {
    const core = new CoreItems(tables, deps);
    return Object.freeze(Object.fromEntries(["defaultState","normalize","normalizeCore","roll","rollPerfect","rerollLine","describe","stats","canDrop","resetForLoop","ownedItems","icon"].map(name => [name, core[name].bind(core)])));
}
