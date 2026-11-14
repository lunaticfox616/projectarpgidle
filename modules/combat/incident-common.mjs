import { HUNTING_ZONES } from '../data/incident-values.mjs';

export function incidentRule(env) { return env.deps.ACT_EXPLORATION_INCIDENTS; }

export function incidentDraw(env, tag, key) { return (Math.abs(env.deps.hashSeed(`${tag}:${key}`)) % 100000) / 100000; }

export function incidentQuiet(env, zone) { return !!env.owner.isBackgroundCalculation || !zone || !HUNTING_ZONES.has(zone.type) || (zone.type === 'act' && zone.id === 0 && (env.owner.season || 1) === 1); }

export function* incidentTell(text, tone, chase = false) { return (yield { kind: 'dispatchRuntimeEvent', args: ['incident', { text, tone, chase }] }); }

export function incidentReceipt(env, work) { return env.deps.combatLootReceipts.capture(env.owner, work); }

/** 전적 화면의 사건 기록(js/records.js). 처음 겪은 사건은 알림 하나를 더 띄운다: 숨은 사건은 찾았다고(체이싱 티어 빛깔로). */
export function* incidentNote(env, kind) {
    const row = incidentRule(env).records.find(([key]) => key === kind), first = !(((env.owner.records || {}).incidents || {})[kind] > 0);
    env.deps.recordIncident(kind, env.owner);
    if (first && row) (yield* incidentTell(row[2] ? env.deps._t('숨은 사건을 찾았습니다. 「{row}」', { row: row[1] }) : env.deps._t('처음 만난 사건입니다. 「{row}」', { row: row[1] }), row[2] ? 'chase' : 'reward', row[2]));
}

export function incidentOften(env) { return env.deps.colonyWards.incidentMul(env.owner); }

/** 착용한(요구 능력치를 채워 켜진) 고유 장비의 그 효과의 값(uniqueEffectParams), 없으면 null. */
export function incidentWorn(env, key) {
    for (const item of Object.values(env.deps.combatEquipmentStats.activeEquipment(env.owner) || {})) {
        if (item && item.rarity === 'unique' && item.uniqueEffectKey === key) return item.uniqueEffectParams || {};
    }
    return null;
}

/** 이 탐험의 방 사건 굴림 값: 처음 쓸 때 정해 탐험 기록에 남긴다(run.incidentSeed). 액트의 지도 모양은 판마다 같아서, 방 번호만으로는
     * 판마다 같은 방에서 같은 일이 나거나 영영 나지 않았다(2026-10-20 검토). */
export function incidentRunSeed(env, run) {
    if (!Number.isSafeInteger(run.incidentSeed)) run.incidentSeed = Math.abs(env.deps.hashSeed(`${run.layoutId}:${env.owner.nextEnemyId}:${env.deps.getCombatTime()}`));
    return run.incidentSeed;
}

export function incidentRoomKey(env, run, room) { return `${run.layoutId || ''}:${incidentRunSeed(env, run)}:${room.id}`; }

/** 이 방을 처음 보는가(몬스터가 선 방에 처음 들어선 때 한 번). 본 방은 탐험 기록에 남아(run.incidentRooms, 방 번호) 다시 불러와도
     * 다시 굴리지 않는다. */
export function incidentFirstLook(run, room) {
    if (!Array.isArray(run.incidentRooms)) run.incidentRooms = [];
    if (run.incidentRooms.includes(room.id)) return false;
    run.incidentRooms.push(room.id);
    return true;
}
