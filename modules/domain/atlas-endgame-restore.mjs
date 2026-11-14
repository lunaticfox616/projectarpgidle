import { atlasLateCapped, atlasLateValidEcho } from './atlas-endgame-run.mjs';
import { atlasLateDefaults } from './atlas-endgame-ledger.mjs';

/** @param {boolean} pinnacleDone the shadow is a completed node: a save from before the late atlas (or one that lost it) wakes. */
export function atlasLateNormalize(env, raw, pinnacleDone = false) {
    const source = raw && typeof raw === 'object' ? raw : {}, kills = atlasLateCapped(source.kills, env.KILL_IDS, 1e6);
    if (pinnacleDone && !kills.pinnacle) kills.pinnacle = 1;
    return { kills, items: atlasLateCapped(source.items, env.ITEM_IDS, env.E.itemCap),
        blight: atlasLateCapped(source.blight, env.deps.ATLAS.regions.map(region => region.id), env.E.blight.max),
        witness: Math.max(0, Math.min(1e6, Math.floor(Number(source.witness) || 0))),
        witnessed: (Array.isArray(source.witnessed) ? source.witnessed : []).filter(atlasLateValidEcho).slice(-env.E.witness.keep) };
}

/** 시대 재생: 후반부 진행(깨어남, 처치, 재료, 마름, 목격)도 되돌린다. 지갑에 있는 제단 재료도 함께. */
export function atlasLateReset(env, state) {
    state.atlas.endgame = atlasLateDefaults();
    Object.values(env.WALLET).forEach(key => { state.currencies[key] = 0; });
}
