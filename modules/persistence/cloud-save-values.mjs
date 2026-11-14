export const CLOUD_REVISION_CONFLICT_CODE = 'CLOUD_REVISION_CONFLICT';

export function summarizeCloudRow(row) {
    if (!row || row.save_data !== undefined) return row;
    const empty = row.season == null && row.loopCount == null && row.saveMeta == null;
    return { user_id: row.user_id, updated_at: row.updated_at, revision: row.revision, summaryOnly: true,
        save_data: empty ? null : { season: row.season, loopCount: row.loopCount, saveMeta: row.saveMeta || {} } };
}

export function readCloudTimestamp(record) {
    if (!record) return 0;
    return record.updated_at ? (new Date(record.updated_at).getTime() || 0) : (record.save_data?.saveMeta?.lastModifiedAt || 0);
}

export function readLoopNumber(snapshot) {
    const save = snapshot || {};
    const season = Math.max(1, Math.floor(Number(save.season) || 1));
    const loopCount = Math.max(0, Math.floor(Number(save.loopCount) || 0));
    return Math.max(season, loopCount + 1);
}

function hasProgressCounters(save) {
    if (['level', 'season'].some(key => (save[key] || 1) > 1)) return true;
    return ['exp', 'loopCount', 'maxZoneId', 'killsInZone', 'loopKills', 'loopDeaths', 'passivePoints']
        .some(key => (save[key] || 0) > 0);
}

function hasProgressItems(save) {
    if (['inventory', 'passives', 'supports'].some(key => Array.isArray(save[key]) && save[key].length > 0)) return true;
    if (Object.values(save.equipment || {}).some(Boolean)) return true;
    if (Object.keys(save.supportGemData || {}).length > 0) return true;
    return Object.keys(save.currencies || {}).some(key => (save.currencies[key] || 0) > 0);
}

function hasProgressSkills(save, defaults) {
    if (Array.isArray(save.skills) && save.skills.some(name => name && name !== '기본 공격')) return true;
    if (save.activeSkill && save.activeSkill !== '기본 공격') return true;
    // The starting attack rune exists even in an untouched save.
    return Object.keys(save.gemData || {}).some(key => !(key in (defaults.gemData || {})));
}

export function isUnplayedSave(snapshot, defaults) {
    const save = snapshot || {};
    return !hasProgressCounters(save) && !hasProgressItems(save) && !hasProgressSkills(save, defaults);
}

export function revisionConflictError() {
    return Object.assign(new Error('다른 기기에서 서버 저장이 바뀌어 이 기기의 진행은 올리지 않았습니다. 시작 화면에서 계정 저장으로 다시 들어가면 서버 저장으로 이어집니다.'),
        { code: CLOUD_REVISION_CONFLICT_CODE });
}

export function hasPendingCloudSave(save, slot) {
    return slot.kind === 'account' && !save?.isGuideReplay && !!save?.saveMeta?.cloudPending;
}

export function summarizeSaveProgress(save) {
    return { loop: readLoopNumber(save), level: Math.max(1, Math.floor(Number(save.level) || 1)) };
}

export function guestCanReplaceAccount(guest, accountSave, defaults) {
    if (isUnplayedSave(accountSave, defaults)) return true;
    const account = summarizeSaveProgress(accountSave);
    return guest.loop > account.loop || (guest.loop === account.loop && guest.level > account.level);
}

export function canMoveGuestSave(state, slot, save, defaults) {
    return !!(state.user && state.guestSaveSummary && slot.kind === 'account'
        && guestCanReplaceAccount(state.guestSaveSummary, save, defaults));
}
