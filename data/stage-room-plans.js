// 방 단위 무대의 방 놓임새 (js/act-exploration-room-plans.js, 2026-10-13 사용자: "맵구조 액트는 프리셋 4개중 소프트랜덤, 혼돈 이후부터는
// 준 랜덤으로"). 지도에 적힌 방들(data/act-exploration-maps.js)은 그대로 두고 놓는 자리와 문으로 잇는 짝만 바꾼다. 방의 수와 구실별
// 수가 지도와 같아야 한다(다르면 그 놓임새는 쓰이지 않고 오류가 난다: scripts/check-stage-room-plans.cjs가 미리 본다).
// 글자 그림: 짝수 줄의 짝수 칸이 방, 그 사이의 '-'와 '|'가 문이다. 오른쪽이 무대의 오른쪽, 아래가 무대의 앞쪽.
//   S 입구, X 보스 방(문은 하나), b 전투 방, e 정예 방, o 들르지 않아도 되는 방(막다른 끝)
const STAGE_ROOM_PLANS = Object.freeze({
    /** 액트마다 네 장. 첫 장은 이어진 지도(뿌리 갈래, 중정 둘레길, 널다리, 미궁, 신전의 본당, 무너진 중정, 나선, 장막, 세 갈래, 차륜)의
     * 생김새를 옮긴 것이고 나머지 셋은 같은 방들을 다르게 놓은 것이다. */
    acts: Object.freeze({
        1: Object.freeze([
            Object.freeze(['    e-o', '    |', 'S-b-b-b-X', '    |', '  o-e']),
            Object.freeze(['S-b-o', '  |', '  e-b-e', '    | |', '    o b-X']),
            Object.freeze(['  e-b-o', '  | |', 'S-b-b-X', '  |', '  e-o']),
            Object.freeze(['    o', '    |', '  b-e-b-X', '  |', 'S-b-e-o'])
        ]),
        2: Object.freeze([
            Object.freeze(['  o', '  |', '  b-e', '  | |', 'S-b b-X', '  | |', '  b-e', '  |', '  o']),
            Object.freeze(['  b-b-e', '  |   |', 'S-b-o b-X', '  |', '  e-o']),
            Object.freeze(['o-b-e', '  | |', 'S-b-b-o', '    |', '    e-b-X']),
            Object.freeze(['S-b-e-o', '  |', '  b-b-e', '  |   |', '  o   b-X'])
        ]),
        3: Object.freeze([
            Object.freeze(['S-b b-X', '  | |', '  e-e', '  | |', '  o o']),
            Object.freeze(['  o   o', '  |   |', 'S-b-e-b-e-X']),
            Object.freeze(['S-e-o', '  |', '  b-e-o', '    |', '    b-X']),
            Object.freeze(['    o', '    |', '  e-b', '  | |', 'S-b e-X', '    |', '    o'])
        ]),
        4: Object.freeze([
            Object.freeze(['o-b-e', '  | |', 'S-b-b-b-X', '  | |', 'o-b-e']),
            Object.freeze(['b-b-e-o', '|   |', 'S   b-b', '    | |', '  o-e-b-X']),
            Object.freeze(['S-b-b', '  | |', 'o-e-b-o', '  |', '  b-b-e-X']),
            Object.freeze(['  o e-b', '  | | |', 'S-b-b b-X', '  |', '  e-b-o'])
        ]),
        5: Object.freeze([
            Object.freeze(['o-e', '  |', 'S-b-b-b-X', '  | |', '  o e']),
            Object.freeze(['    o', '    |', '  e-b-e', '    |', 'S-b-b-X', '  |', '  o']),
            Object.freeze(['S-b-e-o', '    |', '  o-b-b-X', '      |', '      e']),
            Object.freeze(['  e-o', '  |', '  b-b-X', '  | |', 'S-b e', '    |', '    o'])
        ]),
        6: Object.freeze([
            Object.freeze(['o-b-e', '  | |', 'S-b-b-b-X', '    |', '  o-e']),
            Object.freeze(['S-b-b-o', '  |', '  e b-X', '  | |', 'o-b-e']),
            Object.freeze(['  o-b', '    |', 'S-b-b-e', '  |   |', '  e-o b-X']),
            Object.freeze(['    e-o', '    |', 'S-b-b-b', '  |   |', '  o e-b-X'])
        ]),
        7: Object.freeze([
            Object.freeze(['    o', '    |', 'b-b-e', '|   |', 'b-X b-o', '    |', 'S-b-e']),
            Object.freeze(['b-e-X', '|', 'b S-b-o', '|   |', 'b-e-b-o']),
            Object.freeze(['S-b-b-e', '      |', '  o-b-b', '    |', '  o-e-b-X']),
            Object.freeze(['    b-e', '    | |', 'S-b-b b-o', '  |   |', '  o e-b-X'])
        ]),
        8: Object.freeze([
            Object.freeze(['S-b', '  |', 'o-e-b-o', '    |', '    e-b-X']),
            Object.freeze(['    o', '    |', 'S-b-e', '    |', '  o-b-e-b-X']),
            Object.freeze(['  e-o', '  |', 'S-b', '  |', '  b-e-b-X', '    |', '    o']),
            Object.freeze(['S-b-e-b', '  |   |', '  o   b-X', '      |', '    o-e'])
        ]),
        9: Object.freeze([
            Object.freeze(['  e-b-o', '  | |', 'S-b-b-b-X', '  | |', '  e-b-o']),
            Object.freeze(['o-b-b-e', '  |   |', 'S-b   b-X', '  |', '  e-b-o']),
            Object.freeze(['S-b-b-e', '  | |', '  b-b-o', '  |', '  e-b-X', '    |', '    o']),
            Object.freeze(['    o', '    |', '  b-b-e', '  |   |', 'S-b-e b-X', '  |', '  b-o'])
        ]),
        10: Object.freeze([
            Object.freeze(['o-b-e-b', '  |   |', 'S-b   b-X', '  |   |', 'o-b-e-b']),
            Object.freeze(['  b-e-b', '  |   |', 'S-b-o b-X', '  |   |', '  b-e-b', '    |', '    o']),
            Object.freeze(['S-b-b-e', '  |   |', '  b-o b', '  |   |', 'o-e-b-b-X']),
            Object.freeze(['  o-b-b', '    | |', 'S-b-b e', '  |   |', '  e-b-b-X', '    |', '    o'])
        ])
    }),
    /** 소프트 랜덤의 무게: 바로 앞에 걸은 놓임새(last)와 그 앞의 것(before). 나머지는 1. */
    soft: Object.freeze({ last: 0, before: 0.5 }),
    /** 준 랜덤 규칙. mainShare 큰길에 서는 전투 방의 몫(가장 적게, 가장 많게), eliteOnMain 정예 방이 큰길에 설 확률,
     * east 큰길이 오른쪽으로 가는 무게(위와 아래는 1씩), bossEast 보스 방으로 가는 마지막 걸음에서 그 무게에 곱하는 값,
     * turn 큰길이 위아래로 잇달아 가는 걸음의 상한, entryHost 곁가지가 입구에 붙는 무게, chain 곁가지에 다시 붙는 무게(큰길은 1),
     * upright 곁가지가 위아래로 붙는 무게(좌우는 1), loop 돌아가는 길 하나를 더 낼 확률. */
    random: Object.freeze({ mainShare: Object.freeze([0.6, 1]), eliteOnMain: 0.4, east: 3, bossEast: 3, turn: 2, entryHost: 0.25, chain: 1.3, upright: 2, loop: 0.35 }),
    /** 구역의 무대 그림(data/stage-regions.js의 지역). types 구역 종류, deep 혼돈 심화(깊이 21부터), zones 구역 id, rift 시간의 균열의
     * 두 시대, tracks 정점 보스의 영역, rival 버려진 날들, capstone 우주의 끝, boards 고정 전장. 여기에 없는 구역은 빌려 걷는 액트 지도의 그림을 쓴다.
     * 2026-10-13 밤: 판에서 싸우던 군락지, 심해, 우주계, 대균열, 혼돈 밖, 나무꾼의 잔상, 경계 너머가 방 단위 무대에서는 제 지도를 걷는다
     * (js/content-maps.js withRooms). 그 지도의 그림은 판에 붙였던 지역 그림 그대로다. */
    regions: Object.freeze({
        types: Object.freeze({ abyss: 'chaos', chaosRealm: 'chaos-realm', skyTower: 'sky', underworld: 'underworld', labyrinth: 'labyrinth', meteor: 'meteor', beehive: 'beehive',
            colony: 'colony', oceanDepth: 'ocean', cosmos: 'cosmos', grandBreach: 'void', outsideChaos: 'beyond', woodsmanEcho: 'beyond', beyondBoundary: 'beyond' }),
        deep: 'deep-chaos',
        zones: Object.freeze({ trial_1: 'trial-01', trial_2: 'trial-02', trial_3: 'trial-03', trial_4: 'trial-04', trial_5: 'trial-05' }),
        rift: Object.freeze({ past: 'act-02', future: 'act-06' }),
        tracks: Object.freeze({ underworld: 'underworld', sky: 'sky', ocean: 'ocean-trench', convergence: 'beyond' }),
        /** 심해의 수심 띠(2026-10-20 GPT 심해 그림 2차): bands [이 수심(m) 아래, 지역], 그 아래는 deep, 500m마다 가디언의 투기장은 arena.
         * 지도를 지을 때의 수심으로 고른다(지도 하나는 한 띠다). 1000m의 탈라사(정점 보스)는 tracks.ocean. */
        ocean: Object.freeze({ bands: Object.freeze([Object.freeze([300, 'ocean-shallow']), Object.freeze([700, 'ocean'])]), deep: 'ocean-lightless', arena: 'ocean-trench' }),
        rival: 'act-06',
        capstone: 'cosmos',
        /** 걷는 지도가 없는 고정 전장(구역 종류 → 지역): 판 전체를 방 하나처럼 그린다(js/canvas-stage-board.js). 여기에 없는 고정 전장은
         * 앞서의 판 그림 그대로다. */
        boards: Object.freeze({ beehive: 'beehive', colony: 'colony', oceanDepth: 'ocean', cosmos: 'cosmos', grandBreach: 'void', outsideChaos: 'beyond', woodsmanEcho: 'beyond' }),
        /** 시야 방식을 켜는 지역(지역 이름, 예: 'underworld'). 여기에 없는 지역은 주인공이 선 방 전체가 보인다(시야 탐색, 안개, 칸별 발견
         * 목록 없이). 적힌 지역의 방에서는 시야 반경, 벽의 가림, 안개, 발견 규칙이 돈다. 어느 방식인지는 js/act-exploration-sight.js가
         * 여기만 읽어 정한다. 지금은 어느 지역도 켜지 않았다(테스트 패널의 "시야"로 걸어 볼 수 있다). */
        sight: Object.freeze([])
    })
});
safeExposeData({ STAGE_ROOM_PLANS });
