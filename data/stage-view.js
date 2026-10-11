// 옆에서 보는 무대 (2026-10-11 사용자 결정: 던파식 캐릭터를 쓰고 전장도 옆에서 보는 무대로 바꾼다. 대검은 검방패 자세로 대신한다).
// 전투 규칙과 격자는 그대로 두고 그리는 법만 바꾼다: 격자의 가로는 무대의 좌우, 세로는 무대의 깊이다. 깊이 한 칸은 화면에서
// depth배로 눌려 보이고, 캐릭터와 몬스터는 옆모습으로 서서 깊이 순서대로 겹친다. 켜는 곳: 설정 battleView = 'stage'
// (지금은 시험판이라 테스트 패널에서만 켠다, js/dev-test-panel-ui.js). 캐릭터 규격은 data/stage-characters.js.
const STAGE_VIEW = Object.freeze({
    /** 깊이 한 칸의 화면 높이 ÷ 가로 한 칸의 화면 너비. */
    depth: 0.5,
    /** 탐험 지도에서 가로로 적어도 이만큼의 칸이 보이게 칸 크기를 고른다(사거리 7칸 스킬의 대상이 화면 안에 든다). 좁은 화면(휴대폰)은 narrow. */
    minColumns: Object.freeze({ wide: 15, narrow: 8, narrowBelow: 700 }),
    /** 주인공이 서는 세로 자리(화면 높이의 비율). 아래쪽은 HUD가 덮으므로 가운데보다 조금 위다. */
    anchorY: 0.46,
    /** 칸 너비가 이 값일 때 캐릭터 도트 하나가 화면 1px이다. 칸은 캐릭터 도트가 캔버스 픽셀의 정수배가 되는 크기로만 잡는다. */
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
    version: 2,
    /** 깊이 칸 수: 어느 방이나 5(화면 높이의 3할쯤). 뒤쪽에 배경 그림이 설 자리를 남긴다. */
    depth: 5,
    /** 방 사이를 띄우는 칸 수: 경계하는 무리의 귀(12칸)와 튀는 피해(12칸)가 옆 방에 닿지 않게 그보다 넓다. */
    gap: 16,
    /** 방 위쪽의 벽 칸 수(뒷벽이 서는 자리)와 아래쪽 여백. */
    top: 5,
    bottom: 3,
    /** 방에 들어서면 방 안을 모두 보고 방 안의 몬스터가 모두 알아챈다: 이 반경은 어느 방보다도 크기만 하면 된다. */
    reach: 40,
    /** 방 그림에 함께 담는 둘레의 벽 칸 수(좌우, 위, 아래). openFrame: 배경 그림을 쓰는 방(벽이 없어 바닥과 길이 화면 끝까지 간다). */
    frame: Object.freeze({ side: 3, top: 5, bottom: 2 }),
    openFrame: Object.freeze({ side: 7, top: 4, bottom: 7 }),
    /** 배경 그림을 쓰는 방에서 바닥의 앞쪽 끝이 놓이는 세로 자리(화면 높이의 비율): 그 아래는 HUD가 덮는다. 좁은 화면(휴대폰)은 narrow. */
    floorBottom: Object.freeze({ wide: 0.76, narrow: 0.6 }),
    /** 방을 화면 기준 줄보다 위로 올리는 칸 수의 상한(깊이 칸): 화면 아래쪽을 덮는 HUD에서 앞쪽 문을 꺼낸다. */
    lift: 1.25,
    /** 문을 지난 뒤 화면이 어둠에서 밝아지는 시간(ms). */
    fadeMs: 280
});
// 방 단위 무대의 배경 그림 (2026-10-11 사용자: "바닥이랑 오브젝트만 놔두고, 벽 대신 이런 느낌의 배경으로", js/canvas-stage-backdrop.js).
// 지형마다 그림 한 장: 위쪽은 배경, 아래쪽은 바닥이 놓일 빈 띠다. ground = 그림에서 바닥이 시작하는 줄(그림 높이의 비율).
// 그 지형의 방은 벽돌 벽 없이 바닥과 길만 그린다: floor 바닥 판석, kerb 바닥 옆 턱, earth 바닥 밖의 어두운 땅(그림의 빈 띠 색),
// rim과 hollow 뒷문이 되는 굴의 테와 속, moss 바닥 뒤쪽 끝에 번지는 이끼. 그림이 없는 지형과 그림 파일이 없는 판은 벽돌 뒷벽 그대로다.
// 그림은 캐릭터 그림과 같은 폴더에 두고 아직 저장소에 넣지 않는다(사용자가 준 그림: 써도 되는지 확인 뒤에 넣는다).
const STAGE_BACKDROPS = Object.freeze({
    path: 'assets/playable/stage/backdrops/',
    /** 방이 화면보다 넓어 카메라가 움직일 때 배경이 따라 움직이는 비율(바닥보다 느리게). */
    parallax: 0.3,
    biomes: Object.freeze({
        root: Object.freeze({ file: 'root.webp', ground: 0.5996, floor: '#4d4035', kerb: '#2f2620', earth: '#1e1a17', rim: '#6f5e4c', hollow: '#0e0b09', moss: '#6e5a2a' })
    })
});
// 무대의 탐험 물체 그림(js/canvas-stage-objects.js): 한 장에 물체마다 한 칸(cell 도트), 발 자리 feet. names의 순서가 그림의 칸 순서다
// (scripts/stage-monsters/objects.cjs와 같아야 한다). 보급 상자의 은, 금 등급은 chestSilver, chestGold와 그 열린 모습이다.
const STAGE_OBJECTS = Object.freeze({
    sheet: 'assets/objects/stage/objects.png',
    cell: 96,
    feet: Object.freeze([48, 84]),
    /** 제 그림이 따로 있는 보급 상자 등급(나무 등급은 기본 그림 chest). */
    grades: Object.freeze(['silver', 'gold']),
    names: Object.freeze(['crate', 'crateBroken', 'pot', 'potBroken', 'chest', 'chestOpen', 'chestSilver', 'chestSilverOpen',
        'chestGold', 'chestGoldOpen', 'sealed', 'sealedOpen', 'nest', 'nestSpent', 'tracks'])
});
safeExposeData({ STAGE_VIEW, STAGE_TERRAIN, STAGE_ROOMS, STAGE_BACKDROPS, STAGE_OBJECTS });
