// 방치 정산이 인정하는 시간과 효율(2026-10-25 사용자: 영구 방치 성장을 해금에 통합). 시간과 강화 효율은 해금 탭 강화의 단계 수
// (contentProgression.rank: 시간 인식 offlineHours, 전투 효율 offlineRate)로 읽고, 표는 data/offline-progress.js. 시간의 잔재, 방치
// 보관함과 방치 지시는 이날 없앴다: 옛 저장의 보관함 장비는 불러올 때 가방으로 돌아간다(js/save-migrations.js retireOfflineGrowth).

/** Efficiency from outside the 강화 steps, one row per source that gives any: {key, label, rate}. */
function getOfflineEfficiencySources(state) {
    let rows = [
        { key: 'epoch', label: '고요한 시대', rate: typeof atlasEpoch === 'object' && state.atlas && state.atlas.epoch ? atlasEpoch.offline(state) : 0 },
        { key: 'mastery', label: '무기 숙련', rate: typeof weaponMastery === 'object' ? weaponMastery.offline(state) : 0 },
        { key: 'chronicle', label: '세계수 연대기', rate: typeof chronicle === 'object' ? chronicle.offline(state) : 0 }
    ];
    return rows.filter(row => row.rate > 0);
}

/** The hours the settlement counts and the share of them fought, from the owned 강화 steps plus the outside sources (capped). */
function getOfflineProgressConfig(state) {
    let owner = state || {};
    let hours = OFFLINE_PROGRESS_RECOGNITION_HOURS[contentProgression.rank('offlineHours', owner)];
    let baseRate = OFFLINE_PROGRESS_EFFICIENCY_RATES[contentProgression.rank('offlineRate', owner)];
    let recognitionLimitMs = hours * 60 * 60 * 1000;
    let efficiencySources = getOfflineEfficiencySources(owner);
    let rate = Math.min(OFFLINE_PROGRESS_EFFICIENCY_CAP, efficiencySources.reduce((sum, row) => sum + row.rate, baseRate));
    return { recognitionLimitMs, efficiencyRate: rate, baseEfficiencyRate: baseRate, efficiencySources,
        effectiveLimitMs: recognitionLimitMs * rate, recognitionHours: hours };
}

safeExposeGlobals({ getOfflineEfficiencySources, getOfflineProgressConfig });
