// Each projectile gets its own target selection and sequence. Plans retain the original enemy references.
export const PROJECTILE_REPEAT_MS = 60;
export const projectileSupportExtra = skill => skill.supportEffects?.projectiles?.extra || 0;
const projectileAims = skill => (skill.tags || []).includes('projectile') && !(skill.tags || []).includes('summon')
    && !skill.nativeCastId && skill.projectilePattern?.kind !== 'fan';

// Straight shots delay each round; thrown shots delay each projectile and its return to the same enemy.
export function projectileGapOf(shot, foes, thrown) {
    const round = Math.floor(shot / Math.max(1, foes));
    return thrown ? PROJECTILE_REPEAT_MS * (shot + round) : PROJECTILE_REPEAT_MS * round;
}

const projectileSingleSkill = skill => ({ ...skill, targets: Math.max(1, (skill.targets || 1) - projectileSupportExtra(skill)),
    supportEffects: { ...skill.supportEffects, projectiles: null, aimedShots: true } });

function projectileMoreShots(env, pStats) {
    const chance = pStats.uniqueProjExtraShotChance;
    const lucky = chance && env.deps.random() * 100 < Number(chance.chance || 0) ? Math.max(0, Math.floor(chance.shots || 0)) : 0;
    return { plain: projectileSupportExtra(pStats.sSkill), bonus: Math.max(0, Math.floor(pStats.projectileExtraShots || 0)) + lucky };
}

function projectileShotFoes(env, primary, profile, count) {
    const source = env.owner.gridPlayer, side = Math.sign(env.deps.getGridUnitCenter(primary).gx - source.gx);
    const ahead = enemy => profile.kind !== 'line' || !side || (env.deps.getGridUnitCenter(enemy).gx - source.gx) * side >= -0.5;
    const others = (env.owner.enemies || []).filter(enemy => enemy !== primary && enemy.hp > 0 && env.deps.hasGridCell(enemy) && env.deps.actExplorationState.inSight(enemy)
        && env.deps.getGridUnitDistance(source, enemy) <= Math.max(1, profile.range || 1) && ahead(enemy))
        .sort((a, b) => env.deps.getGridUnitDistance(source, a) - env.deps.getGridUnitDistance(source, b));
    return [primary, ...others].slice(0, count);
}

// The selected primary stays first; dormant enemies caught by the same area are awakened immediately.
function projectileShotTargets(env, skillName, shot, foe) {
    const living = (env.owner.enemies || []).filter(enemy => enemy.hp > 0), alive = living.filter(enemy => env.deps.actExplorationState.inSight(enemy));
    const dormant = env.deps.getSplashDormantEnemies().concat(living.filter(enemy => !alive.includes(enemy)));
    const found = env.deps.selectCombatGemTargets(skillName, shot, env.owner.gridPlayer, alive, { preferredEnemyId: foe.id, dormant });
    env.deps.actExplorationState.wake(env.owner, found.map(entry => entry.enemy));
    return found.length && found[0].enemy === foe ? found : [{ enemy: foe, mult: 1 }];
}

/** @returns {?Array<object>} Ordered hit stages; null delegates unchanged skills to their existing cast. */
function projectilePlan(env, skillName, pStats, stages) {
    const skill = pStats.sSkill, primary = stages[0]?.targets?.[0]?.enemy;
    if (!primary || !projectileAims(skill)) return null;
    const more = projectileMoreShots(env, pStats), total = more.plain + more.bonus;
    if (!total) return null;
    const shot = projectileSingleSkill(skill), gridProfile = env.deps.getSkillGridProfile(skillName, shot), foes = projectileShotFoes(env, primary, gridProfile, total + 1);
    const bonusMul = Math.max(0, Number(skill.extraProjectileDamagePct) || env.deps.bonusShotDamagePct) / 100, rows = [];
    for (let index = 0; index <= total; index++) {
        const sequence = env.deps.buildSkillHitSequence(skillName, shot, projectileShotTargets(env, skillName, shot, foes[index % foes.length]));
        const mul = index > more.plain ? bonusMul : 1, shotDelayMs = projectileGapOf(index, foes.length, gridProfile.kind !== 'line');
        env.deps.supportStages(sequence, shot).forEach((stage, shotStage) => {
            rows.push({ ...stage, gridProfile: stage.gridProfile || gridProfile, shot: index, shotStage, shotDelayMs, damageMultiplier: stage.damageMultiplier * mul });
        });
    }
    return rows;
}

export function createProjectileShots(env) {
    return Object.freeze({
        REPEAT_MS: PROJECTILE_REPEAT_MS,
        plan: (skillName, pStats, stages) => projectilePlan(env, skillName, pStats, stages),
        gapOf: projectileGapOf,
        supportExtra: projectileSupportExtra
    });
}
