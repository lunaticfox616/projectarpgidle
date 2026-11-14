// Enemy turn stages. Explicit tick state and dependencies; existing rounding and short-circuit order.
function readMonsterStrike(c, e, h) {
    if (e.enemy.isBoss && e.bossAttacksThisTick >= 1) {
        e.enemy.attackTimer = Math.min(e.enemy.attackTimer, 1);
        return 'break';
    }
    if (!e.bossPatternTelegraphReady) {
        e.enemy.attackTimer = Math.min(e.enemy.attackTimer, 1);
        return 'break';
    }
    if (e.enemy.isBoss) e.bossAttacksThisTick++;
    h.resolvingPendingAttack = e.pendingAttack;
    h.bossPattern = h.resolvingPendingAttack ? h.resolvingPendingAttack.bossPattern
        : (typeof c.deps.consumeBossPatternAttack === 'function' ? c.deps.consumeBossPatternAttack(e.enemy) : null);
}

function prepareCosmosStrike(c, e, h) {
    if (!h.resolvingPendingAttack && c.zone && c.zone.type === 'cosmos') {
        h.bossPattern = c.deps.applyCosmosBossAttackSetup(e.enemy, h.bossPattern, c.pStats);
    }
    if (!h.resolvingPendingAttack && c.zone && c.zone.type === 'cosmos') c.deps.applyCosmosBossPlayerDebuff(e.enemy);
}

function prepareAstraStrike(c, e, h) {
    if (!h.resolvingPendingAttack && c.zone && c.zone.id === 'cosmos_astra' && e.enemy.isBoss) c.deps.applyCosmosAstraStance(e.enemy);
}

function beginMonsterStrike(c, e, h) {
    const step0 = readMonsterStrike(c, e, h);if (step0) return step0;
    prepareCosmosStrike(c, e, h);
    prepareAstraStrike(c, e, h);
}

function curseFromWoodsman(c, e) {
    if (c.zone.type === 'outsideChaos' && e.enemy.isWoodsman) {
        e.enemy.nextCurseAt = Number.isFinite(e.enemy.nextCurseAt) ? e.enemy.nextCurseAt : 0;
        if (c.deps.getCombatTime() >= e.enemy.nextCurseAt) {
            e.enemy.nextCurseAt = c.deps.getCombatTime() + 6500;
            let curseType = c.deps.rndChoice(['ignite', 'chill', 'shock', 'poison', 'bleed']);
            c.deps.ailments.apply(c.owner, { type: curseType, duration: 4, power: 0.18, pStats: c.pStats, sourceHitDamage: 0, options: {
                sourceEnemyId: e.enemy.id,
                sourceEnemyName: e.enemy.name
            } });
            c.deps.addLog(c.deps._t('☠️ 알 수 없는 권능: {ailment}', { ailment: c.deps._t(curseType === 'ignite' ? '점화' : curseType === 'chill' ? '냉각' : curseType === 'shock' ? '감전' : curseType === 'poison' ? '중독' : '출혈') }), 'attack-monster', { noToast: true });
        }
    }
}

function releaseMonsterStrike(c, e, h) {
    if (!h.resolvingPendingAttack) {
        e.enemy.attackTimer -= 1;
        let delivery = c.deps.flights.delivery(c.owner, e.enemy, h.bossPattern);
        if (delivery !== 'instantTarget' && c.deps.flights.queue(c.owner, e.enemy, e.attackTarget, h.bossPattern, delivery)) return 'break';
        // 붙어서 바로 치는 보스도 놓는 순간을 알린다: 그림 보스의 공격 동작이 이때 타격 프레임을 친다(js/canvas-monster-actors.js).
        c.deps.flights.release(c.owner, e.enemy, h.bossPattern, 'instantTarget', e.attackTarget);
    } else e.pendingAttack = null;
    if (e.attackTarget === c.owner.gridPlayer) {
        if (c.deps.skillGemCombatRuntime) e.enemy.facingDirection = c.deps.skillGemCasts.facing(e.enemy, c.owner.gridPlayer);
    }
}

function scaleMonsterBaseHit(c, e, h) {
    h.dmg = c.deps.engagement.getMonsterBaseHitDamage(c.owner, c.zone, e.seasonDepth, e.tierPressure, e.benchmarkProfile);
    h.dmg = Math.floor(h.dmg * e.enemyDmgMul * (e.enemy.damageMul || 1));
    if (c.zone.type === 'act' && c.zone.id <= 1 && (c.owner.season || 1) >= 3) h.dmg = Math.floor(h.dmg * 0.58);
    if (e.enemy.isElite) h.dmg = Math.floor(h.dmg * 1.28);
    if (e.enemy.isBoss) h.dmg = Math.floor(h.dmg * (1.14 + c.zone.tier * 0.16));
    h.dmg = Math.floor(h.dmg * c.deps.getEntryBossTuning(c.zone, e.enemy.isBoss).damage);
}

function scaleBossPatternHit(c, e, h) {
    if (h.bossPattern && Number.isFinite(h.bossPattern.damageMul) && h.bossPattern.damageMul !== 1) {
        h.dmg = Math.max(1, Math.floor(h.dmg * h.bossPattern.damageMul));
        if (h.bossPattern.isSpecial && c.owner.settings.showCombatLog) {
            c.deps.addLog(`⚠️ ${e.enemy.name}: ${h.bossPattern.label}`, 'attack-monster', { noToast: true });
        }
    }
}

function dispatchOutgoingHit(c, e, h) {
    if (!e.enemy.isBoss) h.dmg = Math.floor(h.dmg * c.crowdPenalty);
    h.dmg = Math.floor(h.dmg * (c.abyssScale.dmgMul || 1) * (c.abyssScale.playerTakenMul || 1) * (e.enemy.isBoss ? (c.abyssScale.bossMul || 1) : 1));
    if (!c.deps.engagement.dispatchMonsterHitTargets(c.owner, {targets: e.impactTargets, damage: h.dmg, enemy: e.enemy, pStats: c.pStats, bossPattern: h.bossPattern})) return 'break';
    if (c.deps.getCombatTime() < Math.max(0, Number(c.owner.realmInvulnerableBarrierUntil) || 0)) {
        c.deps.addBattleFx('statusText', { text: c.deps._t('균열 장막'), color: '#c49bff', duration: 220 });
        return 'continue';
    }
}

function rollOutgoingHit(c, e, h) {
    scaleMonsterBaseHit(c, e, h);
    scaleBossPatternHit(c, e, h);
    const step2 = dispatchOutgoingHit(c, e, h);if (step2) return step2;
}

export function prepareEnemyHit(c, e, h) {
    const step0 = beginMonsterStrike(c, e, h); if (step0) return step0;
    curseFromWoodsman(c, e, h);
    const step2 = releaseMonsterStrike(c, e, h); if (step2) return step2;
    const step3 = rollOutgoingHit(c, e, h); if (step3) return step3;
}
