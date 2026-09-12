// Orchestrates the existing stat calculator on isolated equipment views. No DOM or saved disabled flags.
const combatEquipmentStats = (() => {
    const cache = new WeakMap();
    const evaluating = new WeakSet();
    function missing(item, attributes, owner, maintaining) {
        if (maintaining && item.legacyRequirementGrace) return [];
        const req = levelProgression.requirements(item), result = [];
        if (!item.inheritedLevelExempt && owner.level < req.level) result.push(`레벨 ${req.level}`);
        for (const [key, value] of Object.entries(req.attributes)) {
            if ((attributes[key] || 0) < value) result.push(`${getStatName(key)} ${value}`);
        }
        return result;
    }
    function permanentSnapshot(owner) {
        const snapshot = JSON.parse(JSON.stringify({ ...owner, inventory: [] }));
        snapshot.isBackgroundCalculation = true;
        snapshot.shrineBuff = null;
        snapshot.uniqueEliteTraitBuff = null;
        snapshot.playerConditionBuffs = [];
        // Observed constellation is a persistent build choice until rerolled/looped, not a timed combat buff.
        return snapshot;
    }
    function attributes(snapshot, equipment) {
        const live = game, stateBridge = window.GameState, windowGame = stateBridge.game;
        try {
            game = { ...snapshot, equipment };
            stateBridge.game = game;
            evaluating.add(game);
            return equipmentStatCalculator(false, true, true);
        } finally { evaluating.delete(game); game = live; stateBridge.game = windowGame; }
    }
    function evaluate(owner) {
        const signature = getPersistentBuildSignature(owner);
        const previous = cache.get(owner);
        if (previous?.signature === signature && previous.equipmentRef === owner.equipment
            && Object.entries(owner.equipment || {}).every(([slot, item]) => previous.itemRefs[slot] === item)) return previous;
        const snapshot = permanentSnapshot(owner), equipment = { ...snapshot.equipment }, disabled = {};
        let totals = attributes(snapshot, equipment);
        // Descending fixed point: each round only removes invalid items, so at most slot-count rounds.
        for (let round = 0; round < Object.keys(equipment).length; round++) {
            const rejected = Object.entries(equipment).filter(([, item]) => item && missing(item, totals, owner, true).length);
            if (!rejected.length) break;
            for (const [slot, item] of rejected) {
                disabled[slot] = missing(item, totals, owner, true); equipment[slot] = null;
            }
            totals = attributes(snapshot, equipment);
        }
        const active = Object.keys(disabled).length
            ? Object.fromEntries(Object.entries(owner.equipment).map(([slot, item]) => [slot, disabled[slot] ? null : item])) : owner.equipment;
        const result = { signature, disabled, totals, snapshot, active, equipmentRef: owner.equipment,
            itemRefs: { ...owner.equipment }, inspections: new Map() };
        cache.set(owner, result);
        return result;
    }
    function inspect(item, slot, owner = game) {
        const current = evaluate(owner);
        const key = JSON.stringify([slot, item.baseId, item.baseName, item.inheritedLevelExempt]);
        if (current.inspections.has(key)) return current.inspections.get(key);
        const equipment = { ...owner.equipment, [slot]: null };
        for (const key of Object.keys(current.disabled)) equipment[key] = null;
        const totals = evaluate({ ...owner, equipment }).totals;
        const unmet = missing(item, totals, owner, false);
        const result = { ok: unmet.length === 0, reason: unmet.length ? `장착 요구: ${unmet.join(' · ')}` : '' };
        current.inspections.set(key, result);
        return result;
    }
    function validateLoadout(equipment, owner) {
        const candidate = { ...owner, equipment };
        const currentItems = new Set(Object.values(owner.equipment));
        const view = { ...equipment };
        // Old gear can maintain itself; new gear must have a valid sequential equip order.
        for (const [slot, item] of Object.entries(view)) if (item && !currentItems.has(item)) view[slot] = null;
        const pending = Object.entries(equipment).filter(([, item]) => item && !currentItems.has(item));
        while (pending.length) {
            const index = pending.findIndex(([slot, item]) => inspect(item, slot, { ...owner, equipment: view }).ok);
            if (index < 0) return { ok: false, reason: '프리셋의 새 장비가 요구 레벨·능력치를 충족하지 않습니다.' };
            const [[slot, item]] = pending.splice(index, 1); view[slot] = item;
        }
        const disabled = evaluate(candidate).disabled;
        return Object.keys(disabled).length ? { ok: false, reason: '프리셋 적용 시 요구조건이 부족해지는 장비가 있습니다.' } : { ok: true };
    }
    function read(includeBreakdowns) {
        const owner = game, status = evaluate(owner);
        const originalEquipment = owner.equipment;
        const equipment = status.active;
        try {
            // Keep ordinary runtime normalization on the real state while masking disabled slots synchronously.
            owner.equipment = equipment;
            evaluating.add(owner);
            const result = equipmentStatCalculator(includeBreakdowns, false, true);
            result.disabledEquipment = status.disabled;
            result.requirementAttributes = status.totals;
            return result;
        } finally { evaluating.delete(owner); owner.equipment = originalEquipment; }
    }
    function activeEquipment(owner) {
        if (evaluating.has(owner)) return owner.equipment;
        return evaluate(owner).active;
    }
    return Object.freeze({ evaluate, inspect, validateLoadout, read, activeEquipment });
})();
