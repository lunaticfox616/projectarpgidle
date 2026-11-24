/** Released attack queues keep their original objects, source identity and visual references across restore. */
function deliveryOf(c, enemy, bossPattern) {
    return c.deps.enemyAttackRules.delivery(enemy, bossPattern);
}

function getEnemyCombatTargetType(c, target) {
    if(target.isColonyCore)return 'colonyCore';
    return target===c.owner.gridPlayer ? 'player' : 'summon';
}

function enqueueReleasedAttack(c, enemy, target, bossPattern, delivery) {
    let sourceCell = c.deps.copyCombatGridCell(enemy);
    let targetCell = c.deps.copyCombatGridCell(target);
    if (enemy.attackCast) targetCell = enemy.attackCast.targetCell;
    if (!sourceCell || !targetCell) return false;
    let now = c.deps.getCombatTime();
    let travelMs = enemy.isBoss ? c.deps.BOSS_ATTACK_IMPACT_DELAY_MS : c.deps.getCombatTravelMs(sourceCell, targetCell);
    let targetType=getEnemyCombatTargetType(c, target);
    const attack = {
        at: now + travelMs, castStartAt: now, enemyId: enemy.id, source: enemy, sourceCell, targetType,
        targetId: targetType === 'summon' ? target.id : null,
        targetCell, bossPattern: bossPattern || null, delivery, woodsmanElement: c.deps.woodsmanAttackFxElement(enemy)
    };
    const sideShots = spreadShots(attack);
    const flight = queueFlight(c,attack,travelMs);
    c.deps.bossMoves.begin(attack, now);
    const releaseMs = emitAttackRelease(c, enemy, bossPattern, delivery, target);
    if (delivery === 'patternArea') return true;
    showFlight(c,attack,flight,releaseMs);
    for (const shot of sideShots) showFlight(c,shot,queueFlight(c,shot,travelMs),releaseMs);
    return true;
}

function spreadShots(attack) {
    if (!attack.source.huntTraits?.includes('volley')) return [];
    if (!['projectileTarget','projectileCell','magicCell'].includes(attack.delivery)) return [];
    const {sourceCell,targetCell}=attack;
    const dx=targetCell.gx-sourceCell.gx,dy=targetCell.gy-sourceCell.gy;
    const distance=Math.hypot(dx,dy);
    if (!distance) return [];
    const width=Math.max(1,distance*0.4);
    return [-1,1].map(side=>({...attack,delivery:'projectileCell',targetCell:{
        gx:Math.round(targetCell.gx-side*width*dy/distance),gy:Math.round(targetCell.gy+side*width*dx/distance)
    }}));
}

function queueFlight(c,attack,travelMs) {
    const flight=c.deps.enemyAttackRules.trajectory(attack,attack.source,travelMs);
    c.deps.pendingEnemyCombatAttacks.push(attack);
    return flight;
}

function showFlight(c,attack,flight,releaseMs) {
    const {enemyId,sourceCell,targetCell,targetType,targetId,delivery,bossPattern}=attack;
    c.deps.addBattleFx('combatTravel',{owner:'enemy',sourceId:enemyId,sourceCell,targetCells:[targetCell],
        travelPath:flight.path,enemyFlight:attack,targetType,targetId,delivery,element:c.deps.enemyAttackRules.element(attack.source,bossPattern),
        cerberusHead:bossPattern?.cerberusHead,releaseDelayMs:0,flightMs:flight.duration,duration:Math.max(flight.duration+260,releaseMs)});
}

/** Release pictures start even when the warned area later misses every target. */
function announceBossRelease(c, enemy, bossPattern, delivery) {
    const slam = delivery === 'patternArea' && !['line', 'fan'].includes(bossPattern.area.kind);
    const woodsman = c.deps.woodsmanAttackFxElement(enemy);
    c.deps.addBattleFx('bossRelease', { enemyId: enemy.id, slam, special: !!bossPattern?.isSpecial, duration: 560,
        cerberusHead: bossPattern?.cerberusHead, woodsman: !!woodsman, element: woodsman || c.deps.enemyAttackRules.element(enemy, bossPattern) });
}

function emitAttackRelease(c, enemy, bossPattern, delivery, target) {
    if (enemy.isBoss) announceBossRelease(c, enemy, bossPattern, delivery);
    const actor = c.deps.getBossStageActor(enemy);
    const remaining = actor?.attackMs ? actor.attackMs.slice(actor.impactFrame).reduce((sum, ms) => sum + ms, 0) : 0;
    const duration = Math.max(220, remaining);
    if (delivery === 'instantTarget') {
        const targetCell = c.deps.copyCombatGridCell(target);
        c.deps.addBattleFx('enemyAttack', { enemyId: enemy.id, duration, motionMs: 220,
            targetType: target === enemy.rescue ? 'rescue' : getEnemyCombatTargetType(c, target), targetCell });
        const element = c.deps.woodsmanAttackFxElement(enemy);
        if (element && targetCell) c.deps.addBattleFx('woodsmanImpact', { cells: [targetCell], element, duration: 460 });
    }
    return enemy.isBoss ? 0 : duration;
}

function retireReleasedAttacks(c, enemy) {
    enemy.attackTimer = 0;
    for (let i = c.deps.pendingEnemyCombatAttacks.length - 1; i >= 0; i--) {
        const row = c.deps.pendingEnemyCombatAttacks[i];
        const mine = row && (row.source ? row.source === enemy : row.enemyId === enemy.id);
        if (mine && (enemy.isBoss || row.delivery === 'patternArea')) removeReleasedAttack(c, i, c.deps.getCombatTime());
    }
    if (enemy.isBoss) Object.assign(enemy, { patternArea: null, patternTelegraphKey: null, patternTelegraphStartedAt: 0, attackCast: null });
}

function removeReleasedAttack(c, index, now) {
    const [row] = c.deps.pendingEnemyCombatAttacks.splice(index, 1);
    c.deps.bossMoves.cut(row.bossPattern && row.bossPattern.move, now);
    for (let i = c.deps.battleFx.length - 1; i >= 0; i--) if (c.deps.battleFx[i]?.enemyFlight === row) c.deps.battleFx.splice(i, 1);
}

function takeReleasedAttack(c, enemyId, now) {
    let index = c.deps.pendingEnemyCombatAttacks.findIndex(row => row && row.enemyId === enemyId && flightReady(c,row,now));
    if (index < 0) return null;
    let attack = c.deps.pendingEnemyCombatAttacks[index];
    if (attack.source.isBoss && attack.source.hp <= 0) { removeReleasedAttack(c, index,now); return null; }
    if (c.deps.enemyAttackRules.cancelPending(attack,now)) {
        clearCancelledBossRecovery(attack.source, now);
        removeReleasedAttack(c, index,now);
        return null;
    }
    if (attack.source.isBoss && (attack.at>now || (attack.path && !c.deps.enemyAttackRules.advanceFlight(attack,c.owner,now)))) return null;
    c.deps.pendingEnemyCombatAttacks.splice(index, 1);
    if (attack.delivery === 'patternArea') landBossPatternArea(c, attack, now);
    announceWoodsmanImpact(c, attack);
    return attack;
}

function flightReady(c,attack,now) {
    if (attack.source?.isBoss) return true;
    if (attack.at>now) return false;
    return !attack.path || c.deps.enemyAttackRules.advanceFlight(attack,c.owner,now);
}

/** The released element owns the visual even when the boss changes phase before impact. */
function announceWoodsmanImpact(c, attack) {
    if (!attack.woodsmanElement) return;
    const cells = attack.delivery === 'patternArea' ? attack.bossPattern.area.cells
        : releasedAttackTargets(c, attack).map(c.deps.copyCombatGridCell).filter(Boolean);
    if (cells.length) c.deps.addBattleFx('woodsmanImpact', { cells, element: attack.woodsmanElement, duration: 460 });
}

/** Interrupted ordinary specials do not retain the recovery reserved for unplayed stages. */
function clearCancelledBossRecovery(enemy, now) {
    if (enemy.isBoss && enemy.patternMode !== 'apex') enemy.apexRecoveryUntil = now;
}

/** A staged boss move requeues its remaining stages; ordinary areas resolve once. */
function landBossPatternArea(c, attack, now) {
    attack.source.attackCast = null;
    const stage = c.deps.bossMoves.takeStage(attack, c.deps.pendingEnemyCombatAttacks, now);
    if (c.deps.woodsmanStumps.resolve(attack, now)) return;
    if (stage && !stage.burst) return;
    c.deps.addBattleFx('bossAreaImpact', { footprint: attack.bossPattern.area, element: attack.source.ele || 'phys', duration: 560 });
}

function releasedAttackTargets(c, pendingAttack) {
    return pendingAttack.observerTargets || c.deps.woodsmanBattle.takeTargets(pendingAttack, c.deps.enemyAttackRules.impactTargets(pendingAttack,c.owner));
}

function collectAttackSources(c) {
    const sources=(c.owner.enemies || []).slice();
    c.deps.pendingEnemyCombatAttacks.forEach(row=>{
        if(row && row.at<=c.deps.getCombatTime() && row.source && !sources.some(enemy=>enemy && enemy.id===row.enemyId))sources.push(row.source);
    });
    return sources;
}

export function createEnemyFlights(deps) {
    return Object.freeze({
        delivery: (owner, enemy, bossPattern) => deliveryOf({owner, deps}, enemy, bossPattern),
        queue: (owner, enemy, target, bossPattern, delivery) => enqueueReleasedAttack({owner, deps}, enemy, target, bossPattern, delivery),
        release: (owner, enemy, bossPattern, delivery, target) => emitAttackRelease({owner, deps}, enemy, bossPattern, delivery, target),
        retire: (owner, enemy) => retireReleasedAttacks({owner, deps}, enemy),
        drop: (owner, index, now) => removeReleasedAttack({owner, deps}, index, now),
        take: (owner, enemyId, now) => takeReleasedAttack({owner, deps}, enemyId, now),
        targets: (owner, pendingAttack) => releasedAttackTargets({owner, deps}, pendingAttack),
        sources: (owner) => collectAttackSources({owner, deps}),
    });
}
