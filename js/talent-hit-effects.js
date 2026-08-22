// 재능 개화의 적중 후 추가 타격·상태 효과.

function disableTalentFalseEnemyBuff(enemy) {
    if (!enemy || enemy.talentFalseBuffDisabled || !getPreciseTalentLevel('hero4__inquisitor')) return false;
    let candidates = [
        ['atkMul', 1], ['damageMul', 1], ['attackSpeedVar', 1], ['evasionChance', 0],
        ['armorGuard', 0], ['comboTakenLessPct', 0], ['critChance', 0], ['penetration', 0]
    ];
    let picked = candidates.find(([key, neutral]) => Number(enemy[key]) > neutral);
    if (!picked) return false;
    enemy.talentFalseBuffDisabled = { key: picked[0], previous: enemy[picked[0]] };
    enemy[picked[0]] = picked[1];
    return true;
}

function applyTalentSplashDamage(enemy, damage, element) {
    let dealt = applyDamageToEnemyResource(enemy, Math.max(0, Math.floor(damage)));
    if (dealt > 0) addBattleFx('hit', {
        enemyId: enemy.id, color: getElementColor(element), damage: dealt,
        duration: 180, element, syncToSwing: true
    });
    return dealt;
}

function applyTalentPostHitEffects(enemy, dealt, sourceDamage, element, pStats, isPrimary) {
    if (!enemy || dealt <= 0) return 0;
    game.talentLastPlayerTargetId = enemy.id;
    if (element === 'chaos') enemy.talentHitByChaos = true;
    let extra = 0;
    if (element === 'phys' && getPreciseTalentLevel('hero4__warrior')) {
        extra += applyTalentSplashDamage(enemy, dealt * 1.10 * getPreciseTalentRatio('hero4__warrior'), 'phys');
    }
    if (getPreciseTalentLevel('hero4__soulbinder')) {
        let summonScale = (1 + Math.max(0, Number(pStats.summonPctDmg) || 0) / 100)
            * (1 + Math.max(0, Number(pStats.summonEfficiency) || 0) / 100);
        extra += applyTalentSplashDamage(enemy, dealt * 0.25 * summonScale
            * getPreciseTalentRatio('hero4__soulbinder'), element);
    }
    if (game.talentShadowCallerMarks && game.talentShadowCallerMarks[enemy.id]) {
        delete game.talentShadowCallerMarks[enemy.id];
        extra += applyTalentSplashDamage(enemy, dealt * 0.20 * getPreciseTalentRatio('hero7__assassin'), 'chaos');
    }
    if (isPrimary) extra += applyTalentHolyWave(enemy, dealt);
    applyTalentCursedExtraAilments(enemy, sourceDamage, element, pStats);
    if ((enemy.hp || 0) / Math.max(1, enemy.maxHp || 1) <= 0.80) disableTalentFalseEnemyBuff(enemy);
    return extra;
}

function applyTalentHolyWave(primary, dealt) {
    let ratio = getPreciseTalentRatio('hero5__gladiator');
    if (!ratio) return 0;
    let wave = dealt * 0.20 * ratio;
    let otherEnemies = (game.enemies || []).filter(row => row && row.hp > 0 && row.id !== primary.id);
    if (!otherEnemies.length) return applyTalentSplashDamage(primary, wave, 'light');
    return otherEnemies.reduce((sum, row) => sum + applyTalentSplashDamage(row, wave, 'light'), 0);
}

function applyTalentCursedExtraAilments(enemy, sourceDamage, element, pStats) {
    if (!isTalentTargetCursed(enemy) || !getPreciseTalentLevel('hero4__warlock')) return;
    let ratio = getPreciseTalentRatio('hero4__warlock');
    if (element === 'phys') {
        applyEnemyAilmentFromHit(enemy, { ...pStats, sSkill: { ...pStats.sSkill, ele: 'phys' } },
            sourceDamage * 0.20 * ratio, false, { primaryAilmentChance: 1 });
    }
    if (element === 'chaos') {
        applyEnemyAilmentFromHit(enemy, { ...pStats, sSkill: { ...pStats.sSkill, ele: 'chaos' } },
            sourceDamage * 0.20 * ratio, false, { primaryAilmentChance: 1 });
    }
}

safeExposeGlobals({ disableTalentFalseEnemyBuff, applyTalentPostHitEffects });
