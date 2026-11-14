import { createPlayerRecords } from './domain/records.mjs';

const rules = createPlayerRecords({
    clockNow: () => Date.now(),
    get getClearedSkyTowerFloor() { return getClearedSkyTowerFloor; },
    get ACT_EXPLORATION_INCIDENTS() { return ACT_EXPLORATION_INCIDENTS; }
});
const { createDefaultRecordsState, tickRecordActiveTime, RECORDS_VERSION, RECORDS_LOOP_HISTORY_LIMIT,
    RECORDS_ACTIVE_TICK_MAX_MS, RECORD_CLEARED_FLOOR_KEYS, keepIncidentCounts } = rules;
function resolveRecordOwner(state) { return state || (typeof game !== 'undefined' ? game : null); }
function ensureRecordsState(state) { return rules.ensureRecordsState(resolveRecordOwner(state)); }
function trackRecordBests(state) { return rules.trackRecordBests(resolveRecordOwner(state)); }
function recordActClear(zoneId, state) { return rules.recordActClear(zoneId, resolveRecordOwner(state)); }
function recordWoodsmanEchoRun(totalDamage, dps, state, seconds = 30) {
    return rules.recordWoodsmanEchoRun(totalDamage, dps, resolveRecordOwner(state), seconds);
}
function recordIncident(kind, state) { return rules.recordIncident(kind, resolveRecordOwner(state)); }
function closeLoopRecord(path, state) { return rules.closeLoopRecord(path, resolveRecordOwner(state)); }
function getRecordsView(state) { return rules.getRecordsView(resolveRecordOwner(state)); }
safeExposeGlobals({ createDefaultRecordsState, ensureRecordsState, tickRecordActiveTime, trackRecordBests,
    recordActClear, recordWoodsmanEchoRun, recordIncident, closeLoopRecord, getRecordsView,
    RECORDS_VERSION, RECORDS_LOOP_HISTORY_LIMIT, RECORDS_ACTIVE_TICK_MAX_MS, RECORD_CLEARED_FLOOR_KEYS,
    keepIncidentCounts });
