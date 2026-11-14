/** 아틀라스 후반부 (docs/atlas-pinnacles-20261002.md 2-1, 3절, data/atlas-endgame.js): 깨어남, 최종 보스 다섯과 리그 우두머리를 여는 조건과
 * 재료, 지도 속 마름의 사도 · 제단 · 리그 조각, 나이테의 목격, 보스 처치 보상과 단계별 특수기.
 * 상태는 game.atlas.endgame {kills, items, blight, witness, witnessed}: 루프를 넘어 남고 시대 재생 때 비운다.
 * 지도 장치 런(js/atlas.js · js/atlas-run.js)과 넓은 맵 무리(js/combat-encounters.js createActExplorationPack)가 이 모듈의 규칙을 부른다.
 * 런마다의 몫은 run.endgame {apostle, items, echoes}: 방에서 얻은 재료는 지도석처럼 보스를 잡을 때까지 런이 들고 있다.
 */
import { atlasLateDefaults, atlasLateMoveAltarMaterials, atlasLateAwakened, atlasLateKills, atlasLateCount, atlasLateDef } from './atlas-endgame-ledger.mjs';
import { atlasLateNormalize, atlasLateReset } from './atlas-endgame-restore.mjs';
import { atlasLateNormalizeRun, atlasLateRunExtra } from './atlas-endgame-run.mjs';
import { atlasLateAncientDone, atlasLateAncientGate, atlasLateEntryReason, atlasLateSpend, atlasLateRefund } from './atlas-endgame-access.mjs';
import { atlasLateLoopKeptCurrencies, atlasLateOverview } from './atlas-endgame-overview.mjs';
import { atlasLateBossBoost, atlasLateZoneExtras, atlasLateTuneStage, atlasLatePatternState } from './atlas-endgame-boss-stage.mjs';
import { atlasLateRoomItems } from './atlas-endgame-spoils.mjs';
import { atlasLateOnComplete } from './atlas-endgame-completion.mjs';
import { atlasLateBearableOmens, atlasLateMarkOmenBearer, atlasLateTakeOmen } from './atlas-endgame-omens.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
function createAtlasEndgameEnvironment(deps) {
    const env = { deps };
    env.E = env.deps.ATLAS_ENDGAME;
    env.DEFS = new Map([...env.E.apexes.map(row => [row.id, { ...row, kind: 'apex' }]), ...env.E.leagues.map(row => [row.id, { ...row, kind: 'league' }])]);
    env.LEAGUE_BY_ROOM = new Map(env.E.leagues.map(row => [row.room, row]));
    env.BODY_BY_BOSS = new Map([...env.E.leagues, ...env.E.apexes].filter(row => row.bodyVisual).map(row => [row.boss || row.stages[0].name, row]));
    env.APOSTLES = new Map(env.E.apostles.map(row => [row.id, row]));
    env.ITEM_IDS = Object.freeze(Object.keys(env.E.items));
    env.LATE_BOSSES = new Set(['guardian', 'pinnacle', 'apex', 'league']);
    env.WALLET = Object.freeze({ ember: env.deps.ITEM_INFLUENCES.red.currency, ichor: env.deps.ITEM_INFLUENCES.blue.currency });
    env.KILL_IDS = Object.freeze([...env.DEFS.keys(), ...env.APOSTLES.keys(), 'pinnacle', ...env.deps.ATLAS.regions.map(region => `${region.id}_g`)]);
    return env;
}

function createAtlasEndgameLedgerApi(env) {
    return {
        defaults: atlasLateDefaults,
        normalize: (...args) => atlasLateNormalize(env, ...args),
        normalizeRun: (...args) => atlasLateNormalizeRun(env, ...args),
        ancientDone: atlasLateAncientDone,
        ancientGate: (...args) => atlasLateAncientGate(env, ...args),
        moveAltarMaterials: (...args) => atlasLateMoveAltarMaterials(env, ...args),
        reset: (...args) => atlasLateReset(env, ...args),
        loopKeptCurrencies: (...args) => atlasLateLoopKeptCurrencies(env, ...args),
        awakened: atlasLateAwakened,
        kills: atlasLateKills,
        count: (...args) => atlasLateCount(env, ...args),
        def: (...args) => atlasLateDef(env, ...args),
        entryReason: (...args) => atlasLateEntryReason(env, ...args),
        spend: (...args) => atlasLateSpend(env, ...args),
        refund: (...args) => atlasLateRefund(env, ...args),
        runExtra: (...args) => atlasLateRunExtra(env, ...args)
    };
}

function createAtlasEndgameFightApi(env) {
    return {
        bossBoost: (...args) => atlasLateBossBoost(env, ...args),
        zoneExtras: (...args) => atlasLateZoneExtras(env, ...args),
        tuneStage: (...args) => atlasLateTuneStage(env, ...args),
        patternState: (...args) => atlasLatePatternState(env, ...args),
        roomItems: (...args) => atlasLateRoomItems(env, ...args),
        onComplete: (...args) => atlasLateOnComplete(env, ...args),
        overview: (...args) => atlasLateOverview(env, ...args),
        bearableOmens: (...args) => atlasLateBearableOmens(env, ...args),
        markOmenBearer: (...args) => atlasLateMarkOmenBearer(env, ...args),
        takeOmen: atlasLateTakeOmen,
        isFight: id => env.DEFS.has(id),
        itemName: id => (env.E.items[id] ? env.E.items[id].name : id)
    };
}

export function createAtlasEndgame(deps) {
    const env = createAtlasEndgameEnvironment(deps);
    return Object.freeze({
        ...createAtlasEndgameLedgerApi(env),
        ...createAtlasEndgameFightApi(env)
    });
}
