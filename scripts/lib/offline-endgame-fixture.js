// Synthetic load scenario, not a player's save or a balanced/legally allocated build.
// Uses real item rolls and a full one-cell growth board to exercise repeated stat resolution.
module.exports = function configureOfflineEndgameFixture() {
    game.season = 100;
    game.loopCount = 99;
    game.level = 100;
    // This fixture measures a fully equipped build, not attribute-gate failures.
    game.actRewardBonuses = ['strength','dexterity','intelligence'].map(stat => ({stat,value:200}));
    game.maxZoneId = 100;
    game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(def => def.id);
    game.settings.mapCompleteAction = 'repeatZone';
    game.selectedClassId = 'occultist';
    game.selectedHeroId = 'hero9';
    game.ascendClass = 'soulbinder';
    game.ascendNodes = Object.keys(getClassTreeDef('soulbinder'));
    game.ascendKeystones = ['sb1', 'sb3', 'sb7', 'sb9'];
    game.passives = Object.values(PASSIVE_TREE.nodes)
        .filter(node => node.kind !== 'void' && !node.keystone && !node.intentionalNoEffect)
        .slice(0, 100).map(node => node.id);
    for (const slot of Object.keys(game.equipment)) {
        const baseSlot = slot.replace(/[123]$/, '');
        const base = BASE_ITEM_DB.filter(row => row.slot === baseSlot).at(-1);
        if (!base) continue;
        const item = { id: ++itemIdCounter, slot: baseSlot, baseId: base.id,
            baseName: base.name, name: base.name, rarity: 'rare', itemTier: 80,
            hiddenTier: 80, quality: 20, baseStats: rollBaseStats(base, 80), stats: [] };
        rerollExplicitMods(item, 'rare', 80);
        item.voidSocket = { open: true, jewel: generateJewelDrop(80) };
        game.equipment[slot] = item;
    }
    // Explicit synthetic load modifier: ensure the requested eight summons really run.
    game.equipment['무기'].stats.push({ id: 'summonCap', val: 7 });
    game.skills = ['기본 공격', '서리늑대 소환'];
    game.activeSkill = '기본 공격';
    game.gemData['서리늑대 소환'] = { level: 20, exp: 0, quality: 20 };
    game.equippedSummonSkills = ['서리늑대 소환'];
    game.summonSkillCounts = { '서리늑대 소환': 8 };
    game.summonLoadoutInitialized = true;
    game.equippedSupports = Object.keys(SUPPORT_GEM_DB).slice(0, 5);
    for (const name of game.equippedSupports) game.supportGemData[name] = { level: 20, exp: 0 };
    game.growthInventory = [];
    const board = ensureGrowthBoardState();
    board.unlockedCellCount = GROWTH_BOARD_W * GROWTH_BOARD_H;
    const bases = GROWTH_BASE_DB.filter(base => base.shapeId === 'dot1');
    for (let i = 0; i < board.unlockedCellCount; i++) {
        const item = createGrowthItemFromBase(bases[i % bases.length], 'rare', 80);
        game.growthInventory.push(item);
        board.loadouts[0].placements[item.id] = { x: i % GROWTH_BOARD_W, y: Math.floor(i / GROWTH_BOARD_W), rotation: 0 };
    }
    invalidateGrowthEffects();
    game.playerHp = getPlayerStats().maxHp;
    startEncounterRun();
    return { level: game.level, loop: game.season, equipment: Object.values(game.equipment).filter(Boolean).length,
        passives: game.passives.length, growthItems: getPlacedGrowthEntries().length,
        configuredSummons: game.summonSkillCounts, activeSummons: game.summons.length };
};
