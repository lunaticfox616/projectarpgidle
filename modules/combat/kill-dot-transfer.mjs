export function* killTransferSkillDotOnDeath(env, enemy) {
    let dotState = enemy && enemy.dotState;
    let skill = dotState && env.deps.SKILL_DB[dotState.skillName];
    let config = skill && skill.dotTransferOnDeath;
    if (!config || dotState.timeLeft <= 0) return;
    let target = (env.owner.enemies || []).find(entry => entry && entry.id !== enemy.id && entry.hp > 0);
    if (!target) return;
    transferRemainingDot(target, dotState, config);
    (yield { kind: 'addConfirmedSkillEffect', args: ['confirmedTransfer',{skillName:dotState.skillName,sourceCell:env.deps.copyCombatGridCell(enemy)},target,dotState.ele] });
    (yield { kind: 'addBattleFx', args: ['statusText', {
        enemyId: target.id,
        text: env.deps._t('지속 피해 이전'),
        color: '#b98cff',
        duration: 700,
        dedupeKey: `dot-transfer:${enemy.id}:${target.id}`
    }] });
}

function transferRemainingDot(target, dotState, config) {
    let scale = Math.max(0, Number(config.remainingDamagePct) || 0) / 100;
    let transferred = { ...dotState, rawTickDamage: Math.max(1, Math.floor(dotState.rawTickDamage * scale)) };
    if (!target.dotState || transferred.rawTickDamage >= target.dotState.rawTickDamage) target.dotState = transferred;
    target.dotStacks = Math.max(target.dotStacks || 0, transferred.stacks || 1);
}
