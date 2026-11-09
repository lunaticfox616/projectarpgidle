/** 투사체 수 규칙(2026-11-02 스킬 전체 전달본 V3.7, 사용자 "투사체 추가 발사 관련 수정"): 시간의 사선에 있던 대상 규칙을 모든 투사체에.
 * N발은 가까운 서로 다른 적에게 먼저 한 발씩 가고, 남는 발은 그 적들에게 차례로 이어서 간다. 발마다 제 길로 날아 관통과 연쇄를 따로 한다.
 * 곧게 나는 룬은 앞쪽(쓴 줄까지)의 적만 겨누고 첫 바퀴가 함께 나간다. 던지는 룬은 발마다 조금씩 늦게 나간다.
 * 피해: 갈래 투사체의 발은 그 룬의 피해 그대로(×0.8은 js/support-runes.js), 패시브와 장비의 추가 발사는 보너스 샷 배율이다.
 * 연발 사격 같은 부채꼴은 제 규칙 그대로다. 따로 시전하는 룬의 병과 화살은 js/skill-gem-casts.js가 같은 차례를 쓴다(gapOf). */
const projectileShots = (() => {
    const REPEAT_MS = 60;
    const supportExtra = skill => skill.supportEffects?.projectiles?.extra || 0;
    const aims = skill => (skill.tags || []).includes('projectile') && !(skill.tags || []).includes('summon')
        && !skill.nativeCastId && skill.projectilePattern?.kind !== 'fan';
    /** shot번째 발(0이 첫 발)이 늦는 시간(ms). 곧게 나는 룬은 바퀴마다, 던지는 룬은 발마다 늦고 같은 적에게 돌아오면 한 번 더 늦어 터짐이 하나씩 보인다. */
    function gapOf(shot, foes, thrown) {
        const round = Math.floor(shot / Math.max(1, foes));
        return thrown ? REPEAT_MS * (shot + round) : REPEAT_MS * round;
    }
    /** 한 발의 룬: 갈래 투사체의 부채꼴과 그 몫의 대상 수를 뺀다. */
    const shotSkill = skill => ({ ...skill, targets: Math.max(1, (skill.targets || 1) - supportExtra(skill)),
        supportEffects: { ...skill.supportEffects, projectiles: null, aimedShots: true } });
    /** 더 나가는 발: plain은 갈래 투사체, bonus는 굴려 둔 추가 발사(js/combat-player-attack.js getAttackProjectileShots)와 고유 장비의 확률 발사. */
    function moreShots(pStats) {
        const chance = pStats.uniqueProjExtraShotChance;
        const lucky = chance && Math.random() * 100 < Number(chance.chance || 0) ? Math.max(0, Math.floor(chance.shots || 0)) : 0;
        return { plain: supportExtra(pStats.sSkill), bonus: Math.max(0, Math.floor(pStats.projectileExtraShots || 0)) + lucky };
    }
    /** 겨눌 수 있는 적: 시야 안, 사거리 안. 곧게 나는 룬은 첫 대상 쪽만 본다(옆줄과 앞쪽, 몸 뒤 반 칸까지). */
    function shotFoes(primary, profile, count) {
        const source = game.gridPlayer, side = Math.sign(getGridUnitCenter(primary).gx - source.gx);
        const ahead = enemy => profile.kind !== 'line' || !side || (getGridUnitCenter(enemy).gx - source.gx) * side >= -0.5;
        const others = (game.enemies || []).filter(enemy => enemy !== primary && enemy.hp > 0 && hasGridCell(enemy) && actExplorationState.inSight(enemy)
            && getGridUnitDistance(source, enemy) <= Math.max(1, profile.range || 1) && ahead(enemy))
            .sort((a, b) => getGridUnitDistance(source, a) - getGridUnitDistance(source, b));
        return [primary, ...others].slice(0, count);
    }
    /** 한 발이 맞히는 적들: 그 대상을 먼저 겨눈 룬의 범위 그대로(관통, 연쇄, 터짐). 휘말린 잠든 적은 깨운다. */
    function shotTargets(skillName, shot, foe) {
        const living = (game.enemies || []).filter(enemy => enemy.hp > 0), alive = living.filter(enemy => actExplorationState.inSight(enemy));
        const dormant = getSplashDormantEnemies().concat(living.filter(enemy => !alive.includes(enemy)));
        const found = selectCombatGemTargets(skillName, shot, game.gridPlayer, alive, { preferredEnemyId: foe.id, dormant });
        actExplorationState.wake(game, found.map(entry => entry.enemy));
        return found.length && found[0].enemy === foe ? found : [{ enemy: foe, mult: 1 }];
    }
    /** @returns {?Array<object>} 발마다의 타격 단계(shot 몇째 발, shotStage 그 발의 몇째 단계, shotDelayMs 늦는 시간). 더 나가는 발이 없거나 이 규칙을 쓰지 않는 룬이면 null. */
    function plan(skillName, pStats, stages) {
        const skill = pStats.sSkill, primary = stages[0]?.targets?.[0]?.enemy;
        if (!primary || !aims(skill)) return null;
        const more = moreShots(pStats), total = more.plain + more.bonus;
        if (!total) return null;
        const shot = shotSkill(skill), gridProfile = getSkillGridProfile(skillName, shot), foes = shotFoes(primary, gridProfile, total + 1);
        const bonusMul = Math.max(0, Number(skill.extraProjectileDamagePct) || PROJECTILE_BONUS_SHOT_DAMAGE_PCT) / 100, rows = [];
        for (let index = 0; index <= total; index++) {
            const sequence = buildSkillHitSequence(skillName, shot, shotTargets(skillName, shot, foes[index % foes.length]));
            const mul = index > more.plain ? bonusMul : 1, shotDelayMs = gapOf(index, foes.length, gridProfile.kind !== 'line');
            window.GameModules.combat.supports.stages(sequence, shot).forEach((stage, shotStage) => {
                rows.push({ ...stage, gridProfile: stage.gridProfile || gridProfile, shot: index, shotStage, shotDelayMs, damageMultiplier: stage.damageMultiplier * mul });
            });
        }
        return rows;
    }
    return Object.freeze({ REPEAT_MS, plan, gapOf, supportExtra });
})();
safeExposeGlobals({ projectileShots });
