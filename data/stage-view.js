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
    /** 깊이 칸 수: 보통 5, 넓은 방(지도에 적힌 반경이 양쪽 다 3 이상)과 보스 방은 7. */
    depth: 5,
    deepDepth: 7,
    /** 방 사이를 띄우는 칸 수: 경계하는 무리의 귀(12칸)와 튀는 피해(12칸)가 옆 방에 닿지 않게 그보다 넓다. */
    gap: 16,
    /** 방 위쪽의 벽 칸 수(뒷벽이 서는 자리)와 아래쪽 여백. */
    top: 5,
    bottom: 3,
    /** 방에 들어서면 방 안을 모두 보고 방 안의 몬스터가 모두 알아챈다: 이 반경은 어느 방보다도 크기만 하면 된다. */
    reach: 40,
    /** 방 그림에 함께 담는 둘레의 벽 칸 수(좌우, 위, 아래). */
    frame: Object.freeze({ side: 3, top: 5, bottom: 2 }),
    /** 방을 화면 기준 줄보다 위로 올리는 칸 수의 상한(깊이 칸): 화면 아래쪽을 덮는 HUD에서 앞쪽 문을 꺼낸다. */
    lift: 1.25,
    /** 문을 지난 뒤 화면이 어둠에서 밝아지는 시간(ms). */
    fadeMs: 280
});
safeExposeData({ STAGE_VIEW, STAGE_TERRAIN, STAGE_ROOMS });
