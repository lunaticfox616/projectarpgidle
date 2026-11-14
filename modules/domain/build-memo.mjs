/** One runtime owns its settlement memos and synchronous foreground evaluation scope. */
export function createBuildMemo(fields, parts) {
    const background = new WeakMap();
    let pass = null;
    const values = (byEquipment, state) => {
        const key = state.equipment || state;
        let memo = byEquipment.get(key);
        if (!memo) byEquipment.set(key, memo = new Map());
        return memo;
    };
    const foreground = state => !pass || pass.owner !== state || !state.equipment ? null : values(pass.byEquipment, state);
    const withinPass = (state, draw) => {
        if (pass) return draw();
        pass = { owner: state, byEquipment: new WeakMap() };
        try { return draw(); } finally { pass = null; }
    };
    const signature = (state, includeInventory = false) => {
        const inputs = fields.filter(key => includeInventory || key !== 'inventory').map(key => state[key]);
        Object.entries(parts).forEach(([key, names]) => inputs.push(names.map(name => state[key]?.[name])));
        return JSON.stringify(inputs, (key, value) => ['locked', 'exp', 'xp', 'uniqueBaseLegacy'].includes(key) ? undefined : value);
    };
    const read = state => {
        if (!state.isBackgroundCalculation) return foreground(state);
        // The active equipment mask changes within an evaluation. Keep each view under the same build revision.
        const revision = [state.loopKills, state.loopDeaths, state.level, state.season, state.maxZoneId,
            state.currentZoneId, state.passives, state.actRewardBonuses?.length, state.journalBonuses?.length];
        let memo = background.get(state);
        if (!memo || revision.some((value, index) => value !== memo.revision[index])) {
            memo = { revision, byEquipment: new WeakMap() };
            background.set(state, memo);
        }
        return values(memo.byEquipment, state);
    };
    return Object.freeze({ withinPass, signature, read, clear: state => background.delete(state) });
}
