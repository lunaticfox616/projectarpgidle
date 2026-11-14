/** Existing save shape; normalization stays at state access, not inside crafting calculations. */
export function underworldRuneState(owner) {
    if (!owner.underworldRunes || typeof owner.underworldRunes !== 'object') owner.underworldRunes = {
        unlockedSlots:0,unlockedRunesMaxNumber:0,obtainedRunes:[],equippedRunes:[null,null,null,null,null,null],enhanceLvByNo:{}
    };
    const state = owner.underworldRunes;
    state.obtainedRunes = Array.isArray(state.obtainedRunes) ? state.obtainedRunes : [];
    state.equippedRunes = Array.isArray(state.equippedRunes) ? state.equippedRunes.slice(0,6) : [null,null,null,null,null,null];
    while (state.equippedRunes.length < 6) state.equippedRunes.push(null);
    normalizeUnderworldGrowth(state);
    return state;
}

function normalizeUnderworldGrowth(state) {
    state.enhanceLvByNo = state.enhanceLvByNo && typeof state.enhanceLvByNo === 'object' ? state.enhanceLvByNo : {};
    state.bonusLinesByNo = state.bonusLinesByNo && typeof state.bonusLinesByNo === 'object' ? state.bonusLinesByNo : {};
}
