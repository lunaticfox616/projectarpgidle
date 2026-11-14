import { threadZoneKeys, threadKillChance, threadDropPool, threadOpen } from './knitting-sources.mjs';

export function threadPick(rows, random) { return rows[Math.floor(random() * rows.length)]; }

/** 등급 가중치에 가산 한 번: 주력 지역이면 homeBonus, 아니고 보스·정예 전용 출처면 그보다 작은 rankBonus. 등급이 없는 행은 0. */
export function threadBaseWeight(env, row, keys, enemy) {
    const grade = env.deps.KNITTING.grades[row.grade];
    if (!grade || !(row.set >= 1)) return 0;
    if ((row.homes || []).some(key => keys.includes(key))) return grade.weight * env.deps.KNITTING.homeBonus;
    const ranked = !!enemy && !!(row.source.boss || row.source.elite);
    return grade.weight * (ranked ? env.deps.KNITTING.rankBonus : 1);
}

/** 풀 안에서 등급 순으로: 어떤 행도 더 낮은 등급 어느 행보다 무겁지 않고, 완성 속도(가중치 ÷ 세트)도 더 빠르지 않다. */
export function threadWeighted(env, rows, zone, enemy) {
    const keys = threadZoneKeys(zone);
    const list = rows.map(row => ({ row, weight: threadBaseWeight(env, row, keys, enemy) })).filter(entry => entry.weight > 0)
        .sort((a, b) => a.row.grade - b.row.grade);
    const floor = { weight: Infinity, pace: Infinity }, current = { grade: 0, weight: Infinity, pace: Infinity };
    for (const entry of list) {
        if (entry.row.grade !== current.grade) {
            floor.weight = Math.min(floor.weight, current.weight);
            floor.pace = Math.min(floor.pace, current.pace);
            Object.assign(current, { grade: entry.row.grade, weight: Infinity, pace: Infinity });
        }
        entry.weight = Math.min(entry.weight, floor.weight, floor.pace * entry.row.set);
        current.weight = Math.min(current.weight, entry.weight);
        current.pace = Math.min(current.pace, entry.weight / entry.row.set);
    }
    return list;
}

export function threadPickWeighted(list, random) {
    const total = list.reduce((sum, entry) => sum + entry.weight, 0);
    if (!(total > 0)) return null;
    let roll = random() * total;
    return (list.find(entry => (roll -= entry.weight) < 0) || list[list.length - 1]).row.id;
}

export function threadRollKill(env, state, zone, enemy, random = Math.random) {
    // 첫 관문: 해금 전에는 난수, 150행 순회, 풀 작성, 가중치 정렬, 보상 검사를 하나도 하지 않는다.
    // isUnlocked는 hardMinLoop에서 바로 끝난다(content-progression meetsUsageGate).
    if (!env.deps.contentProgression.isUnlocked('knitting', state)) return null;
    if (!zone || !enemy || enemy.noLoot) return null;
    if (random() >= threadKillChance(env, zone, enemy, state.level)) return null;
    return threadPickWeighted(threadWeighted(env, threadDropPool(env, state, zone, enemy), zone, enemy), random);
}

/** 반환 실타래: 발견한 여러 개짜리 중 반환하는 종류의 등급 이하만. 반환형·1개짜리·반환 제외·잠긴 종류는 없다. */
export function threadYarnPool(env, state, id) {
    const grade = env.byId.get(id)?.grade || 0;
    return env.deps.KNITTING.list.filter(row => row.id !== id && row.set > 1 && !row.reward.yarns && row.yarnOut !== false
        && row.grade <= grade && state.knitting.seen.includes(row.id) && threadOpen(env, state, row));
}

export function threadPickYarn(env, state, id, random) { return threadPickWeighted(threadWeighted(env, threadYarnPool(env, state, id), null, null), random); }

export function threadReason(env, state, id) {
    const row = env.byId.get(id);
    const count = state.knitting.counts[id] || 0;
    if (!row || !state.knitting.seen.includes(id)) return '발견하지 않은 실타래입니다.';
    if (!env.deps.contentProgression.isUnlocked('knitting', state)) return '뜨개질이 아직 열리지 않았습니다.';
    if (state.woodsmanBuildLock) return '나무꾼 전투 중에는 뜨개질할 수 없습니다.';
    if (!threadOpen(env, state, row)) return '보상에 필요한 콘텐츠를 먼저 해금하세요.';
    if (count < row.set) return env.deps._t('실타래 부족 ({count}/{set})', { count, set: row.set });
    if (row.reward.yarns && !threadYarnPool(env, state, id).length) return '다른 종류의 실타래를 먼저 발견하세요.';
    return '';
}
