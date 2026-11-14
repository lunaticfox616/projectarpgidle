/** Eligibility works on explicit owners. Legacy current-game calculation is injected only by the adapter. */
class EquipmentRequirements {
    constructor(deps) {
        this.deps = deps;
        this.cache = new WeakMap();
        this.evaluating = new WeakSet();
        this.tickResults = null;
    }

    missing(item, attributes, owner, maintaining, slot) {
        if (maintaining && item.legacyRequirementGrace) return [];
        const req = this.deps.requirements(item), result = [];
        if (owner.level < req.level) result.push(`레벨 ${req.level}`);
        for (const [key, value] of Object.entries(req.attributes)) {
            if ((attributes[key] || 0) < value) result.push(`${this.deps.statName(key)} ${value}`);
        }
        const slotNeed = this.slotRequirement(item, slot, owner);
        if (slotNeed) result.push(slotNeed);
        return result;
    }

    slotRequirement(item, slot, owner) {
        if (slot === '방패' && item.slot === '무기' && this.deps.offhandLocked(owner)) return '쌍수 훈련 키스톤';
        return slot === '반지3' && !this.deps.thirdFingerOpen(owner) ? '세 번째 손가락' : '';
    }

    permanentSnapshot(owner) {
        // Exploration is not a stat input and is never mutated here. Keep it shared instead of copying the whole room map.
        const snapshot = JSON.parse(JSON.stringify({ ...owner, inventory: [], actExploration: undefined }));
        if (owner.actExploration !== undefined) snapshot.actExploration = owner.actExploration;
        snapshot.isBackgroundCalculation = true;
        snapshot.uniqueEliteTraitBuff = null;
        snapshot.incidentBreath = null;
        return snapshot;
    }

    attributes(snapshot, equipment) {
        const candidate = { ...snapshot, equipment };
        this.evaluating.add(candidate);
        try { return this.deps.attributes(candidate); } finally { this.evaluating.delete(candidate); }
    }

    sameEquipment(previous, owner) {
        return previous.equipmentRef === owner.equipment
            && Object.entries(owner.equipment || {}).every(([slot, item]) => previous.itemRefs[slot] === item);
    }

    withinTick(work) {
        if (this.tickResults) return work();
        this.tickResults = new WeakMap();
        try { return work(); } finally { this.tickResults = null; }
    }

    evaluate(owner) {
        const memo = this.deps.memo(owner);
        const kept = this.tickResults?.get(owner) || memo?.get('equipment-evaluation');
        if (kept && kept.level === owner.level && this.sameEquipment(kept, owner)) return kept;
        const result = this.evaluateBuild(owner);
        this.tickResults?.set(owner, result);
        memo?.set('equipment-evaluation', result);
        return result;
    }

    resolveActive(snapshot, equipment, owner) {
        const disabled = {};
        let totals = this.attributes(snapshot, equipment);
        // Descending fixed point: each pass only removes invalid items, so the slot count bounds the work.
        for (let round = 0; round < Object.keys(equipment).length; round++) {
            const rejected = Object.entries(equipment).filter(([slot, item]) => item && this.missing(item, totals, owner, true, slot).length);
            if (!rejected.length) break;
            for (const [slot, item] of rejected) { disabled[slot] = this.missing(item, totals, owner, true, slot); equipment[slot] = null; }
            totals = this.attributes(snapshot, equipment);
        }
        return { disabled, totals };
    }

    evaluateBuild(owner) {
        const signature = this.deps.signature(owner), previous = this.cache.get(owner);
        if (previous?.signature === signature && this.sameEquipment(previous, owner)) return previous;
        const snapshot = this.permanentSnapshot(owner), equipment = { ...snapshot.equipment };
        const { disabled, totals } = this.resolveActive(snapshot, equipment, owner);
        const active = Object.keys(disabled).length
            ? Object.fromEntries(Object.entries(owner.equipment).map(([slot, item]) => [slot, disabled[slot] ? null : item])) : owner.equipment;
        const result = { signature, level: owner.level, disabled, totals, snapshot, active, equipmentRef: owner.equipment,
            itemRefs: { ...owner.equipment }, inspections: new Map() };
        this.cache.set(owner, result);
        return result;
    }

    inspect(item, slot, owner) {
        const current = this.evaluate(owner), key = JSON.stringify([slot, item.baseId, item.baseName, item.rarity, item.name]);
        if (current.inspections.has(key)) return current.inspections.get(key);
        const equipment = { ...owner.equipment, [slot]: null };
        for (const key of Object.keys(current.disabled)) equipment[key] = null;
        const totals = this.evaluate({ ...owner, equipment }).totals;
        const unmet = this.missing(item, totals, owner, false);
        const result = { ok: unmet.length === 0, reason: unmet.length ? this.deps.translate('장착 요구: {unmet}', { unmet: unmet.join(', ') }) : '' };
        current.inspections.set(key, result);
        return result;
    }

    validateLoadout(equipment, owner) {
        const candidate = { ...owner, equipment }, currentItems = new Set(Object.values(owner.equipment)), view = { ...equipment };
        // Existing gear may maintain itself. New gear must have a valid sequential equip order.
        for (const [slot, item] of Object.entries(view)) if (item && !currentItems.has(item)) view[slot] = null;
        const pending = Object.entries(equipment).filter(([, item]) => item && !currentItems.has(item));
        while (pending.length) {
            const index = pending.findIndex(([slot, item]) => this.inspect(item, slot, { ...owner, equipment: view }).ok);
            if (index < 0) return { ok: false, reason: this.deps.translate('프리셋의 새 장비가 요구 레벨/능력치를 충족하지 않습니다.') };
            const [[slot, item]] = pending.splice(index, 1); view[slot] = item;
        }
        return Object.keys(this.evaluate(candidate).disabled).length
            ? { ok: false, reason: this.deps.translate('프리셋 적용 시 요구조건이 부족해지는 장비가 있습니다.') } : { ok: true };
    }

    validateBuildLoadout(equipment, config, owner) {
        if (!config) return this.validateLoadout(equipment, owner);
        const runes = this.deps.runes, candidate = this.permanentSnapshot(owner);
        candidate.equipment = JSON.parse(JSON.stringify(equipment));
        const structure = runes.inspect(config, candidate);
        if (!structure.ok) return structure;
        runes.apply(config, candidate);
        const gear = this.validateLoadout(equipment, { ...candidate, equipment: owner.equipment });
        if (!gear.ok) return gear;
        this.evaluating.add(candidate);
        try { return this.deps.inspectBuild(candidate, config); } finally { this.evaluating.delete(candidate); }
    }

    read(owner, includeBreakdowns) {
        const status = this.evaluate(owner), originalEquipment = owner.equipment;
        const memo = this.deps.memo(owner);
        try {
            // Keep live normalization on this owner while masking disabled gear only for the synchronous calculation.
            owner.equipment = status.active;
            this.evaluating.add(owner);
            const result = this.deps.readStats(owner, includeBreakdowns, memo, status);
            result.disabledEquipment = status.disabled;
            result.requirementAttributes = status.totals;
            return result;
        } finally { this.evaluating.delete(owner); owner.equipment = originalEquipment; }
    }

    activeEquipment(owner) { return this.evaluating.has(owner) ? owner.equipment : this.evaluate(owner).active; }
}

export function createEquipmentRequirements(deps) {
    const runtime = new EquipmentRequirements(deps);
    return Object.freeze({ evaluate: runtime.evaluate.bind(runtime), inspect: runtime.inspect.bind(runtime),
        validateLoadout: runtime.validateLoadout.bind(runtime), validateBuildLoadout: runtime.validateBuildLoadout.bind(runtime),
        read: runtime.read.bind(runtime), activeEquipment: runtime.activeEquipment.bind(runtime), withinTick: runtime.withinTick.bind(runtime) });
}
