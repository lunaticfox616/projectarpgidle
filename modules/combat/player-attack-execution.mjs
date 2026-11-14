

/** Final attack accounting follows the resolver's hit processing and its ordered presentation. */
export function* castPerformPlayerAttack(env, pStats, attackOptions) {
    const result = env.resolver.resolve(env.owner, pStats, attackOptions);
    if (!result) return;
    if (result.hitLog) yield { kind: 'addLog', args: [result.hitLog.line, 'attack-player', result.hitLog.options] };
    env.deps.performTalentMoonReturn(result.pStats, result.options, result.talentMoonPrimaryHit);
    (env.owner.enemies || []).slice().forEach(enemy => {
        if (enemy && enemy.hp <= 0) env.deps.handleEnemyDeath(enemy, result.pStats);
    });
}
