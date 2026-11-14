// 전직 노드 상향(2026-11-11 사용자 "전부다"): 기존 전투 흐름에 한 줄씩 끼우는 전투 규칙. 키스톤은 hasKeystone으로 고르고, 수치는
// data/ascendancies.js ASCENDANCY_KEYSTONE_VALUES 한 곳에서 읽는다. 짧게 사는 전투 상태(갈라진 땅, 이중 폭발 대기, 철갑에 모인 피해,
// 반격과 불굴의 대기 시간)는 저장하지 않는다. 능력치 계산이 읽는 값(흐르는 칼끝 중첩, 불굴 발동)은 js/player-stat-cache.js 읽기 함수로 읽는다.
// 같은 날 단순 능력치 키스톤 열 개도 여기서 규칙을 받았다(사용자: 증폭도 아니고 너무 단순한 규칙): 잔상, 비껴내기, 연무, 질풍 시위, 바람 발,
// 폭풍의 눈, 서리 이끼, 수액 재생, 뿌리 갑주, 넓은 투척.
// 부르는 곳: 공격 시작 js/combat-tick.js queuePlayerAttackSequence, 주인공의 적중 js/combat-support-runes.js dealHit, 맞음과 회피
// js/combat-enemy-turn.js, 소환수 적중 js/combat-summon-stats.js, 지속 피해와 냉기 중독 js/combat-skill-effects.js, 연속 타격 js/combat-tick.js,
// 폭발에 맞은 적의 수 js/combat-player-attack.js. 능력치 쪽(불굴, 광분, 흐르는 칼끝, 뿌리 갑주의 배율)은 js/player-stats.js
// getAscendancyNodeStatMultipliers가 이 파일의 읽기 값으로 센다.
// 방치 정산이 다른 게임 사본으로 싸울 때는 전투 모듈 상태처럼 따라간다(js/combat.js captureCombatRuntime, restoreCombatRuntime).
import { ascendNodeReset, ascendNodeCapture, ascendNodeRestore } from './ascendancy-rule-runtime.mjs';
import { ascendNodeOnAttack, ascendNodeStoreArmorBlow, ascendNodeBlastMultiplier } from './ascendancy-rule-attacks.mjs';
import { ascendNodeFlowStacks, ascendNodeUnyieldingActive, ascendNodeBeforeHit, ascendNodeMossSlowPct, ascendNodeArmorBreak, ascendNodeRooted, ascendNodePoisonHeld, ascendNodeAilmentStep, ascendNodeDotMultiplier, ascendNodeSummonHitMultiplier } from './ascendancy-rule-reads.mjs';
import { ascendNodeOnLifeDrop, ascendNodeCounter } from './ascendancy-rule-defense.mjs';
import { ascendNodeAfterHit } from './ascendancy-rule-hits.mjs';
import { ascendNodeTick } from './ascendancy-rule-ticks.mjs';
import { ascendNodeStoreSharedBlow, ascendNodeTakeSharedBlow, ascendNodeOnSummonKill } from './ascendancy-rule-summons.mjs';

/** One transient combat-state owner, captured/restored by combat replay. Gameplay methods
 * receive their target save explicitly; visual commands are consumed at the application boundary. */
export function createAscendancyNodeRules(deps) {
    const env = { deps };
    env.ECHO_WAIT_MS = 3000;
    env.NO_GALE = Object.freeze({ charges: 0, active: false, splashed: false });
    ascendNodeReset(env);
    return Object.freeze({
        reset: (...args) => ascendNodeReset(env, ...args),
        capture: (...args) => ascendNodeCapture(env, ...args),
        restore: (...args) => ascendNodeRestore(env, ...args),
        onAttack: (...args) => ascendNodeOnAttack(env, ...args),
        flowStacks: (...args) => ascendNodeFlowStacks(env, ...args),
        unyieldingActive: (...args) => ascendNodeUnyieldingActive(env, ...args),
        onLifeDrop: (...args) => ascendNodeOnLifeDrop(env, ...args),
        storeArmorBlow: (...args) => ascendNodeStoreArmorBlow(env, ...args),
        counter: (...args) => ascendNodeCounter(env, ...args),
        beforeHit: (...args) => ascendNodeBeforeHit(env, ...args),
        mossSlowPct: (...args) => ascendNodeMossSlowPct(env, ...args),
        armorBreak: (...args) => ascendNodeArmorBreak(env, ...args),
        afterHit: (...args) => ascendNodeAfterHit(env, ...args),
        blastMultiplier: (...args) => ascendNodeBlastMultiplier(env, ...args),
        tick: (...args) => ascendNodeTick(env, ...args),
        rooted: (...args) => ascendNodeRooted(env, ...args),
        poisonHeld: (...args) => ascendNodePoisonHeld(env, ...args),
        ailmentStep: ascendNodeAilmentStep,
        dotMultiplier: (...args) => ascendNodeDotMultiplier(env, ...args),
        summonHitMultiplier: (...args) => ascendNodeSummonHitMultiplier(env, ...args),
        storeSharedBlow: (...args) => ascendNodeStoreSharedBlow(env, ...args),
        takeSharedBlow: ascendNodeTakeSharedBlow,
        onSummonKill: (...args) => ascendNodeOnSummonKill(env, ...args)
    });
}
