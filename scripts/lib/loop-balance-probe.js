// Controlled combat inputs, not a legal player build or a human playtest.
// Use the real coreLoop, enemy creation, attacks, recovery and death rules.
module.exports = function loopBalanceProbe(input) {
    game = mergeDefaults({ heroSelectionInitialized: true, selectedHeroId: 'hero1', selectedClassId: 'warrior',
        level: 100, season: input.loop, loopCount: input.loop - 1, currentZoneId: input.zone,
        maxZoneId: 40, settings: { mapCompleteAction: 'stop', townReturnAction: 'stop',
            pauseGameOnOverlay: false, pauseCombatOnTutorial: false, autoEquipEmptySlots: false } });
    window.game = game;
    gameplayStarted = true; startupOverlayActive = false;
    resetBattleRuntimeVisuals(); resetCombatTacticsRuntime();
    game.isBackgroundCalculation = true;
    game.actExploration = null;
    game.encounterPlan = [{ at: 101, count: 0 }]; game.encounterIndex = 0;
    game.runProgress = 20; game.moveTimer = 0; game.combatHalted = false;
    game.gridPlayer = { gx: 3, gy: 4, gridMoveTimer: 0 };
    game.skills = ['기본 공격', input.skill]; game.activeSkill = input.skill;
    game.gemData[input.skill] = { level: 10, quality: 0, exp: 0 };
    game.equippedSummonSkills = []; game.summonLoadoutInitialized = true;
    game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(row => row.id);
    // A synthetic stat-input item keeps all stat/skill/defense calculations real and explicit.
    game.equipment['무기'] = { id: 900001, name: '측정 입력', slot: '무기', rarity: 'rare',
        baseStats: [], stats: [{ id: 'flatDmg', val: input.power }, { id: 'flatHp', val: 20000 * Math.sqrt(input.power / 10000) },
            { id: 'accuracy', val: 10000 }, { id: 'resAll', val: 60 }, { id: 'resChaos', val: 60 },
            { id: 'aspd', val: 60 }] };
    const zone = getZone(input.zone);
    const cells = input.rank === 'boss' ? [[4, 3]] : [[4, 4], [4, 3], [3, 3]];
    game.enemies = cells.map(([gx, gy], index) => Object.assign(createEnemy(zone,
        { at: 50, boss: input.rank === 'boss', elite: input.rank === 'elite' && index === 0 }, index), { gx, gy }));
    const owner = game;
    const targetHp = new Map(owner.enemies.map(enemy => [enemy.id, enemy.maxHp]));
    const initialHp = [...targetHp.values()].reduce((sum, hp) => sum + hp, 0);
    const initialKills = owner.loopKills || 0;
    const initialEncounter = owner.encounterIndex;
    const stats = getPlayerStats(false), start = getCombatTime();
    game.playerHp = stats.maxHp; game.playerEnergyShield = stats.energyShield;
    let elapsed = 0, lowestLife = game.playerHp, cleared = false, interrupted = false;
    while (elapsed < input.durationMs && !cleared && !owner.loopDeaths && !interrupted) {
        elapsed += 100;
        coreLoop(start + elapsed);
        lowestLife = Math.min(lowestLife, owner.playerHp);
        const live = new Map(owner.enemies.filter(enemy => enemy.hp > 0 && targetHp.has(enemy.id)).map(enemy => [enemy.id, enemy.hp]));
        const kills = (owner.loopKills || 0) - initialKills;
        const leftEncounter = owner !== game || owner.currentZoneId !== zone.id || owner.encounterIndex !== initialEncounter || !!owner.actExploration;
        // Effects can replace an enemy object before killing it. Count only original IDs still active;
        // do not treat an unconfirmed removal during a defeat or departure as a kill.
        for (const [id, hp] of live) targetHp.set(id, hp);
        if (!owner.loopDeaths && !leftEncounter && kills >= targetHp.size - live.size) {
            for (const id of targetHp.keys()) if (!live.has(id)) targetHp.set(id, 0);
            cleared = live.size === 0;
        }
        interrupted = leftEncounter || owner.combatHalted;
    }
    return { ...input, hp: initialHp,
        estimatedDps: Math.round(stats.totalDps), maxLife: stats.maxHp, elapsedMs: elapsed,
        cleared, deaths: owner.loopDeaths,
        outcome: owner.loopDeaths ? 'death' : cleared ? 'clear' : interrupted ? 'halt' : 'timeout',
        remainingHp: Math.round([...targetHp.values()].reduce((sum, hp) => sum + hp, 0)),
        lowestLifePct: Math.round(lowestLife / stats.maxHp * 100), kills: owner.loopKills };
};
