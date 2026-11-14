import { recordCreateDefaultRecordsState, recordEnsureRecordsState, recordTickRecordActiveTime, recordTrackRecordBests, recordRecordActClear, recordRecordWoodsmanEchoRun, recordRecordIncident, recordCloseLoopRecord, recordGetRecordsView, recordKeepIncidentCounts } from './records-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createPlayerRecords(deps) {
    const env = { deps };
    env.RECORDS_VERSION = 1;
    env.RECORDS_LOOP_HISTORY_LIMIT = 30;
    env.RECORDS_ACTIVE_TICK_MAX_MS = 5000;
    env.RECORD_CLEARED_FLOOR_KEYS = Object.freeze(['labyrinthFloor', 'chaosRealmFloor', 'skyFloor', 'underworldFloor']);
    return Object.freeze({
        createDefaultRecordsState: (...args) => recordCreateDefaultRecordsState(env, ...args),
        ensureRecordsState: (...args) => recordEnsureRecordsState(env, ...args),
        tickRecordActiveTime: (...args) => recordTickRecordActiveTime(env, ...args),
        trackRecordBests: (...args) => recordTrackRecordBests(env, ...args),
        recordActClear: (...args) => recordRecordActClear(env, ...args),
        recordWoodsmanEchoRun: (...args) => recordRecordWoodsmanEchoRun(env, ...args),
        recordIncident: (...args) => recordRecordIncident(env, ...args),
        closeLoopRecord: (...args) => recordCloseLoopRecord(env, ...args),
        getRecordsView: (...args) => recordGetRecordsView(env, ...args),
        RECORDS_VERSION: env.RECORDS_VERSION,
        RECORDS_LOOP_HISTORY_LIMIT: env.RECORDS_LOOP_HISTORY_LIMIT,
        RECORDS_ACTIVE_TICK_MAX_MS: env.RECORDS_ACTIVE_TICK_MAX_MS,
        RECORD_CLEARED_FLOOR_KEYS: env.RECORD_CLEARED_FLOOR_KEYS,
        keepIncidentCounts: recordKeepIncidentCounts
    });
}
