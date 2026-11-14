/** state/chaos-realm: native owner; state is read from the supplied current-game port. */
export class ChaosRealmState {
    constructor(deps, data) {
        this.deps = deps;
        this.data = data;
        this.createDefaultChaosRealmState = this.createDefaultChaosRealmState.bind(this);
        this.ensureChaosRealmState = this.ensureChaosRealmState.bind(this);
    }

    createDefaultChaosRealmState() {
        return {
            unlocked: false,
            highestFloor: 0,
            currentFloor: 1,
            clearedFloors: [],
            woodsmanBestDamagePct: 0,
            permanentBonuses: { ...this.data.CHAOS_REALM_DEFAULT_BONUSES }
        };
    }

    ensureChaosRealmState() {
        let st = (this.deps.game && this.deps.game.chaosRealm && typeof this.deps.game.chaosRealm === 'object') ? this.deps.game.chaosRealm : (this.deps.game.chaosRealm = this.createDefaultChaosRealmState());
        st.unlocked = !!st.unlocked;
        st.highestFloor = Math.max(0, Math.floor(st.highestFloor || 0));
        st.currentFloor = Math.max(1, Math.floor(st.currentFloor || 1));
        st.clearedFloors = Array.isArray(st.clearedFloors) ? Array.from(new Set(st.clearedFloors.map(v => Math.floor(v || 0)).filter(v => v >= 1))).sort((a, b) => a - b) : [];
        st.woodsmanBestDamagePct = Math.max(0, Math.min(100, Number(st.woodsmanBestDamagePct) || 0));
        this.normalizePermanentBonuses(st);
        if (st.unlocked && st.highestFloor < 1) st.highestFloor = 1;
        return st;
    }

    normalizePermanentBonuses(st) {
        st.permanentBonuses = { ...this.data.CHAOS_REALM_DEFAULT_BONUSES, ...(st.permanentBonuses || {}) };
        Object.keys(this.data.CHAOS_REALM_DEFAULT_BONUSES).forEach(key => { st.permanentBonuses[key] = Math.max(0, Number(st.permanentBonuses[key]) || 0); });
    }
}
