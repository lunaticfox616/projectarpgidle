/**
 * @typedef {object} ActExplorationPendingLoot
 * @property {number} version Schema version (8).
 * @property {'pending'|'claimed'|'lost'} phase
 * @property {Record<string,number>} currencies Already resolved canonical currency gains.
 * @property {Array<{id:number,name:string,slot:string,baseStats:Array<{id:string,val:number}>,stats:Array<{id:string,val:number}>}>} equipment
 * @property {Array<{id:number,name:string,lines:Array<{id:string,value:number}>}>} cores Core items, unavailable until claimed.
 * @property {Array<{item:ActExplorationPendingLoot['equipment'][number],rewards:Record<string,number>}>} salvagedEquipment Last recoverable equipment, unavailable until clear. Rewards are original salvage costs.
 * @property {Array<{id:number,name:string,rarity:string,stats:Array<{id:string,val:number}>}>} jewels
 * @property {Array<{kind:'attack',name:string,awakened:boolean}|{kind:'support',name:string,tier:number}>} gems Exact drop unlocks, not snapshots of live leveled records.
 */
/**
 * @typedef {object} ActExplorationRun Saved authored act exploration, null in special arenas.
 * @property {number} version Schema version (1).
 * @property {number} act Story act 1..10; zoneId is act minus one.
 * @property {number} zoneId
 * @property {string} layoutId Authored preset identity, never randomised at restore.
 * @property {number} rotation Map facing in clockwise quarter turns (0 gate north, 1 east, 2 south, 3 west), drawn once per run;
 *   saves before 2026-10-04 take the map's drawn facing (actExplorationState.upgradeRotation).
 * @property {'active'|'cleared'|'failed'} status
 * @property {boolean} completionApplied Existing story/zone completion has been applied once.
 * @property {null|{zoneId:number,remainingMs:number}} departure Already-selected automatic exit after presentation; never another reward claim.
 * @property {ActExplorationPendingLoot} loot Already resolved rewards, inaccessible until boss completion.
 * @property {number} motionTimeMs Last processed 20 ms exploration movement step, in combat time.
 * @property {'north'|'south'|'east'|'west'} motionDirection Current walking direction.
 * @property {null|{from:{gx:number,gy:number},to:{gx:number,gy:number},startedAt:number,elapsed:number,duration:number}} motion Saved movement in milliseconds; the hit cell changes halfway.
 * @property {'direct'|'full'|'manual'} mode
 * @property {{gx:number,gy:number}|null} destination Integer map tile.
 * @property {number[]} discovered Row-major tile indices, including visible wall borders.
 * @property {string[]} visitedRooms Internal room ids (not player-facing room names).
 * @property {Array<{key:string,roomId:string,stage:number|null,aliveIds:number[],eliteIds:number[],waiting:Enemy[]}>} packs
 * Waiting records move into game.enemies at engagement. aliveIds includes both owners;
 * dead ids are removed once by the death handler. Boss stages are zero-based and sequential.
 */
/**
 * @typedef {'spore'|'fossil'|'transplant'} EquipmentCraftSource
 * Explicit equipment affixes may store craftSource. Missing means ordinary/unknown legacy origin.
 * Compound substats belong to the parent affix. Rift fossil's blank+amplifier form one effect.
 */
/**
 * @typedef {{statId:string,minValue:number,minTier:number}} EquipmentTargetRule
 * @typedef {{enabled:boolean,slot:string,scope:('explicit'|'all'),minMatches:number,rules:EquipmentTargetRule[]}} EquipmentTargetFilter
 * minTier 0 means any tier; minValue uses the displayed stat unit. Each rule matches one option line.
 */
/**
 * Permanent content ledger. Purchased IDs retain order; inherited IDs cost no points.
 * highestLoop records earned progress; legacy preserves pre-ledger early map access.
 * paidCosts records actual prices, preserving 1P purchases made before version 6.
 * grandfathered lists purchases restored without the loop check: 1P-era rows, and rows bought before their loop moved later (ledger 14).
 * @typedef {{version:number, highestLoop:number, unlocked:string[], paidCosts:Record<string, number>, inherited:string[], automatic:string[], grandfathered:string[], legacy?:boolean}} ContentProgressionState
 */
/**
 * 그루터기 함(js/stump-box.js). acquired/via/starter are one-time receipts. items live in storage unless an id sits
 * on the 5×5 board (row-major, null = empty); xp counts kills toward the family's need (data/stump-box.js) and ripe
 * marks a grown item. Suppression, resonance and stats are recomputed from the board, never saved. harvest is the
 * 수확 일지: first grown flower/fruit/amber per colour ('flower-fire' …, fixed order) and the one-time row gift receipts.
 * 16번(2026-10-08): a grown seed or sap keeps its ripening roll in harvest {bonus, golden, lines} until a new loop; golden marks
 * a golden item; a scar (불씨의 흉터, family 'scar') keeps absorbed stats and meal counts. sealed = sealed cells, pouches = seed
 * pouch receipts and offers kept until one is taken, codex = unique talismans first found, scarGift = the one free scar's receipt.
 * wallet = 화폐화한 꽃, 열매, 덩굴, 뿌리 ('flower-fire': 개수, 실물로 돌아오지 않고 루프가 바뀌면 사라진다). nursery = 생육함 5×5(board와 같은 모양, 효과 없이 경험치만).
 * @typedef {{id:number, family:('seed'|'talisman'|'scar'), color:(null|'physical'|'fire'|'cold'|'lightning'|'chaos'), path:(null|'flower'|'fruit'|'vine'|'root'), xp:number, ripe:boolean, roll:number,
 *   golden?:boolean, harvest?:{bonus:number, golden:boolean, lines:{stat:string, value:number}[]}, absorbed?:Record<string, number>, meals?:number, misses?:number}} StumpBoxItem
 * @typedef {{version:number, acquired:boolean, via:(null|string), starter:{seed:boolean, sap:boolean}, nextId:number, items:StumpBoxItem[], board:Array<number|null>, graft:number[],
 *   harvest:{grown:string[], gifts:{flower:boolean, fruit:boolean, amber:boolean}}, sealed:number[], pouches:{opened:string[], offers:Record<string, object[]>},
 *   codex:string[], scarGift:boolean, wallet:Record<string, number>, nursery:Array<number|null>}} StumpBoxState
 */
/**
 * G1 expedition ledger. Rewards in history are already in the wallet, never claimable again.
 * @typedef {{version:number,galaxy?:number,loop:number,phase:string,stage:number,goal:string,legSize:number,signal:string,seed:number,plan:string[][],queue:string[],history:Array<{id:string,dust:number,stage:number}>,dust:number,decisions:Record<string,string>,habitats?:string[],failedNode?:string}} CosmosRouteState
 * Board seed fixes the route across reloads; retryAt is a wall-clock UTC timestamp in ms. Older routes have no galaxy (G1).
 * @typedef {{seed:number,selected:number,goal:string,decisions:Record<string,string>,habitats:string[],retryAt:number}} CosmosRouteBoard
 */

/** Initial serializable save shape. Keep field names and default values stable across runtime migration. */
const DEFAULT_GAME_BLUEPRINT = {
    // 세계수 아틀라스 (js/atlas.js normalize): unlocked/completed/bonus/autoMap survive loops; stash/run reset each loop.
    // stash: map items {uid,node,tier,rarity,mods:[{id,roll}],quality,corrupted}; run: the open map {map,portals,drops,returnZoneId}.
    // passives: atlas passive ids (js/atlas-passives.js); fragments: {id: count} per loop; loadout: fragment ids the device uses.
    // seeds: world-tree seeds 0..4 (pinnacle); epoch: {count, essence, perks} of the atlas rebirth layer (js/atlas-epoch.js).
    // endgame: the awakened late atlas (js/atlas-endgame.js) — kills, materials, blight, witness; survives loops, not the epoch.
    atlas: { version: 1, unlocked: false, completed: [], bonus: [], passives: [], seeds: 0, stash: [], fragments: {}, loadout: [], nextUid: 1, run: null, lastResult: null, autoMap: false, autoGuardians: true, starterSeason: 0, epoch: { count: 0, essence: 0, perks: {} },
        endgame: { kills: {}, items: {}, blight: {}, witness: 0, witnessed: [] }, leaves: { counts: {}, seen: [], woven: {} },
        tally: { maps: 0, treasure: 0, golden: 0 } },
    // Last map's committed combat receipts; display only, never a claimable reward.
    explorationLoot: null,
    cosmosRoute: null,
    // Transient gravity pulse: {nextPulseAt: combat ms, steps: 0..2}; reset at load/exit.
    cosmosGravity: null,
    cosmosRouteBoard: { seed: 1, selected: 0, goal: 'dust', decisions: { 1: 'survey', 3: 'survey' }, habitats: ['swarm', 'guard', 'storm'], retryAt: 0 },
    combatTimeMs: 0,
    // Permanent across loops (docs/late-game-review-20261008.md): weapon mastery experience per weapon category
    // (js/weapon-mastery.js) and the chronicle's claimed rings (js/chronicle.js).
    weaponMastery: { xp: {} },
    chronicle: { rings: 0 },
    saveVersion: 21,   // 20(2026-10-30): 장비 줄의 다시 만들 수 있는 칸을 빼고 저장한다(js/item-save-slim.js). 21(2026-11-09): resonancePower에서 봉인 몫을 뺐다(js/save-migrations.js removeOldSealResonanceSave)
    // Permanent ledger: income follows CONTENT_UNLOCK_POINT_AWARDS (contentProgression.earnedBy), starting at loop two. carry: points a
    // save from before 2026-10-21 keeps beyond those awards (the earlier table's), 0 for a new game. The default stays version 9: a save
    // without a ledger takes it during the load, and the bag counts its pages by loop until contentProgression.restore makes the ledger
    // (version 10 with graftFloor, js/content-progression.js) and turns those pages into owned 가방 쪽 steps.
    knitting: { season: 1, counts: {}, seen: [], knitted: {}, once: [] },
    contentProgression: { version: null, highestLoop: 1, carry: 0, unlocked: [], paidCosts: {}, inherited: [], automatic: [], grandfathered: [], plannedUnlockId: '' },
    loopChallenge: null,
    loopChallengeHistory: [],
    level: 1,
    exp: 0,
    season: 1,
    loopCount: 0,
    combatTacticsUnlocked: false,
    woodsmanDefeatAttempts: 0,
    woodsmanSimulatorSeenLoop: false,
    woodsmanEntrancePending: false,
    woodsmanCurseActive: false,
    woodsmanCurseDamageTakenStacks: 0,
    woodsmanCurseLastTickAt: 0,
    woodsmanCurseNextLogStack: 0,
    currentZoneId: 0,
    maxZoneId: 0,
    killsInZone: 0,
    loopDeaths: 0,
    loopKills: 0,
    // 루프의 첫 처치가 직업 무기를 떨어뜨렸는가(js/combat-kill-rewards.js grantLoopStarterWeaponOnFirstKill), 첫 루프의 그 무기가 장착 안내를 기다리는 동안 그 아이템 id
    loopStarterWeaponGranted: false,
    starterWeaponTutorialPending: null,
    // 기초 스킬(js/basic-skills.js): 이번 루프의 속성 선택지({ loop, elements }, 고를 때까지)와 지난번 고른 속성(자동 루프가 쓴다)
    basicSkillOffer: null,
    basicSkillElement: '',
    // 변이시간선(js/loop-mutation.js): 규칙이 걸린 루프 번호(0이면 없음)
    loopMutationSeason: 0,
    settings: {
        effectIntensity: 'system',
        // PC와 모바일 메뉴 편집은 서로의 순서·배치를 덮어쓰지 않는다.
        tabLayouts: {
            desktop: { tabOrder: [], tabPlacement: {}, tabGroupOrder: [] },
            mobile: { tabOrder: [], tabPlacement: {}, tabGroupOrder: [] }
        },
        cameraShake: true,
        runeTimingOff: false,   // 룬 강화의 담금질을 건너뛴다
        hitEmphasis: 'normal', // normal | mild; presentation only
        bgm: true,        // 배경음(js/bgm-ui.js)
        bgmVolume: 70,    // 0..100 percent; 효과음과 따로
        uiSounds: true,
        soundVolume: 100, // 0..100 percent of the existing sound mix; independent of mute
        showCombatLog: true,
        showDetailedDamageLog: false,
        combatLogAggregate: true,
        combatLogRateLimit: true,
        showSpawnLog: true,
        showStoryLog: true, // the hero's, NPCs' and bosses' lines in the combat log (js/canvas-act-title-card.js logStoryLine)
        showExpLog: true,
        showLootLog: true,
        showCrowdPauseLog: true,
        showDeathNotice: true,
        showActJournal: true,
        showMobileBattlePip: true,
        pauseGameOnOverlay: true,
        twoRowTabs: false,
        damageNumberFormat: 'comma',
        showExpComma: true,
        showHpComma: true,
        showEnemyHpComma: true,
        showCharacterComma: true,
        uiScale: 100,
        uiScaleChosen: null,   // 사용자가 배율을 고른 적이 있는가(null: 모름 → 100이면 화면에 맞춰 고른다, js/ui-display.js applySaved)
        language: 'ko',        // 글과 숫자 표기 언어(data/locales, js/i18n.js). 주소의 ?lang=은 저장을 바꾸지 않고 그 판에서만 덮는다.
        uiSkin: 'rift',
        highContrast: false,
        /** PC 단축키 중 기본값과 다른 것만: { 동작 id: KeyboardEvent.code | '' } (data/hotkeys.js) */
        hotkeyOverrides: {},
        heroAppearanceMode: 'loop',
        leftPaneCollapsed: false,
        combatLogCollapsed: false,
        mobileCombatLogExpanded: false,
        autoEquipEmptySlots: true,
        collapsePastLoopMilestones: true,
        autoSalvageEnabled: false,
        autoSalvageRarities: { normal: true, magic: true, rare: false, unique: false },
        inventoryViewRarities: { normal: true, magic: true, rare: true, unique: true },
        bagArrangeOrder: 'recent', // 가방 정리 기준(js/equipment-inventory-grid.js ARRANGE_ORDERS): 정리 단추를 두 번 누르면 이 기준
        equipmentMobilePane: 'inventory',
        itemFilterEnabled: false,
        itemFilterRarities: { normal: true, magic: true, rare: true, unique: true },
        itemFilterTierThreshold: 10,
        itemFilterMinTierCount: 0,
        itemFilterMinHiddenTier: 1,
        itemFilterOnlyNewCodexUnique: false,
        // 줍기 필터 세분화(2026-10-10 사용자): 희귀도마다 최소 티어, 부위, 무기 종류, 항상 줍는 예외(js/item-rolls.js passesItemPickupFilter).
        itemFilterMinTiers: { normal: 1, magic: 1, rare: 1, unique: 1 },
        itemFilterSlots: { 무기: true, 투구: true, 갑옷: true, 장갑: true, 신발: true, 목걸이: true, 반지: true, 허리띠: true, 방패: true },
        itemFilterWeaponCategories: { greatsword: true, scimitar: true, shortbow: true, orb: true, flask: true, censer: true },
        itemFilterAlways: { exceptional: true, fineRare: true, socket: true, corrupted: false, newUnique: true, influenced: true, ward: true },
        // 발견 연출(js/battle-ground-loot-ui.js 빛기둥, 알림창): 플레이어가 고른다.
        lootFx: { beams: { jackpot: true, great: true, good: true }, notices: { chase: true, goldenRule: true, treasure: true, codex: true, leaf: true } },
        equipmentTargets: { enabled: false, slot: 'any', scope: 'explicit', minMatches: 1, rules: [] },
        autoEnterMeteor: false,
        autoEnterGrandBreach: false,
        autoRediveOcean: false,
        // 자동 환생(js/loop-automation-ui.js): 관문을 채우면 몇 초 뒤 다음 루프로, 다음 직업은 'ask' | 'keep'.
        autoLoop: false, autoLoopClass: 'ask',
        mapCompleteAction: 'nextZone',
        actExplorationMode: 'direct',
        // 탐험 자동 이동(미니맵 단추 · 단축키). 끄면 이동 명령으로만 움직이고 새 탐험도 직접 이동으로 시작한다.
        autoMove: true,
        disableItemAutomationAfterLoop: true,
        postLoopMapCompleteAction: 'nextLoopBestPlusOne',
        townReturnAction: 'retry',
        combatTargetPriority: 'nearest',
        combatPositionMode: 'auto',
        passiveTreeShowLabels: false,
        passiveTreeVisualStyleVersion: 2,
        passiveInvestmentSummaryCollapsed: true,
        passiveTreePlanner: { layoutVersion: null, activeSlot: 0, autoInvest: false, presets: [null, null, null] },
        tabNotiEnabled: true,
        socialChatNotifications: true,
        chatMessageSize: 'medium',
        notiFilters: { char: true, season: true, items: true, skills: true, map: true, codex: true, traits: true, cube: true, jewel: true, journal: true, currency: true, fossil: true, ascend: true, loop: true, social: true }
    },
    selectedHeroId: 'hero1',
    selectedClassId: 'archer',
    classTalentAlignmentVersion: 1,
    talentSelectionInitialized: false,
    appearanceClassId: null,
    discoveredClassIds: [],
    heroSelectionInitialized: false,
    classFreeSwitchUnlocked: false,
    talentBloomClears: 0,
    talentBloomCombos: [],
    bloomedClasses: [],
    bloomLoopSpecGranted: null,
    bloomedClassThisLoop: null,
    bloomedTalentThisLoop: null,
    pendingTalentBloomHeroId: null,
    bloomBossDefeated: false,
    talentCards: {},
    talentCardLoadout: [null, null, null, null, null, null],
    bloomTrialRegenSuppress: 0,
    pendingLoopHeroSelection: false,
    unlockedMonsterSkins: {},
    passivePoints: 0,
    playerHp: 100,
    playerEnergyShield: 0,
    moveTimer: 0,
    moveTotalTime: 0,
    isTownReturning: false,
    combatHalted: false,
    inTicketBossFight: false,
    runProgress: 0,
    encounterIndex: 0,
    encounterPlan: [],
    actExploration: null,
    enemies: [],
    playerAilments: [],
    playerLeechInstances: [],
    realmDeathWard: null,
    realmInvulnerableBarrierUntil: 0,
    nextEnemyId: 1,
    summons: [],
    summonSeq: 1,
    passives: [],
    passiveAttributePreference: 'strength',
    passiveAttributeChoices: {},
    passiveSpecialization: {
        revelation: 'combat',
        keystoneChoices: { wisdom_leap_element: 'fire' },
        cycleBuffs: [],
        fanaticism: { skillName: '', stacks: 0 },
        karma: { byEnemy: {}, buff: null }
    },
    voidPassives: {},
    retiredVoidPassives: {},
    discoveredPassives: [],
    passiveLayoutVersion: null,
    passiveStarEvolution: false,
    passiveStarEvolutionSource: null,
    skills: ['기본 공격'],
    activeSkill: '기본 공격', weaponBlockedSkill: '', // 지금 무기로 못 써 기본 공격으로 바꿔 둔 주 공격 룬(js/skills.js fitActiveSkillToWeapon)
    mobilitySkill: '', // 이동 스킬 칸 (js/mobility-skill.js): a gem tagged 'mobility', worn next to the main gem
    equippedSummonSkills: [],
    summonSkillCounts: {},
    summonLoadoutInitialized: false,
    gemData: { '기본 공격': { level: 1, exp: 0 } },
    supports: [],
    sealedSkills: [],
    sealedSupports: [],
    resonancePower: 10,
    equippedSupports: [],
    supportGemData: {},
    itemSubtab: 'item-tab-equip',
    skillSubtab: 'skill-tab-equip',
    skillAutoRules: [],
    beyondBoundary: {
        version: null, unlocked: false, unlockNoticeSeen: false,
        highestTier: 1, selectedTier: 1, selectedSealId: 'edge', completions: 0, bestTier: 0,
        selectedRewardFocusId: 'armory', selectedIntensityId: 'plain',
        seals: { edge:{ level:0, xp:0 }, ward:{ level:0, xp:0 }, stride:{ level:0, xp:0 } },
        activeRun: null
    },
    clearedRootBosses: [],
    timeRift: { pressure: 1, activePressure: null, altarOpen: false, altarUnique: null, altarRare: null, fusionCount: 0, lastFusion: null },
    mapSubtab: 'map-tab-zones',
    unlockedMapContents: ['map-tab-zones'],
    // 지도 탭의 처음 화면은 세계 지도다(2026-11-09 사용자: 지도 안내가 구버전 맵으로 이동시킴). 액트 목록은 그 안의 세부 지역.
    mapExploreSubtab: 'map-explore-atlas',
    gemFoldInactiveAttack: false,
    gemFoldInactiveSupport: false,
    autoRepeatSeasonBoss: false,
    // 액막이1~5: 액막이 칸(2026-10-10, js/colony-wards.js). 열린 칸 수는 허리띠, 초월 공허, 가디언, 고유가 정한다.
    // 코어: 코어 칸(2026-10-10, js/bag-items.js). 코어는 가방에 들어가고 이 칸에 하나를 낀다.
    equipment: { '무기': null, '투구': null, '갑옷': null, '방패': null, '장갑1': null, '장갑2': null, '신발': null, '목걸이': null, '반지1': null, '반지2': null, '반지3': null, '허리띠': null,
        '액막이1': null, '액막이2': null, '액막이3': null, '액막이4': null, '액막이5': null, '코어': null },
    equipmentLoadouts: { identityVersion: 1, selectedSlot: 0, presets: [null, null, null] },
    equipmentInventoryPlacements: {},
    // 그루터기 함 5×5 조합창: 재료를 가리키기만 한다(js/stump-cube.js).
    stumpCube: { slots: [], known: null },
    equipmentTemporaryStorage: [],
    inventory: [],
    jewelInventoryExpandLevel: 0,
    chaosInfuserUnlocked: false,
    abyssClearedDepths: [],
    craftingWorkspace: { discovered: [], goal: { statId: '', minTier: 0 } },
    // 한 번이라도 가진 재화(js/currency-exchange.js): 오르가에게서 살 수 있는 재화. 루프가 지나도 남는다.
    currencySeen: [],
    currencies: { magicBud: 0, sapBud: 0, formlessDew: 0, goldenRule: 0, emberBranch: 0, burningEmberBranch: 0, catalystPhys: 0, catalystFire: 0, catalystCold: 0, catalystLight: 0, catalystChaos: 0, catalystCrit: 0, catalystSummon: 0, oilFire: 0, oilCold: 0, oilLight: 0, oilChaos: 0, ouroboros: 0, blightSpore: 0, pruningShears: 0, fairyRing: 0, blessing: 0, bossKeyFlame: 0, bossKeyFrost: 0, bossKeyStorm: 0, beastKeyCerberus: 0, bossCore: 0, fossil: 0, fossilPrimal: 0, fossilAncientPrimal: 0, fossilPrimordial: 0, fossilJagged: 0, fossilBound: 0, fossilGale: 0, fossilPrismatic: 0, fossilAbyssal: 0, fossilBulwark: 0, fossilWedge: 0, fossilOld: 0, fossilRift: 0, deepWhetstone: 0, rootIron: 0, jewelPolish: 0, abyssCatalyst: 0, uberRootTicketFlame: 0, uberRootTicketFrost: 0, uberRootTicketStorm: 0, uberRootTicketChaos: 0, runeShard: 0, skyEssence: 0, jewelCore: 0, jewelShard: 0, sealShard: 0, strongSealShard: 0, radiantSealShard: 0, hiveKey: 0, colonyTrace: 0, colonyShard: 0, enchantedHoney: 0, venomStinger: 0, pollen: 0, beeswax: 0, starDust: 0, awakenedEcho: 0, voidChisel: 0, underCopper: 0, underSilver: 0, underGold: 0 },
    ascendClass: null,
    lastLoopAscendPlan: null,
    ascendPoints: 0,
    ascendKeystonePoints: 0,
    ascendRank: 0,
    ascendNodes: [],
    ascendKeystones: [],
    completedTrials: [],
    unlockedTrials: [],
    seasonPoints: 0,
    loopDeepPoints: 0,
    woodsmanPendingScore: 0,
    woodsmanLifetimeScore: 0,
    woodsmanSettledScore: 0,
    woodsmanEchoRun: { active: false, timeLeft: 0, duration: 30, lastTickAt: 0, totalDamage: 0, bestDps: 0 },
    seasonNodes: [],
    seasonNodeLevels: {},
    labyrinthFloor: 1,
    /** @type {{season:number,floor:number,currencies:Record<string,number>}|null} Display-only completion receipt; never paid on load. */
    labyrinthLastResult: null,
    jewelInventory: [],
    // 가방의 새 아이템(빨간 점): id가 이보다 크면 새 것. 가방을 열었다가 닫으면 그때의 itemIdCounter가 된다(js/equipment-window-ui.js).
    bagSeenId: null,
    // waveExtra: 0..2 extra normal enemies for the selected wave only; cleared before the next choice or queen.
    beehive: { unlockedPermanent: false, inRun: false, branchStep: 0, cleared: false, routeSeed: 0, waveExtra: 0 },
    // Core durability is an integer. A zero maximum means a new/legacy run needs initialization.
    // returnAfterWave: 0 or a boss-wave integer (multiple of 5). lastResult: null or {kind, wave, completed, lostHeld} integer counts.
    colony: { inRun: false, wave: 0, highestWave: 0, kills: 0, requiredKills: 0, coreMaxHp: 0, coreHp: 0, failedWave: 0, rewardPending: false,
        returnAfterWave: 0, lastResult: null, pendingLoot: [], lootPending: false, bossLootCell: null, wardInventory: [], wardEquipped: [null,null,null,null], wardSlots: 1, wardSlotVersion: 1 },
    // grandRun is created on entry; kills fills the gauge, phase bossPending queues the one-time boss spawn.
    // rewardVoidChisel/rewardJewelShard: number|null are the actual paid integers,
    // null before settlement or for legacy receipts; retained until the next entry/loop reset.
    voidRift: { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, grandBreachCleared: false, activeKills: 0, requiredKills: 0 },
    sporeCraftModes: {},
    craftOmen: null, // 걸어 둔 제작 뿌리 { key, side }(data/items.js CRAFT_OMENS): 다음 맞는 제작 한 번에 쓰인다
    craftChoice: null, // 성화의 뿌리로 굴린 결과 { itemId, options }: 고를 때까지 남는다(js/equipment-crafting.js craftBasic)
    salvageRecovery: { entries: [], sequence: 0 },
    blackMarket: { nextRefreshAt: 0, extraSlots: 0, offers: [], lockedOffers: {}, preferredSlot: 'any', insight: 0, manualRefreshes: 0 },
    // NPC escrow: UTC millisecond clocks and independent visitors, with integer proceeds per currency.
    // listings: {id, item, price: integer currency units, currency, slot, listedAt: UTC ms}[]; escrow owns listed gear.
    // proceeds/budProceeds/goldProceeds: unclaimed integer dew/buds/gold; rng: saved uint32; sequence: increasing listing ID.
    playerStall: { version: 8, sequence: 0, offerSequence: 0, eventSequence: 0, saleSequence: 0, nextOfferAt: 0, lastAt: 0, nextVisitAt: 0, rng: 1357911, proceeds: 0, budProceeds: 0, goldProceeds: 0, listings: [], history: [], sales: [] },
    loop10ChaosStayEnabled: false,
    loop10BonusStats: { flatHp: 0, flatDmg: 0, aspd: 0, move: 0 },
    abyssEndlessDepth: 20,
    abyssUnlockedDepths: [20],
    loopDeepStats: { flatHp: 0, flatDmg: 0, resChaos: 0, aspd: 0, move: 0, dr: 0, crit: 0 },
    worldTreeBark: { damage: 0, taken: 0, move: 0, reach: 0, timeGoals: null },
    loopProgressBase: { abyssEndlessDepth: 20, labyrinthUnlockedMaxFloor: 1, specialBosses: [] },
    // Floor records count cleared floors; null in migrated saves means this loop was not recorded.
    loopProgressCurrent: { specialBosses: [], chaos20Cleared: false, bestAbyssDepth: 0, bestLabyrinthFloor: 0, bestChaosRealmFloor: 0, bestSkyFloor: 0, bestUnderworldFloor: 0, cosmosPlanets: [] },
    cosmosLoopCount: 0,
    lastLoopAdvancePath: null,
    chaosRealm: null,
    skyTower: null,
    underworldRunes: { unlockedSlots: 0, unlockedRunesMaxNumber: 0, obtainedRunes: [], equippedRunes: [null, null, null, null, null, null], enhanceLvByNo: {}, bonusLinesByNo: {} },
    underworldProgress: { highestFloor: 1, currentFloor: 1, deepRewardFloor: 0 },
    ocean: null,
    /** @type {StumpBoxState} */
    stumpBox: { version: 1, acquired: false, via: null, starter: { seed: false, sap: false }, nextId: 1, items: [], board: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
        graft: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        harvest: { grown: [], gifts: { flower: false, fruit: false, amber: false } }, sealed: [], pouches: { opened: [], offers: {} }, codex: [], scarGift: false, wallet: {}, nursery: Array(25).fill(null) },
    cores: { equipped: null, owned: [] },
    pendingLoopDecision: false,
    pendingLoopReady: false,
    // The pending loop gate was reached in offline/background replay (js/loop-automation-ui.js does not auto-advance it).
    loopGateOffline: false,

    skyGemEnhancements: {},
    recentDamageEvents: [],
    // fatalElement is the last attack's dominant element, distinct from recent primaryElement.
    // Older logs have no fatalElement; save migration keeps that uncertainty as null.
    lastDeathLog: null,
    // Auto progression retreated after a defeat in story act frontierZoneId at this level (null = not retreating).
    // Cleared once the level rose by ACT_RETREAT_LEVELS or a map outside the retreat act finishes (js/combat-enemy-turn.js holdActRetreat).
    actRetreat: null,
    unlockedSeasonContents: ['season_1'],
    seenSeasonContentNotices: ['season_1'],
    seenTutorials: [],
    // Durable notice lifecycle. Millisecond timestamps; shown notices interrupted by reload resume once.
    tutorialHistory: [],
    // Unlock rows the player has picked in the unlock tab; the others that are open or within reach wear a ! (js/unlock-tab-ui.js unseenIds).
    seenUnlocks: [],
    // The NPC window's keywords already heard, "npcId:keyword" (js/content-progression-ui.js npcHeard): kept across loops.
    npcHeard: [],
    // NPCs met on the maps, { npcId: { count, loop, zoneId, tone } } (js/npc-shop.js meet), kept across loops: the NPC tab lists them.
    npcMet: {},
    // Each NPC's shop stock, rolled at each meeting: { npcId: { loop, zoneId, offers } } (js/npc-shop.js); an earlier loop's is gone.
    npcShops: {},
    journalEntries: ['prologue'],
    journalBonuses: [],
    journalBonusClaims: {},
    hiddenJournalBossRun: null,
    claimableActRewards: [],
    claimedActRewards: [],
    actRewardBonuses: [],
    seasonChaseUniqueDropped: false,
    seasonChaseUniqueDrops: [],
    gemEnhanceUnlocked: false,
    gemEnhanceTargetSkill: null,
    gemEngraveSelectedSlot: 0,
    runeSpares: {},     // 공격 룬 이름 → 쓰는 하나 말고 더 가진 개수. 루프가 비운다(js/gem-drop-rewards.js).
    uniqueCodex: {},
    uniqueHuntTargets: [],
    equipmentDropProgress: 0, // Drought credit; normal 1 / elite 4 / boss 16, reset on an equipment drop.
    codexNewlyRegistered: {},
    codexCollapsedSlots: {},
    codexSubtab: 'main',
    codexSelectedSlot: '무기',
    uniqueCodexCompletedRewardClaimed: false,
    // 운석 낙하 지점(2026-10-01 별쐐기 저장에서 분리): 하늘 균열 게이지 · 들어갈 단계 · 돌아갈 사냥터 · 별자리 관측.
    meteorSite: {
        unlocked: false,
        skyRiftGauge: 0,
        skyRiftReady: false,
        skyRiftMinTier: null,
        skyRiftAllCosmos: false,
        activeMeteorTier: null,
        // 떨어질 운석의 종류(data/maps.js METEOR_KINDS id): 하늘 균열이 다 차면 정해지고 원정이 끝나면 비운다.
        kind: null,
        meteorReturnZoneId: null,
        lastAnomalyAt: 0,
        skyRiftCarryGauge: 0,
        constellationBuff: null,
        entriesCleared: 0
    },
    // cloudPending: this account slot was written since its last commit to the server (js/save.js persistLocalSave); never true in the guest slot.
    // gameBuild: the release that last wrote this save (its commit time, ISO; null before 2026-10-28 and on an unbuilt page), js/save.js.
    saveMeta: { lastModifiedAt: 0, playedUntil: 0, lastCloudSyncAt: 0, lastCloudUploadProfile: null, cloudUserId: null, cloudRevision: 0, cloudPending: false, maxSeenAt: 0, gameBuild: null },
    unlocks: { char: false, season: false, items: false, map: false, skills: false, codex: false, traits: false, talent: false, jewel: false, stump: false, npcs: false },
    noti: { char: false, season: false, items: false, skills: false, map: false, codex: false, traits: false, jewel: false, journal: false, currency: false, fossil: false, ascend: false, loop: false, social: false, stump: false, npcs: false },
    mapAlarmSeen: {},
    mapAlarmMainSeen: {}
};

/** Build independent mutable defaults; only the current runtime instance publishes this object. */
export function createDefaultGame({ CONTENT_UNLOCK_RECORD_VERSION, PASSIVE_LAYOUT_VERSION, BEYOND_BOUNDARY_STATE_VERSION, createDefaultChaosRealmState, createDefaultSkyTowerState, createDefaultOceanState }) {
    const result = JSON.parse(JSON.stringify(DEFAULT_GAME_BLUEPRINT));
    result.contentProgression.version = CONTENT_UNLOCK_RECORD_VERSION;
    result.settings.passiveTreePlanner.layoutVersion = PASSIVE_LAYOUT_VERSION;
    result.passiveLayoutVersion = PASSIVE_LAYOUT_VERSION;
    result.beyondBoundary.version = BEYOND_BOUNDARY_STATE_VERSION;
    result.chaosRealm = createDefaultChaosRealmState();
    result.skyTower = createDefaultSkyTowerState();
    result.ocean = createDefaultOceanState();
    return result;
}
