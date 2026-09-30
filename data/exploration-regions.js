// 탐험 권역 허브(js/exploration-atlas-ui.js): 권역별 콘텐츠 입구 묶음. 이동만 하고, 입장 조건 · 비용 · 전투는 각 콘텐츠가 맡는다.
const EXPLORATION_REGIONS = Object.freeze({
    regions: [
        {id:'tree',name:'나무',landscape:ACT_BATTLE_MAP_SOURCES.bgAct1,routes:['map-explore-hunting','map-explore-root-boss','map-explore-trials','map-explore-beehive','map-explore-colony'],sideRoutes:['map-explore-beehive','map-explore-colony']},
        {id:'roots',name:'혼돈의 뿌리',landscape:'assets/background/refined-20260910/bgChaos3.webp',routes:['map-explore-worldtree','map-explore-chaos','map-tab-chaos-realm','map-explore-labyrinth','map-explore-voidrift','map-explore-timerift','map-explore-beyond'],sideRoutes:['map-explore-voidrift','map-explore-timerift']},
        {id:'underworld',name:'지하계',landscape:'assets/background/refined-20260910/bgUnderworld.webp',routes:['map-tab-underworld'],sideRoutes:[]},
        {id:'sky',name:'창공',landscape:'assets/background/refined-20260910/bgSkyTower.webp',routes:['map-tab-sky','map-explore-meteor'],sideRoutes:['map-explore-meteor']},
        {id:'sea',name:'심해',landscape:'assets/background/refined-20260910/bgOceanDepth.webp',routes:['map-tab-ocean','map-tab-fishing'],sideRoutes:['map-tab-fishing']},
        {id:'cosmos',name:'우주계',landscape:'assets/background/refined-20260910/bgCosmos.webp',routes:['map-tab-cosmos'],sideRoutes:[]}
    ],
    // Short activity identities for the region chooser; entry/rewards stay in their domains.
    activities: {
        'map-explore-root-boss': {kind:'보스전',tone:'boss'},
        'map-explore-trials': {kind:'전직 도전',tone:'trial'},
        'map-explore-beehive': {kind:'',tone:'choice'},
        'map-explore-colony': {kind:'',tone:'survival'},
        'map-explore-worldtree': {kind:'지도 공략',tone:'choice'},
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
    }
});
safeExposeData({ EXPLORATION_REGIONS });
