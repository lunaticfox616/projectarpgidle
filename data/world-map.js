// GENERATED from modules/data/world-map.mjs. Edit the ESM source; run npm run build:modules.
(() => {
  // modules/data/world-map.mjs
  var WORLD_MAP = Object.freeze({
    src: "assets/ui/world-map.png",
    width: 688,
    height: 384,
    atlas: Object.freeze({
      src: "assets/ui/world-map-atlas-temple-20261109.png",
      entrance: "content-01",
      // 원화 위 백분율 좌표. nodes는 해당 권역의 슬롯 0~8과 수호자 순서다.
      regions: Object.freeze([
        { id: "canopy", label: [53, 6.5], nodes: [[52, 37], [38, 34], [67, 34], [44, 29], [61, 29], [41, 19], [66, 22], [47, 19], [58, 20], [53, 16.5]] },
        { id: "roots", label: [24, 28], nodes: [[44, 57], [37, 59], [39, 48], [29, 56], [33, 46], [26, 46], [30, 37], [15, 47], [21, 39], [21, 54]] },
        { id: "trunk", label: [76, 32], nodes: [[58, 58], [65, 61], [66, 52], [73, 61], [73, 52], [81, 56], [80, 43], [88, 52], [88, 43], [74, 41]] },
        { id: "garden", label: [22, 93], nodes: [[46, 79], [39, 85], [31, 87], [39, 74], [32, 78], [24, 84], [31, 69], [15, 83], [18, 74], [25, 74]] },
        { id: "sanctum", label: [75, 95], nodes: [[57, 72], [64, 70], [65, 80], [71, 71], [71, 85], [79, 66], [78, 81], [85, 87], [90, 77], [84, 75]] }
      ].map(Object.freeze)),
      pinnacle: [51, 50],
      // 표식 그림(js/world-map-ui.js atlasIcon, 2026-11-09 사용자: 아틀라스 아이콘 개선): 15x15 도트, 글자마다 색. o 테두리, Y y d 금빛(밝음, 중간, 어둠),
      // a b c 권역 색(밝음, 중간, 어둠), g G 보석, s 돌판 바탕, w 흰자, p q 홍채(밝음, 어둠), k 눈동자. 잠긴 곳은 같은 그림을 회색 팔레트로 그린다.
      icons: Object.freeze({
        // 지도 노드: 권역 색 테의 팔각 돌판(등급 숫자가 위에 선다)
        stone: [
          "...ooooooooo...",
          "..ooaaaaaaaoo..",
          ".ooabbbbbbbaoo.",
          "ooabsssssssbcoo",
          "oabsssssssssbco",
          "oabsssssssssbco",
          "oabsssssssssbco",
          "oabsssssssssbco",
          "oabsssssssssbco",
          "oabsssssssssbco",
          "oabsssssssssbco",
          "ooabsssssssbcoo",
          ".oocbbbbbbbcoo.",
          "..oocccccccoo..",
          "...ooooooooo..."
        ],
        // 지역 수호자: 뿔 달린 방패와 보석
        guardian: [
          "o.............o",
          "oyo.........oyo",
          ".oyoooooooooyo.",
          "..oYYYYYYYYYo..",
          "..oyaaaaaaado..",
          "..oyaabgbccdo..",
          "..oyabgGgccdo..",
          "..oyaabgbccdo..",
          "..oyaabbbccdo..",
          "...oyabbccdo...",
          "....oybbcdo....",
          ".....oycdo.....",
          "......odo......",
          ".......o.......",
          "..............."
        ],
        // 정점(경계의 관측자): 눈을 품은 여덟 갈래 별
        pinnacle: [
          ".......o.......",
          "......oYo......",
          "......oYo......",
          "..oo..oyo..oo..",
          "..oYo.oyo.oyo..",
          "...oyoqqqoyo...",
          ".oooqwpppwqooo.",
          "oYYyqwpkpwqdddo",
          ".oooqwpppwqooo.",
          "...oyoqqqodo...",
          "..oyo.odo.odo..",
          "..oo..odo..oo..",
          "......odo......",
          "......odo......",
          ".......o......."
        ]
      })
    }),
    // 11x11 도트 표식(임시): 콘텐츠는 symbol(같은 꼴을 색만 바꿔 나눠 쓴다), 액트는 diamond. 진짜 표식 그림이 오면 바꾼다.
    symbols: Object.freeze({
      diamond: [".....#.....", "....###....", "...#####...", "..#######..", ".#########.", "###########", ".#########.", "..#######..", "...#####...", "....###....", ".....#....."],
      hollow: [".....#.....", "....#.#....", "...#...#...", "..#.....#..", ".#.......#.", "#.........#", ".#.......#.", "..#.....#..", "...#...#...", "....#.#....", ".....#....."],
      "celtic-cross": [".....#.....", "...#.#.#...", "..#..#..#..", ".#...#...#.", "#...###...#", "###########", "#...###...#", ".#...#...#.", "..#..#..#..", "...#.#.#...", ".....#....."],
      triskelion: [".....#.....", "....#.#....", "....#.#....", "...#...#...", "..#..#..#..", ".#..###..#.", "#...###...#", ".#...#...#.", "..#.....#..", "...#...#...", "....###...."],
      boss: ["...#####...", "..#######..", ".#########.", ".##..#..##.", ".##..#..##.", ".#########.", "..##.#.##..", "...#####...", "....#.#....", "....#.#....", "....###...."],
      "celtic-knot": ["..###.###..", ".#...#...#.", "#....#....#", "#...#.#...#", ".#.#...#.#.", "..#.....#..", ".#.#...#.#.", "#...#.#...#", "#....#....#", ".#...#...#.", "..###.###.."],
      "shield-knot": [".##.....##.", "#..#...#..#", "#..#####..#", ".##.#.#.##.", "...##.##...", "....#.#....", "...##.##...", ".##.#.#.##.", "#..#####..#", "#..#...#..#", ".##.....##."],
      spiral: ["...#####...", "..#.....#..", ".#..###..#.", ".#.#...#.#.", ".#.#.#.#.#.", ".#.#.##..#.", ".#.#.....#.", ".#..#####..", "..#........", "...######..", "..........."],
      bang: ["....###....", "....###....", "....###....", "....###....", "....###....", "....###....", ".....#.....", "...........", "....###....", "....###....", "....###...."]
      // 받을 보상의 ! (표식 오른쪽 위, js/world-map-ui.js markHtml)
    }),
    // 자리 표식(2026-11-10 사용자: 아틀라스 지도와 통일, 자리마다 다른 모양): 아틀라스 표식과 같은 15x15 도트와 같은 글자 팔레트(atlas.icons의 설명),
    // 같은 그리기(js/world-map-ui.js atlasIcon). a b c는 그 자리의 색(region.color)이다. 자리의 icon이 여기 이름이다.
    icons: Object.freeze({
      // 액트: 마름모 돌판(번호가 위에 선다)
      act: [".......o.......", "......oao......", ".....oabao.....", "....oabsbao....", "...oabsssbao...", "..oabsssssbco..", ".oabsssssssbco.", "oabsssssssssbco", ".ocbsssssssbco.", "..ocbsssssbco..", "...ocbsssbco...", "....ocbsbco....", ".....ocbco.....", "......oco......", ".......o......."],
      // 강대한 적: 뿔 달린 해골
      boss: ["o.............o", "oao.........oao", "obao.......oabo", ".obaooooooaabo.", "..obwwwwwwwbo..", "..owwwwwwwwwo..", ".owwoowwwoowwo.", ".owwoobwboowwo.", ".owwwwwowwwwwo.", "..owwwwowwwwo..", "...owwwwwwwo...", "...owowowowo...", "...owowowowo...", "....ooooooo....", "..............."],
      // 고대 미궁: 겹겹의 벽
      maze: ["ooooooooooooooo", "oaaaaaaaaaaaaco", "oasssssssssssco", "oasbbbbbbbbbsco", "oasbsssssssbsco", "oasbsbbbbbsbsco", "oasbsbsssbsbsco", "oasbsbsGsssbsco", "oasbsbsssbsbsco", "oasbsbbbbbsbsco", "oasbsssssssssco", "oasbbbbbbbbbsco", "oasssssssssssco", "occccccccccccco", "ooooooooooooooo"],
      // 대균열: 벌어진 틈
      rift: [".......oo......", "......oao......", ".....oabo......", "....oabwo......", "....oawbooo....", "...oabwwbbao...", "...oobbwwwbo...", ".....oobwwao...", "......oawbo....", ".....oawbo.....", "....oawboo.....", "....obwbo......", ".....obo.......", ".....oo........", "..............."],
      // 숨겨진 벌집: 꿀이 든 육각 방
      hive: ["....ooooooo....", "...oaaaaaaao...", "..oabbbbbbbco..", ".oabbsssssbbco.", "oabbssssssssbco", "oabssssYssssbco", "oabsssYYYsssbco", "oabsssYyYsssbco", "oabsssyyysssbco", "oabbsssssssbbco", ".oabbsssssbbco.", "..obbbbbbbbco..", "...occcccccco..", "....ooooooo....", "..............."],
      // 시간의 균열: 모래시계
      hourglass: [".ooooooooooooo.", ".oaaaaaaaaaaco.", "..obbbbbbbbbo..", "..obwwwwwwwbo..", "...obwwwwwbo...", "....obwwwbo....", ".....obwbo.....", "......owo......", ".....obwbo.....", "....obswsbo....", "...obsswssbo...", "..obswwwwwsbo..", "..obbbbbbbbbo..", ".oaaaaaaaaaaco.", ".ooooooooooooo."],
      // 심해(낚시 포함): 물고기와 물결
      fish: ["...............", "...............", "....oooooo.....", "..ooaaaaaaoo.oo", ".oaawabbbbbbobo", "oaaaoabbbbbbbbo", "oabbbbbbbbbbbco", "obbbbbbbbbbbcco", ".obbbbbccccoobo", "..oocccccoo..oo", "....oooooo.....", "...............", ".oo..oo..oo..oo", "o..oo..oo..oo..", "..............."],
      // 유성 낙하 지역: 꼬리를 끄는 유성
      meteor: ["...........oooo", ".........ooYYYo", ".......ooYYyyo.", "......oYYyyoo..", "....ooYyyyo....", "...oaaoyyo.....", "..oaaaaooo.....", ".oaawabbbo.....", ".oaaabbbbo.....", ".oabbbbbco.....", ".obbbbbcco.....", "..obbccco......", "...ooooo.......", "...............", "..............."],
      // 전직 시련: 곧게 선 검
      sword: [".......o.......", "......owo......", ".....owwwo.....", ".....owwwo.....", ".....owwwo.....", ".....owwwo.....", ".....owwwo.....", ".....owwwo.....", "...ooooooooo...", "...oaabbbbco...", "...ooooooooo...", "......obo......", "......obo......", ".....oaaao.....", "......ooo......"],
      // 혼돈의 뿌리: 갈라져 내려가는 뿌리
      root: [".....ooooo.....", ".....oaabo.....", ".....oabbo.....", "....ooabboo....", "...oaoabbobo...", "..oaoobbcoobo..", ".oao.obco.obo..", ".obo.obco..obo.", "oao..obo...oco.", "obo..oco....oo.", "oo..obo........", "....oco........", "...obo.........", "...oo..........", "..............."],
      // 지하계: 어두운 굴 입구
      cave: ["...ooooooooo...", "..oaaaaaaaaao..", ".oaabbbbbbbbco.", "oaabbooooobbcco", "oabboosssoobbco", "oabosssssssobco", "oabosssssssobco", "oabosssssssobco", "oabosssssssobco", "oabosssssssobco", "oabosssssssobco", "oabosssssssobco", "occosssssssocco", "ooooooooooooooo", "..............."],
      // 혼돈계: 소용돌이
      vortex: ["....ooooooo....", "..ooaaaaaaaoo..", ".oaaoooooooaao.", "oaaoobbbbboobo.", "oaoobooooobooco", "oaobooaaaoobobo", "oaoboaoooaoboco", "oaoboaowoooboco", "oaoboaoooooboco", "oaobooaaaaabbco", "oaooboooooooco.", ".oaoobbbbbbco..", ".ooaoooooooo...", "..oooaaaaao....", "....ooooooo...."],
      // 우주계: 고리를 두른 별
      planet: ["...............", ".....ooooo.....", "...ooaaaaaoo...", "..oaaaabbbbbo.o", "..oaabbbbbbboYo", ".oaabbbbbbbooYo", ".oabbbbbbooYYo.", "ooobbbbooYYoco.", "oYYoooYYYoocco.", "oYYYYYooobcco..", ".ooooobbbccco..", "...obbbccccoo..", "...ooccccoo....", ".....ooooo.....", "..............."],
      // 군락지: 구멍이 숭숭 뚫린 둔덕
      colony: ["...............", "......ooo......", ".....oaaao.....", "....oaabbbo....", "...oaabobbbo...", "..oaabbbbbbco..", "..oabbbbobbco..", ".oaabobbbbbbco.", ".oabbbbbbbobco.", "oaabbbobbbbbbco", "oabbbbbbbbbbcco", "oabbobbbbobbcco", "occccccccccccco", "ooooooooooooooo", "..............."],
      // 창공: 반듯한 탑(2026-11-10 사용자: 구름 없이 그냥 반듯한 탑 모양으로)
      tower: [".....o.o.o.....", "....oaoaoco....", "....ooooooo....", "....oaabbco....", "....oaabbco....", "....oasbbco....", "....oasbbco....", "....oaabbco....", "....oaabbco....", "....oaabsco....", "....oaabsco....", "....oaabbco....", "...ooaabbcoo...", "...oaaabbcco...", "...ooooooooo..."],
      // 세계 지도로 돌아가는 자리: 세계수
      tree: ["....ooooooo....", "..ooaaaaaaaoo..", ".oaaaabaaabaao.", "oaabaaaaabaaaao", "oaaaaabaaaaabao", "obaaaaaaabaaaco", ".occaaYYaaacco.", "..oooccYyccoo..", ".....oYyo......", ".....oYyo......", ".....oyyo......", "....oYyydo.....", "..ooYyoydyoo...", ".oyyoo.oo.oydo.", ".oo.........oo."]
    }),
    regions: Object.freeze([
      { id: "act-05", type: "act", act: 1, zone: [[372, 210], [403, 211], [444, 223], [446, 231], [426, 254], [395, 254], [369, 219]], tag: [470, 222] },
      { id: "act-02", type: "act", act: 2, zone: [[374, 176], [462, 176], [468, 206], [442, 216], [427, 216], [365, 198]], tag: [480, 198] },
      { id: "act-06", type: "act", act: 3, zone: [[234, 238], [302, 238], [308, 262], [292, 282], [262, 283], [230, 250]], tag: [222, 226] },
      { id: "act-03", type: "act", act: 4, zone: [[316, 282], [366, 282], [370, 293], [367, 312], [358, 320], [334, 320], [312, 296]], tag: [262, 352] },
      { id: "act-04", type: "act", act: 5, zone: [[326, 246], [387, 246], [398, 261], [395, 281], [394, 282], [338, 282], [318, 264]], tag: [368, 338] },
      { id: "act-08", type: "act", act: 6, zone: [[403, 121], [442, 124], [472, 150], [462, 176], [400, 176], [373, 168], [369, 144], [369, 142]], tag: [484, 146] },
      { id: "act-07", type: "act", act: 7, zone: [[337, 131], [365, 132], [372, 175], [370, 180], [354, 196], [325, 191], [312, 163]], tag: [238, 178] },
      { id: "act-mw6qeu87", type: "act", act: 8, zone: [[283, 101], [323, 103], [336, 117], [339, 126], [309, 164], [292, 168], [268, 142], [275, 105]], tag: [226, 160] },
      { id: "act-09", type: "act", act: 9, zone: [[315, 72], [378, 72], [383, 83], [370, 106], [328, 106], [311, 88]], tag: [394, 86] },
      { id: "act-10", type: "act", act: 10, zone: [[318, 40], [372, 40], [378, 56], [368, 70], [322, 70], [316, 61], [314, 52]], tag: [398, 46] },
      { id: "content-mw6r5xui", type: "content", route: "map-explore-root-boss", icon: "boss", name: "강대한 적", description: "지주근의 밑바닥, 열쇠가 사라진 감옥입니다.", color: "#ff5c5c", symbol: "boss", zone: [[372, 292], [406, 292], [417, 301], [422, 316], [402, 326], [376, 322], [369, 313]], tag: [430, 350] },
      { id: "content-mw6quoe1", type: "content", route: "map-explore-labyrinth", icon: "maze", name: "고대 미궁", description: "뿌리 틈에 숨겨져 있던 고대의 미궁, 그 끝에 이르는 길은 당신만이 알고 있습니다.", color: "#f3fd5d", symbol: "shield-knot", zone: [[176, 266], [225, 257], [228, 265], [228, 306], [182, 298]], tag: [186, 316] },
      { id: "content-mw6r4qv9", type: "content", route: "map-explore-voidrift", icon: "rift", name: "대균열", description: "유성의 영향으로 인한 균열은 천천히 영역을 넓혀 갑니다.", color: "#950e64", symbol: "spiral", zone: [[244, 184], [275, 186], [287, 211], [278, 220], [246, 216], [234, 200]], tag: [204, 212] },
      { id: "content-mw6qm5i9", type: "content", route: "map-explore-beehive", icon: "hive", name: "숨겨진 벌집", description: "수액이 괴이한 방식으로 정제한 흔적들과 생명들", color: "#ff8800", symbol: "celtic-knot", zone: [[230, 48], [298, 42], [312, 55], [314, 64], [310, 85], [271, 104], [264, 106], [226, 88]], tag: [206, 44] },
      { id: "content-mw6ra48b", type: "content", route: "map-explore-timerift", icon: "hourglass", name: "시간의 균열", description: "엔트로피를 극대화하십시오.", color: "#ffffff", symbol: "celtic-knot", zone: [[377, 96], [414, 98], [419, 108], [379, 133], [366, 116]], tag: [440, 104] },
      { id: "content-02", type: "content", route: "map-tab-ocean", also: ["map-tab-fishing"], icon: "fish", name: "심해", description: "", color: "#047bfb", symbol: "triskelion", zone: [[270, 314], [326, 314], [342, 331], [346, 340], [326, 358], [280, 354], [262, 334]], tag: [344, 356] },
      { id: "content-01", type: "content", route: "map-explore-worldtree", icon: "pinnacle", name: "아틀라스", description: "당신은 이방인과 어머니 나무 이전의 존재들을 찾기 위해 시간과 공간을 뛰어넘을 것입니다.", color: "#0aff9d", symbol: "celtic-cross", zone: [[322, 8], [368, 8], [374, 24], [366, 40], [324, 40], [316, 24]], tag: [296, 22] },
      { id: "content-03", type: "content", route: "map-explore-meteor", icon: "meteor", name: "유성 낙하 지역", description: "고대의 존재들은 규율의 균열을 눈치채고 있습니다.", color: "#e43fb0", symbol: "boss", zone: [[280, 170], [313, 170], [323, 191], [312, 204], [285, 202], [274, 179]], tag: [214, 178] },
      { id: "content-mw6qhzhs", type: "content", route: "map-explore-trials", icon: "sword", name: "전직 시련", description: "어머니 나무 뿌리 속의 시련을 마주하라.", color: "#ab90c6", symbol: "celtic-knot", zone: [[402, 254], [442, 254], [433, 294], [412, 294], [397, 282]], tag: [456, 234] },
      { id: "content-mw6rigds", type: "content", route: "map-explore-chaos", icon: "root", name: "혼돈의 뿌리", description: "당신의 호기심이 혼돈의 뿌리 끝을 향해 내려갑니다.", color: "#9162ea", symbol: "celtic-knot", zone: [[445, 250], [498, 248], [498, 318], [468, 324], [434, 301]], tag: [470, 340] },
      { id: "content-underworld", type: "content", route: "map-tab-underworld", icon: "cave", name: "지하계", description: "", color: "#d5a16f", symbol: "shield-knot", zone: [[228, 256], [236, 259], [265, 289], [264, 296], [228, 306]], tag: [236, 328] },
      { id: "content-chaos-realm", type: "content", route: "map-tab-chaos-realm", icon: "vortex", name: "혼돈계", description: "", color: "#f0b3ff", symbol: "celtic-knot", zone: [[498, 248], [522, 246], [550, 274], [538, 312], [498, 318]], tag: [556, 262] },
      { id: "content-cosmos", type: "content", route: "map-tab-cosmos", icon: "planet", name: "우주계", description: "", color: "#aaa6e6", symbol: "celtic-cross", zone: [[226, 154], [270, 158], [276, 176], [262, 184], [232, 182], [220, 170]], tag: [196, 166] },
      { id: "content-colony", type: "content", route: "map-explore-colony", icon: "colony", name: "군락지", description: "", color: "#9fd46a", symbol: "celtic-knot", zone: [[84, 288], [126, 274], [166, 292], [160, 318], [98, 320]], tag: [206, 330] },
      { id: "content-sky", type: "content", route: "map-tab-sky", icon: "tower", name: "창공", description: "", color: "#8fd3ff", symbol: "celtic-cross", zone: [[546, 150], [608, 138], [650, 160], [642, 194], [566, 198], [538, 176]], tag: [594, 122] }
    ])
  });

  // modules/data/world-map.mjs:classic
  Object.assign(globalThis, { WORLD_MAP });
  if (typeof safeExposeData === "function") safeExposeData({ WORLD_MAP });
})();
