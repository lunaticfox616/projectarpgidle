import { hitBurstFlameDecayOnDeath } from '../combat/flame-decay.mjs';
import { hitCloneEnemyAilmentForSpread, hitMergeEnemyAilment } from '../combat/ailment-spread.mjs';

/** What a death passes on: the ct3 keystone spread and the region lines (poison, shock and ignite spread, ice shards). */
export function* hitApplyAilmentEffectsOnDeath(env, enemy, pStats) {
    (yield* hitBurstFlameDecayOnDeath(env, enemy, pStats));
    (yield* hitSpreadCatalystAilmentsOnDeath(env, enemy, pStats));
    env.deps.regionAffixEffects.onEnemyDeath(enemy, pStats);
}

export function* hitSpreadCatalystAilmentsOnDeath(env, enemy, pStats) {
    if (!env.deps.hasKeystone('ct3')) return;
    if (!enemy || !Array.isArray(enemy.ailments)) return;
    let ailments = enemy.ailments.map(ail => hitCloneEnemyAilmentForSpread(env, ail, pStats)).filter(Boolean);
    if (ailments.length <= 0) return;
    let targets = catalystSpreadTargets(env, enemy);
    if (targets.length <= 0) return;
    targets.forEach(target => ailments.forEach(ail => hitMergeEnemyAilment(env, target, ail, pStats)));
    if (env.owner.settings && env.owner.settings.showCombatLog) (yield { kind: 'addLog', args: [env.deps._t('🧪 확산 반응: 남은 상태이상이 주변 적 {length}마리에게 퍼졌습니다.', { length: targets.length }), 'attack-player', { rateKey: 'catalyst:spread', minIntervalMs: 500 }] });
}

function catalystSpreadTargets(env, enemy) {
    let sourceGroup = Number.isFinite(enemy.groupIndex) ? enemy.groupIndex : 0;
    return (env.owner.enemies || [])
        .filter(target => target && target.id !== enemy.id && target.hp > 0)
        .sort((a, b) => {
            let ga = Math.abs((Number.isFinite(a.groupIndex) ? a.groupIndex : 0) - sourceGroup);
            let gb = Math.abs((Number.isFinite(b.groupIndex) ? b.groupIndex : 0) - sourceGroup);
            if (ga !== gb) return ga - gb;
            return (a.id || 0) - (b.id || 0);
        });
}
