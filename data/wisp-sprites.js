// 속성 위습 도트 애니메이션(인계: rignin-elemental-wisps-idle-attack-v1.zip, elemental-wisps-animations-v1).
// 속성마다 대기·공격 시트 한 장씩: 행 = 위·아래·왼쪽·오른쪽, 열 = 시간순, 칸 48×48(16도트 칸 셋 폭), 기준점은 칸 가운데.
// 대기 4프레임 반복, 공격 6프레임 1회 — 타격은 네 번째 프레임(0부터 3)에 들어서는 270ms.
const WISP_SPRITE_FRAME = 48;
const WISP_SPRITE_DIRECTIONS = Object.freeze(['up', 'down', 'left', 'right']);
const WISP_SPRITE_CLIPS = Object.freeze({
    idle: Object.freeze({ frames: 4, durationsMs: Object.freeze([220, 180, 220, 180]), loop: true }),
    attack: Object.freeze({ frames: 6, durationsMs: Object.freeze([100, 90, 80, 70, 110, 150]), loop: false, impactFrame: 3 })
});
const WISP_SPRITE_SHEETS = Object.freeze({
    fire: Object.freeze({ name: '불씨 위습', idle: 'assets/enemies/wisps/elemental/fire-idle.png', attack: 'assets/enemies/wisps/elemental/fire-attack.png' }),
    ice: Object.freeze({ name: '서리날개 위습', idle: 'assets/enemies/wisps/elemental/ice-idle.png', attack: 'assets/enemies/wisps/elemental/ice-attack.png' }),
    lightning: Object.freeze({ name: '전광 위습', idle: 'assets/enemies/wisps/elemental/lightning-idle.png', attack: 'assets/enemies/wisps/elemental/lightning-attack.png' }),
    poison: Object.freeze({ name: '독안개 위습', idle: 'assets/enemies/wisps/elemental/poison-idle.png', attack: 'assets/enemies/wisps/elemental/poison-attack.png' }),
    holy: Object.freeze({ name: '성광 위습', idle: 'assets/enemies/wisps/elemental/holy-idle.png', attack: 'assets/enemies/wisps/elemental/holy-attack.png' }),
    void: Object.freeze({ name: '공허 위습', idle: 'assets/enemies/wisps/elemental/void-idle.png', attack: 'assets/enemies/wisps/elemental/void-attack.png' })
});

// 게임의 위습 외형 18종(data/bosses.js WISP_MONSTER_VISUALS) → 시트 6종. 물리 계열은 청동·옅은 금빛의 성광,
// 독·괴저 계열 카오스는 독안개, 나머지 카오스는 공허. 혼합형은 이름이 가리키는 쪽을 따른다.
const WISP_SPRITE_BY_VISUAL = Object.freeze({
    'wisp-b01': 'holy', 'wisp-b02': 'fire', 'wisp-b03': 'ice', 'wisp-b04': 'lightning', 'wisp-b05': 'void', 'wisp-b06': 'poison',
    'wisp-h01': 'fire', 'wisp-h02': 'lightning', 'wisp-h03': 'ice', 'wisp-h04': 'fire', 'wisp-h05': 'ice', 'wisp-h06': 'lightning', 'wisp-h07': 'poison',
    'wisp-s01': 'holy', 'wisp-s02': 'poison', 'wisp-s03': 'void', 'wisp-s04': 'void', 'wisp-s05': 'holy'
});
// 외형 id가 없을 때(예전 저장의 적) 원소로 고른다.
const WISP_SPRITE_BY_ELEMENT = Object.freeze({ phys: 'holy', fire: 'fire', cold: 'ice', light: 'lightning', chaos: 'void' });

safeExposeData({ WISP_SPRITE_FRAME, WISP_SPRITE_DIRECTIONS, WISP_SPRITE_CLIPS, WISP_SPRITE_SHEETS, WISP_SPRITE_BY_VISUAL, WISP_SPRITE_BY_ELEMENT });
