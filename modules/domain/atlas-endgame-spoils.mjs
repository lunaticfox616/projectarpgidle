import { atlasLateAwakened, atlasLateGive, atlasLateDef, atlasLateWitness } from './atlas-endgame-ledger.mjs';

// ---------------------------------------------------------------- rooms in a map
export function atlasLateRoomItem(env, room) {
    if (env.E.altars[room]) return { item: env.E.altars[room].item, rate: env.E.altars[room].amount };
    const league = env.LEAGUE_BY_ROOM.get(room);
    return league ? { item: league.item, rate: league.shards } : null;
}

/** Expected base + perTier × tier; the fraction rolls one more. */
export function atlasLateRolledAmount(rate, tier, random) { const expected = rate[0] + rate[1] * tier; return Math.floor(expected) + Number(random() < expected % 1); }

export function atlasLateLateRun(state) { return (atlasLateAwakened(state) && state.atlas.run && state.atlas.run.endgame) || null; }

/** An emptied altar or league room (once awake): its late material waits in the run until the boss falls. @returns {Array} [[item, n]]. */
export function atlasLateRoomItems(env, state, zone, room, random = Math.random) {
    const held = atlasLateLateRun(state), found = atlasLateRoomItem(env, room);
    if (!held || !found) return [];
    const amount = atlasLateRolledAmount(found.rate, zone.atlasTier || 1, random);
    held.items[found.item] = (held.items[found.item] || 0) + amount;
    return amount > 0 ? [[found.item, amount]] : [];
}

export function atlasLateKeepHeld(env, state, run, out) {
    const extra = run.endgame || {};
    for (const [item, amount] of Object.entries(extra.items || {})) {
        const got = atlasLateGive(env, state, item, amount); // at the cap only part of it fits: tell what really came in
        if (got) out.items.push([item, got]);
    }
}

/** The material a late boss gives on top of its fight's spoils: guardians their shear, apostles their rot shard. */
export function atlasLateBossMaterial(env, state, node, run, out) {
    if (node.kind === 'guardian' && env.E.guardianShears[node.region] && atlasLateGive(env, state, env.E.guardianShears[node.region], 1)) out.items.push([env.E.guardianShears[node.region], 1]);
    const apostle = env.APOSTLES.get(run.endgame && run.endgame.apostle);
    if (apostle && atlasLateGive(env, state, apostle.item, 1)) out.items.push([apostle.item, 1]);
}

export function atlasLateFightSpoils(env, state, node, out, first) {
    const row = atlasLateDef(env, node.id);
    if (!row) return;
    out.rewards = row.rewards.filter(([key]) => env.deps.contentProgression.canDropCurrency(key));
    const chance = env.E.uniqueChance[row.kind] || 0;
    // 고유가 둘인 우두머리(묘목장: 어미나무의 손길, 떨어지지 않는 열매, 시든 정원: 마른 꽃잎 고리, 감기는 덩굴손)는 그 가운데 하나를 준다.
    const uniques = [].concat(row.unique || []);
    if (uniques.length && (first || Math.random() < chance)) out.unique = uniques[Math.floor(Math.random() * uniques.length)];
}

/** The weaver witnesses late bosses (not herself, nor the kill that woke the atlas). */
export function atlasLateWitnessKill(env, state, node, apostle) {
    if (apostle) return atlasLateWitness(env, state, apostle.name, apostle.bossAct);
    return env.LATE_BOSSES.has(node.kind) && node.id !== 'apex_weaver' ? atlasLateWitness(env, state, node.boss, node.bossAct) : 0;
}
