import { createOfflineProgress } from './domain/offline-progress.mjs';

const rules = createOfflineProgress({
    get _t() { return _t; },
    get atlasEpoch() { return typeof atlasEpoch === 'undefined' ? undefined : atlasEpoch; },
    get weaponMastery() { return typeof weaponMastery === 'undefined' ? undefined : weaponMastery; },
    get chronicle() { return typeof chronicle === 'undefined' ? undefined : chronicle; },
    get OFFLINE_PROGRESS_RECOGNITION_HOURS() { return OFFLINE_PROGRESS_RECOGNITION_HOURS; },
    get contentProgression() { return contentProgression; },
    get OFFLINE_PROGRESS_EFFICIENCY_RATES() { return OFFLINE_PROGRESS_EFFICIENCY_RATES; },
    get OFFLINE_PROGRESS_EFFICIENCY_CAP() { return OFFLINE_PROGRESS_EFFICIENCY_CAP; }
});
const { getOfflineEfficiencySources, getOfflineProgressConfig } = rules;
safeExposeGlobals({ getOfflineEfficiencySources, getOfflineProgressConfig });
