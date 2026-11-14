/** 실타래 수집·발견 기록·뜨개질. counts/once는 이번 루프, seen/knitted는 영구 기록. UI/저장 호출은 소비자가 한다.
 * 드롭(2026-10-22 개편): 확정 드롭은 없다. 처치 등급 확률(KNITTING.chance, 액트 보스 포함) → 출처가 맞는 종류 → 가치 등급 가중치.
 * 주력 지역(row.homes)은 homeBonus, 그 밖의 보스·정예 전용 출처는 그보다 작은 rankBonus를 받고 둘은 겹쳐 곱하지 않는다.
 * 가산 뒤에도 더 좋은 등급이 더 흔하거나 더 빨리 완성되지 않는다. source.once는 루프당 최대 한 번이라는 상한일 뿐 확정 지급이 아니다. */
import { threadZoneKeys, threadDropPool } from './knitting-sources.mjs';
import { threadSetProblem, threadNameProblem, threadSourceProblem, threadZoneKeyProblem, threadUnlockProblem, threadStructureProblems } from './knitting-catalog.mjs';
import { threadDefaults, threadNormalize, threadResetForLoop, threadMarkDrop, threadReceive, threadVisible, threadGainedBetween } from './knitting-state.mjs';
import { threadWeighted, threadRollKill, threadYarnPool, threadPickYarn, threadReason, threadPick } from './knitting-draws.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createKnitting(deps) {
    const env = { deps };
    env.byId = new Map(env.deps.KNITTING.list.map(row => [row.id, row]));
    env.sourceChecks = {
        types: (value, zone) => value.includes(zone.type),
        zones: (value, zone) => threadZoneKeys(zone).some(key => value.includes(key)),
        boss: (value, zone, enemy) => !value || !!enemy.isBoss,
        elite: (value, zone, enemy) => !value || !!enemy.isElite || !!enemy.isBoss,
        treasure: (value, zone, enemy) => !value || !!enemy.treasureCarrier,
        minAtlasTier: (value, zone) => zone.type === 'atlasMap' && Number(zone.atlasTier) >= value,
        act: (value, zone) => Number(zone.id) === value, minAct: (value, zone) => Number(zone.id) >= value,
        kind: (value, zone) => zone.atlasKind === value, apostle: (value, zone) => !value || !!zone.atlasApostle
    };
    env.ZONE_KEY = /^(type|act|atlas|node):\S+$/;
    env.ROW_CHECKS = [(...args) => threadSetProblem(env, ...args), (...args) => threadNameProblem(env, ...args), (...args) => threadSourceProblem(env, ...args), (...args) => threadZoneKeyProblem(env, ...args), (...args) => threadUnlockProblem(env, ...args)];
    return Object.freeze({
        defaults: threadDefaults,
        normalize: (...args) => threadNormalize(env, ...args),
        resetForLoop: threadResetForLoop,
        zoneKeys: threadZoneKeys,
        dropPool: (...args) => threadDropPool(env, ...args),
        weighted: (...args) => threadWeighted(env, ...args),
        rollKill: (...args) => threadRollKill(env, ...args),
        markDrop: (...args) => threadMarkDrop(env, ...args),
        receive: (...args) => threadReceive(env, ...args),
        yarnPool: (...args) => threadYarnPool(env, ...args),
        pickYarn: (...args) => threadPickYarn(env, ...args),
        reason: (...args) => threadReason(env, ...args),
        visible: (...args) => threadVisible(env, ...args),
        gainedBetween: (...args) => threadGainedBetween(env, ...args),
        structureProblems: (...args) => threadStructureProblems(env, ...args),
        row: id => env.byId.get(id),
        validId: id => env.byId.has(id),
        pick: threadPick
    });
}
