import { buildGetLoopDifficultyInputs } from '../domain/enemy-loop-difficulty.mjs';
import { clampNumber } from '../common/numbers.mjs';
import { buildGetEnemyBaseHp, buildApplyEnemyTraitHp } from '../combat/enemy-spawn-life.mjs';
import { buildGetEnemyLook, buildGetEnemyLookName } from '../combat/enemy-spawn-look.mjs';
import { buildGetCosmosEnemyModifiers, buildGetZoneStaticBossMods } from '../combat/cosmos-enemy-modifiers.mjs';
import { buildGetCosmosExclusiveEnemyTrait } from '../combat/cosmos-enemy-traits.mjs';
import { buildGetEnemyDefence, buildApplySpawnDefences } from '../combat/enemy-spawn-defence.mjs';
import { buildBuildEnemyRecord } from '../combat/enemy-spawn-record.mjs';
import { METEOR_CORE_GUARD } from '../combat/enemy-spawn-values.mjs';
import { buildApplyZoneEnemyMods } from '../combat/chaos-enemy-affixes.mjs';

/** A new monster for zone at marker (its spawn record) in group groupIndex. Split into its steps on 2026-10-18 (it was one function
 * of complexity 254): the same steps and random rolls in the same order, the record's fields in the same order. */
export function* buildCreateEnemy(env, zone, marker, groupIndex) {
    const level = env.deps.levelProgression.monsterLevel(zone, marker);
    zone = env.deps.levelProgression.combatZone(zone);
    const loopInputs = buildGetLoopDifficultyInputs(env, zone);
    const tierProgress = clampNumber(((zone.tier || 1) - 1) / 18, 0, 1);
    const abyssScale = env.deps.getAbyssMonsterScales(zone);
    const markedBoss = !!marker.boss;
    const isElite = !!marker.elite && !markedBoss;
    let hp = buildGetEnemyBaseHp(env, zone, { loopInputs, tierProgress, abyssScale, isBoss: markedBoss, isElite });
    const enemyEle = env.deps.cosmosRouteRuntime.enemyElement(zone, markedBoss, env.deps.pickEnemyElement(zone, buildGetEnemyElementPool(zone), markedBoss));
    // 혼돈 밖의 나무꾼 is always a boss, with 120 times the life
    const woodsman = zone.type === 'outsideChaos';
    const isBoss = markedBoss || woodsman;
    if (woodsman) hp = Math.floor(hp * 120);
    let name = isBoss ? `👿 ${env.deps.getBossNameForZone(zone, marker.storyStage ?? 0)}` : env.deps._t('{split} 추종자', { split: zone.name.split(':')[0] });
    const { zoneSeed, variantSeed } = buildGetEnemySeeds(env, zone, marker, groupIndex);
    const look = buildGetEnemyLook(env, zone, marker, { isBoss, isElite, enemyEle, variantSeed });
    hp = Math.floor(hp * look.wispDefense.hpMul);
    name = buildGetEnemyLookName(name, isBoss, isElite, look);
    const cosmosMods = buildGetCosmosEnemyModifiers(env, zone, isElite, isBoss) || buildGetZoneStaticBossMods(zone, isBoss);
    const mods = { trait: look.trait, cosmosMods, cosmosExclusiveTrait: buildGetCosmosExclusiveEnemyTrait(env, zone, isElite, isBoss, variantSeed) };
    hp = buildApplyEnemyTraitHp(hp, mods);
    const isSky = buildRollEnemySky(env, zone, isBoss);
    if (isSky) name = env.deps._t('부유하는 {name}', { name });
    const defence = buildGetEnemyDefence(env, zone, { enemyEle, isBoss, isElite, loopInputs, wispDefense: look.wispDefense });
    const rolled = { hybridElement: buildRollEnemyHybridElement(env, zone, isBoss), patternMode: buildRollEnemyPatternMode(env, cosmosMods, isBoss) };
    const spawn = { level, hp, name, isElite, isBoss, groupIndex, zoneSeed, variantSeed, enemyEle, abyssScale, look, mods, defence, rolled, isSky, plainBoss: !!marker.plainBoss };
    const enemy = buildBuildEnemyRecord(env, zone, marker, spawn);
    buildFinishEnemySpawn(env, enemy, zone, spawn);
    (yield { kind: 'primeEnemyHpDamageGhost', args: [enemy.id, 100] });
    return enemy;
}

/** The zone's seed and the monster's variant seed (its look, trait and swing rhythm). */
export function buildGetEnemySeeds(env, zone, marker, groupIndex) {
    const zoneSeed = Number.isFinite(zone.id) ? zone.id : env.deps.hashSeed(zone.id || zone.name || 'zone');
    return { zoneSeed, variantSeed: ((zoneSeed + 1) * 37 + (marker.at || 0) * 13 + groupIndex * 17) % 997 };
}

/** From loop 3 the second element a monster mixes in: a boss's own pair's second, else a random chaos boss element. */
export function buildRollEnemyHybridElement(env, zone, isBoss) {
    return (env.owner.season || 1) >= 3 ? ((isBoss && env.deps.getChaosBossElements(zone)) || [null, env.deps.rndChoice(env.deps.CHAOS_BOSS_ELEMENTS)])[1] : null;
}

/** The cosmos encounter's pattern, else a boss's random one of this loop's modes. */
export function buildRollEnemyPatternMode(env, cosmosMods, isBoss) {
    return (cosmosMods && cosmosMods.patternMode) || (isBoss
        ? (env.deps.rndChoice(env.deps.getBossPatternModesForLoop(env.owner.season || 1)) || null)
        : null);
}

export function buildHardenMeteorCore(enemy, ele) {
    const key = METEOR_CORE_GUARD[ele] || 'resF';
    enemy[key] = Math.min(key === 'dr' ? 90 : 95, (enemy[key] || 0) + 12);
}

/** The new monster's last steps: its defences, zone mods, the grand breach tuning, the grid profile, the severed wanderer, a boss's
 * last steps, the board carrier and root bearer marks. */
export function buildTuneMeteorEnemy(env, enemy, zone) {
    if (zone.type !== 'meteor') return;
    // 운석의 종류(data/maps.js METEOR_KINDS)가 속성을 정한다: 핵은 제 속성의 저항(물리는 피해 감소)이 오르고, 호위 사수는 eliteEle.
    const kind = env.deps.METEOR_KINDS.find(row => row.id === zone.meteorKind) || env.deps.METEOR_KINDS[0];
    enemy.ele = kind.ele;
    if (enemy.isBoss) {
        buildHardenMeteorCore(enemy, kind.ele);
    } else if (enemy.isElite) {
        enemy.ele = kind.eliteEle || kind.ele;
        enemy.attackRange = env.deps.COMBAT_GRID_CONFIG.rangedEnemyMaxRange;
        enemy.attackDelivery = 'projectileCell';
        enemy.projectileToEdge = true;
        enemy.attackCastMs = 900;
        enemy.attackCastSpecial = true;
        enemy.attackLabel = '별철 관통';
    } else if (enemy.monsterVisualId === 'meteor-shard') {
        enemy.attackSpeedVar *= 1.2;
        enemy.maxHp = Math.floor(enemy.maxHp * 0.85);
    } else {
        enemy.dr = Math.min(90, enemy.dr + 6);
        enemy.maxHp = Math.floor(enemy.maxHp * 1.2);
    }
    enemy.hp = enemy.maxHp;
}

export function buildFinishEnemySpawn(env, enemy, zone, spawn) {
    buildApplySpawnDefences(env, enemy, zone, spawn);
    buildApplyZoneEnemyMods(env, enemy, zone);
    env.deps.applyGrandBreachMobTuning(zone, enemy);
    env.deps.assignEnemyGridCombatProfile(enemy);
    buildTuneMeteorEnemy(env, enemy, zone);
    if (typeof env.deps.maybeApplySeveredWanderer === 'function') env.deps.maybeApplySeveredWanderer(enemy, zone, spawn.isElite, spawn.isBoss);
    if (!spawn.plainBoss) buildFinishBossSpawn(env, enemy, zone);
    env.deps.atlasEndgame.markOmenBearer(env.owner, enemy, zone);
}

/** A boss's last spawn steps: the hidden journal run and, from loop 33, a rare variant (js/boss-variants.js). */
export function buildFinishBossSpawn(env, enemy, zone) {
    if (!enemy.isBoss) return;
    env.deps.startHiddenJournalBossRun(enemy, zone);
    if (typeof env.deps.bossVariants === 'object') env.deps.bossVariants.maybeApply(enemy, zone);
}

/** The pool a monster's element is picked from: a chaos zone's four, else physical, the zone's own and the four. */
export function buildGetEnemyElementPool(zone) { return zone.ele === 'chaos' ? ['fire','cold','light','chaos'] : ['phys', zone.ele || 'phys', 'fire', 'cold', 'light', 'chaos']; }

/** From loop 4 a deep chaos monster that is not a boss floats 8% of the time. */
export function buildRollEnemySky(env, zone, isBoss) { return (env.owner.season || 1) >= 4 && zone.type === 'abyss' && !isBoss && Math.random() < 0.08; }
