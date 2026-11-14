// 무기 숙련(data/weapon-mastery.js): 들고 있는 무기 대분류가 처치마다 경험치를 얻고, 레벨과 10단위 특전이 그 무기를 들었을 때의 능력치가
// 된다. 상태는 game.weaponMastery {xp: {대분류: 누적 경험치}, v: 곡선 판}로 루프를 넘어 남는다(js/loop-reset.js triggerSeasonReset은 건드리지 않는다).
// 처치 기록은 js/combat-skill-effects.js recordKillProgress, 능력치는 getPlayerStats의 계정 보상 묶음(applyAccountRewardStats), 화면은
// js/weapon-mastery-ui.js.
import { masteryReachTable, masteryNeed, masteryLevel, masteryProgress, masteryTotal, masteryWielded, masteryOnKilled, masteryOpened, masteryPerLevel, masteryLines, masteryApplyStats, masteryOffline, masteryGains } from './weapon-mastery-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createWeaponMastery(deps) {
    const env = { deps };
    env.M = env.deps.WEAPON_MASTERY;
    env.IDS = Object.freeze(Object.keys(env.deps.WEAPON_CATEGORIES));
    env.REACH = masteryReachTable(env, env.M.curve);
    env.PAST_REACH = Object.fromEntries(Object.entries(env.M.pastCurves).map(([version, curve]) => [version, masteryReachTable(env, curve)]));
    env.CAP = env.REACH[env.M.maxLevel];
    return Object.freeze({
        ids: env.IDS,
        need: (...args) => masteryNeed(env, ...args),
        reach: level => env.REACH[level],
        level: (...args) => masteryLevel(env, ...args),
        progress: (...args) => masteryProgress(env, ...args),
        total: (...args) => masteryTotal(env, ...args),
        wielded: (...args) => masteryWielded(env, ...args),
        onKilled: (...args) => masteryOnKilled(env, ...args),
        opened: (...args) => masteryOpened(env, ...args),
        perLevel: (...args) => masteryPerLevel(env, ...args),
        lines: (...args) => masteryLines(env, ...args),
        applyStats: (...args) => masteryApplyStats(env, ...args),
        offline: (...args) => masteryOffline(env, ...args),
        gains: (...args) => masteryGains(env, ...args)
    });
}
