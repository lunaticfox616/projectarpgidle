// Current owner and explicit service ports are supplied per call; no game or restored queues are captured.
/** Existing automatic escape is limited to trial traps and final-boss combos; ordinary warnings only gate the approach. */
function stateIsApexFight(c) { return c.owner.enemies.some(enemy => enemy.hp > 0 && enemy.patternMode === 'apex'); }

/** Lasting ground (lava, frost, corrosion, shock): a soft danger. The hero walks around it when it can and fights in it when it must
 * (2026-10-18: as a hard danger a melee hero kept 0-16% of its damage against the final bosses). */
function stateGroundHazardCells(c) { return (c.deps.trialHazardRuntime.ground || []).flatMap(ground => ground.cells); }

/** The trap's name in the log and the defeat line: a trial's '시련 함정', or the zone's own (the atlas late arenas' '바닥 함정'). */
function stateTrialTrapName(zone) { return zone.trapName || '시련 함정'; }

function stateIsAnyEnemyAlive(c) { return (c.owner.enemies || []).some(enemy => enemy && enemy.hp > 0); }

function stateCalculateTrialTrapDamage(c, zone, pStats, trapElement) {
    let resistanceKey = { fire: 'resF', cold: 'resC', light: 'resL', chaos: 'resChaos' }[trapElement];
    let baseDamage = (pStats.maxHp * (0.035 + zone.tier * 0.005)) + 10 + zone.tier * 3;
    let damageMultiplier = Math.max(0.1, Number(zone.trapDamageMul) || 1);
    let scaledDamage = Math.floor(baseDamage * damageMultiplier);
    let physicalMitigation = (Number(pStats.dr) || 0) + c.deps.getArmorPhysicalReductionPct(pStats.armor, scaledDamage);
    let mitigation = trapElement === 'phys' ? physicalMitigation : (Number(pStats[resistanceKey]) || 0);
    return Math.max(10, Math.floor(scaledDamage * (1 - Math.max(-60, Math.min(85, mitigation)) / 100)));
}

function stateGetBloomTrialRegenSuppressNext(zone, currentSuppress) {
    let gain = Math.max(0, Number(zone && zone.trapRegenSuppressPct) || 0) / 100;
    let requestedCap = Number(zone && zone.trapRegenSuppressCap);
    let cap = Number.isFinite(requestedCap) ? Math.max(0, Math.min(0.95, requestedCap)) : 0.95;
    return Math.min(cap, Math.max(0, Number(currentSuppress) || 0) + gain);
}

/** 함정이 덮는 칸: 주인공 칸을 가운데 두고 reach칸씩 넓힌다(2026-11-02 사용자: 범위가 작아 피하기 쉽다). line은 맵을 가로지르는 띠(차례마다 가로와 세로),
 * cross는 그 띠 둘, pool은 마름모, block은 네모. */
function stateBuildTrialHazardCells(c, zone, origin, sequence) {
    const { columns, rows } = c.deps.getCombatGridSize(), { pattern, reach } = c.deps.getTrialHazardProfile(zone);
    const cells = [], seen = new Set();
    const push = (gx, gy) => {
        const key = c.deps.gridCellKey(gx, gy);
        if (!c.deps.isGridCellInBounds(gx, gy) || seen.has(key)) return;
        seen.add(key);
        cells.push({ gx, gy });
    };
    const band = horizontal => {
        for (let offset = -reach; offset <= reach; offset++) {
            for (let index = 0; index < (horizontal ? columns : rows); index++) {
                if (horizontal) push(index, origin.gy + offset);
                else push(origin.gx + offset, index);
            }
        }
    };
    if (pattern === 'line') { band(sequence % 2 === 0); return cells; }
    if (pattern === 'cross') { band(true); band(false); return cells; }
    for (let dx = -reach; dx <= reach; dx++) {
        for (let dy = -reach; dy <= reach; dy++) {
            if (pattern !== 'pool' || Math.abs(dx) + Math.abs(dy) <= reach) push(origin.gx + dx, origin.gy + dy);
        }
    }
    return cells;
}

function stateCreateTrialHazard(c, zone, now) {
    let index = Math.max(0, Math.floor(c.owner.trialHazardIndex || 0));
    let elements = Array.isArray(zone.trapElements) && zone.trapElements.length > 0 ? zone.trapElements : ['phys'];
    let element = elements[index % elements.length];
    let profile = c.deps.getTrialHazardProfile(zone);
    const terrain = c.deps.getGridPlacementTerrain();
    let cells = stateBuildTrialHazardCells(c, zone, c.owner.gridPlayer, index)
        .filter(cell => c.deps.canPlaceGridFootprint(new Set(), cell.gx, cell.gy, { columns: 1, rows: 1 }, terrain));
    c.owner.trialHazardIndex = index + 1;
    let color = { phys: '#ffd36b', fire: '#ff754f', cold: '#86dcff', light: '#e5d35b', chaos: '#c47cff' }[element] || '#ffd36b';
    c.deps.addBattleFx('trialTrapWarning', { targetCells: cells, color, element, duration: profile.warningMs });
    const persistent = profile.persistent && !!c.deps.COMBAT_GRID_CONFIG.ground[element];
    // 시련 함정은 주인공이 알아서 피하지 않는다(2026-11-02 사용자): 피하려면 직접 걷는다. 오래 남는 지대는 전처럼 비켜 간다.
    return { cells, element, color, impactAt: now + profile.warningMs, intervalMs: profile.intervalMs, shouldAvoid: persistent, persistent };
}

function stateIsPlayerInsideCombatHazard(c, hazard) {
    if (!hazard || !c.deps.hasGridCell(c.owner.gridPlayer)) return false;
    let playerKey = c.deps.gridCellKey(c.owner.gridPlayer.gx, c.owner.gridPlayer.gy);
    return hazard.cells.some(cell => c.deps.gridCellKey(cell.gx, cell.gy) === playerKey);
}

function stateIsTrialHazardPositionHeld(c) {
    let hazard = c.deps.trialHazardRuntime.active;
    return !!(hazard && hazard.shouldAvoid && c.deps.getCombatTime() < hazard.impactAt && !stateIsPlayerInsideCombatHazard(c, hazard));
}

/** Advance one shared escape timer for all warning cells; never move twice in a combat tick. */
function stateUpdateCombatHazardEscape(c, hazard, pStats, now, reason = '함정 회피') {
    if (!hazard.shouldAvoid || !stateIsPlayerInsideCombatHazard(c, hazard)) return false;
    if (c.deps.hasPlayerChannelBreakingAilment()) return true;
    // 공격 후딜이 끝나야 피한다(2026-10-17 사용자 "자동 회피는 경직을 무시하면 안되는거 아니야?"). 그동안 공격도 쉰다.
    if (c.deps.isPlayerAttackRecovering(now)) return true;
    let moveSpeed = Number.isFinite(pStats.moveSpeed) && pStats.moveSpeed > 0 ? pStats.moveSpeed : 100;
    let interval = c.deps.COMBAT_GRID_CONFIG.playerMoveIntervalSec * (100 / moveSpeed);
    let result = c.deps.advanceGridHazardEscape(c.owner.gridPlayer, hazard.cells, 0.1, interval);
    if (result.blocked || !result.moved) return true;
    c.deps.cancelCombatChannel(reason);
    let attackDelayMs = c.deps.getTacticalMoveAttackDelayMs(moveSpeed);
    c.deps.combatTacticsRuntime.attackDelayUntil = Math.max(c.deps.combatTacticsRuntime.attackDelayUntil, now + attackDelayMs);
    c.deps.addBattleFx('playerMobility', { fromCell: result.from, toCell: result.to, duration: 240 });
    return true;
}

/** Ordinary warnings forbid entry, not all walking. Do not escape an occupied warning or retreat to find a way around it. */
function stateBossWarningApproach(c, warned) {
    if (!warned.length || !c.deps.hasGridCell(c.owner.gridPlayer)) return { hold: false, block: [] };
    const keys = new Set(warned.map(cell => c.deps.gridCellKey(cell.gx, cell.gy)));
    return { hold: c.deps.isGridUnitInCellSet(c.owner.gridPlayer, keys), block: warned };
}

function stateHardHazardCells(c) {
    let cells = [];
    if (c.deps.trialHazardRuntime.active && c.deps.trialHazardRuntime.active.shouldAvoid) cells.push(...c.deps.trialHazardRuntime.active.cells);
    // 최종 보스의 연계는 이동 룬이 없어도 걸어서 대응한다. 기존 공격 후딜과 실제 이동 속도는 지킨다.
    if (stateIsApexFight(c)) cells.push(...c.deps.getBossWarningCells(c.owner, c.deps.pendingEnemyCombatAttacks));
    return cells;
}

function stateUpdateCombatHazardEvasion(c, pStats) {
    if (c.owner.playerHp <= 0) return { avoiding: false, holdPosition: false };
    stateApplyTrialTrapTick(c, pStats, true);
    if (c.owner.playerHp <= 0) return { avoiding: false, holdPosition: false };
    const cells = stateHardHazardCells(c), warned = c.deps.getBossWarningCells(c.owner, c.deps.pendingEnemyCombatAttacks);
    const approach = stateIsApexFight(c) ? { hold: warned.length > 0, block: [] } : stateBossWarningApproach(c, warned);
    let holdPosition = approach.hold || stateIsTrialHazardPositionHeld(c);
    let avoiding = stateUpdateCombatHazardEscape(c, { cells, shouldAvoid: true }, pStats, c.deps.getCombatTime(), '위험 범위 회피');
    let frozen = c.owner.playerAilments.some(ail => ail.type === 'freeze' && ail.time > 0);
    return { avoiding: avoiding || frozen, holdPosition, warning: warned.length > 0, avoidCells: { hard: cells.concat(approach.block), soft: stateGroundHazardCells(c), warned: approach.block } };
}

function stateDealTrialTrapDamage(c, zone, pStats, hazard, trapDamage) {
    let remaining = c.deps.floorIncomingDamage(trapDamage), trapName = stateTrialTrapName(zone);
    c.owner.playerEnergyShield = Math.max(0, Math.floor(Number(c.owner.playerEnergyShield) || 0));
    let energyShieldBeforeTrap = c.owner.playerEnergyShield;
    if (remaining > 0 && c.owner.playerEnergyShield > 0) {
        let absorbed = Math.min(c.owner.playerEnergyShield, remaining);
        c.owner.playerEnergyShield -= absorbed;
        remaining -= absorbed;
    }
    c.deps.triggerUniqueEnergyShieldBreakRecharge(pStats, energyShieldBeforeTrap, c.deps.getCombatTime());
    if (remaining > 0) remaining = c.deps.absorbDamageWithTalentStoneShield(remaining);
    if (remaining > 0) remaining = c.deps.absorbDamageWithRealmDeathWard(remaining, pStats);
    c.owner.playerHp = stateHpAfterTrap(c, remaining);
    c.owner.playerEsLastHitAt = c.deps.getCombatTime();
    c.deps.recordIncomingDamage(hazard.element, trapDamage, trapName);
    suppressBloomRecovery(c, zone);
    stateLogTrialDamage(c, trapName, hazard, trapDamage);
    if (c.owner.playerHp <= 0) {
        c.deps.lose(c.owner, zone, pStats, c.deps._t('{trapName}에 쓰러졌습니다. 마을로 귀환합니다.', { trapName }), { fatalElement: hazard.element, sourceName: trapName, noToast: true });
    }
}

function suppressBloomRecovery(c, zone) {
    if (!zone.bloomTrial || !((zone.trapRegenSuppressPct || 0) > 0)) return;
    c.owner.bloomTrialRegenSuppress = stateGetBloomTrialRegenSuppressNext(zone, c.owner.bloomTrialRegenSuppress);
    c.deps.addLog(c.deps._t('혹독한 한기: 생명력 재생 억제 {round}%', { round: Math.round((c.owner.bloomTrialRegenSuppress || 0) * 100) }), 'attack-monster', { noToast: true });
}

/** 적이 다 쓰러진 뒤에 터진 함정은 아프기만 하다: 이긴 싸움을 남은 함정 하나로 잃지 않는다. */
function stateHpAfterTrap(c, damage) {
    const hp = Math.floor(c.owner.playerHp - damage);
    return hp <= 0 && !stateIsAnyEnemyAlive(c) ? 1 : hp;
}

function stateLogTrialDamage(c, name, hazard, damage) {
    if (!hazard.persistent) {
        c.deps.dispatchRuntimeEvent('ground-damage', { name, element: hazard.element, damage, persistent: false });
        return;
    }
    hazard.logDamage = (hazard.logDamage || 0) + damage;
    if (c.deps.getCombatTime() < (hazard.nextLogAt || 0)) return;
    c.deps.dispatchRuntimeEvent('ground-damage', { name, element: hazard.element, damage: hazard.logDamage, persistent: true });
    hazard.logDamage = 0; hazard.nextLogAt = c.deps.getCombatTime() + 2000;
}

function stateResolveTrialHazardImpact(c, zone, pStats, hazard, now) {
    if (hazard.persistent) {
        const rules = c.deps.COMBAT_GRID_CONFIG.ground;
        const ground = [...(c.deps.trialHazardRuntime.ground || []), { ...hazard, start: now, endsAt: now + rules.durationMs }];
        c.deps.trialHazardRuntime = { nextAt: now + hazard.intervalMs, active: null, ground: ground.slice(-rules.maxAreas), nextGroundTick: now };
        return;
    }
    let playerHit = stateIsPlayerInsideCombatHazard(c, hazard);
    let barrierActive = playerHit && now < Math.max(0, Number(c.owner.realmInvulnerableBarrierUntil) || 0);
    c.deps.addBattleFx('trialTrap', {
        targetCells: hazard.cells,
        color: barrierActive ? '#c49bff' : hazard.color,
        element: hazard.element,
        duration: 760 // eight frames of the trap's art (js/canvas-trial-traps.js): rise, hold, fall back
    });
    if (!playerHit) {
        c.deps.addBattleFx('statusText', { text: c.deps._t('함정 회피'), color: '#b8f5c4', duration: 360 });
    } else if (barrierActive) {
        c.deps.addBattleFx('statusText', { text: c.deps._t('균열 장막'), color: '#c49bff', duration: 260 });
    } else {
        stateDealTrialTrapDamage(c, zone, pStats, hazard, stateCalculateTrialTrapDamage(c, zone, pStats, hazard.element));
    }
    c.deps.trialHazardRuntime = { ...c.deps.trialHazardRuntime, nextAt: now + hazard.intervalMs, active: null };
}

/** Ground is a DoT, not a hit/ignite/poison: resistance, DoT protection and the armour-to-DoT unique apply; block/leech do not. */
function stateTickPersistentGround(c, zone, pStats, now) {
    const runtime = c.deps.trialHazardRuntime, rules = c.deps.COMBAT_GRID_CONFIG.ground;
    runtime.ground = (runtime.ground || []).filter(area => now < area.endsAt);
    if (now < (runtime.nextGroundTick || 0) || !runtime.ground.length) return;
    runtime.nextGroundTick = now + rules.tickMs;
    const elements = new Set();
    for (const area of runtime.ground) {
        if (elements.has(area.element) || !stateIsPlayerInsideCombatHazard(c, area)) continue;
        elements.add(area.element);
        stateApplyGroundContact(c, zone, pStats, area, now);
        if (c.owner.playerHp <= 0) return;
    }
}

function stateApplyGroundContact(c, zone, stats, area, now) {
    const rule = c.deps.COMBAT_GRID_CONFIG.ground[area.element];
    if (rule.ailment) c.deps.ailments.apply(c.owner, {type: rule.ailment, duration: 0.75, power: 0.5, pStats: stats});
    if (!rule.damageShare || now < (c.owner.realmInvulnerableBarrierUntil || 0)) return;
    let damage = stateCalculateTrialTrapDamage(c, zone, stats, area.element) * rule.damageShare;
    damage *= 1 - c.deps.clampNumber(stats.dotTakenDamageReducePct || 0, 0, 90) / 100;
    if (stats.uniqueArmorAppliesToDot) damage *= 1 - Math.min(0.8, stats.armor / (stats.armor + 1200));
    if (c.owner.playerAilments.some(ail => ail.type === 'shock' && ail.time > 0)) damage *= 1 + c.deps.getPlayerShockTakenDamageIncreasePct(stats) / 100;
    stateDealTrialTrapDamage(c, { ...zone, trapName: rule.name }, stats, area, Math.max(0, Math.floor(damage)));
}

function stateHasGroundHazard(zone) {
    return !!zone && (zone.type === 'trial' || !!zone.trialHazard);
}

/** 적이 다 쓰러진 뒤: 새 함정은 없고 남은 지대는 걷히지만, 경고를 시작한 함정은 마저 터진다(2026-11-02 사용자). */
function stateSettleTrapAfterFight(c, zone, pStats, now) {
    const hazard = c.deps.trialHazardRuntime.active;
    c.deps.trialHazardRuntime.ground = [];
    c.deps.trialHazardRuntime.nextAt = Math.max(c.deps.trialHazardRuntime.nextAt, now + 500);
    if (hazard && hazard.persistent) c.deps.trialHazardRuntime.active = null;
    else if (hazard && now >= hazard.impactAt) stateResolveTrialHazardImpact(c, zone, pStats, hazard, now);
}

function stateApplyTrialTrapTick(c, pStats, deferEscape) {
    let zone = c.deps.getZone(c.owner.currentZoneId);
    if (!stateHasGroundHazard(zone) || c.owner.moveTimer > 0) return false;
    let now = c.deps.getCombatTime();
    if (!stateIsAnyEnemyAlive(c)) {
        stateSettleTrapAfterFight(c, zone, pStats, now);
        return false;
    }
    stateTickPersistentGround(c, zone, pStats, now);
    if (c.owner.playerHp <= 0) return false;
    scheduleTrialWarning(c, zone, now);
    let hazard = c.deps.trialHazardRuntime.active;
    if (!hazard) return false;
    if (now >= hazard.impactAt) {
        stateResolveTrialHazardImpact(c, zone, pStats, hazard, now);
        return false;
    }
    return !deferEscape && stateUpdateCombatHazardEscape(c, hazard, pStats, now);
}

function scheduleTrialWarning(c, zone, now) {
    if (!c.deps.trialHazardRuntime.nextAt) c.deps.trialHazardRuntime.nextAt = now + c.deps.getTrialHazardProfile(zone).initialDelayMs;
    if (!c.deps.trialHazardRuntime.active && now >= c.deps.trialHazardRuntime.nextAt) {
        c.deps.trialHazardRuntime.active = stateCreateTrialHazard(c, zone, now);
    }
}

export function createCombatHazards(deps) {
    return Object.freeze({
        calculateTrialTrapDamage: (owner, zone, pStats, trapElement) => stateCalculateTrialTrapDamage({owner, deps}, zone, pStats, trapElement),
        getBloomTrialRegenSuppressNext: stateGetBloomTrialRegenSuppressNext,
        buildTrialHazardCells: (owner, zone, origin, sequence) => stateBuildTrialHazardCells({owner, deps}, zone, origin, sequence),
        createTrialHazard: (owner, zone, now) => stateCreateTrialHazard({owner, deps}, zone, now),
        isTrialHazardPositionHeld: (owner) => stateIsTrialHazardPositionHeld({owner, deps}),
        bossWarningApproach: (owner, warned) => stateBossWarningApproach({owner, deps}, warned),
        updateCombatHazardEvasion: (owner, pStats) => stateUpdateCombatHazardEvasion({owner, deps}, pStats),
        dealTrialTrapDamage: (owner, zone, pStats, hazard, trapDamage) => stateDealTrialTrapDamage({owner, deps}, zone, pStats, hazard, trapDamage),
        resolveTrialHazardImpact: (owner, zone, pStats, hazard, now) => stateResolveTrialHazardImpact({owner, deps}, zone, pStats, hazard, now),
        applyTrialTrapTick: (owner, pStats, deferEscape) => stateApplyTrialTrapTick({owner, deps}, pStats, deferEscape),
        isApexFight: (owner) => stateIsApexFight({owner, deps}),
        groundHazardCells: (owner) => stateGroundHazardCells({owner, deps}),
    });
}
