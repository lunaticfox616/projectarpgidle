// 세계수 연대기(data/chronicle.js): 장마다 저장 상태에서 지금 수와 목표를 세고, 무게를 곱한 완성도로 나이테를 감는다. 감긴 나이테는
// game.chronicle.rings에 남고 풀리지 않는다. 확인은 자동 저장 직전(js/main.js)과 기록 창을 그릴 때 하고, 새 나이테는 'chronicle-ring'
// 이벤트로 알린다(js/chronicle-ui.js). 방치 효율은 감긴 나이테 수만 읽는다(js/offline-progress.js).
import { chronicleCount, chronicleKeysOf, chronicleList, chronicleCompletedLoops, chronicleChapters, chronicleCompletion, chronicleRings, chronicleCheck, chronicleOffline } from './chronicle-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createChronicle(deps) {
    const env = { deps };
    env.C = env.deps.CHRONICLE;
    env.journalIds = new Set(env.deps.JOURNAL_ENTRY_ORDER.filter(id => !env.deps.JOURNAL_DB[id].discoveryOnly));
    env.COUNTERS = Object.freeze({
    codex: state => chronicleCount(chronicleKeysOf(state.uniqueCodex).filter(key => env.deps.UNIQUE_CODEX_KEYS.has(key)).length, env.deps.UNIQUE_CODEX_KEYS.size),
    mastery: state => chronicleCount(env.deps.weaponMastery.total(state), env.deps.weaponMastery.ids.length * env.deps.WEAPON_MASTERY.maxLevel),
    talismans: state => chronicleCount(chronicleList(state.stumpBox && state.stumpBox.codex).length, env.deps.TALISMAN_UNIQUE_DB.length + env.deps.TALISMAN_WILD_UNIQUE_DB.length),
    journal: state => chronicleCount(chronicleList(state.journalEntries).filter(id => env.journalIds.has(id)).length, env.journalIds.size),
    depth: state => chronicleCount(Math.max(0, (Number(state.records && state.records.best && state.records.best.abyssDepth) || 0) - 20), null),
    loops: state => chronicleCount(chronicleCompletedLoops(state), null),
    harvest: state => chronicleCount(chronicleList(state.stumpBox && state.stumpBox.harvest && state.stumpBox.harvest.grown).length,
        env.deps.STUMP_BOX_HARVEST.rows.length * Object.keys(env.deps.STUMP_BOX_COLORS).length),
    fishing: state => chronicleCount(chronicleKeysOf(state.ocean && state.ocean.fishCaughtTotal).filter(key => Object.hasOwn(env.deps.OCEAN_FISH_DB, key)).length,
        Object.keys(env.deps.OCEAN_FISH_DB).length),
    variants: state => chronicleCount(state.atlas && state.atlas.memory ? env.deps.bossVariants.records(state).filter(row => row.kills > 0).length : 0,
        env.deps.BOSS_VARIANTS.kinds.length),
    memory: state => chronicleCount(Math.max(0, ...Object.values((state.atlas && state.atlas.memory && state.atlas.memory.best) || {}).map(Number)), null),
    epochs: state => chronicleCount(state.atlas && state.atlas.epoch ? state.atlas.epoch.count : 0, null)
});
    return Object.freeze({
        chapters: (...args) => chronicleChapters(env, ...args),
        completion: (...args) => chronicleCompletion(env, ...args),
        rings: (...args) => chronicleRings(env, ...args),
        check: (...args) => chronicleCheck(env, ...args),
        offline: (...args) => chronicleOffline(env, ...args)
    });
}
