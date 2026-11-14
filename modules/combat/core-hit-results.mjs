

/** One landed player hit, for the hit line in the combat log (getPlayerHitCombatLog): how much, how often, and on whom. */
export function coreNotePlayerHitSummary(summary, enemy, dealt) {
    summary.totalHits += 1;
    summary.totalDamage += dealt;
    summary.uniqueTargets.add(enemy.id);
    summary.targetName = enemy.name;
}

/** A corpse explosion: every other living enemy takes `splash`; each corpseDeath is settled before the next target. Returns the combat log line naming whom it
 * reached ("전령 시체 폭발로 적 2마리에게 1,234 피해"), or '' when it reached nobody: it used to report damage over an empty field. */
export function* coreExplodeCorpse(env, enemy, splash, detail) {
    const { label, noun = '피해' } = detail;
    let reached = [];
    const enemies = env.owner.enemies || [], count = enemies.length;
    for (let index = 0; index < count; index++) {
        if (!(index in enemies)) continue;
        const target = enemies[index];
        if (!target || target.id === enemy.id || target.hp <= 0) continue;
        env.deps.applyDamageToEnemyResource(target, splash);
        reached.push(target.name);
        if (target.hp <= 0) yield { kind: 'corpseDeath', args: [target] };
    }
    if (reached.length === 0) return '';
    return (yield { kind: 'corpseExplosionLine', args: [reached, splash, label, noun] });
}
