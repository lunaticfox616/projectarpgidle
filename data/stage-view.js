// 옆에서 보는 무대 (2026-10-11 사용자 결정: 던파식 캐릭터를 쓰고 전장도 옆에서 보는 무대로 바꾼다. 대검은 검방패 자세로 대신한다).
// 전투 규칙과 격자는 그대로 두고 그리는 법만 바꾼다: 격자의 가로는 무대의 좌우, 세로는 무대의 깊이다. 깊이 한 칸은 화면에서
// depth배로 눌려 보이고, 캐릭터와 몬스터는 옆모습으로 서서 깊이 순서대로 겹친다. 켜는 곳: 설정 battleView = 'stage'
// (지금은 시험판이라 테스트 패널에서만 켠다, js/dev-test-panel-ui.js). 캐릭터 규격은 data/stage-characters.js.
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
    shortClipFrames: 9
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
// 넓은 방으로 놓고 길을 문으로 바꾼다. 방 안의 몬스터를 모두 잡아야 문이 열린다. 시험판: 테스트 실행기의 무대 항목(주소에 stage=1)에서만 쓴다.
const STAGE_ROOMS = Object.freeze({
    /** 방 바닥의 가로 칸 수: 지도에 적힌 방의 큰 쪽 반경(0~4)에 따라. 입구 방과 보스 방은 따로 정한다. 모두 홀수(가운데 칸이 있다). */
    widthByRadius: Object.freeze([9, 9, 11, 13, 15]),
    entryWidth: 9,
    bossWidth: 15,
    /** 방 하나가 차지하는 가로 자리: 가장 넓은 방의 너비. */
    slot: 15,
    /** 방 놓는 법의 판 번호: 탐험 기록(run.rooms)에 적힌다. 방 크기나 자리를 바꾸면 올린다(옛 번호의 탐험은 불러올 때 버리고 다시 연다). */
    version: 3,
    /** 깊이 칸 수의 바탕: 여기에 덧칸(grow.deep)이 붙는다. */
    depth: 5,
    /** 방을 넓히는 덧칸(사용자 2026-10-11: "좀 넓게 만들어봐 크기조절도 (위아래랑 양옆 둘다)"): 모든 방의 가로와 깊이에 더한다.
     * 바탕값이 grow이고 테스트 패널에서 wideSteps, deepSteps 가운데 고를 수 있다(홀수 크기를 지키려고 두 칸씩이다).
     * 고른 값은 탐험 기록의 열쇠 "판:가로 덧칸:깊이 덧칸"(run.rooms)에 적혀 그 탐험이 끝날 때까지 그대로다. */
    grow: Object.freeze({ wide: 6, deep: 2 }),
    wideSteps: Object.freeze([0, 2, 4, 6, 8, 10]),
    deepSteps: Object.freeze([0, 2, 4]),
    /** 방 사이를 띄우는 칸 수: 경계하는 무리의 귀(12칸)와 튀는 피해(12칸)가 옆 방에 닿지 않게 그보다 넓다. */
    gap: 16,
    /** 방 위쪽의 벽 칸 수(뒷벽이 서는 자리)와 아래쪽 여백. */
    top: 5,
    bottom: 3,
    /** 방에 들어서면 방 안을 모두 보고 방 안의 몬스터가 모두 알아챈다: 이 반경은 어느 방보다도 크기만 하면 된다. */
    reach: 40,
    /** 방 그림에 함께 담는 둘레의 벽 칸 수(좌우, 위, 아래). openFrame: 배경 그림을 쓰는 방(벽이 없어 바닥과 길이 화면 끝까지 간다). */
    frame: Object.freeze({ side: 3, top: 5, bottom: 2 }),
    openFrame: Object.freeze({ side: 7, top: 6, bottom: 7 }),
    /** 배경 그림을 쓰는 방에서 바닥의 앞쪽 끝이 놓이는 세로 자리(화면 높이의 비율): 그 아래는 HUD가 덮는다. 좁은 화면(휴대폰)은 narrow. */
    floorBottom: Object.freeze({ wide: 0.745, narrow: 0.6 }),
    /** 방을 화면 기준 줄보다 위로 올리는 칸 수의 상한(깊이 칸): 화면 아래쪽을 덮는 HUD에서 앞쪽 문을 꺼낸다. */
    lift: 1.25,
    /** 문을 지난 뒤 화면이 어둠에서 밝아지는 시간(ms). */
    fadeMs: 280,
    /** 방 단위 탐험에서 주인공이 걷는 빠르기의 배수(2026-10-11 사용자: "기본 이동속도를 지금보다 50% 정도 빠르게"): 방이 넓어져 한 칸씩
     * 걷는 시간이 길게 느껴졌다. 방 단위 탐험(run.rooms)에만 곱하므로 이어진 지도의 탐험과 그 계산은 그대로다. */
    pace: 1.5,
    /** 방마다 더 서는 무리(2026-10-13 사용자: "한 방에 몬스터 한무리~1.5무리 정도 더 나오게"): always는 늘 더 서는 수, 하나 더는
     * chance의 확률로 선다. 방 가운데의 원래 무리 양옆으로, 방 반너비의 spread 자리에 선다. 정예는 원래 무리에만 있다. */
    extraPacks: Object.freeze({ always: 1, chance: 0.5, spread: 0.58 }),
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
safeExposeData({ STAGE_VIEW, STAGE_TERRAIN, STAGE_ROOMS, STAGE_BACKDROPS, STAGE_OBJECTS, STAGE_PROPS, STAGE_SCENES });
