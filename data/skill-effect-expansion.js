/** 효과 확장 +N (스킬 변경분 2, 2026-09-30 · 인계 expand_core.js): what "+N" grows for each gem, by the shape of its hits.
 *  radius  — area gems grow their radius (cross gems: their arms); an area around the caster also reaches N further
 *  cone    — cones grow N cells longer
 *  range   — lines, projectiles and movement reach N cells further (빈 플라스크: its shards)
 *  targets — single-target, arc and chain gems strike N more targets (탄성 플라스크: N more bounces)
 * Gems not listed are never expanded: 신성한 기도·시간 가속·과냉각 혼합물 (a radius of 3+ already covers most of the
 * 9×8 board) and summons. +1 comes from items and inner growth and does not stack; +2 only from a keystone and costs that
 * skill 30% of its damage (proposed value, handoff §8-1). Rules: js/skill-effect-expansion.js.
 */
const SKILL_EFFECT_EXPANSION = Object.freeze({
    max: 2,
    penaltyFrom: 2,
    damagePenaltyPct: 30,
    kinds: Object.freeze({
        '회오리': 'radius', '대지의 함성': 'radius', '도약 강타': 'radius', '폭발성 타격': 'radius', '피뢰침': 'radius',
        '신성한 단두대': 'radius', '얼어붙은 고리': 'radius', '불씨의 함성': 'radius', '화살비': 'radius',
        '화염 부패': 'radius', '빙결 침식': 'radius', '중력 붕괴': 'radius', '화염 폭풍핵': 'radius', '유성 낙화': 'radius',
        '난타 눈보라': 'radius', '번개 각인': 'radius', '원소 포션 투척': 'radius', '폭발 혼합물': 'radius', '신성한 안개': 'radius',
        '파문심판': 'radius', '차원찢기': 'radius',
        '섬머솔트 슬래시': 'cone', '불사르기': 'cone', '혹한의 지진': 'cone', '서리바람 내지르기': 'cone',
        '얼음 창': 'range', '번개 창': 'range', '관통 사격': 'range', '공허 가르기': 'range', '서리 파동': 'range', '참격파': 'range', '부싯돌 베기': 'range',
        '연발 사격': 'range', '폭열 창탄': 'range', '암흑 파열': 'range', '빙결 파열창': 'range',
        '돌진': 'range', '그림자 점멸': 'range', '빈 플라스크': 'range', '암살': 'range',
        '향로구름': 'range', '작살화살': 'range',
        '이중 베기': 'targets', '강타': 'targets', '흡혈 관통': 'targets', '기습 공격': 'targets', '번개 타격': 'targets',
        '화염 참격': 'targets', '독창 투척': 'targets', '올려 베기': 'targets', '전도성 난격': 'targets', '서리베기': 'targets', '뇌운 낙뢰': 'targets', '심연 전염': 'targets',
        '천뢰 분기': 'targets', '탄성 플라스크': 'targets'
    }),
    // Never expanded (for the checks): a radius of 3+ already spans most of the board.
    excluded: Object.freeze(['신성한 기도', '시간 가속', '과냉각 혼합물'])
});
safeExposeData({ SKILL_EFFECT_EXPANSION });
