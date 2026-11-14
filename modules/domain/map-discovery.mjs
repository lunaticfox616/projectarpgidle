/** Stored discovery receipts; no DOM, timers or presentation callbacks. */
export const MAP_EXPLORE_ALARM_SUBTABS = Object.freeze([
    'map-explore-hunting', 'map-explore-root-boss', 'map-explore-colony', 'map-explore-trials'
]);

export function hasTalentBloomTrialKey(owner) {
    return (owner.currencies.chaosKey || 0) >= 1 || (owner.currencies.coreKey || 0) >= 1;
}

export class MapDiscovery {
    constructor(deps) { this.deps = deps; }

    signatures(owner) {
        const cap = typeof this.deps.LAST_STORY_ZONE_ID === 'number'
            ? this.deps.LAST_STORY_ZONE_ID : Math.max(0, Math.floor(owner.maxZoneId || 0));
        const bosses = this.deps.SEASON_BOSS_ZONES || [];
        const trials = this.deps.contentProgression.isUnlocked('battleTrials') ? this.deps.TRIAL_ZONES : [];
        const available = trial => trial.bloomTrial ? hasTalentBloomTrialKey(owner)
            : ((trial.reqZone !== -1 && owner.maxZoneId >= trial.reqZone) || (owner.unlockedTrials || []).includes(trial.id));
        return {
            'map-explore-hunting': Math.min(Math.max(0, Math.floor(owner.maxZoneId || 0)), cap),
            'map-explore-root-boss': bosses.filter(zone => (owner.season || 1) >= (zone.reqSeason || 2)).length,
            'map-explore-colony': (owner.season || 1) >= 15 ? 1 : 0,
            'map-explore-trials': trials.filter(available).length
        };
    }

    ensure(owner) {
        if (!owner.mapAlarmSeen || typeof owner.mapAlarmSeen !== 'object') owner.mapAlarmSeen = {};
        if (!owner.mapAlarmMainSeen || typeof owner.mapAlarmMainSeen !== 'object') owner.mapAlarmMainSeen = {};
    }

    detect(owner) {
        this.ensure(owner);
        const signatures = this.signatures(owner);
        for (const key of MAP_EXPLORE_ALARM_SUBTABS) {
            if (owner.mapAlarmSeen[key] === undefined) owner.mapAlarmSeen[key] = signatures[key];
            if (owner.mapAlarmMainSeen[key] === undefined) { owner.mapAlarmMainSeen[key] = signatures[key]; continue; }
            if (signatures[key] > owner.mapAlarmMainSeen[key]) owner.noti.map = true;
        }
    }

    clear(owner, subtabId) {
        const key = subtabId === 'map-explore-atlas' ? 'map-explore-hunting' : subtabId;
        if (!MAP_EXPLORE_ALARM_SUBTABS.includes(key)) return;
        this.ensure(owner);
        owner.mapAlarmSeen[key] = this.signatures(owner)[key];
    }

    acknowledge(owner) {
        this.ensure(owner);
        const signatures = this.signatures(owner);
        for (const key of MAP_EXPLORE_ALARM_SUBTABS) owner.mapAlarmMainSeen[key] = signatures[key];
    }

    unseen(owner) {
        this.ensure(owner);
        const signatures = this.signatures(owner);
        return MAP_EXPLORE_ALARM_SUBTABS.filter(key => owner.mapAlarmSeen[key] !== undefined && signatures[key] > owner.mapAlarmSeen[key]);
    }
}
