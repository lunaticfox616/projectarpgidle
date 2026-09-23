// First playable world-map region. IDs also identify real combat zones; rewards use existing loot.
const WORLD_TREE_JOURNEY = Object.freeze({
    maxStage: 8,
    locations: [
        {name:'수액이 흐르는 숲',image:'bgAct1',ele:'phys'},
        {name:'서리 덮인 회랑',image:'bgAct3',ele:'cold'},
        {name:'잿빛 고원',image:'bgAct5',ele:'fire'},
        {name:'갈라진 지하 성소',image:'bgUnderworld',ele:'chaos'},
        {name:'가라앉은 정원',image:'bgAct7',ele:'light'},
        {name:'뒤틀린 뿌리',image:'bgChaos3',ele:'chaos'}
    ],
    events: [
        {id:'grove',name:'벌집',currency:'enchantedHoney',amount:1},
        {id:'breach',name:'공허 균열',currency:'voidChisel',amount:1},
        {id:'meteor',name:'운석 낙하',currency:'meteorShard',amount:4}
    ],
    risks: [
        {name:'안정',hp:1,damage:1,reward:1},
        {name:'위험',hp:1.35,damage:1.15,reward:1.4},
        {name:'극한',hp:1.8,damage:1.3,reward:1.9}
    ],
    focuses: [
        {id:'craft',name:'제작',currency:'blightSpore',amount:2},
        {id:'gem',name:'젬 강화',currency:'bossCore',amount:1},
        {id:'star',name:'별쐐기',currency:'meteorShard',amount:6}
    ],
    stages: [
        // Depth I starts above the required Chaos 20 boss; depth III retains full realm boss health.
        {pack:3,guardWaves:0,guardPack:0,bossHpMul:0.15,label:'수호자 단독 전투'},
        {pack:4,guardWaves:1,guardPack:2,bossHpMul:0.4,label:'수호자 호위 1무리'},
        {pack:5,guardWaves:2,guardPack:3,bossHpMul:1,label:'수호자 호위 2무리'},
        {pack:5,guardWaves:2,guardPack:4,bossHpMul:1.2},
        {pack:6,guardWaves:2,guardPack:4,bossHpMul:1.4},
        {pack:6,guardWaves:3,guardPack:4,bossHpMul:1.6},
        {pack:7,guardWaves:3,guardPack:5,bossHpMul:1.8},
        {pack:7,guardWaves:3,guardPack:5,bossHpMul:2}
    ],
    atlasRegions: [
        {id:'tree',name:'나무',landscape:ACT_BATTLE_MAP_SOURCES.bgAct1,routes:['map-explore-hunting','map-explore-root-boss','map-explore-trials','map-explore-beehive','map-explore-colony'],sideRoutes:['map-explore-beehive','map-explore-colony']},
        {id:'roots',name:'혼돈의 뿌리',landscape:'assets/background/refined-20260910/bgChaos3.webp',routes:['map-explore-worldtree','map-explore-chaos','map-tab-chaos-realm','map-explore-labyrinth','map-explore-voidrift','map-explore-timerift','map-explore-beyond'],sideRoutes:['map-explore-voidrift','map-explore-timerift']},
        {id:'underworld',name:'지하계',landscape:'assets/background/refined-20260910/bgUnderworld.webp',routes:['map-tab-underworld'],sideRoutes:[]},
        {id:'sky',name:'창공',landscape:'assets/background/refined-20260910/bgSkyTower.webp',routes:['map-tab-sky','map-explore-meteor'],sideRoutes:['map-explore-meteor']},
        {id:'sea',name:'심해',landscape:'assets/background/refined-20260910/bgOceanDepth.webp',routes:['map-tab-ocean','map-tab-fishing'],sideRoutes:['map-tab-fishing']},
        {id:'cosmos',name:'우주계',landscape:'assets/background/refined-20260910/bgCosmos.webp',routes:['map-tab-cosmos'],sideRoutes:[]}
    ],
    // Short activity identities for the region chooser; entry/rewards stay in their domains.
    atlasActivities: {
        'map-explore-root-boss': {kind:'보스전',tone:'boss'},
        'map-explore-trials': {kind:'전직 도전',tone:'trial'},
        'map-explore-beehive': {kind:'',tone:'choice'},
        'map-explore-colony': {kind:'',tone:'survival'},
        'map-explore-worldtree': {kind:'분기 탐험',tone:'choice'},
        'map-explore-chaos': {kind:'루프 등반',tone:'climb'},
        'map-tab-chaos-realm': {kind:'영구 등반',tone:'climb'},
        'map-explore-labyrinth': {kind:'미궁 등반',tone:'trial'},
        'map-explore-voidrift': {kind:'대량 섬멸',tone:'survival'},
        'map-explore-timerift': {kind:'시간압 전투',tone:'survival'},
        'map-explore-beyond': {kind:'최종 도전',tone:'boss'},
        'map-tab-underworld': {kind:'지하 탐사',tone:'climb'},
        'map-tab-sky': {kind:'탑 등반',tone:'climb'},
        'map-explore-meteor': {kind:'운석 원정',tone:'boss'},
        'map-tab-ocean': {kind:'심도 탐사',tone:'climb'},
        'map-tab-fishing': {kind:'낚시',tone:'rest'},
        'map-tab-cosmos': {kind:'항로 탐사',tone:'choice'}
    },
    nodes: [
        {id:'worldtree_root',name:'혼돈의 입구',kind:'path',floor:1,x:12,y:50,parents:[]},
        {id:'worldtree_grove',name:'숲길',kind:'grove',floor:2,x:37,y:26,parents:['worldtree_root']},
        {id:'worldtree_breach',name:'균열길',kind:'breach',floor:2,x:37,y:74,parents:['worldtree_root']},
        {id:'worldtree_crossing',name:'회랑',kind:'path',floor:3,x:63,y:26,parents:['worldtree_grove','worldtree_breach']},
        {id:'worldtree_meteor',name:'고원',kind:'meteor',floor:3,x:63,y:74,parents:['worldtree_grove','worldtree_breach']},
        {id:'worldtree_guardian',name:'혼돈 수호자',kind:'boss',floor:5,x:87,y:50,parents:['worldtree_crossing','worldtree_meteor']}
    ]
});
safeExposeData({ WORLD_TREE_JOURNEY });
