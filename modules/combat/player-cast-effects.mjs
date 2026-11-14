

/** Emit confirmed hit presentation, carrying the immutable cast-time attack cells. */
export function* castAddPlayerHitVisualFx(env, pStats, options, targetEnemy, hit) {
    let { stageKind, stageLabel, stageCount, skillName, hitCrit, hitIdx, hitElement, dealtToEnemy, dmg, isStageReplay } = hit;
    yield { kind: 'addBattleFx', args: ['hit', {
        enemyId: targetEnemy.id, targetCell: env.deps.hasGridCell(targetEnemy) ? env.deps.getGridUnitCenter(targetEnemy) : null, channelId: options.channelId, color: env.deps.getElementColor(hitElement), crit: hitCrit,
        projectile: (pStats.sSkill.tags || []).includes('projectile'),
        pierce: pStats.sSkill.targetMode === 'pierce' || stageKind === 'piercePrimary' || stageKind === 'pierceThrough',
        chain: pStats.sSkill.targetMode === 'chain' || stageKind === 'chainJump',
        slam: stageKind === 'slamPrimary' || stageKind === 'slamAftershock',
        stageKind, stageLabel, stageIndex: Math.max(0, Math.floor(Number(options.stageIndex) || 0)),
        repeatIndex: hitIdx, stageCount, chainFromEnemyId: options.chainFromEnemyId,
        skillName: pStats.sSkill.visualName || skillName, damage: dealtToEnemy, rawDamage: dmg,
        damageTextGroupId: options.damageTextGroupId || '', attackFootprint: options.attackFootprint, sourceCell: options.sourceCell,
        duration: 320, element: hitElement, syncToSwing: !isStageReplay, resolvedSkillContact: isStageReplay
    }] };
}

/** 이동기 4종 swing their weapon once at the move's key moment (the tear, the puff, the release, the slam); 암살 kicks off before it
 * vanishes (cast.swing, pose 'kickoff'). */
export function* castNoteNativeGemSwing(env, name, stats) {
    const cast = env.nativeCasts.casts.at(-1), swing = cast && (cast.move ? cast.move.swing : cast.swing);
    if (!swing || env.owner.isBackgroundCalculation) return;
    yield { kind: 'addBattleFx', args: ['playerSwing', { skillName: name, element: stats.sSkill.ele, color: env.deps.getElementColor(stats.sSkill.ele), pose: swing.pose, contactFrame: swing.contactFrame,
        sourceCell: env.deps.copyCombatGridCell(env.owner.gridPlayer), impactDelayMs: swing.impact - cast.at, duration: Math.max(80, swing.until - cast.at) }] };
}

/** 전도성 난격: each arrival strikes at once, so the hero shows the rune's 단타 pose beside the foe (js/skill-gem-casts.js 70); 암살's
 * arrival stabs; 작살화살's pose command hauls on the rope (pose 'pull'). */
export function* castNoteNativeGemArrivalSwing(env, command) {
    if (env.owner.isBackgroundCalculation) return;
    yield { kind: 'addBattleFx', args: ['playerSwing', { skillName: command.name, element: command.element, color: env.deps.getElementColor(command.element), pose: command.swing.pose,
        sourceCell: env.deps.copyCombatGridCell(env.owner.gridPlayer), impactDelayMs: command.swing.impactDelayMs, duration: command.swing.duration }] };
}
