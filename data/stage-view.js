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
safeExposeData({ STAGE_VIEW });
