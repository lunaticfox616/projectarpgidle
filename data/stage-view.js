// 옆에서 보는 무대 (2026-10-11 사용자 결정: 던파식 캐릭터를 쓰고 전장도 옆에서 보는 무대로 바꾼다. 대검은 검방패 자세로 대신한다).
// 전투 규칙과 격자는 그대로 두고 그리는 법만 바꾼다: 격자의 가로는 무대의 좌우, 세로는 무대의 깊이다. 깊이 한 칸은 화면에서
// depth배로 눌려 보이고, 캐릭터와 몬스터는 옆모습으로 서서 깊이 순서대로 겹친다. 2026-10-13부터 게임의 기본 전장이다
// (js/canvas-stage-actors.js stageView.wanted): 무대 그림이 있는 판은 무대로, 없는 판은 위에서 보는 전장으로 그린다.
// 테스트 패널(js/dev-test-panel-ui.js)의 "끄기"는 설정 battleView = 'top'으로 위에서 보는 전장을 고른다. 캐릭터 규격은 data/stage-characters.js.
const STAGE_VIEW = Object.freeze({
    /** 깊이 한 칸의 화면 높이 ÷ 가로 한 칸의 화면 너비. */
    depth: 0.5,
    /** 탐험 지도에서 가로로 적어도 이만큼의 칸이 보이게 칸 크기를 고른다. 좁은 화면(휴대폰)은 narrow.
     * 2026-10-11 사용자 "보이는 캐릭터 사이즈 좀 작게": 넓은 화면 15 → 20칸. 1080p에서 캐릭터 도트 하나가 2px → 1.5px이 된다
     * (반 걸음 배율은 js/canvas-stage-dots.js가 도트를 고르게 찍는다). */
    minColumns: Object.freeze({ wide: 20, narrow: 8, narrowBelow: 700 }),
    /** 2026-10-11 사용자 "게임 전체화면일때랑 창모드일때랑 맵 크기가 엄청 변함": 도트 크기를 반 걸음(1, 1.5, 2)으로만 고르던 때는 창이 조금만
     * 좁아져도 1.5 → 1로 떨어져 캐릭터와 방이 3분의 1이나 작아졌다. 이제 칸 크기가 화면 너비를 따라 이어서 변해 어느 창 크기에서나 가로로
     * 같은 칸 수가 보인다(도트가 캔버스 픽셀의 정수배가 아닌 배율은 js/canvas-stage-dots.js가 고르게 찍는다). 아주 작은 창에서는
     * 도트가 이보다 작아지지 않고 대신 보이는 칸이 준다. */
    minDot: 0.75,
    /** 2026-10-13 (가로로 긴 창 2560×720에서 방의 뒤쪽 줄이 화면 위로 나가 몬스터의 머리와 체력바가 잘렸다): 칸 크기는 화면 높이도 따른다.
     * 방 바닥의 뒤쪽 끝 위로 dots도트(뒤쪽 줄에 선 몬스터의 키와 체력바, 이름표)와 화면 위쪽의 top px(구역 이름과 진행 막대의 줄)이
     * 남는 가장 큰 칸까지만 커진다. 그보다 작은 창에서는 전처럼 minDot이 아래 끝이다. */
    headroom: Object.freeze({ dots: 104, top: 44 }),
    /** 주인공이 서는 세로 자리(화면 높이의 비율). 아래쪽은 HUD가 덮으므로 가운데보다 조금 위다. */
    anchorY: 0.46,
    /** 칸 너비가 이 값일 때 캐릭터 도트 하나가 화면 1px이다. */
    heroTile: 64,
    /** 무기 자세 id (data/stage-characters.js의 무기 id와 같다). */
    stances: Object.freeze(['unarmed', 'swordshield', 'dagger', 'bow', 'orb', 'flask', 'censer']),
    /** 낀 무기의 대분류(data/weapon-categories.js) → 자세. 대검은 자세 그림이 없어 검방패를 든다(사용자 결정). */
    stanceByCategory: Object.freeze({ greatsword: 'swordshield', scimitar: 'dagger', shortbow: 'bow', orb: 'orb', flask: 'flask', censer: 'censer' }),
    /** 곡도에 방패를 함께 끼면 드는 자세. */
    shieldStance: 'swordshield',
    /** 준비 시간(휘두르기 시작 → 타격)이 이보다 짧으면 9장 이하의 짧은 공격 그림만 쓴다: 17장짜리를 그 안에 넣으면 깜빡이기만 한다. */
    shortWindupMs: 320,
    shortClipFrames: 9,
    /** 휘두름 사이가 이보다 길면 연속기를 처음 휘두름부터 다시 한다(쉬었다 다시 치면 준비 자세에서 시작한다). */
    comboResetMs: 1500
});
// 무대의 지형(js/canvas-stage-terrain.js): 지도마다 바닥 판석 색과 뒷벽 벽돌 색 두 가지만 정한다. 나머지 음영은 그리는 쪽이 만든다.
// wallMax: 뒷벽의 최대 높이(도트, 깊이 네 칸). pillarEvery: 높은 뒷벽에 기둥을 세우는 가로 간격(칸).
const STAGE_TERRAIN = Object.freeze({
    wallMax: 128,
    pillarEvery: 5,
    biomes: Object.freeze({
        root: Object.freeze({ floor: '#4a3f42', wall: '#40343a' }),
        courtyard: Object.freeze({ floor: '#454b3c', wall: '#364432' }),
        aerial: Object.freeze({ floor: '#514c45', wall: '#3c4352' }),
        maze: Object.freeze({ floor: '#4b3c30', wall: '#402d25' }),
        sanctum: Object.freeze({ floor: '#343b4a', wall: '#2b3143' }),
        ruins: Object.freeze({ floor: '#4c4840', wall: '#3f3b33' }),
        trunk: Object.freeze({ floor: '#51402e', wall: '#453223' }),
        veil: Object.freeze({ floor: '#403558', wall: '#352a50' }),
        canopy: Object.freeze({ floor: '#3b4833', wall: '#30402d' }),
        crown: Object.freeze({ floor: '#383b55', wall: '#2e314d' })
    })
});
// 방 단위 무대 (2026-10-11 사용자: "던파처럼 방 하나마다 이동하는 방식", js/act-exploration-rooms.js). 액트 지도의 방을 따로 떨어진
// 넓은 방으로 놓고 길을 문으로 바꾼다. 방 안의 몬스터를 모두 잡아야 문이 열린다. 무대가 켜진 곳이면 새 탐험은 모두 방 단위다(2026-10-13부터).
const STAGE_ROOMS = Object.freeze({
    /** 방 바닥의 가로 칸 수(덧칸을 붙이기 전): 방의 구실에 따라. 값을 여럿 적으면 놓인 자리에 따라 번갈아 쓴다. 모두 홀수(가운데 칸이 있다).
     * 2026-10-13 사용자: "보스방 크기를 기본으로 해주고 오히려 보스방은 좀 더 작게" → 보통 방 15, 보스 방 11.
     * 같은 날 저녁, 해 본 뒤: "기본 맵 크기를 보스방이랑 같은크기로 하자" → 모든 방이 보스 방의 너비(11)다. 덧칸 10을 더하면 21칸이다. */
    widths: Object.freeze({ entry: 11, optional: 11, battle: 11, elite: 11, boss: 11 }),
    /** 방 하나가 차지하는 가로 자리: 가장 넓은 방의 너비. */
    slot: 11,
    /** 방 놓는 법의 판 번호: 탐험 기록(run.rooms)에 적힌다. 방 크기나 자리를 바꾸면 올린다(옛 번호의 탐험은 불러올 때 버리고 다시 연다).
     * 4 = 방 놓임새(data/stage-room-plans.js: 액트는 프리셋 넷, 그 밖의 구역은 준 랜덤)와 구역마다의 무대 그림. 5 = 방의 바탕 크기를 키움.
     * 6 = 보통 방을 보스 방의 크기로, 보스 방은 더 작게. 7 = 모든 방을 그 작아진 보스 방의 크기로.
     * 8 = 방마다 생김새(shapes)와 문 자리(doorSpots)가 다르다. */
    version: 8,
    /** 방의 생김새 (2026-10-13 밤, 검토: "전부 직사각형이고 깊이는 9칸으로 같아" → 사용자 "규칙 상관없으니까 바꿔줘"): 전투, 정예, 들르는
     * 방은 기준 방(widths + grow, depth + grow: 21×9)에서 가로와 깊이를 줄인 생김새 가운데 하나를 씨앗으로 고른다.
     * [가로에서 빼는 칸, 깊이에서 빼는 칸, 무게]. 기준 방보다 커지지는 않는다: 무대 그림은 기준 방에 맞춘 한 배율로 모든 방에 놓이므로
     * (구조물의 크기가 방마다 달라지지 않는다) 더 큰 방은 그림이 모자란다. 입구와 보스 방, 한 줄 지도의 방은 기준 크기다.
     * 줄이는 칸은 덧칸(grow)을 넘지 않는다. 지금의 생김새: 21×9, 17×9, 15×9, 21×7, 19×7, 17×7. */
    shapes: Object.freeze([Object.freeze([0, 0, 4]), Object.freeze([4, 0, 2]), Object.freeze([6, 0, 1]), Object.freeze([0, 2, 3]), Object.freeze([2, 2, 2]), Object.freeze([4, 2, 2])]),
    /** 문이 벽을 따라 서는 자리(벽 길이의 비율): 길마다 씨앗으로 하나를 고른다. 좌우 문은 깊이의 위쪽, 가운데, 아래쪽이고 길의 두 끝이
     * 같은 높이에 선다. 앞쪽 문은 가로의 왼쪽, 가운데, 오른쪽이다. 보스 방으로 가는 문과 한 줄 지도의 문은 가운데(0.5)이고, 뒤쪽 문은
     * 무대 그림에 그려진 문 자리를 따른다. */
    doorSpots: Object.freeze([0.2, 0.5, 0.8]),
    /** 방 하나에 무리들이 서는 자리 묶음(2026-10-13 밤, 검토: "추가 몹팩 위치도 가운데 양옆으로 정해져 있어"): 방을 열 때 무게대로 하나를 고른다
     * (js/combat.js stageRoomArranger). spots는 [가로, 깊이] 자리로, 방 가운데가 0이고 ±1이 무리가 설 수 있는 끝이다. 가로의 +는 들어온 문의
     * 맞은편이다(문이 위아래에 있으면 반반). 첫 자리가 방의 원래 무리, 그다음이 덧무리의 자리다. 한 줄 지도의 방도 이 자리를 쓴다.
     * centre 가운데와 양옆(전의 자리), wings 양 날개(가운데가 빈다), far 들어온 쪽의 맞은편에 몰려 있다, back 뒤쪽 줄, front 앞쪽 줄,
     * corners 구석들, split 앞뒤로 갈라 선다. */
    layouts: Object.freeze([
        Object.freeze({ id: 'centre', weight: 3, spots: Object.freeze([[0, 0], [0.6, -0.5], [-0.6, 0.5]]) }),
        Object.freeze({ id: 'wings', weight: 2, spots: Object.freeze([[0.7, 0], [-0.7, 0], [0, 1]]) }),
        Object.freeze({ id: 'far', weight: 3, spots: Object.freeze([[0.75, -0.5], [0.75, 1], [0.2, 0]]) }),
        Object.freeze({ id: 'back', weight: 2, spots: Object.freeze([[0, -1], [0.7, -1], [-0.7, -1]]) }),
        Object.freeze({ id: 'front', weight: 1, spots: Object.freeze([[0.1, 1], [0.75, 0.5], [-0.6, 1]]) }),
        Object.freeze({ id: 'corners', weight: 2, spots: Object.freeze([[0.85, -1], [-0.85, 1], [0.85, 1]]) }),
        Object.freeze({ id: 'split', weight: 2, spots: Object.freeze([[0.3, -1], [-0.3, 1], [0.8, 0]]) })
    ]),
    /** 무리가 서는 꼴과 무게: cluster 뭉쳐서(전의 꼴), line 가로 한 줄, column 세로 줄, loose 한 칸씩 띄어서. 무리마다 따로 고른다. */
    packShapes: Object.freeze([Object.freeze({ id: 'cluster', weight: 4 }), Object.freeze({ id: 'line', weight: 2 }), Object.freeze({ id: 'column', weight: 1 }), Object.freeze({ id: 'loose', weight: 3 })]),
    /** 깊이 칸 수의 바탕: 여기에 덧칸(grow.deep)이 붙는다. */
    depth: 5,
    /** 방을 넓히는 덧칸(사용자 2026-10-11: "좀 넓게 만들어봐 크기조절도 (위아래랑 양옆 둘다)"): 모든 방의 가로와 깊이에 더한다.
     * 바탕값이 grow이고 테스트 패널에서 wideSteps, deepSteps 가운데 고를 수 있다(홀수 크기를 지키려고 두 칸씩이다).
     * 고른 값은 탐험 기록의 열쇠 "판:가로 덧칸:깊이 덧칸"(run.rooms)에 적혀 그 탐험이 끝날 때까지 그대로다.
     * 2026-10-13 사용자: 새 브라우저로 여니 방이 "엄청 좁아졌어"(쓰던 창에서는 테스트 패널로 키워 둔 크기였다). 바탕값을 가장 큰 크기로
     * 올렸다(가로 6 → 10, 깊이 2 → 4): 방은 가로 21칸, 깊이 9칸이다. */
    grow: Object.freeze({ wide: 10, deep: 4 }),
    wideSteps: Object.freeze([0, 2, 4, 6, 8, 10]),
    deepSteps: Object.freeze([0, 2, 4]),
    /** 방 사이를 띄우는 칸 수: 경계하는 무리의 귀(12칸)와 튀는 피해(12칸)가 옆 방에 닿지 않게 그보다 넓다. */
    gap: 16,
    /** 방 위쪽의 벽 칸 수(뒷벽이 서는 자리)와 아래쪽 여백. */
    top: 5,
    bottom: 3,
    /** 방 그림에 함께 담는 둘레의 벽 칸 수(좌우, 위, 아래). openFrame: 배경 그림을 쓰는 방(벽이 없어 바닥과 길이 화면 끝까지 간다). */
    frame: Object.freeze({ side: 3, top: 5, bottom: 2 }),
    openFrame: Object.freeze({ side: 7, top: 6, bottom: 7 }),
    /** 배경 그림을 쓰는 방에서 바닥의 앞쪽 끝이 놓이는 세로 자리(화면 높이의 비율): 그 아래는 HUD가 덮는다. 좁은 화면(휴대폰)은 narrow. */
    floorBottom: Object.freeze({ wide: 0.745, narrow: 0.6 }),
    /** 넓은 화면에서 바닥의 앞쪽 끝이 전장의 아래 끝에서 이만큼(전장의 px)은 떨어져 있어야 한다: 하단 HUD(.player-hud)의 높이다(어느 창
     * 크기에서나 244px). 2026-10-13 돌려 본 결과: 높이 864 화면에서 앞쪽 문이 가운데 구슬(미니맵)에 가려졌다. */
    hudClear: 244,
    /** 방을 화면 기준 줄보다 위로 올리는 칸 수의 상한(깊이 칸): 화면 아래쪽을 덮는 HUD에서 앞쪽 문을 꺼낸다. */
    lift: 1.25,
    /** 바닥의 앞쪽 끝 아래(걸어갈 수 없는 자리)를 덮는 어둠 (2026-10-14 사용자: "바닥 중 아래쪽의 못 가는 영역은 약간 그라데이션으로
     * 어둡게"). 앞쪽 끝에서 아래로 띠(bandDots 도트)마다 한 단씩 짙어져 bands번째 띠부터 alpha에 머문다. */
    frontShade: Object.freeze({ colour: '#06050a', alpha: 0.6, bands: 12, bandDots: 4 }),
    /** 문을 지난 뒤 화면이 어둠에서 밝아지는 시간(ms). */
    fadeMs: 280,
    /** 방 단위 탐험에서 주인공이 걷는 빠르기의 배수(2026-10-11 사용자: "기본 이동속도를 지금보다 50% 정도 빠르게"): 방이 넓어져 한 칸씩
     * 걷는 시간이 길게 느껴졌다. 방 단위 탐험(run.rooms)에만 곱하므로 이어진 지도의 탐험과 그 계산은 그대로다. */
    pace: 1.5,
    /** 방마다 더 서는 무리(2026-10-13 사용자: "한 방에 몬스터 한무리~1.5무리 정도 더 나오게"): always는 늘 더 서는 수, 하나 더는
     * chance의 확률로 선다. 방 가운데의 원래 무리 양옆으로, 방 반너비의 spread 자리에 선다. 정예는 원래 무리에만 있다.
     * 같은 날 "몹팩 약간(0.5~1팩)만 줄여봐": 늘 하나 더에 반은 둘 더(평균 1.5)이던 것을 네 방에 세 방꼴로 하나 더(평균 0.75)로 줄였다.
     * 방의 무리는 2~3개에서 1~2개가 된다. */
    extraPacks: Object.freeze({ always: 0, chance: 0.75, spread: 0.58 }),
    /** 방의 상자와 항아리(2026-10-13 사용자: "막다른 길에 상자 / 항아리 출현 확률이 좀 더 높게", "1개부터 여러개 랜덤으로",
     * "좀 떨어져서"): 방마다 따로 굴린다. 값 둘은 [보스로 가는 길의 방, 들르지 않아도 되는 막다른 쪽의 방] 순서다.
     * chest 보급 상자가 놓일 확률. props 항아리나 목재 상자가 놓일 확률, propCounts 놓일 때의 개수(이 가운데 하나를 고르게 뽑는다).
     * apart 같은 방의 물체 사이에 두는 칸 수(가로와 세로 차이의 합). limit 지도 하나에 놓는 물체의 상한. */
    objects: Object.freeze({ chest: Object.freeze([0.1, 0.4]), props: Object.freeze([0.4, 0.75]), propCounts: Object.freeze([1, 1, 2, 2, 3, 4]), apart: 4, limit: 40 })
});
// 방 단위 무대의 배경 그림 (2026-10-11 사용자: "바닥이랑 오브젝트만 놔두고, 벽 대신 이런 느낌의 배경으로", js/canvas-stage-backdrop.js).
// 지형마다 그림 한 장: 위쪽은 배경, 아래쪽은 바닥이 놓일 빈 띠다. ground = 그림에서 바닥이 시작하는 줄(그림 높이의 비율).
// 그 지형의 방은 벽돌 벽 없이 바닥과 길만 그린다: floor 바닥 판석, kerb 바닥 옆 턱, earth 바닥 밖의 어두운 땅(그림의 빈 띠 색),
// rim과 hollow 뒷문이 되는 굴의 테와 속, moss 바닥 뒤쪽 끝에 번지는 이끼. 그림이 없는 지형과 그림 파일이 없는 판은 벽돌 뒷벽 그대로다.
// theme: 그 지형의 방을 제 방식으로 그리는 테마(바닥, 문), objects: 그 지형의 탐험 물체 그림 묶음(STAGE_OBJECTS.themes). 없으면 공용이다.
// props: 그 지형의 방을 채우는 소품 묶음(STAGE_PROPS.themes). 없으면 소품을 놓지 않는다.
// layers: 층 그림(같은 폴더의 파일). 좌우로 이어 붙는 띠이고 tall = 화면에 그릴 높이(캐릭터 도트). 없는 층은 코드로 그린 임시 그림이 대신한다.
//   back   뒤쪽 띠: 바닥 뒤쪽 끝에 서는 울타리나 벽. 위쪽이 투명한 그림. sink = 바닥선 아래로 내려 겹치는 도트.
//   ground 바닥 무늬: 바닥선에서 아래로 깔리는 띠. 방 바닥 일곱 줄이 224도트이므로 그보다 크게(바닥 밖까지 덮는다).
//   예: layers: Object.freeze({ back: Object.freeze({ file: 'root-back.png', tall: 72, sink: 4 }), ground: Object.freeze({ file: 'root-ground.png', tall: 320 }) })
// 그림은 캐릭터 그림과 같은 폴더에 두고 아직 저장소에 넣지 않는다(사용자가 준 그림: 써도 되는지 확인 뒤에 넣는다).
const STAGE_BACKDROPS = Object.freeze({
    path: 'assets/playable/stage/backdrops/',
    /** 방이 화면보다 넓어 카메라가 움직일 때 배경이 따라 움직이는 비율(바닥보다 느리게). */
    parallax: 0.3,
    biomes: Object.freeze({
        root: Object.freeze({ file: 'root.webp', ground: 0.5996, floor: '#4d4035', kerb: '#2f2620', earth: '#1e1a17', rim: '#6f5e4c', hollow: '#0e0b09', moss: '#6e5a2a',
            // 뿌리끝 성소(js/canvas-stage-sanctum.js): 다져진 흙, 빈터 밖의 어두운 땅, 돌, 풀(몸, 밝은 잎, 밑동), 뿌리(몸, 빛 받는 쪽, 테), 수액(몸, 빛, 테), 빛나는 버섯,
            // 보스 방 문의 썩은 뿌리.
            theme: 'sanctum', objects: 'root', props: 'root',
            palette: Object.freeze({ dirt: '#5a4532', wild: '#241d16', stone: '#74665a', grass: '#56602b', grassLight: '#808a3e', grassDark: '#2c321a',
                root: '#6d5845', rootLight: '#957a5c', rootDark: '#241a14',
                sap: '#c58f2a', sapLight: '#f4d572', sapDark: '#7a5416', cap: '#8fe3c8',
                rot: '#7a3f3a', rotLight: '#b3655a', rotDark: '#2c1414' }) })
    })
});
// 무대의 탐험 물체 그림(js/canvas-stage-objects.js): 한 장에 물체마다 한 칸(cell 도트), 발 자리 feet. names의 순서가 그림의 칸 순서다
// (scripts/stage-monsters/objects.cjs와 같아야 한다). 보급 상자의 은, 금 등급은 chestSilver, chestGold와 그 열린 모습이다.
const STAGE_OBJECTS = Object.freeze({
    sheet: 'assets/objects/stage/objects.png',
    /** 지형의 테마에 맞춘 그림 묶음(STAGE_BACKDROPS.biomes의 objects가 고른다): 칸과 이름 순서는 공용 그림과 같다. */
    themes: Object.freeze({ root: 'assets/objects/stage/objects-root.png' }),
    cell: 96,
    feet: Object.freeze([48, 84]),
    /** 제 그림이 따로 있는 보급 상자 등급(나무 등급은 기본 그림 chest). */
    grades: Object.freeze(['silver', 'gold']),
    names: Object.freeze(['crate', 'crateBroken', 'pot', 'potBroken', 'chest', 'chestOpen', 'chestSilver', 'chestSilverOpen',
        'chestGold', 'chestGoldOpen', 'sealed', 'sealedOpen', 'nest', 'nestSpent', 'tracks'])
});
// 무대의 소품 층(js/canvas-stage-props.js): 던파의 무대처럼 배경, 뒤쪽 띠, 바닥, 소품, 앞쪽을 겹쳐 그릴 때 방을 채우는 조각 그림.
// 한 장에 소품마다 한 칸(cell 도트), 발 자리 feet. names의 순서가 그림의 칸 순서다(scripts/stage-monsters/props.cjs와 같아야 한다).
// themes: 지형의 소품 묶음(STAGE_BACKDROPS.biomes의 props가 고른다). back, side, front = 바닥 뒤쪽 끝, 양옆 바깥, 앞쪽 바깥에 놓일
// [이름, 비중]. backGap, frontGap = 그 줄에서 소품 사이의 간격(도트, 가장 좁게와 넓게). sides = 한쪽 옆에 놓는 수.
// 지금 그림은 임시다: 제대로 그린 조각이 오면 같은 이름으로 갈아 끼운다.
const STAGE_PROPS = Object.freeze({
    cell: 128,
    feet: Object.freeze([64, 116]),
    names: Object.freeze(['rock', 'rockSmall', 'rockTall', 'rootKnot', 'stump', 'shrineStone', 'shrineFallen', 'glowcaps', 'sapPod', 'fernSmall', 'fern', 'fernBig', 'grass']),
    themes: Object.freeze({
        root: Object.freeze({
            sheet: 'assets/objects/stage/props-root.png',
            back: Object.freeze([['rock', 3], ['rockTall', 2], ['rootKnot', 3], ['stump', 2], ['shrineStone', 2], ['glowcaps', 1], ['sapPod', 1], ['fern', 2], ['grass', 2]]),
            side: Object.freeze([['rock', 2], ['rockSmall', 2], ['fern', 3], ['fernSmall', 2], ['stump', 1], ['glowcaps', 1], ['grass', 2]]),
            front: Object.freeze([['rock', 2], ['rockSmall', 2], ['fernBig', 3], ['fern', 3], ['rootKnot', 1], ['shrineFallen', 1], ['grass', 3], ['glowcaps', 1]]),
            backGap: Object.freeze([70, 170]),
            frontGap: Object.freeze([90, 210]),
            sides: 3
        })
    })
});
// 무대 조각 묶음 (js/canvas-stage-scene.js). 2026-10-11 사용자가 이미지 생성으로 만들어 온 "뿌리 성소 무대 조각"(root-stage-kit-20261011):
// 먼 배경, 뒤쪽 띠, 바닥 세 가지, 작은 소품 열, 앞쪽 소품 넷, 네 방향 문의 닫힌 모습과 열린 모습. 그림 한 장이 캐릭터 도트 하나에 1px이다.
// 수치는 모두 도트이고 방 바닥의 뒤쪽 끝(바닥선)과 왼쪽 끝에서 잰다. 묶음의 조립 화면(화면 px, 1.5배)을 도트로 옮긴 값이다.
//   far    먼 배경: 좌우로 이어 붙는 띠. bottom = 바닥선 아래로 내려오는 깊이, parallax = 카메라를 따라 움직이는 비율, shift = 띠를 미는 양.
//   back   뒤쪽 띠: 낮은 뿌리와 부서진 목질. bottom = 바닥선 아래로 내려오는 깊이. 바닥 띠와 이음매가 엇갈리게 shift만큼 민다.
//   floor  바닥: 방마다 한 가지를 고른다. top = 바닥선 위로 올라가는 높이(음수).
//   pieces 조각: 이름(= 파일 이름) → [그림 가로, 세로, 조각이 차지하는 상자의 왼쪽, 위, 가로, 세로]. 상자의 맨 아래 줄이 발 자리다.
//   rows   줄지어 놓는 규칙: names를 차례로 돌리며 from부터 gaps 간격으로, 방 끝에서 until 앞까지. drops = 발 자리의 깊이(차례로).
//          clear = 문 둘레에 비우는 반경. back 바닥 뒤쪽 끝, inner 바닥 앞쪽에 놓이는 낮은 조각, front 바닥 밖 앞쪽(캐릭터를 가린다).
//          corners = 방의 왼쪽 앞, 오른쪽 앞 구석에 하나씩 [이름, 가로 자리, 깊이].
//   doors  문: 방향 → [닫힌 그림, 열린 그림, 자리]. 뒤쪽과 앞쪽 문의 자리는 발 자리의 깊이, 좌우 문은 방 끝에서 바깥으로 나가는 거리다.
//   sideMark 열린 좌우 문의 화살표 자리(js/canvas-stage-door-marks.js).
//   fill 그림이 닿지 않는 땅의 색, sky 먼 배경 위쪽의 색, beyond 방의 옆쪽 바깥을 누르는 어둠의 세기.
// 물을 제거한 뿌리끝 성소 v5 시안 기준 조각. 캐릭터 원본과 별도 경로에 보관한다. 열린/닫힌 문은 같은 문틀 픽셀과 발 자리를 쓴다.
const STAGE_SCENES = Object.freeze({
    path: 'assets/stage-scenes/',
    biomes: Object.freeze({
        root: Object.freeze({
            dir: 'root-end-v5/', fill: '#4c3530', sky: '#241e22', beyond: 0.26,
            far: Object.freeze({ file: 'backdrop.png', width: 1536, height: 384, bottom: 19, parallax: 0.4, shift: 0 }),
            back: Object.freeze({ file: 'rear-strip.png', width: 1024, height: 192, bottom: 20, shift: -207 }),
            floor: Object.freeze({ files: Object.freeze(['floor-a.png', 'floor-b.png', 'floor-c.png']), width: 1536, height: 320, top: -24 }),
            pieces: Object.freeze({
                'rock-low': Object.freeze([96, 64, 4, 25, 88, 35]), 'root-low': Object.freeze([160, 64, 4, 17, 152, 43]),
                'rock-small': Object.freeze([64, 48, 8, 4, 47, 40]), 'rock-tall': Object.freeze([80, 112, 7, 4, 65, 104]),
                'root-stump': Object.freeze([112, 112, 4, 48, 104, 60]), 'bark-chip': Object.freeze([64, 48, 5, 25, 55, 19]),
                'root-broken': Object.freeze([96, 80, 4, 35, 88, 41]), 'mushrooms': Object.freeze([64, 48, 4, 8, 56, 36]),
                'sanctum-slab': Object.freeze([208, 128, 4, 40, 200, 84]), 'sanctum-pillar': Object.freeze([80, 112, 7, 4, 65, 104]),
                'front-bark': Object.freeze([256, 160, 4, 84, 248, 72]), 'front-root-low': Object.freeze([256, 160, 4, 97, 248, 59]),
                'front-root': Object.freeze([384, 192, 4, 17, 376, 171]), 'front-root-stone': Object.freeze([384, 192, 4, 37, 376, 151]),
                'door-rear-closed': Object.freeze([256, 240, 4, 66, 248, 170]), 'door-rear-open': Object.freeze([256, 240, 4, 66, 248, 170]),
                'door-left-closed': Object.freeze([192, 224, 4, 8, 184, 212]), 'door-left-open': Object.freeze([192, 224, 4, 8, 184, 212]),
                'door-right-closed': Object.freeze([192, 224, 12, 4, 168, 216]), 'door-right-open': Object.freeze([192, 224, 12, 4, 168, 216]),
                'door-front-closed': Object.freeze([256, 160, 4, 58, 248, 98]), 'door-front-open': Object.freeze([256, 160, 4, 58, 248, 98])
            }),
            rows: Object.freeze({
                back: Object.freeze({ names: Object.freeze(['root-low', 'sanctum-slab', 'root-broken', 'sanctum-pillar', 'root-stump', 'rock-low', 'mushrooms', 'rock-tall']),
                    from: 51, until: 65, gaps: Object.freeze([213, 271, 229]), drops: Object.freeze([4, 8, 12]), clear: 163 }),
                inner: Object.freeze({ names: Object.freeze(['bark-chip', 'rock-small', 'mushrooms']), from: 184, until: 104, gaps: Object.freeze([473]), drops: Object.freeze([188, 216]), clear: 133 }),
                front: Object.freeze({ names: Object.freeze(['front-bark', 'front-root-low']), from: 451, until: 337, gaps: Object.freeze([653, 547]), drops: Object.freeze([332]), clear: 160 }),
                corners: Object.freeze({ left: Object.freeze(['front-root-stone', 27, 327]), right: Object.freeze(['front-root', -64, 325]) })
            }),
            doors: Object.freeze({
                north: Object.freeze(['door-rear-closed', 'door-rear-open', 13]), south: Object.freeze(['door-front-closed', 'door-front-open', 293]),
                west: Object.freeze(['door-left-closed', 'door-left-open', 1]), east: Object.freeze(['door-right-closed', 'door-right-open', -1])
            }),
            // 좌우 문이 열렸을 때 문틀의 뚫린 자리에 세우는 화살표: 그림 맨 아래 줄에서 올라간 높이, 빛이 퍼지는 너비, 굵기(도트).
            sideMark: Object.freeze({ rise: 100, spread: 64, thick: 4 })
        })
    })
});
/** 무대에서 몬스터 그림을 그리는 배율(js/canvas-stage-roster.js): 외형 id의 앞머리 → 배율, 여기에 없는 외형은 1(그림의 도트 = 캐릭터의 도트).
 * 2026-10-13 사용자: "위습 크기 줄이고"(몬스터 위습). 새 위습 그림은 몸이 가로 75~108도트, 세로 60도트쯤에 머리 높이로 떠 있어
 * 주인공(가로 40도트쯤)보다 크게 보였다. 0.7배로 줄여 몸이 가로 52~76도트, 세로 42도트쯤이다. */
// 같은 날 밤 "벌 크기도 줄여줘": 새 벌 그림은 전투벌의 몸이 가로 100도트, 근위벌 142도트, 여왕 185도트로 주인공을 덮었다(검토에서도
// 주인공이 벌 밑에 묻힌다고 짚었다). 0.6배로 전투벌 60도트, 근위벌 85도트, 여왕 111도트다.
const STAGE_MONSTER_SCALE = Object.freeze({ 'wisp-': 0.7, 'hive-': 0.6 });

/** 방 단위 무대의 입구 방에 서는 이야기 NPC(js/canvas-act-title-card.js). 이야기 액트와 시련에서 그 대사의 NPC(data/story-journal.js
 * STORY_NPCS, 이름으로 찾는다)가 입구 방에 선다. 엔드게임 콘텐츠 지도에는 서지 않는다(2026-10-15 사용자: "콘텐츠 지도 입구 NPC도 빼줘",
 * 지도마다 같은 NPC가 앞질러 서 있는 게 어색했다). 누르면 그 NPC의 창(맡은 해금, 대사)이 열린다(js/content-progression-ui.js openNpc).
 * 그림은 assets/stage-npcs/<id>-idle.png(대기 6프레임 한 줄, 칸 cell, 발 feet, 머리 꼭대기 head, 프레임마다 frameMs)와
 * <id>-portrait.png(일러스트, 480×720). scale: 몸이 89도트로 주인공(97도트)보다 작아 아이처럼 보여 늘려 그린다.
 * 저장소 밖 그림이다(scripts/build-stage-npcs.cjs가 옮긴다). 그림이 없으면 NPC는 서지 않고 대사만 띠에 나온다.
 * 2026-10-15 사용자: "하켄부터 세워봐", 이어서 NPC 도트와 일러스트 다섯을 만들어 줬다. 하켄은 액트 5에서 쓰러지므로 엔드게임 자리는 없다. */
const STAGE_NPC_ART = Object.freeze({ path: 'assets/stage-npcs/', cell: 128, feet: Object.freeze([64, 112]), head: 22, scale: 1.15,
    frameMs: Object.freeze([720, 260, 460, 280, 140, 720]) });

/** 판(9×8)에서 싸우던 콘텐츠가 방 단위 무대에서 걷는 지도(2026-10-13 밤 사용자: "그거 포함해서 아틀라스도, 옮겨줘". js/content-maps.js withRooms).
 * acts 구역 종류 → 바탕으로 빌리는 액트 지도(지도 id와 어둠 색, 입구와 끝 방의 이름만 쓴다. 무대 그림은 그 구역의 지역 그림이다),
 * chainMax 한 줄 지도의 사이 방 수의 위(무리가 그보다 많으면 마지막 방들에 겹쳐 선다),
 * colonyWaves 군락지 지도 한 장이 받는 웨이브 수(다섯째마다 오는 지배체가 끝 방에 서고, 그 뒤에는 새 지도가 열린다). */
const STAGE_BOARD_ROOMS = Object.freeze({
    acts: Object.freeze({ cosmos: 10, oceanDepth: 2, beyondBoundary: 10, colony: 1, grandBreach: 8, outsideChaos: 10, woodsmanEcho: 10 }),
    chainMax: 30,
    colonyWaves: 5
});

// 정리 묶음(data/stage-characters.js, 다시 가져와 만드는 표)에 없는 주인공 동작: 직업 → 무기 자세 → 동작. 규격은 묶음과 같다(칸 128×128,
// 발바닥 줄 110, 발 가운데 63, 오른쪽을 본다). 그림은 scripts/cut-stage-hero-motion.cjs로 잘라 assets/playable/stage/에 둔다(저장소에 넣지
// 않는다). 2026-10-14 사용자가 준 전사의 찌르기(9장)와 베기(17장, 세 번 이어 베는 연속기): 베기는 휘두름 하나씩 셋으로 나눴다(0~3, 3~5,
// 6~10번. 11~16번은 6~10번을 되풀이한 그림이라 쓰지 않았다). 찌르기의 6번 프레임은 칼끝의 흰 섬광이 칸 밖으로 12점 나가 잘렸다.
// 같은 날 받은 셋째 그림(9장): 낮게 휘둘러 한 번 치고 몸을 한 바퀴 돌려 빛나는 칼로 크게 벤다(돌려베기, 타격은 마지막 8번).
const STAGE_HERO_MOTIONS = Object.freeze({
    warrior: Object.freeze({
        swordshield: Object.freeze({
            thrust: Object.freeze({ frames: 9, ms: Object.freeze([90, 90, 80, 70, 70, 80, 140, 110, 110]), hit: Object.freeze([6]), file: 'warrior/swordshield/thrust.png' }),
            slash: Object.freeze({ frames: 4, ms: Object.freeze([90, 80, 140, 110]), hit: Object.freeze([2]), file: 'warrior/swordshield/slash.png' }),
            slash2: Object.freeze({ frames: 3, ms: Object.freeze([80, 80, 140]), hit: Object.freeze([2]), file: 'warrior/swordshield/slash2.png' }),
            slash3: Object.freeze({ frames: 5, ms: Object.freeze([90, 90, 140, 110, 110]), hit: Object.freeze([2]), file: 'warrior/swordshield/slash3.png' }),
            spin: Object.freeze({ frames: 9, ms: Object.freeze([90, 80, 80, 90, 70, 70, 70, 90, 160]), hit: Object.freeze([8]), file: 'warrior/swordshield/spin.png' })
        })
    })
});
/** 처음 장면의 쓰러진 주인공이 일어나는 동작(2026-10-15 사용자가 만든 6직업 그림, scripts/build-stage-hero-rise.cjs가 옮긴다): 맨손 자세의
 * <직업>/unarmed/rise.png, 주인공 칸과 같은 규격. 0번이 쓰러진 모습(처음 850ms는 쓰러진 채 머문다), 마지막은 맨손 대기의 첫 프레임이다.
 * 쓰는 곳은 js/canvas-stage-actors.js setRise(js/opening-journey-ui.js가 정한다). */
const STAGE_HERO_RISE = Object.freeze({ file: 'unarmed/rise.png', ms: Object.freeze([850, 180, 220, 240, 260, 220, 220, 650]) });
/** 휘두르는 모양: 동작 이름 → 그 동작으로 휘두르는 스킬. 그 동작이 있는 자세에서만 쓰고(지금은 전사의 검방패), 없는 자세와 여기에 없는
 * 스킬은 보통 공격 그림(공격, 공격2 …)을 돌린다. 한 대상을 노리는 찌르는 기술은 찌르기, 휘둘러 베는 기술은 베기, 도는 기술은 돌려베기. */
const STAGE_HERO_STRIKES = Object.freeze({
    thrust: Object.freeze(['암살자의 일격', '흡혈 타격', '혈기 폭쇄']),
    slash: Object.freeze(['기본 공격', '연속 베기', '묵직한 강타', '번개 타격', '화염 참격', '지진 파쇄', '용암 강타', '공허 베기', '그림자 점멸']),
    spin: Object.freeze(['회오리바람'])
});

safeExposeData({ STAGE_HERO_MOTIONS, STAGE_HERO_RISE, STAGE_HERO_STRIKES, STAGE_VIEW, STAGE_TERRAIN, STAGE_ROOMS, STAGE_BACKDROPS, STAGE_OBJECTS, STAGE_PROPS, STAGE_SCENES, STAGE_MONSTER_SCALE, STAGE_NPC_ART, STAGE_BOARD_ROOMS });
