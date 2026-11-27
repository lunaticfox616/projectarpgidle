/** 가변 범위에 적용되는 확장 단위와 기존 전용 효과 확장 규칙. 고정 범위는 스킬별 판정과 각 단계의 크기를 그대로 쓴다. */
const SKILL_EFFECT_EXPANSION = Object.freeze({
    max: 2,
    penaltyFrom: 2,
    damagePenaltyPct: 30,
    kinds: Object.freeze({
        '회오리': 'radius', '대지의 함성': 'radius', '폭발성 타격': 'radius', '피뢰침': 'radius',
        '신성한 단두대': 'radius', '얼어붙은 고리': 'radius', '불씨의 함성': 'radius', '화살비': 'radius',
        '중력 붕괴': 'radius', '화염 폭풍핵': 'radius', '유성 낙화': 'radius', '난타 눈보라': 'radius', '번개 각인': 'radius',
        '폭발 혼합물': 'radius', '바위 플라스크': 'radius', '병에 담긴 번개': 'radius',
        '전도성 형상체': 'orbs', '절대 영도': 'targets',
        '섬머솔트 슬래시': 'cone', '불사르기': 'cone', '혹한의 지진': 'cone', '서리바람 내지르기': 'cone',
        '얼음 창': 'range', '번개 창': 'range', '관통 사격': 'range', '공허 가르기': 'range', '서리 파동': 'range', '참격파': 'range', '부싯돌 베기': 'range',
        '연발 사격': 'range', '폭열 창탄': 'range', '암흑 파열': 'range', '빙결 파열창': 'range',
        '돌진': 'range', '그림자 점멸': 'range', '빈 플라스크': 'range', '암살': 'range',
        '작살화살': 'range', '추적 사격': 'range', '시간의 사선': 'range',
        '이중 베기': 'targets', '강타': 'targets', '흡혈 관통': 'targets', '기습 공격': 'targets', '번개 타격': 'targets',
        '화염 참격': 'targets', '독창 투척': 'targets', '올려 베기': 'targets', '전도성 난격': 'targets', '서리베기': 'targets', '뇌운 낙뢰': 'targets', '심연 전염': 'targets',
        '천뢰 분기': 'targets', '탄성 플라스크': 'targets'
    })
});
export { SKILL_EFFECT_EXPANSION };
