// 탐험 권역 허브(js/exploration-atlas-ui.js): 권역별 콘텐츠 입구 묶음. 이동만 하고, 입장 조건 · 비용 · 전투는 각 콘텐츠가 맡는다.
// 권역 카드와 나무 띠의 그림(landscape, actLandscapes)은 그 권역의 무대 지역 그림에서 바닥 위 풍경만 잘라 냈다
// (assets/ui/region-cards, 2026-10-21: 예전 전장의 판 그림을 뺐다).
const EXPLORATION_REGIONS = Object.freeze({
    regions: [
        // 2026-10-25 사용자: 나무(사냥)와 탐험이 허브에서는 따로인데 안의 위 탭에서는 하나였다. 세계수 아틀라스도 따로 탭을 쓴다.
        {id:'tree',name:'나무',landscape:'assets/ui/region-cards/act-01.webp?v=20261030',routes:['map-explore-hunting'],sideRoutes:[]},
        {id:'trail',name:'탐험',landscape:'assets/ui/region-cards/act-01.webp?v=20261030',routes:['map-explore-root-boss','map-explore-trials','map-explore-beehive','map-explore-colony'],sideRoutes:['map-explore-beehive','map-explore-colony']},
        // 세계수 아틀라스의 그림은 타이틀의 세계수(assets/background/title-worldtree-v1.webp)를 다른 권역 카드와 같은 1200x430으로 잘랐다.
        {id:'worldtree',name:'세계수 아틀라스',landscape:'assets/ui/region-cards/worldtree.webp',routes:['map-explore-worldtree'],sideRoutes:[]},
        {id:'roots',name:'혼돈의 뿌리',landscape:'assets/ui/region-cards/roots.webp',routes:['map-explore-chaos','map-tab-chaos-realm','map-explore-labyrinth','map-explore-voidrift','map-explore-timerift','map-explore-beyond'],sideRoutes:['map-explore-voidrift','map-explore-timerift']},
        {id:'underworld',name:'지하계',landscape:'assets/ui/region-cards/underworld.webp',routes:['map-tab-underworld'],sideRoutes:[]},
        {id:'sky',name:'창공',landscape:'assets/ui/region-cards/sky.webp',routes:['map-tab-sky','map-explore-meteor'],sideRoutes:['map-explore-meteor']},
        {id:'sea',name:'심해',landscape:'assets/ui/region-cards/sea.webp',routes:['map-tab-ocean','map-tab-fishing'],sideRoutes:['map-tab-fishing']},
        {id:'cosmos',name:'우주계',landscape:'assets/ui/region-cards/cosmos.webp',routes:['map-tab-cosmos'],sideRoutes:[]}
    ],
    /** 나무 띠의 그림: 액트 순서(1부터)마다 하나. */
    actLandscapes: Object.freeze(Array.from({ length: 10 }, (_, i) => 'assets/ui/region-cards/act-' + String(i + 1).padStart(2, '0') + '.webp?v=20261030')),
    // Short activity identities for the region chooser; entry/rewards stay in their domains. landscape: the card's picture, cut from
    // the stage region picture of that content like the region cards (2026-10-26 사용자: 권역 고르기 카드에 지도 그림).
    activities: {
        'map-explore-root-boss': {kind:'보스전',tone:'boss',landscape:'assets/ui/region-cards/act-07.webp?v=20261030'},
        'map-explore-trials': {kind:'전직 도전',tone:'trial',landscape:'assets/ui/region-cards/trial-01.webp'},
        'map-explore-beehive': {kind:'',tone:'choice',landscape:'assets/ui/region-cards/beehive.webp'},
        'map-explore-colony': {kind:'',tone:'survival',landscape:'assets/ui/region-cards/colony.webp'},
        'map-explore-worldtree': {kind:'지도 공략',tone:'choice'},
        'map-explore-chaos': {kind:'루프 등반',tone:'climb',landscape:'assets/ui/region-cards/chaos.webp'},
        'map-tab-chaos-realm': {kind:'영구 등반',tone:'climb',landscape:'assets/ui/region-cards/roots.webp'},
        'map-explore-labyrinth': {kind:'미궁 등반',tone:'trial',landscape:'assets/ui/region-cards/labyrinth.webp'},
        'map-explore-voidrift': {kind:'대량 섬멸',tone:'survival',landscape:'assets/ui/region-cards/void.webp'},
        'map-explore-timerift': {kind:'시간압 전투',tone:'survival',landscape:'assets/ui/region-cards/rift-past.webp'},
        'map-explore-beyond': {kind:'최종 도전',tone:'boss',landscape:'assets/ui/region-cards/beyond.webp'},
        'map-tab-underworld': {kind:'지하 탐사',tone:'climb'},
        'map-tab-sky': {kind:'탑 등반',tone:'climb',landscape:'assets/ui/region-cards/sky.webp'},
        'map-explore-meteor': {kind:'운석 원정',tone:'boss',landscape:'assets/ui/region-cards/meteor.webp'},
        'map-tab-ocean': {kind:'심도 탐사',tone:'climb',landscape:'assets/ui/region-cards/sea.webp'},
        'map-tab-fishing': {kind:'낚시',tone:'rest',landscape:'assets/ui/region-cards/fishing.webp'},
        'map-tab-cosmos': {kind:'항로 탐사',tone:'choice'}
    }
});
safeExposeData({ EXPLORATION_REGIONS });
