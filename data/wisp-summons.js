/** 위습 정령 소환 6종 (스킬 변경분 2, 2026-09-30 · 인계 3_결과물/Hana_소환수/위습정령): 동물 소환 8종을 대신한다.
 * 시트는 한 칸 16×16 도트 가로 띠(assets/summon/wisp/<slug>_idle|attack.png, 기준점 = 아래 가운데): 대기 4프레임 160ms,
 * 공격 4프레임 90/70/110/110ms이고 두 번째 프레임에 공격이 나간다. 공격 그림은 js/canvas-redrawn-skill-art-moves.js WispAttack.
 * art: WispAttack 원소. flight: 위습 → 대상 비행 시간(ms) = base + perDot × 거리(도트, 칸 = 16도트) — 그림(WispAttack.timing)과
 * 같은 식이고 피해는 도착할 때 들어간다(번개·분광은 광선이라 0). tailMs: 도착 뒤 그림이 남는 시간(그림의 WISP_TAIL).
 * elements: 공격마다 이 중 하나로 친다(분광). 소환수 수치는 js/combat.js getSummonProfile, 공격 규칙은 js/wisp-summons.js.
 */
const WISP_SUMMONS = Object.freeze({
    '화염 위습 소환': Object.freeze({ slug: 'wisp-fire', art: 'fire', flight: Object.freeze({ base: 260, perDot: 2 }), tailMs: 460 }),
    '냉기 위습 소환': Object.freeze({ slug: 'wisp-cold', art: 'cold', flight: Object.freeze({ base: 110, perDot: 2 }), tailMs: 260 }),
    '번개 위습 소환': Object.freeze({ slug: 'wisp-light', art: 'light', flight: Object.freeze({ base: 0, perDot: 0 }), tailMs: 520 }),
    '물리 위습 소환': Object.freeze({ slug: 'wisp-phys', art: 'phys', flight: Object.freeze({ base: 90, perDot: 3 }), tailMs: 720 }),
    '카오스 위습 소환': Object.freeze({ slug: 'wisp-chaos', art: 'chaos', flight: Object.freeze({ base: 260, perDot: 2 }), tailMs: 760 }),
    '분광 위습 소환': Object.freeze({ slug: 'wisp-spectral', art: 'spectral', flight: Object.freeze({ base: 0, perDot: 0 }), tailMs: 520,
        elements: Object.freeze(['fire', 'cold', 'light']) })
});
const WISP_SUMMON_SHEET = Object.freeze({
    size: 16, path: 'assets/summon/wisp/',
    idleMs: Object.freeze([160, 160, 160, 160]), attackMs: Object.freeze([90, 70, 110, 110]), strike: 1
});
// Saves made before the wisps: each animal summon gem becomes the wisp of its element (the storm spirit, the only
// spirit among them, becomes the spectral wisp). Two animals of one element fold into one wisp.
const LEGACY_SUMMON_GEM_TO_WISP = Object.freeze({
    '불곰 소환': '화염 위습 소환', '서리늑대 소환': '냉기 위습 소환', '벼락멧돼지 소환': '번개 위습 소환',
    '칼날까마귀 소환': '물리 위습 소환', '철갑 거북 소환': '물리 위습 소환', '공허 유충 소환': '카오스 위습 소환',
    '벌떼 소환': '카오스 위습 소환', '폭풍 정령 소환': '분광 위습 소환'
});
safeExposeData({ WISP_SUMMONS, WISP_SUMMON_SHEET, LEGACY_SUMMON_GEM_TO_WISP });
