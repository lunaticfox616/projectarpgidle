import { HERO_HALF_CELLS } from './combat-grid-values.mjs';

export function cellGetBossStageActor(env, enemy) {
    if (typeof env.deps.MONSTER_STAGE_ROSTER !== 'object') return null;
    const roster = env.deps.MONSTER_STAGE_ROSTER, look = enemy.spriteVariantId || enemy.monsterVisualId;
    return roster.actors[roster.wears[look] || look] || roster.actors[enemy.bossAssetKey] || null;
}

export function cellGetStageLookScale(env, id) {
    const rule = typeof env.deps.STAGE_MONSTER_SCALE === 'object' ? env.deps.STAGE_MONSTER_SCALE : {};
    if (Object.hasOwn(rule, id)) return rule[id];
    const prefix = Object.keys(rule).find(head => head.endsWith('-') && id.startsWith(head));
    return prefix ? rule[prefix] : 1;
}

export function cellFitBossFootprint(env, enemy) {
    const actor = enemy && enemy.isBoss && !enemy.footprint ? cellGetBossStageActor(env, enemy) : null;
    if (!actor) return;
    const reach = Math.max(...(actor.reach || [actor.width / 2, 0])) * cellGetStageLookScale(env, actor.id) / (env.deps.BOSS_DRAW_SCALE * env.deps.STAGE_VIEW.heroTile);
    const columns = Math.max(2, Math.min(6, Math.ceil(2 * (reach - 0.5 + HERO_HALF_CELLS) - 0.01)));
    if (columns > 2) enemy.footprint = { columns, rows: 2 };
}

export function cellGetEnemyPictureMelee(env, enemy) {
    const kind = typeof env.deps.getMonsterVisualAttackKind === 'function' ? env.deps.getMonsterVisualAttackKind(enemy.spriteVariantId || enemy.monsterVisualId) : null;
    return kind ? kind === 'melee' : null;
}

export function cellRollEnemyGridCombatProfile(env, enemy) {
    const cfg = env.deps.COMBAT_GRID_CONFIG;
    if (enemy.monsterArchetype === 'wisp') return {melee:false,range:cfg.rangedEnemyMinRange};
    const identity = enemy.monsterVisualId || enemy.spriteVariantId;
    const random = identity ? env.deps.createSeededRng('enemy-attack:' + identity) : Math.random;
    const rolled = random() < cfg.meleeEnemyChance, picture = cellGetEnemyPictureMelee(env, enemy);
    const melee = picture === null ? rolled : picture;
    return {melee,range:melee ? cfg.meleeAttackRange
        : cfg.rangedEnemyMinRange+Math.floor(random()*(cfg.rangedEnemyMaxRange-cfg.rangedEnemyMinRange+1))};
}

export function cellAssignEnemyGridCombatProfile(env, enemy) {
    let cfg = env.deps.COMBAT_GRID_CONFIG;
    if (enemy.isBoss) {
        const reach = env.deps.getBossReach(enemy);
        enemy.attackKind = reach.id === 'melee' ? 'melee' : 'ranged';
        enemy.attackRange = reach.range;
        return;
    }
    const {melee,range} = cellRollEnemyGridCombatProfile(env, enemy);
    enemy.attackKind = melee ? 'melee' : 'ranged';
    enemy.attackRange = range;
    enemy.attackDelivery = melee ? 'instantTarget' : (range === cfg.rangedEnemyMinRange ? 'projectileTarget' : 'projectileCell');
    enemy.projectileToEdge = !melee && range === cfg.rangedEnemyMaxRange;
    enemy.attackCastMs = enemy.isElite && enemy.projectileToEdge ? 900 : 0;
    enemy.attackCastSpecial = false;
    enemy.attackLabel = enemy.attackCastMs ? '관통 사격' : '';
    Object.assign(enemy, env.deps.MONSTER_COMBAT_ROLES.profile(enemy));
    enemy.attackCast = null;
    enemy.castInterruptedUntil = 0;
}
