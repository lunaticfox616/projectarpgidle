/** state/time-rift-progress: native owner; state is read from the supplied current-game port. */
export class TimeRiftState {
    constructor(deps, data) {
        this.deps = deps;
        this.data = data;
        this.ensureTimeRiftState = this.ensureTimeRiftState.bind(this);
        this.normalizeTimeRiftResult = this.normalizeTimeRiftResult.bind(this);
    }

    ensureTimeRiftState() {
        if (!this.deps.game.timeRift || typeof this.deps.game.timeRift !== 'object') this.deps.game.timeRift = {};
        let st = this.deps.game.timeRift;
        st.pressure = Math.max(1, Math.min(this.deps.TIME_RIFT_MAX_PRESSURE, Math.floor(st.pressure || 1)));
        st.activePressure = Number.isFinite(st.activePressure) ? Math.max(1, Math.min(this.deps.TIME_RIFT_MAX_PRESSURE, Math.floor(st.activePressure))) : null;
        st.altarOpen = !!st.altarOpen;
        st.altarUnique = (st.altarUnique && typeof st.altarUnique === 'object') ? st.altarUnique : null;
        st.altarRare = (st.altarRare && typeof st.altarRare === 'object') ? st.altarRare : null;
        st.fusionCount = Math.max(0, Math.floor(st.fusionCount || 0));
        return st;
    }

    normalizeTimeRiftResult(value) {
        if (!value || typeof value !== 'object') return null;
        const numbers = ['id', 'pressure', 'inherited', 'lost', 'season'];
        if (!numbers.every(key => Number.isSafeInteger(value[key]) && value[key] >= 0)) return null;
        if (![value.id, value.season, value.pressure].every(number => number > 0)) return null;
        if (value.pressure > this.deps.TIME_RIFT_MAX_PRESSURE) return null;
        if (!Number.isSafeInteger(value.inherited + value.lost)) return null;
        if (typeof value.name !== 'string' || typeof value.instanceId !== 'string' || !value.instanceId.trim()) return null;
        return { id: value.id, name: value.name.slice(0, 100), instanceId: value.instanceId.trim().slice(0, 96),
            pressure: value.pressure, inherited: value.inherited, lost: value.lost, season: value.season };
    }
}
