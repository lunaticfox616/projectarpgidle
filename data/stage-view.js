// GENERATED from modules/data/stage-view.mjs. Edit the ESM source; run npm run build:modules.
(() => {
  // modules/data/stage-view.mjs
  var STAGE_VIEW = Object.freeze({
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
    /** 2026-11-02 사용자 "캐릭터랑 칸이랑 맵 크기랑 동기화": 칸 너비가 어중간하면 방 그림의 2px 도트가 캔버스 픽셀에 떨어지지 않아 옆 색과 섞인다. PC 창은 칸 너비를
     * 캔버스 픽셀로 canvasPx의 배수(64, 96, 128)에서만 골라 칸, 캐릭터, 방 그림이 함께 옮겨 간다. 2026-10-11의 이어지는 칸과 달리 가로 1600 이상이면 전체화면과 같은
     * 크기로 보이는 칸만 줄고, 그보다 좁으면 3분의 2 크기가 된다. 고른 칸에서 maxColumns칸(방 그림 1672도트의 폭)보다 많이 보이면 그림이 창을 덮지 못해 양옆이 비므로
     * 그런 창(낮고 넓은 창)과 휴대폰, 태블릿 세로는 이어지는 칸 그대로다.
     * 2026-11-04 사용자 "1픽셀로 간다음": 1.5px 도트는 한 도트 걸러 옆 색과 섞여 흐려 보였다. 이제 칸은 64의 배수(도트 하나가 캔버스 픽셀의 정수배)이고,
     * 보이는 칸이 maxColumns를 넘지 않는 가장 작은 칸을 고른다. 1080p(가로 1920)는 도트 1px에 30칸이 보이고, 방 그림보다 넓은 양옆 124px은 어둡게 빈다. */
    tileSteps: Object.freeze({ canvasPx: 64, maxColumns: 32 }),
    /** 2026-10-13 (가로로 긴 창 2560×720에서 방의 뒤쪽 줄이 화면 위로 나가 몬스터의 머리와 체력바가 잘렸다): 칸 크기는 화면 높이도 따른다.
     * 방 바닥의 뒤쪽 끝 위로 dots도트(뒤쪽 줄에 선 몬스터의 키와 체력바, 이름표)와 화면 위쪽의 top px(구역 이름과 진행 막대의 줄)이
     * 남는 가장 큰 칸까지만 커진다. 그보다 작은 창에서는 전처럼 minDot이 아래 끝이다. */
    headroom: Object.freeze({ dots: 104, top: 44 }),
    /** 주인공이 서는 세로 자리(화면 높이의 비율). 아래쪽은 HUD가 덮으므로 가운데보다 조금 위다. */
    anchorY: 0.46,
    /** 칸 너비가 이 값일 때 캐릭터 도트 하나가 화면 1px이다. */
    heroTile: 64,
    /** 무기 자세 id (data/stage-characters.js의 무기 id와 같다). 낀 무기의 대분류 → 자세는 data/skills.js SKILL_RUNE_STANCE_BY_CATEGORY. */
    stances: Object.freeze(["unarmed", "greatsword", "sword", "bow", "orb", "flask", "censer"]),
    /** 준비 시간(휘두르기 시작 → 타격)이 이보다 짧으면 9장 이하의 짧은 공격 그림만 쓴다: 17장짜리를 그 안에 넣으면 깜빡이기만 한다. */
    shortWindupMs: 320,
    shortClipFrames: 9,
    /** 휘두름 사이가 이보다 길면 연속기를 처음 휘두름부터 다시 한다(쉬었다 다시 치면 준비 자세에서 시작한다). */
    comboResetMs: 1500,
    /** 전투가 휘두름에 적는 자세 이름(js/combat.js, js/skill-gem-casts.js) → 무대 주인공의 동작(2026-10-20 스킬룬 전달본 v42의 이동 모션):
     * kickoff 사라지기 전에 박차고 나가기(암살, 그림자 점멸: 한손검 이동), pull 끌려가는 동안 밧줄 당기기(작살화살: 활 이동). */
    poseMotions: Object.freeze({ kickoff: "move", pull: "move" }),
    /** 룬이 동작 표(data/stage-skill-vfx.js motions, 전달본에서 만드는 표)와 다른 동작을 쓰는 자세: 룬 → 자세 → 동작.
     * 빙결 파열창은 주문 룬이지만 창을 날리므로 활을 들면 다른 원소 창처럼 활을 쏜다(2026-11-02 사용자).
     * 연발 사격은 표의 연타사격(13장, 10-20 원본 그대로) 대신 활 공격(개선본)을 쓴다(2026-11-09 사용자: "개선된 활 공격으로"). 휘두름 효과는
     * 준비 시간(투사체 400ms)만 살아 있어 연타사격은 첫 발사까지 7장만 나오고 남은 세 발은 대기 자세에서 날아갔다(들썩들썩 제보). 화살은
     * 전처럼 네 번에 나눠 나가고 그림만 한 번 당겨 쏜다. */
    runeStanceMotions: Object.freeze({ "빙결 파열창": Object.freeze({ bow: "attack" }), "연발 사격": Object.freeze({ bow: "attack" }) }),
    /** 그림자 점멸이 박차고 나가는 시간(ms): 그동안 그림은 떠난 칸에 있고 휘두름 앞부분에 이동 동작을 그린 뒤 사라져 닿는 칸에 나타난다. */
    kickoffMs: 200
  });
  var STAGE_ROOMS = Object.freeze({
    /** 방 바닥의 가로 칸 수(덧칸을 붙이기 전): 방의 구실에 따라. 값을 여럿 적으면 놓인 자리에 따라 번갈아 쓴다. 모두 홀수(가운데 칸이 있다).
     * 2026-10-13 사용자: "보스방 크기를 기본으로 해주고 오히려 보스방은 좀 더 작게" → 보통 방 15, 보스 방 11.
     * 같은 날 저녁, 해 본 뒤: "기본 맵 크기를 보스방이랑 같은크기로 하자" → 모든 방이 보스 방의 너비(11)다. 덧칸 10을 더하면 21칸이다. */
    widths: Object.freeze({ entry: 11, optional: 11, battle: 11, elite: 11, boss: 11 }),
    /** 방 하나가 차지하는 가로 자리: 가장 넓은 방의 너비. */
    slot: 11,
    /** 방 놓는 법의 판 번호: 탐험 기록(run.rooms)에 적힌다. 방 크기나 자리를 바꾸면 올린다(옛 번호의 탐험은 불러올 때 버리고 다시 연다).
     * 4 = 방 놓임새(data/stage-room-plans.js: 액트는 프리셋 넷, 그 밖의 구역은 준 랜덤)와 구역마다의 무대 그림. 5 = 방의 바탕 크기를 키움.
     * 6 = 보통 방을 보스 방의 크기로, 보스 방은 더 작게. 7 = 모든 방을 그 작아진 보스 방의 크기로.
     * 8 = 방마다 생김새(shapes)와 문 자리(doorSpots)가 다르다. 9 = 보스 방은 좌우 문으로만 들어간다(준 랜덤의 마지막 걸음, 한 줄 지도). */
    version: 9,
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
     * (js/combat-encounters.js stageRoomArranger). spots는 [가로, 깊이] 자리로, 방 가운데가 0이고 ±1이 무리가 설 수 있는 끝이다. 가로의 +는 들어온 문의
     * 맞은편이다(문이 위아래에 있으면 반반). 첫 자리가 방의 원래 무리, 그다음이 덧무리의 자리다. 한 줄 지도의 방도 이 자리를 쓴다.
     * centre 가운데와 양옆(전의 자리), wings 양 날개(가운데가 빈다), far 들어온 쪽의 맞은편에 몰려 있다, back 뒤쪽 줄, front 앞쪽 줄,
     * corners 구석들, split 앞뒤로 갈라 선다. */
    layouts: Object.freeze([
      Object.freeze({ id: "centre", weight: 3, spots: Object.freeze([[0, 0], [0.6, -0.5], [-0.6, 0.5]]) }),
      Object.freeze({ id: "wings", weight: 2, spots: Object.freeze([[0.7, 0], [-0.7, 0], [0, 1]]) }),
      Object.freeze({ id: "far", weight: 3, spots: Object.freeze([[0.75, -0.5], [0.75, 1], [0.2, 0]]) }),
      Object.freeze({ id: "back", weight: 2, spots: Object.freeze([[0, -1], [0.7, -1], [-0.7, -1]]) }),
      Object.freeze({ id: "front", weight: 1, spots: Object.freeze([[0.1, 1], [0.75, 0.5], [-0.6, 1]]) }),
      Object.freeze({ id: "corners", weight: 2, spots: Object.freeze([[0.85, -1], [-0.85, 1], [0.85, 1]]) }),
      Object.freeze({ id: "split", weight: 2, spots: Object.freeze([[0.3, -1], [-0.3, 1], [0.8, 0]]) })
    ]),
    /** 무리가 서는 꼴과 무게: cluster 뭉쳐서(전의 꼴), line 가로 한 줄, column 세로 줄, loose 한 칸씩 띄어서. 무리마다 따로 고른다. */
    packShapes: Object.freeze([Object.freeze({ id: "cluster", weight: 4 }), Object.freeze({ id: "line", weight: 2 }), Object.freeze({ id: "column", weight: 1 }), Object.freeze({ id: "loose", weight: 3 })]),
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
    /** 방 그림에 함께 담는 둘레의 칸 수(좌우, 위, 아래): 바닥과 길이 화면 끝까지 간다. */
    frame: Object.freeze({ side: 7, top: 6, bottom: 7 }),
    /** 배경 그림을 쓰는 방에서 바닥의 앞쪽 끝이 놓이는 세로 자리(화면 높이의 비율): 그 아래는 HUD가 덮는다. 좁고 낮은 전장(가로 휴대폰)은 narrow, 왼쪽 HUD 배치는 sideHud. */
    floorBottom: Object.freeze({ wide: 0.745, narrow: 0.6, sideHud: 0.85 }),
    /** 왼쪽 HUD 배치에서는 하단 HUD 공제 대신 최소 타일 한 칸과 이 여유만 남긴다. 타일 크기는 기존 규칙을 유지한다. */
    sideHudGap: 8,
    /** 넓은 화면에서 바닥의 앞쪽 끝이 전장의 아래 끝에서 이만큼(전장의 px)은 떨어져 있어야 한다: 하단 HUD(.player-hud)의 높이다(어느 창
     * 크기에서나 244px). 2026-10-13 돌려 본 결과: 높이 864 화면에서 앞쪽 문이 가운데 구슬(미니맵)에 가려졌다. */
    hudClear: 244,
    /** 휴대폰과 태블릿 세로(세로로 긴 전장, 폭 phoneWidth px까지)에서 바닥의 앞쪽 끝이 전장의 아래 끝에서 떨어지는 거리(px): 접힌 전투
     * 기록과 하단 HUD(둘이 137px)를 비키고 앞쪽 문이 드러나는 만큼. 2026-10-22 HUD를 한 줄로 줄이며 높이 비율(휴대폰 0.6, 태블릿 0.73) 대신:
     * 전장 아래가 어두운 바닥이었다. 그림이 위끝에 닿지 않으면 칸이 커진다(js/canvas-stage-scene.js coverTile). */
    phoneClear: 160,
    /** 하단 HUD가 휴대폰 배치(전장 아래를 덮는 한 줄 판)인 가장 넓은 전장 폭(px): CSS의 max-width: 1080px와 같다. */
    phoneWidth: 1080,
    /** 세로 화면의 전투 탭(2026-11-03 사용자: 전투 화면과 생명력 HUD를 위로, 아래 빈 공간에 전투 기록): 전장, HUD, 펼친 전투 기록이 위아래로
     * 쌓인다(css/themes/rift-stage.css). 전장은 가로로 columns칸을 다 보이고, 바닥의 앞쪽 끝은 전장 아래 끝에서 clear px 위다: 전장 아래쪽에
     * 띠 없이 겹친 생명력 · 미니맵 · 경험치 HUD 위(2026-11-03 사용자). */
    stacked: Object.freeze({ columns: 20, clear: 58 }),
    /** 바닥의 앞쪽 끝 아래(걸어갈 수 없는 자리)를 덮는 어둠 (2026-10-14 사용자: "바닥 중 아래쪽의 못 가는 영역은 약간 그라데이션으로
     * 어둡게"). 앞쪽 끝에서 아래로 띠(bandDots 도트)마다 한 단씩 짙어져 bands번째 띠부터 alpha에 머문다. */
    frontShade: Object.freeze({ colour: "#06050a", alpha: 0.6, bands: 12, bandDots: 4 }),
    /** 혼돈 층계의 깊이 안개(2026-10-26 사용자: "혼돈 1~10의 배경은 숫자가 높아질수록 더 혼돈스럽게 살짝씩만"): 혼돈 2부터 floors층까지
     * 고르게 짙어져 floors층에서 화면 전체에 colour를 wash만큼, 가장자리에 edge만큼 더 얹는다. 혼돈 1은 그림 그대로다. */
    chaosHaze: Object.freeze({ colour: "#3a0b26", wash: 0.24, edge: 0.5, floors: 20 }),
    /** 문을 지난 뒤 화면이 어둠에서 밝아지는 시간(ms). */
    fadeMs: 280,
    /** 문의 회백색 뿌리 봉인(2026-10-21 사용자가 만든 그림): 앞뒤 문은 정면(front, 풀리면 뿌리가 갈라진 아치가 남는다), 좌우 문은 옆에서 본
     * 그림(side, 바닥으로 눕는다. 그림의 앞이 화면 왼쪽을 보므로 서쪽 문에서는 좌우를 뒤집는다). 시트마다 256도트 칸 9장이 가로로 있고 첫
     * 장이 닫힌 모습이다. ends = 앞의 여덟 장이 끝나는 시각(ms, 잠금이 풀릴 때 한 번), anchorY = 칸 위에서 잰 발 자리, half = 주인공이 그
     * 뒤에 서면 반투명해지는 가로 반폭, heights = 장마다 그림의 높이(모두 도트). 낱장과 출처는 같은 폴더의 seal.json. */
    rootSeal: Object.freeze({
      regionPath: "assets/stage-scenes/root-seal-v3/regions/",
      version: "environment-20261106",
      ends: Object.freeze([80, 160, 240, 320, 400, 480, 560, 640]),
      front: Object.freeze({
        file: "assets/stage-scenes/root-seal-v3/front.png",
        width: 256,
        height: 256,
        anchorY: 238,
        half: 116,
        heights: Object.freeze([187, 187, 187, 187, 187, 187, 187, 187, 187])
      }),
      side: Object.freeze({
        file: "assets/stage-scenes/root-seal-v3/side.png",
        width: 256,
        height: 256,
        anchorY: 241,
        half: 97,
        heights: Object.freeze([228, 199, 163, 156, 127, 99, 82, 65, 50])
      })
    }),
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
  var STAGE_OBJECTS = Object.freeze({
    version: "environment-20261106",
    sheet: "assets/objects/stage/objects.png",
    /** 지형의 테마에 맞춘 그림 묶음: biomes가 지형 → 테마를 고르고 themes가 그 그림이다. 칸과 이름 순서는 공용 그림과 같다. 없는 지형은 공용 그림. */
    biomes: Object.freeze({ root: "root" }),
    themes: Object.freeze({ root: "assets/objects/stage/objects-root.png" }),
    cell: 96,
    feet: Object.freeze([48, 84]),
    /** 제 그림으로 그리는 보급 상자 등급(나무 등급은 기본 그림 chest). 은빛은 나무 상자 그림에 테로만 읽힌다(js/canvas-exploration-objects.js):
     * 2026-10-17 사용자 "은빛이라기 보단 상자가 뿌옇게 되어있으니 테두리만 은은하게 더 강조". chestSilver 칸은 그림에 남아 있다. */
    grades: Object.freeze(["gold"]),
    names: Object.freeze([
      "crate",
      "crateBroken",
      "pot",
      "potBroken",
      "chest",
      "chestOpen",
      "chestSilver",
      "chestSilverOpen",
      "chestGold",
      "chestGoldOpen",
      "sealed",
      "sealedOpen",
      "nest",
      "nestSpent",
      "tracks"
    ])
  });
  var STAGE_STORY = Object.freeze({
    pieces: Object.freeze({
      // 2026-11-06: 보스방 뒤쪽에서 떠 있는 막대처럼 보이던 액트 2·4 수액관 배치를 제거했다. 전투·이야기 진행은 그대로다.
      // 액트 5: "거대한 받침뿌리들을 맞물렸고, 무너진 중정으로 직행하는 보랏빛 다리를 놓아주었습니다". 보스가 쓰러지면 뿌리가 뻗어 다리가 된다.
      5: Object.freeze({ clip: "haken-bridge", after: 0, hidden: true, scale: 1, depth: 4 }),
      // 액트 9: "고치를 지키던 접목의 어머니가 쓰러지자, 고치의 외피에 금이 가며". 갈라지고 빈 고치가 된다.
      9: Object.freeze({ clip: "mother-cocoon", after: 0, scale: 1, depth: 2 })
    }),
    objects: Object.freeze({
      themes: Object.freeze({ 1: "root", 2: "court", 3: "root", 4: "root", 5: "root", 6: "court", 7: "canopy", 8: "canopy", 9: "canopy", 10: "canopy" }),
      names: Object.freeze({
        crate: Object.freeze(["wood-crate", 0]),
        crateBroken: Object.freeze(["wood-crate", 1]),
        sealed: Object.freeze(["sealed-chest", 0]),
        sealedOpen: Object.freeze(["sealed-chest", 1]),
        nest: Object.freeze(["egg-nest", 0]),
        nestSpent: Object.freeze(["egg-nest", 1])
      }),
      scale: 0.6
    })
  });
  var STAGE_SCENES = Object.freeze({
    version: "environment-20261106",
    path: "assets/stage-scenes/",
    biomes: Object.freeze({
      root: Object.freeze({
        dir: "root-end-v5/",
        fill: "#644241",
        sky: "#644d45",
        beyond: 0.26,
        far: Object.freeze({
          file: "backdrop.png",
          rooms: Object.freeze({ elite: "backdrop-elite.png", boss: "backdrop-boss.png" }),
          width: 1536,
          height: 384,
          bottom: 19,
          parallax: 0.4,
          shift: 0
        }),
        back: Object.freeze({ file: "rear-strip.png", width: 1024, height: 192, bottom: 20, shift: -207 }),
        floor: Object.freeze({ files: Object.freeze(["floor-a.png", "floor-b.png", "floor-c.png"]), width: 1536, height: 320, top: -24 }),
        terraces: Object.freeze({
          files: Object.freeze(["terrace-banks", "terrace-pools", "terrace-flow"]),
          sides: Object.freeze(["", "-left", "-right"]),
          width: 1536,
          height: 384,
          top: -24
        }),
        pieces: Object.freeze({ "boss-object": Object.freeze([320, 320, 60, 141, 200, 129]) }),
        boss: Object.freeze({ name: "boss-object", drop: -19 }),
        doors: Object.freeze({ north: 13, south: 293, west: 1, east: -1 })
      })
    })
  });
  var STAGE_MONSTER_SCALE = Object.freeze({
    "wisp-": 0.7,
    "hive-": 0.6,
    "deacon-": 1.2,
    apex_gardener: 1.4,
    apex_archbishop: 1.4,
    apex_weaver: 1.2,
    apex_compost: 1.2,
    bossAct4_1: 1.2,
    s2_boss_flame: 1.15,
    s2_boss_frost: 1.3,
    s2_boss_storm: 1.2,
    "atlas-roots-4": 1.2,
    "atlas-trunk-1": 1.2,
    "atlas-garden-0": 1.4,
    "atlas-garden-3": 1.15,
    "atlas-sanctum-1": 1.3,
    "atlas-sanctum-2": 1.4,
    rival_overheat: 1.25,
    rival_dull: 1.4,
    rival_glutton: 1.2,
    rival_afterimage: 1.4,
    rival_backedge: 1.15,
    rival_masterwork: 1.1
  });
  var STAGE_INKED_LOOKS = Object.freeze([
    "league_nursery",
    "pinnacle_leviathan",
    "atlas-sanctum-7",
    "bossAct10_2",
    "apex_gardener",
    "s2_boss_frost",
    "pinnacle_sky",
    "atlas-trunk-8",
    "atlas-garden-8",
    "breach-reflux"
  ]);
  var STAGE_BOSS_REVIVAL = Object.freeze({ bosses: Object.freeze(["gardener_immortal"]), fillMs: 1400 });
  var STAGE_NPC_ART = Object.freeze({
    path: "assets/stage-npcs/",
    version: "20261102-1",
    cell: 160,
    feet: Object.freeze([80, 144]),
    head: 24,
    scale: 1,
    frameMs: Object.freeze([260, 460, 280, 140, 720])
  });
  var STAGE_BOARD_ROOMS = Object.freeze({
    acts: Object.freeze({ cosmos: 10, oceanDepth: 2, beyondBoundary: 10, colony: 1, grandBreach: 8, outsideChaos: 10, woodsmanEcho: 10 }),
    chainMax: 30,
    colonyWaves: 5
  });
  var STAGE_HERO_RISE = Object.freeze({ file: "unarmed/rise.png", ms: Object.freeze([850, 170, 190, 210, 230, 240, 220, 200, 650]) });
  var STAGE_OCEAN = Object.freeze({
    path: "assets/stage-scenes/ocean/",
    bands: Object.freeze({
      "ocean-shallow": Object.freeze({ light: "light-shallow", dust: "dust-sand", shade: null, bright: true }),
      ocean: Object.freeze({ light: "light-twilight", dust: "dust-sand-twilight", shade: null, bright: false }),
      "ocean-lightless": Object.freeze({ light: null, dust: "dust-mud", shade: "rgba(6,14,34,0.5)", bright: false }),
      "ocean-trench": Object.freeze({ light: null, dust: "dust-mud", shade: "rgba(4,10,24,0.55)", bright: false })
    }),
    bubbles: Object.freeze({ file: "bubbles-hero", cell: Object.freeze([32, 64]), frames: 8, frameMs: 125, everyMs: 4200, headDots: 76 }),
    dust: Object.freeze({
      cell: Object.freeze([64, 32]),
      frames: 6,
      frameMs: 80,
      feet: Object.freeze({ "dust-sand": Object.freeze([32, 31]), "dust-sand-twilight": Object.freeze([32, 31]), "dust-mud": Object.freeze([32, 29]) })
    }),
    air: Object.freeze({ file: "air-column", cell: Object.freeze([64, 192]), frames: 8, frameMs: 125, feet: Object.freeze([32, 190]) }),
    drift: Object.freeze([
      Object.freeze({ file: "drift-far", size: Object.freeze([1280, 720]), flow: Object.freeze([-5, -8]), alpha: 0.7, front: false }),
      Object.freeze({ file: "drift-near", size: Object.freeze([1280, 720]), flow: Object.freeze([-11, -18]), alpha: 0.85, front: true })
    ]),
    lift: Object.freeze({ closed: "ocean-lift-closed", open: "ocean-lift-open", size: Object.freeze([160, 240]), feet: Object.freeze([80, 236]), below: 12 })
  });

  // modules/data/stage-view.mjs:classic
  Object.assign(globalThis, { STAGE_VIEW, STAGE_ROOMS, STAGE_OBJECTS, STAGE_STORY, STAGE_SCENES, STAGE_MONSTER_SCALE, STAGE_INKED_LOOKS, STAGE_BOSS_REVIVAL, STAGE_NPC_ART, STAGE_BOARD_ROOMS, STAGE_HERO_RISE, STAGE_OCEAN });
  if (typeof safeExposeData === "function") safeExposeData({ STAGE_VIEW, STAGE_ROOMS, STAGE_OBJECTS, STAGE_STORY, STAGE_SCENES, STAGE_MONSTER_SCALE, STAGE_INKED_LOOKS, STAGE_BOSS_REVIVAL, STAGE_NPC_ART, STAGE_BOARD_ROOMS, STAGE_HERO_RISE, STAGE_OCEAN });
})();
