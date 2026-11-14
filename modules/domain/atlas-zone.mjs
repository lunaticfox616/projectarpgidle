import { atlasCoreBonusOf } from './atlas-bonuses.mjs';
import { atlasCoreActiveFragments } from './atlas-loadout.mjs';

// ---------------------------------------------------------------- the combat zone of the open map
export function atlasCoreEquivalentDepth(env, tier) { return env.deps.ATLAS.difficulty.baseDepth + (tier - 1) * env.deps.ATLAS.difficulty.depthPerTier; }

/** The zone getZone(ATLAS.zoneId) returns while a map is open (memoized per run: its map and bonus never change). */
export function atlasCoreZone(env, state) {
    const run = state.atlas && state.atlas.run;
    if (!run) return null;
    if (!env.zones.has(run)) env.zones.set(run, atlasCoreBuildZone(env, run));
    return env.zones.get(run);
}

/** A node's boss rules: late fights carry their own (stages, life, damage). */
export function atlasCoreRulesOf(env, node) { return node.rules || env.BOSS_RULES[node.kind]; }

/** The wide-map spec of a map item (js/exploration-layouts.js): its node's painted act map — guardians and the pinnacle start
 * at their arena's boss gate — the same map for every entry through its portals. */
export function atlasCoreExplorationSpec(env, map) {
    const node = env.BY_ID.get(map.node), spec = { style: 'act', act: node.act, seed: `atlas:${map.uid}`, bossStages: atlasCoreRulesOf(env, node).stages };
    // 기억 던전의 싸움(map.memory)은 어느 노드든 그 보스만 있는 투기장이다.
    return node.arena || map.memory ? { ...spec, arena: true } : spec;
}

/** Ordinary rooms of the map's layout: how many content rooms it can hold. */
export function atlasCoreEncounterRooms(env, map) { return env.deps.atlasEncounters.hostRooms(env.deps.actExplorationMap.forRun({ source: atlasCoreExplorationSpec(env, map) })).length; }

/** The supply chests of a map (js/exploration-objects.js chestGrade): silver and gold odds up by chestGrade %, chestExtra more
 * chests and, with chestMinGrade (보급 각인), no wooden ones. */
export function atlasCoreChestRules(bonus) { return { grade: Number(bonus.chestGrade) || 0, extra: Number(bonus.chestExtra) || 0, min: Number(bonus.chestMinGrade) > 0 ? 1 : 0 }; }

export function atlasCoreBuildZone(env, run) {
    const { map, bonus } = run, node = env.BY_ID.get(map.node), fx = env.deps.atlasMaps.effects(map), depth = atlasCoreEquivalentDepth(env, map.tier);
    const more = key => 1 + bonus[key] / 100, boss = atlasCoreRulesOf(env, node), boost = env.deps.atlasEndgame.bossBoost(run), memory = env.deps.memoryDungeon.boost(map);
    return {
        id: env.deps.ATLAS.zoneId, name: env.deps.memoryDungeon.zoneName(map, node), type: 'atlasMap', tier: env.deps.getAbyssZoneTier(depth), maxKills: 1, ele: node.ele,
        areaLevel: env.deps.ATLAS.areaLevel.base + (map.tier - 1) * env.deps.ATLAS.areaLevel.perTier,
        // 루프 인플레이션 대신 등급이 정한 고정 루프 · 깊이 (combat getLoopDifficultyInputs · state getAbyssMonsterScales).
        fixedSeason: depth - env.deps.ATLAS.difficulty.loopBehindDepth, equivalentDepth: depth, equivalentChaosDepth: depth,
        mapHpMul: fx.hp * more('monsterLife'), mapDamageMul: fx.damage * more('monsterDamage'),
        bossMods: { hpMul: fx.bossHp * more('bossLife') * boss.hpMul * boost.hp * memory.hp,
            damageMul: fx.bossDamage * more('bossLife') * boss.damageMul * boost.damage * memory.damage },
        // 불타는 땅: 불길 웅덩이(옵션 문구 그대로 불 원소로 터진다).
        ...(fx.hazard ? { trialHazard: { ...env.deps.ATLAS.burningGround, persistent: true }, trapElements: fx.groundElements } : {}),
        atlasNode: node.id, atlasRegion: node.region, atlasTier: map.tier, atlasMapRarity: map.rarity, atlasEnemyMods: fx.enemy, atlasEncounters: run.encounters,
        // 황금 방(data/atlas.js goldenRoom)과 보급 상자 규칙(열매 갈래의 황금 수확, 보급 각인).
        atlasGolden: run.golden, atlasChest: atlasCoreChestRules(bonus),
        atlasLootQuantity: fx.quantity + bonus.quantity, atlasLootRarity: fx.rarity + bonus.rarity, atlasBossRarity: bonus.bossRarity,
        packExtra: fx.packExtra + bonus.packSize, atlasExtraElite: fx.extraElite + bonus.extraElite / 100,
        atlasSeed: map.uid, bossName: node.boss, bossAct: node.bossAct, bossVisualId: run.board ? null : node.bossVisualId,
        atlasCleared: run.cleared,
        atlasKind: node.kind, memoryTier: map.memory || 0, exploration: atlasCoreExplorationSpec(env, map), ...env.deps.atlasEndgame.zoneExtras(run, node),
        ...env.deps.lootOmens.zoneFields(map),
        ...(run.board ? { name: `${env.deps.ATLAS_BOARD.text.title}: ${run.board.name}`, boardBoss: run.board.boss,
            bossName: run.board.boss ? env.deps.ATLAS_BOARD.text.boss.name : node.boss,
            mapHpMul: 1 + run.board.risk * .12, mapDamageMul: 1 + run.board.risk * .05,
            atlasLootQuantity: 0, atlasLootRarity: 0 } : {})
    };
}

/** What a stash map would be with the current passives and loadout (the device card). */
export function atlasCorePreview(env, state, map) { return atlasCoreBuildZone(env, { map, bonus: atlasCoreBonusOf(env, state, atlasCoreActiveFragments(env, state)), encounters: [], golden: [] }); }

/** Equipment base tier from the map tier: T15 at 1~3등급, one more every three tiers, T20 at 16등급. */
export function atlasCoreLootTier(tier) { return Math.min(20, 14 + Math.ceil(tier / 3)); }
