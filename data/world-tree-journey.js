// First playable world-map region. IDs also identify real combat zones; rewards use existing loot.
const WORLD_TREE_JOURNEY = Object.freeze({
    maxStage: 3,
    stages: [
        // Depth I starts above the required Chaos 20 boss; depth III retains full realm boss health.
        {pack:3,guardWaves:0,guardPack:0,bossHpMul:0.15,label:'수호자 단독 전투'},
        {pack:4,guardWaves:1,guardPack:2,bossHpMul:0.4,label:'수호자 호위 1무리'},
        {pack:5,guardWaves:2,guardPack:3,bossHpMul:1,label:'수호자 호위 2무리'}
    ],
    atlasRegions: [
        {id:'tree',name:'나무',landscape:'assets/background/refined-20260910/bgAct1.webp',routes:['map-explore-hunting','map-explore-root-boss','map-explore-trials','map-explore-beehive','map-explore-colony'],sideRoutes:['map-explore-beehive','map-explore-colony']},
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
        { id:'worldtree_root', name:'혼돈의 입구', kind:'path', floor:1, x:14, y:58, parents:[], summary:'뒤틀린 뿌리를 따라 탐험로를 엽니다.', reward:'다음 갈림길 발견' },
        { id:'worldtree_grove', name:'수액이 흐르는 숲', kind:'grove', floor:2, x:36, y:39, parents:['worldtree_root'], summary:'벌떼의 흔적이 이어지는 길. 탐험을 마치면 주변 거점을 발견합니다.', reward:'벌집 거점 발견' },
        { id:'worldtree_breach', name:'갈라진 뿌리', kind:'breach', floor:2, x:40, y:80, parents:['worldtree_root'], summary:'공허 균열에서 적들이 쏟아집니다. 균열을 닫고 전진하세요.', reward:'공허의 끌 · 대균열 발견 기회' },
        { id:'worldtree_crossing', name:'뒤엉킨 회랑', kind:'path', floor:3, x:64, y:59, parents:['worldtree_grove','worldtree_breach'], summary:'두 길이 합쳐지는 회랑. 이곳을 지나면 수호자에게 도달합니다.', reward:'수호자 도전 개방' },
        { id:'worldtree_guardian', name:'혼돈 수호자의 둥지', kind:'boss', floor:5, x:84, y:42, parents:['worldtree_crossing'], summary:'강력한 수호자를 격파해 더 깊은 탐험 단계를 엽니다. 이후 다시 도전할 수 있습니다.', reward:'다음 탐험 단계 · 혼돈계 고유 드랍 기회' }
    ]
});
safeExposeData({ WORLD_TREE_JOURNEY });
