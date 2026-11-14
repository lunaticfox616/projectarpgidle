// Current owner and explicit service ports are supplied per call; no game or restored queues are captured.
function stateColonyRunEndedDuringAttacks(c, zone) { return zone.type==='colony' && !c.owner.colony?.inRun; }

function stateGetColonyDefenseCoreTarget(c) {
    const run=c.deps.getColonyRoomRun();
    if(!c.owner.colony?.inRun || !run)return null;
    const core=c.deps.actExplorationMap.forRun(run).colonyDefense?.core;
    return core ? {...core,isColonyCore:true} : null;
}

function stateNearestEnemyCombatTarget(c, enemy,initial,reach) {
    let best=initial,distance=c.deps.getGridUnitDistance(enemy,initial);
    const candidates=[c.owner.gridPlayer,...(c.owner.summons||[]).filter(unit=>unit && unit.alive && !unit.isGhost && unit.hp>0)];
    for(const unit of candidates) {
        if(!c.deps.hasGridCell(unit))continue;
        const next=c.deps.getGridUnitDistance(enemy,unit);
        if(next>=distance || next>reach)continue;
        best=unit;distance=next;
    }
    return best;
}

function stateGetEnemyPreferredGridTarget(c, enemy) {
    const player=c.owner.gridPlayer;
    if(!c.deps.hasGridCell(enemy) || !c.deps.hasGridCell(player))return player;
    const core=stateGetColonyDefenseCoreTarget(c);
    if(!core)return stateNearestEnemyCombatTarget(c, enemy,player,Infinity);
    // Borers keep heading for the core until a closer body is within their ordinary melee reach.
    if(!enemy.isBoss && !enemy.isSeveredWanderer && enemy.monsterVisualSetId==='colony' && enemy.monsterVisualId==='colony-borer-grub')
        return stateNearestEnemyCombatTarget(c, enemy,core,1);
    const reach=Math.max(2,Math.min(5,Number(enemy.attackRange)||1));
    return stateNearestEnemyCombatTarget(c, enemy,core,reach);
}

/** 적이 자기 사거리(근접 1칸/원거리 3~5칸/보스는 data/bosses.js BOSS_REACH) 안에 선택한 목표를 두고 있는지 판정한다. */
function stateIsEnemyInGridAttackRange(c, enemy, target) {
    // 칸 미배정 상태(레거시 저장 복원 직후 등)에서는 다음 틱의 그리드 복구 전까지 기존 동작을 유지한다.
    target = target || c.owner.gridPlayer;
    if (!c.deps.hasGridCell(enemy) || !c.deps.hasGridCell(target)) return true;
    let range = Number.isFinite(enemy.attackRange) ? enemy.attackRange : c.deps.COMBAT_GRID_CONFIG.bossAttackRange;
    return c.deps.getGridUnitDistance(enemy, target) <= range && c.deps.enemyAttackRules.meleeReach(enemy, target);
}

/** 사거리 밖에서도 그 자리에서 쓰는 공격인가: 보스의 다음 공격이 예고하는 특수기이고 대상이 BOSS_REACH.castRange칸 안일 때.
 * 근접 보스도 지면 강타는 떨어진 곳에 내리친다(달아나기만 하면 아무것도 맞지 않는 싸움이 되지 않게). */
function stateCanBossCastFromAfar(c, enemy, target) {
    if (!enemy.isBoss || enemy.roomInvader || !c.deps.hasGridCell(enemy) || !c.deps.hasGridCell(target)) return false; // 뿌리 절단자는 붙어서 간다
    const next = c.deps.getBossPatternPreview(enemy);
    return !!next && next.isSpecial === true && c.deps.getGridUnitDistance(enemy, target) <= c.deps.BOSS_REACH.castRange;
}

/** 적이 지금 선 자리에서 공격을 이어 가는가: 목표가 사거리 안이거나, 보스가 떨어진 곳에서 쓰는 특수기의 차례다. 아니면 다가간다. */
function stateCanEnemyAttackFromHere(c, enemy, target) {
    if (c.deps.woodsmanBattle.owns(enemy)) return true;
    return stateIsEnemyInGridAttackRange(c, enemy, target) || stateCanBossCastFromAfar(c, enemy, target || c.owner.gridPlayer);
}

/** 사거리 밖의 적을 선택한 목표 쪽으로 한 칸씩 접근시킨다. slowPct(0~1)만큼 이동 주기가 길어진다. */
function stateAdvanceEnemyGridApproach(c, enemy, target, slowPct) {
    if (typeof target === 'number') {
        slowPct = target;
        target = c.owner.gridPlayer;
    }
    target = target || c.owner.gridPlayer;
    if (c.deps.enemyAmbush.tryBlink(enemy, target)) return; // 기습 정예는 걸어가지 않고 옆 칸에 나타난다(js/enemy-ambush.js)
    let slow = Math.max(0, Math.min(0.9, slowPct || 0));
    let interval = c.deps.getGridUnitStepSec(enemy) / (1 - slow);
    c.deps.advanceGridUnitMovement(enemy, target, 0.1, interval);
}

function stateGetSummonRespawnAt(c, summon, shortened) {
    let baseMs = Math.max(4000, Math.floor((summon && summon.respawnMs) || 8000));
    let delayMs = shortened ? Math.floor(baseMs * 0.7) : baseMs;
    return c.deps.getCombatTime() + delayMs;
}

function stateGetClosestLivingSummonToPlayer(c) {
    let player = c.owner.gridPlayer;
    return (c.owner.summons || []).filter(summon => summon && !summon.isGhost && summon.alive && summon.hp > 0).sort((a, b) => {
        let aDist = c.deps.hasGridCell(player) && c.deps.hasGridCell(a) ? c.deps.getGridUnitDistance(player, a) : Infinity;
        let bDist = c.deps.hasGridCell(player) && c.deps.hasGridCell(b) ? c.deps.getGridUnitDistance(player, b) : Infinity;
        return aDist - bDist || a.id - b.id;
    })[0] || null;
}

function mitigateSummonHit(summon, rawDamage, attackElement) {
    let damage = Math.max(1, Math.floor(rawDamage || 1));
    if (attackElement === 'phys') {
        let armorReduction = Math.min(85, (summon.armor || 0) / ((summon.armor || 0) + damage * 8) * 100);
        damage = Math.max(1, Math.floor(damage * (1 - armorReduction / 100)));
    } else {
        let resKey = { fire: 'resFire', cold: 'resCold', light: 'resLight', chaos: 'resChaos' }[attackElement];
        let resistance = resKey ? Math.max(-60, Math.min(85, Number(summon[resKey]) || 0)) : 0;
        damage = Math.max(1, Math.floor(damage * (1 - resistance / 100)));
    }
    return Math.min(damage, summon.hp);
}

function stateApplyMonsterDamageToSummon(c, input) {
    const {summon, rawDamage, enemy, pStats, bossPattern} = input;
    if (summon && summon.isGhost) return 0;
    let evade = c.deps.getSummonEvadeChance(summon, enemy);
    if (c.deps.resolveEntropyEvasion(summon, evade, c.deps.getCombatTime())) return 0;
    const attackElement = c.deps.enemyAttackRules.element(enemy, bossPattern);
    const damage = mitigateSummonHit(summon, rawDamage, attackElement);
    summon.hp = Math.max(0, summon.hp - damage);
    if (damage > 0) {
        c.deps.addBattleFx('summonHit', {
            summonId: summon.id,
            damage: damage,
            element: attackElement,
            duration: 260
        });
    }
    if (summon.hp > 0) return damage;
    summon.alive = false;
    summon.respawnAt = stateGetSummonRespawnAt(c, summon, false);
    recordSummonDeathBuff(c, pStats.uniqueSummonDeathDamageBuff);
    return damage;
}

function recordSummonDeathBuff(c, config) {
    if (config) {
        c.owner.summonDeathDamageBuffPct = Math.max(Number(c.owner.summonDeathDamageBuffPct || 0), Math.max(0, Number(config.pct || 40)));
        c.owner.summonDeathDamageBuffExpiresAt = c.deps.getCombatTime() + Math.max(1, Number(config.duration || 4)) * 1000;
    }
}

/** Apply each summon hit once; return whether the player's defense pipeline must also run. */
function stateDispatchMonsterHitTargets(c, input) {
    const {targets, damage, enemy, pStats, bossPattern} = input;
    const coreHit=targets.some(unit=>unit.isColonyCore);
    if(coreHit)stateStrikeColonyDefenseCore(c, damage);
    if(coreHit && !c.owner.colony?.inRun)return false;
    targets.filter(unit => unit !== c.owner.gridPlayer && !unit.isColonyCore)
        .forEach(summon => stateApplyMonsterDamageToSummon(c, {summon, rawDamage: damage, enemy, pStats, bossPattern}));
    return targets.includes(c.owner.gridPlayer);
}

/** A real landed enemy hit damages the objective by its final outgoing damage before player mitigation. */
function stateStrikeColonyDefenseCore(c, damage) {
    const colony=c.owner.colony;
    if(!colony?.inRun || colony.coreHp<=0)return;
    colony.coreHp=Math.max(0,colony.coreHp-Math.max(1,Math.floor(Number(damage)||1)));
    if(colony.coreHp===0)c.deps.failColonyDefense();
}

/** Base hit before the enemy's own modifiers and the victim's defenses. */
function stateGetMonsterBaseHitDamage(c, zone, seasonDepth, tierPressure, benchmarkProfile) {
    let seasonDmgScale = c.deps.getMonsterLoopGrowthScale(zone, 'damage', seasonDepth, tierPressure);
    let dmg = Math.floor((2.4 + zone.tier * 3.35) * 1.15 * seasonDmgScale);
    if (benchmarkProfile) dmg = Math.floor(dmg * benchmarkProfile.damage);
    else if (zone.type === 'underworld') dmg = Math.floor(dmg * 0.78 * c.deps.getUnderworldEnemyDamageMultiplier(zone));
    if (zone.type === 'skyTower') dmg = Math.floor(dmg * 1.08);
    return Math.max(1, Math.floor(dmg * c.deps.getMonsterLoopPowerScale(zone, 'damage')));
}

/** The heart changes its warning sequence after half life, between casts so a drawn warning never disappears. */
function stateUpdateMeteorHeartPhase(c, enemy, zone, pendingAttack) {
    if (zone.type !== 'meteor' || enemy.monsterVisualId !== 'meteor-heart' || enemy.patternMode !== 'slam'
        || enemy.hp > enemy.maxHp / 2 || enemy.patternTelegraphKey || enemy.patternArea || enemy.attackCast || pendingAttack
        || c.deps.pendingEnemyCombatAttacks.some(row => row.enemyId === enemy.id)) return;
    enemy.patternMode = 'coreFrenzy';
    enemy.nextPatternState = null;
}

function statePrepareMonsterAttackShield(c, pStats) {
    if(!Number.isFinite(c.owner.playerEnergyShield))c.owner.playerEnergyShield=Math.floor(pStats.energyShield || 0);
    c.owner.playerEnergyShield=Math.max(0,Math.min(Math.floor(Number(c.owner.playerEnergyShield)||0),c.deps.getPlayerEnergyShieldRecoveryCap(pStats)));
}

/** 수호자 gd6: 맞을 때마다 인내 중첩, 5중첩이면 받은 피해만큼 되돌려 친다. 반사로 쓰러진 적은 바로 죽음 처리를 한다(뒤의 몬스터
 * 흡혈이 되살리고 연속 공격이 이어지던 일, 2026-11-07 리뷰). */
function stateApplyGuardianEnduranceReflect(c, enemy, remaining, pStats) {
    let stacks = Math.max(0, Math.min(5, Math.floor(c.owner.guardianEnduranceStacks || 0))) + 1;
    c.owner.guardianEnduranceExpiresAt = c.deps.getCombatTime() + 4000;
    if (stacks < 5) {
        c.owner.guardianEnduranceStacks = stacks;
        return;
    }
    let reflect = Math.max(1, Math.floor((pStats.guardianReflectDamage || 1) + remaining));
    c.deps.applyDamageToEnemyResource(enemy, reflect);
    c.deps.addBattleFx('hit', { enemyId: enemy.id, color: c.deps.getElementColor('phys'), damage: reflect, duration: 260, element: 'phys', syncToSwing: false });
    c.owner.guardianEnduranceStacks = 2;
    if (enemy.hp <= 0) c.deps.handleEnemyDeath(enemy, pStats);
}

function stateResolveObserverFatal(c, attack, zone, stats) {
    if (!attack?.observerFatal) return false;
    const sourceName = c.deps.enemyAttackRules.damageName(attack.source, attack.bossPattern);
    c.deps.recordIncomingDamage('chaos', c.owner.playerHp, sourceName);
    c.owner.playerHp = 0;
    c.deps.lose(c.owner, zone, stats, null, { fatalElement: 'chaos', sourceName });
    return true;
}

export function createEnemyEngagement(deps) {
    return Object.freeze({
        getColonyDefenseCoreTarget: (owner) => stateGetColonyDefenseCoreTarget({owner, deps}),
        getEnemyPreferredGridTarget: (owner, enemy) => stateGetEnemyPreferredGridTarget({owner, deps}, enemy),
        isEnemyInGridAttackRange: (owner, enemy, target) => stateIsEnemyInGridAttackRange({owner, deps}, enemy, target),
        canEnemyAttackFromHere: (owner, enemy, target) => stateCanEnemyAttackFromHere({owner, deps}, enemy, target),
        advanceEnemyGridApproach: (owner, enemy, target, slowPct) => stateAdvanceEnemyGridApproach({owner, deps}, enemy, target, slowPct),
        getSummonRespawnAt: (owner, summon, shortened) => stateGetSummonRespawnAt({owner, deps}, summon, shortened),
        getClosestLivingSummonToPlayer: (owner) => stateGetClosestLivingSummonToPlayer({owner, deps}),
        applyMonsterDamageToSummon: (owner, input) => stateApplyMonsterDamageToSummon({owner, deps}, input),
        dispatchMonsterHitTargets: (owner, input) => stateDispatchMonsterHitTargets({owner, deps}, input),
        getMonsterBaseHitDamage: (owner, zone, seasonDepth, tierPressure, benchmarkProfile) => stateGetMonsterBaseHitDamage({owner, deps}, zone, seasonDepth, tierPressure, benchmarkProfile),
        updateMeteorHeartPhase: (owner, enemy, zone, pendingAttack) => stateUpdateMeteorHeartPhase({owner, deps}, enemy, zone, pendingAttack),
        prepareMonsterAttackShield: (owner, pStats) => statePrepareMonsterAttackShield({owner, deps}, pStats),
        applyGuardianEnduranceReflect: (owner, enemy, remaining, pStats) => stateApplyGuardianEnduranceReflect({owner, deps}, enemy, remaining, pStats),
        resolveObserverFatal: (owner, attack, zone, stats) => stateResolveObserverFatal({owner, deps}, attack, zone, stats),
        colonyRunEndedDuringAttacks: (owner, zone) => stateColonyRunEndedDuringAttacks({owner, deps}, zone),
    });
}
