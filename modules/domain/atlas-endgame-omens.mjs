import { atlasLateKills, atlasLateAwakened } from './atlas-endgame-ledger.mjs';

// ---------------------------------------------------------------- 뿌리를 품은 몬스터 (data/items.js CRAFT_OMENS bearer)
/** The omens late maps carry: those of the final bosses already felled (each boss's echo spreads its omen). */
export function atlasLateBearableOmens(env, state) { return env.deps.CRAFT_OMENS.keys.filter(key => atlasLateKills(state, env.deps.CRAFT_OMENS.effects[key].boss) > 0); }

export function atlasLateBearerZone(env, zone) {
    const B = env.deps.CRAFT_OMENS.bearer;
    return Boolean(zone && ((zone.type === 'atlasMap' && zone.atlasTier >= B.minAtlasTier) || (zone.type === 'abyss' && zone.depth >= B.minChaosDepth)));
}

/** An elite's or another monster's chance, raised by the map's 뿌리의 메아리 (data/loot-omens.js, run bonus omenBearer %). */
export function atlasLateBearerChance(env, state, enemy) {
    const run = state.atlas.run, bonus = Number(run && run.bonus && run.bonus.omenBearer) || 0;
    return (enemy.isElite ? env.deps.CRAFT_OMENS.bearer.elite : env.deps.CRAFT_OMENS.bearer.normal) * (1 + bonus / 100);
}

/** A new monster in a late map or deep chaos sometimes carries the omen of a final boss already felled, and its name says so. */
export function atlasLateMarkOmenBearer(env, state, enemy, zone, random = Math.random) {
    if (enemy.isBoss || enemy.isSummon || enemy.craftOmen || !atlasLateAwakened(state) || !atlasLateBearerZone(env, zone)) return;
    const omens = atlasLateBearableOmens(env, state);
    if (!omens.length || random() >= atlasLateBearerChance(env, state, enemy)) return;
    enemy.craftOmen = omens[Math.floor(random() * omens.length)];
    enemy.name = `뿌리를 품은 ${enemy.name}`;   // 한국어 원문으로 둔다: 보여 줄 때 옮긴다(js/i18n.js enemyName)
}

/** The omen key a slain bearer leaves, once ('' for any other monster). */
export function atlasLateTakeOmen(enemy) {
    if (!enemy.craftOmen || enemy.craftOmenTaken) return '';
    enemy.craftOmenTaken = true;
    return enemy.craftOmen;
}
