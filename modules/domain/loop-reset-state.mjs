import { loopFlowClearLoopItemStorage } from './loop-preservation.mjs';

export function loopFlowCloseLoopMap(env, owner) {
    if (owner.actExploration) env.deps.actExplorationProgress.depart(owner);
}

export function loopFlowResetLoopProgress(owner) {
    owner.level = 1;
    owner.exp = 0;
    owner.killsInZone = 0;
    owner.loopDeaths = 0;
    owner.loopKills = 0;
    owner.woodsmanSimulatorSeenLoop = false;
    owner.currentZoneId = 0;
    owner.maxZoneId = 0;
    if (owner.cosmosAtlas && typeof owner.cosmosAtlas === 'object') {
        owner.cosmosAtlas.bossStones = {};
        owner.cosmosAtlas.bossStoneOptions = {};
        owner.cosmosAtlas.bossRelics = [];
        owner.cosmosAtlas.bossKills = {};
        owner.cosmosAtlas.bossClears = [];
        owner.cosmosAtlas.equippedStoneGalaxy = 0;
        owner.cosmosAtlas.equippedStones = {};
    }
    owner.combatHalted = false;
}

export function loopFlowResetLoopBuild(env, owner) {
    owner.passivePoints = typeof env.deps.getClaimedJournalPassivePointTotal === 'function' ? env.deps.getClaimedJournalPassivePointTotal(owner) : 0;
    owner.passives = [];
    owner.passiveAttributeChoices = {};
    owner.voidPassives = {};
    owner.skills = ['기본 공격'];
    owner.activeSkill = '기본 공격';
    owner.weaponBlockedSkill = '';
    owner.mobilitySkill = '';
    owner.loopStarterWeaponGranted = false;
    owner.starterWeaponTutorialPending = null;
    owner.basicSkillOffer = null;
    owner.gemData = { '기본 공격': { level: 1, exp: 0 } };
    owner.runeSpares = {};
    owner.skyGemEnhancements = {};
    owner.supports = [];
    owner.equippedSupports = [];
    owner.supportGemData = {};
    // 전술 규칙은 영구 빌드 설정이다. 루프는 적에게 걸린 저주만 비운다.
    owner.enemyConditionDebuffs = {};
    owner.dotFxThrottle = {};
    owner.sealedSkills = [];
    owner.sealedSupports = [];
    owner.resonancePower = 10;
    owner.completedTrials = [];
    owner.unlockedTrials = [];
    // 지난 루프의 전직 배치는 노드를 비우기 전에 기억한다('지난 루프처럼'이 키스톤만 되살리던 문제).
    let clearedAscendKeystones = env.deps.rememberLoopAscendancyPlan(owner);
    owner.ascendNodes = [];
    owner.ascendPoints = 0;
    env.deps.clearAscendKeystoneRuntimeState(clearedAscendKeystones, { force: true, forceAll: true });
    owner.ascendKeystones = [];
    owner.ascendKeystonePoints = 0;
    owner.cosmosTwinKeystones = [];
    owner.realmDeathWard = null;
    owner.realmInvulnerableBarrierUntil = 0;
    owner.ascendRank = 0;
    owner.ascendClass = null;
    owner.bloomLoopSpecGranted = null;
    owner.bloomedClassThisLoop = null;
    owner.bloomedTalentThisLoop = null;
    owner.pendingTalentBloomHeroId = null;
}

export function loopFlowResetLoopItems(env, owner, kept, codexReveal) {
    const { preservedAltarMaterials, preservedSealedEquipment, preservedSealedInventory, preservedWoodsmanTouch, preservedWoodsmanTouchSeen, prevLabMax } = kept;
    loopFlowClearLoopItemStorage(owner);
    owner.equipment = { ...env.deps.defaultGame.equipment };
    env.deps.craftingWorkspaceState.capture(owner);
    env.deps.currencyExchange.capture(owner);
    owner.currencies = { ...env.deps.defaultGame.currencies };
    preservedAltarMaterials.forEach(([key, value]) => { owner.currencies[key] = value; });
    // 봉인된 장비/나무꾼의 손길 복원(루프 유지)
    // 봉인 장비도 요구 레벨과 능력치를 따른다(2026-10-31 사용자). 입던 칸에 두면 1레벨 영웅의 칸이 꺼진 채 막히므로 가방으로 돌아온다.
    owner.inventory.push(...Object.values(preservedSealedEquipment), ...preservedSealedInventory);
    if (preservedWoodsmanTouch > 0) owner.currencies.ouroboros = preservedWoodsmanTouch;
    owner.woodsmanTouchSeen = preservedWoodsmanTouchSeen;
    owner.labyrinthFloor = 1;
    owner.labyrinthLastResult = null;
    owner.labyrinthUnlockedMaxFloor = Math.max(1, Math.floor(prevLabMax || 1));
    owner.jewelInventory = [];
    owner.abyssClearedDepths = [];
    owner.claimableActRewards = [];
    owner.claimedActRewards = [];
    owner.actRewardBonuses = [];
    owner.seasonChaseUniqueDropped = false;
    owner.seasonChaseUniqueDrops = [];
    owner.uniqueCodex = codexReveal;
    owner.codexNewlyRegistered = {};
}

export function loopFlowResetLoopContents(env, owner, kept) {
    const { preservedConstellationBuff, preservedChaosRealm, preservedTimeRift, preservedSkyTower, preservedOcean, preservedGemEnhanceUnlocked } = kept;
    // 군락지 액막이 부적(보유/장착/슬롯)도 루프 시 초기화한다.
    owner.colony = JSON.parse(JSON.stringify(env.deps.defaultGame.colony));
    env.deps.clearBeehiveRuntimeState(owner.beehive);
    env.deps.abandonBeyondBoundaryRun(owner); // a 경계 너머 run held over would refuse every move and content start of the new loop
    // 열린 대균열도 닫는다(2026-10-20 사용자: 지난 루프의 대균열이 새 루프의 1레벨 영웅을 들여보냈다)
    Object.assign(owner.voidRift, {active:false, activeKills:0, requiredKills:0, pendingWave:false, totalToSpawn:0, spawnedCount:0, spawnTick:0, grandRun:null, grandBreachUnlock:false});
    if (owner.woodsmanEchoRun) Object.assign(owner.woodsmanEchoRun, { active: false, timeLeft: 0, returnZoneId: null }); // 잔상도 끝낸다
    owner.meteorSite = JSON.parse(JSON.stringify(env.deps.defaultGame.meteorSite));
    owner.meteorSite.constellationBuff = preservedConstellationBuff;
    owner.unlocks = { ...env.deps.defaultGame.unlocks };
    if (typeof env.deps.syncPermanentTalentTabUnlock === 'function') env.deps.syncPermanentTalentTabUnlock(owner);
    owner.noti = { ...env.deps.defaultGame.noti };
    env.deps.coreItems.resetForLoop(); env.deps.stumpCube.clear();
    if (typeof env.deps.stumpBox === 'object') env.deps.stumpBox.regress(owner);
    owner.itemSubtab = 'item-tab-equip';
    owner.skillSubtab = 'skill-tab-equip';
    owner.mapSubtab = 'map-tab-zones';
    owner.mapExploreSubtab = 'map-explore-atlas';
    owner.chaosRealm = preservedChaosRealm;
    env.deps.atlas.onLoopReset(owner);
    env.deps.knitting.resetForLoop(owner);
    owner.timeRift = preservedTimeRift;
    // 제단은 루프마다 비운다(2026-10-20 사용자: 루프를 넘기는 보관함이 되면 안 된다): 올린 장비는 가방처럼 사라지고 제단은 닫힌다
    Object.assign(owner.timeRift, { altarOpen: false, altarUnique: null, altarRare: null, activePressure: null });
    owner.skyTower = preservedSkyTower;
    owner.ocean = preservedOcean;
    env.deps.forgetOceanAutoDive(owner.ocean);
    owner.skyTower.loopSeason = Math.max(1, Math.floor(owner.season || 1));
    owner.skyTower.clearedThisLoop = 0;
    owner.skyTower.lastResult = null;
    owner.gemEnhanceUnlocked = preservedGemEnhanceUnlocked;
    owner.inTicketBossFight = false;
}

export function loopFlowApplyLoopSettings(owner) {
    if (owner.settings) {
        if (owner.settings.disableItemAutomationAfterLoop !== false) {
            owner.settings.autoSalvageEnabled = false;
            owner.settings.itemFilterEnabled = false;
        }
        owner.settings.mapCompleteAction = owner.settings.postLoopMapCompleteAction || 'nextLoopBestPlusOne';
    }
    if (owner.heroSelectionInitialized && owner.unlocks) owner.unlocks.char = true;
}
