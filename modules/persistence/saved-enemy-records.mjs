import { clampFiniteNumber } from './saved-number.mjs';
import { restoreSavedBossPicture } from './saved-monster-identity.mjs';

export function normalizeEncounterMarker(marker) {
    if (!marker || typeof marker !== 'object') return null;
    let at = clampFiniteNumber(marker.at, NaN, 0, 100);
    if (!Number.isFinite(at)) return null;
    let normalized = {
        at: at,
        count: Math.max(1, Math.floor(clampFiniteNumber(marker.count, 1, 1, 99))),
        elite: !!marker.elite,
        boss: !!marker.boss
    };
    // Markers keep only their spawn shape; removed content fields (e.g. treasure-hunt ids) are dropped.
    return normalized;
}

/** Regeneration fatigue (modules/domain/enemy-regeneration.mjs) exists only after the monster's first step; a record without it stays without. */
export function normalizeEnemyRegenFatigue(enemy, hp) {
    if (enemy.regenHpMark === undefined && enemy.regenFatigueMs === undefined && enemy.regenLastLossAt === undefined) return {};
    return { regenFatigueMs: clampFiniteNumber(enemy.regenFatigueMs, 0, 0, 60000), regenLastLossAt: clampFiniteNumber(enemy.regenLastLossAt, 0, 0),
        regenHpMark: clampFiniteNumber(enemy.regenHpMark, hp, 0) };
}

export function normalizeEnemyRecord(deps, merged, enemy) {
    if (!enemy || typeof enemy !== 'object') return null;
    let hp = clampFiniteNumber(enemy.hp, NaN, 0);
    let maxHp = clampFiniteNumber(enemy.maxHp, clampFiniteNumber(hp, 1, 1), 1);
    if (!Number.isFinite(hp)) hp = maxHp;
    return normalizeEnemyGridFields(deps, merged, {
        ...enemy,
        ...(merged.currentZoneId === deps.WOODSMAN_ECHO_ZONE_ID ? { noAttack: true, regenRate: 0 } : {}),
        id: Math.max(1, Math.floor(clampFiniteNumber(enemy.id, 1, 1))),
        hp: Math.min(maxHp, hp),
        maxHp: maxHp,
        attackTimer: clampFiniteNumber(enemy.attackTimer, 0, 0),
        regenBank: Math.round(clampFiniteNumber(enemy.regenBank, 0, 0) * 10) / 10,
        ...normalizeEnemyRegenFatigue(enemy, Math.min(maxHp, hp)),
        spawnAt: clampFiniteNumber(enemy.spawnAt, 0, 0, 100),
        spawnStamp: 0,
        groupIndex: Math.max(0, Math.floor(clampFiniteNumber(enemy.groupIndex, 0, 0))),
        variantSeed: Math.floor(clampFiniteNumber(enemy.variantSeed, 1)),
        ele: enemy.ele || 'phys',
        name: enemy.name || '이름 없는 적',
        atkMul: clampFiniteNumber(enemy.atkMul, 1, 0.1),
        dr: clampFiniteNumber(enemy.dr, 0, 0),
        resF: clampFiniteNumber(enemy.resF, 0),
        resC: clampFiniteNumber(enemy.resC, 0),
        resL: clampFiniteNumber(enemy.resL, 0),
        resChaos: clampFiniteNumber(enemy.resChaos, 0),
        isElite: !!enemy.isElite,
        isBoss: !!enemy.isBoss
    });
}

// 그리드 필드 정리: 잘못된 좌표/유형은 버려서 다음 전투 틱의 그리드 복구가 다시 배치하게 한다.
export function normalizeEnemyGridFields(deps, merged, record) {
    delete record.battleSlot;
    restoreSavedBossPicture(deps, record, merged);
    // Exploration coordinates are validated against their own saved map below; never
    // silently move a saved enemy to another tile or into a wall by clamping it.
    const exploration=merged.actExploration;
    if(exploration)return record;
    let gx = Math.floor(clampFiniteNumber(record.gx, NaN, 0, deps.COMBAT_GRID_CONFIG.columns - 1));
    let gy = Math.floor(clampFiniteNumber(record.gy, NaN, 0, deps.COMBAT_GRID_CONFIG.rows - 1));
    if (Number.isFinite(gx) && Number.isFinite(gy)) {
        record.gx = gx;
        record.gy = gy;
    } else {
        delete record.gx;
        delete record.gy;
    }
    record.gridMoveTimer = 0;
    if (record.attackKind !== 'melee' && record.attackKind !== 'ranged') {
        delete record.attackKind;
        delete record.attackRange;
    } else {
        record.attackRange = Math.max(1, Math.floor(clampFiniteNumber(record.attackRange, 1, 1, 99)));
    }
    return record;
}

export function normalizeRecentDamageEvent(deps, entry) {
    if (!entry || typeof entry !== 'object') return null;
    let ele = (0, deps.normalizeDamageElementKey)(entry.ele);
    let amount = Math.max(0, Math.floor(clampFiniteNumber(entry.amount, 0, 0)));
    return {
        at: clampFiniteNumber(entry.at, Date.now(), 0),
        ele: ele,
        amount: amount,
        source: typeof entry.source === 'string' ? entry.source : '',
        sourceType: ['monster', 'hazard', 'ailment'].includes(entry.sourceType) ? entry.sourceType : 'hazard',
        sourceId: typeof entry.sourceId === 'string' || Number.isFinite(entry.sourceId) ? entry.sourceId : null,
        sourceName: typeof entry.sourceName === 'string' ? entry.sourceName : '',
        ailmentType: typeof entry.ailmentType === 'string' ? entry.ailmentType : ''
    };
}

export function pruneEnemyRuntimeMap(aliveEnemyIds, rawMap, options = {}) {
    let map = (rawMap && typeof rawMap === 'object') ? rawMap : {};
    let keys = Object.keys(map);
    let maxKeys = Math.max(0, Math.floor(options.maxKeys || 200));
    let out = {};
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (!aliveEnemyIds.has(String(key))) continue;
        out[key] = map[key];
        if (Object.keys(out).length >= maxKeys) break;
    }
    return out;
}
