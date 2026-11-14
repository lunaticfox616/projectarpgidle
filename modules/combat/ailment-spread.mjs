import { effectGetPassiveBleedMultiplier } from '../domain/ailment-probabilities.mjs';
import { hitIsDamageAilmentType, hitGetStoredAilmentHitDamage } from '../domain/ailment-dot-damage.mjs';

export function hitGetEnemyDamageAilmentMaxStacks(env, type, pStats) {
    if (type === 'bleed' && effectGetPassiveBleedMultiplier(pStats) < 1) return 5;
    let cap = 1;
    if (env.deps.hasKeystone('ct6')) cap += 1;
    if (env.deps.hasKeystone('ct8')) cap += 2;
    if (type === 'poison') cap += Math.max(0, Math.floor(Number(pStats && pStats.uniquePoisonExtraStacks) || 0));
    return Math.max(1, cap);
}

export function hitCloneEnemyAilmentForSpread(env, ail, pStats) {
    if (!ail || (ail.time || 0) <= 0) return null;
    const spreadableTypes = ['ignite', 'poison', 'bleed', 'chill', 'shock', 'freeze'];
    if (!spreadableTypes.includes(ail.type)) return null;
    let copy = { type: ail.type, time: Math.max(0, Number(ail.time) || 0), power: Math.max(0, Number(ail.power) || 0) };
    if (hitIsDamageAilmentType(ail.type)) copySpreadDamage(env, copy, ail, pStats);
    return copy;
}

function copySpreadDamage(env, copy, ail, pStats) {
    let maxStacks = hitGetEnemyDamageAilmentMaxStacks(env, ail.type, pStats);
    if (!pStats) maxStacks = Math.max(maxStacks, Math.floor(ail.stacks || 1));
    copy.stacks = Math.max(1, Math.min(maxStacks, Math.floor(ail.stacks || 1)));
    copy.sourceHitDamage = hitGetStoredAilmentHitDamage(ail);
    copy.critDotBonusPct = Math.max(0, Number(ail.critDotBonusPct) || 0);
    copy.ailmentDotScore = Math.max(0, Number(ail.ailmentDotScore) || 0);
    copy.talentDamageMorePct = Math.max(0, Number(ail.talentDamageMorePct) || 0);
}

export function hitMergeEnemyAilment(env, target, incoming, pStats) {
    if (!target || !incoming || (incoming.time || 0) <= 0) return false;
    if (typeof env.deps.canTalentCardApplyEnemyAilment === 'function' && !env.deps.canTalentCardApplyEnemyAilment(incoming.type)) return false;
    target.ailments = Array.isArray(target.ailments) ? target.ailments : [];
    let row = target.ailments.find(ail => ail && ail.type === incoming.type);
    if (!row) {
        target.ailments.push({ ...incoming });
        return true;
    }
    extendAilmentDurationAndPower(row, incoming);
    if (hitIsDamageAilmentType(incoming.type)) mergeAilmentDamage(env, row, incoming, pStats);
    return true;
}

function extendAilmentDurationAndPower(row, incoming) {
    row.time = Math.max(row.time || 0, incoming.time || 0);
    row.power = Math.max(row.power || 0, incoming.power || 0);
}

function mergedDamageStacks(env, row, incoming, pStats) {
    let maxStacks = hitGetEnemyDamageAilmentMaxStacks(env, incoming.type, pStats);
    if (!pStats) maxStacks = Math.max(maxStacks, Math.floor(row.stacks || 1), Math.floor(incoming.stacks || 1));
    return Math.max(1, Math.min(maxStacks, Math.max(Math.floor(row.stacks || 1), Math.floor(incoming.stacks || 1))));
}

function mergeAilmentDamage(env, row, incoming, pStats) {
    row.stacks = mergedDamageStacks(env, row, incoming, pStats);
    let rowScore = Math.max(0, Number(row.ailmentDotScore) || hitGetStoredAilmentHitDamage(row));
    let incomingScore = Math.max(0, Number(incoming.ailmentDotScore) || hitGetStoredAilmentHitDamage(incoming));
    if (incomingScore >= rowScore) {
        row.sourceHitDamage = hitGetStoredAilmentHitDamage(incoming);
        row.critDotBonusPct = Math.max(0, Number(incoming.critDotBonusPct) || 0);
        row.ailmentDotScore = incomingScore;
        row.talentDamageMorePct = Math.max(0, Number(incoming.talentDamageMorePct) || 0);
    }
}

export function* hitSpreadSkillAilmentOnHit(env, source, skill, pStats) {
    let config = skill.ailmentSpreadOnHit;
    if (!config || Math.random() >= Math.max(0, Math.min(1, Number(config.chance) || 0))) return;
    let ailment = (source.ailments || []).find(ail => ail && ail.type === config.type && (ail.time || 0) > 0);
    let copy = hitCloneEnemyAilmentForSpread(env, ailment, pStats);
    if (!copy) return;
    let targets = (env.owner.enemies || []).filter(enemy => enemy && enemy.id !== source.id && enemy.hp > 0);
    const selected = targets.slice(0, Math.max(1, Math.floor(config.targets || 1))), count = selected.length;
    for (let i = 0; i < count; i++) {
        if (!(i in selected)) continue;
        const target = selected[i];
        hitMergeEnemyAilment(env, target, copy, pStats);
        (yield { kind: 'addBattleFx', args: ['statusText', {
            enemyId: target.id,
            text: env.deps._t('{type} 전파', { type: env.deps.getAilmentDisplayLabel(config.type) }),
            color: env.deps.getElementColor(skill.ele),
            duration: 650,
            dedupeKey: `ailment-spread:${source.id}:${target.id}`,
            dedupeWindowMs: 650
        }] });
    }
}
