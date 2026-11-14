/** domain/time-rift-inheritance: native owner; state is read from the supplied current-game port. */
export class TimeRiftInheritance {
    constructor(deps, data) {
        this.deps = deps;
        this.data = data;
        this.getTimeRiftOptionKeepChance = this.getTimeRiftOptionKeepChance.bind(this);
        this.getTimeRiftLossOdds = this.getTimeRiftLossOdds.bind(this);
        this.getTimeRiftFusionGrade = this.getTimeRiftFusionGrade.bind(this);
    }

    getTimeRiftOptionKeepChance(pressure, keptSoFar = 0) {
        let p = Math.max(1, Math.min(this.deps.TIME_RIFT_MAX_PRESSURE, Math.floor(pressure || 1)));
        return (keptSoFar < this.deps.TIME_RIFT_KEEP_CAP ? this.deps.TIME_RIFT_OPTION_KEEP : this.deps.TIME_RIFT_OPTION_KEEP_PAST_CAP)[p - 1];
    }

    getTimeRiftLossOdds(pressure, count = 6) {
        let n = Math.max(0, Math.floor(count)), kept = [1];
        for (let i = 0; i < n; i++) {
            let next = Array(kept.length + 1).fill(0);
            kept.forEach((chance, k) => {
                let keep = this.getTimeRiftOptionKeepChance(pressure, k);
                next[k + 1] += chance * keep;
                next[k] += chance * (1 - keep);
            });
            kept = next;
        }
        return kept.map((_, lost) => kept[n - lost]);
    }

    getTimeRiftFusionGrade(lost, count) {
        if (lost <= 0) return 'perfect';
        return lost * 2 <= count ? 'normal' : 'unstable';
    }
}
