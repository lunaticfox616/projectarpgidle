/** 효과 확장 +N (스킬 변경분 2, 2026-09-30 · 인계 expand_core.js): what "+N" grows for each gem, by the shape of its hits.
 *  radius  — area gems grow their radius (cross gems: their arms); an area around the caster also reaches N further
 *  cone    — cones grow N cells longer
 *  range   — lines, projectiles and movement reach N cells further (빈 플라스크: its shards)
 *  targets — single-target, arc and chain gems strike N more targets (탄성 플라스크: N more bounces)
 * Gems not listed are never expanded: 광창 강림·시간 가속·과냉각 혼합물·인과 (a radius of 3+ already covers most of the
 * 9×8 board) and summons. +1 comes from items and inner growth and does not stack; +2 only from a keystone and costs that
 * skill 30% of its damage (proposed value, handoff §8-1). Rules: js/skill-effect-expansion.js.
 */
const SKILL_EFFECT_EXPANSION = Object.freeze({
    max: 2,
    penaltyFrom: 2,
    damagePenaltyPct: 30,
    kinds: Object.freeze({
        '회오리바람': 'radius', '서리 폭발': 'radius', '지진 파쇄': 'radius', '혈기 폭쇄': 'radius', '불멸의 진동': 'radius',
        '화염 부패': 'radius', '빙결 침식': 'radius', '중력 붕괴': 'radius', '화염 폭풍핵': 'radius', '유성 낙화': 'radius',
        '난타 눈보라': 'radius', '룬 지뢰': 'radius', '원소 포션 투척': 'radius', '폭발 혼합물': 'radius', '신성한 안개': 'radius',
        '파문심판': 'radius',
        '용암 강타': 'cone', '삼원 파동': 'cone', '용화 숨결': 'cone',
        '얼음 창': 'range', '번개 창': 'range', '관통 사격': 'range', '공허 베기': 'range', '서리 파동': 'range', '독니 사출': 'range',
        '연발 사격': 'range', '폭열 창탄': 'range', '암흑 파열': 'range', '빙결 파열창': 'range', '방패 투척': 'range',
        '방패 돌진': 'range', '그림자 점멸': 'range', '집중 광선': 'range', '공허 절삭광': 'range', '빈 플라스크': 'range', '암살': 'range',
        '연속 베기': 'targets', '묵직한 강타': 'targets', '흡혈 타격': 'targets', '암살자의 일격': 'targets', '번개 타격': 'targets',
        '화염 참격': 'targets', '독창 투척': 'targets', '연쇄 폭풍': 'targets', '뇌운 낙뢰': 'targets', '심연 전염': 'targets',
        '천뢰 분기': 'targets', '뇌격 삼연타': 'targets', '탄성 플라스크': 'targets'
    }),
    // Never expanded (for the checks): a radius of 3+ already spans most of the board.
    excluded: Object.freeze(['광창 강림', '시간 가속', '과냉각 혼합물', '인과'])
});
safeExposeData({ SKILL_EFFECT_EXPANSION });
