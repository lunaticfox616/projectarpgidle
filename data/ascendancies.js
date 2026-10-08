if (typeof safeExposeData !== 'function') throw new Error('data/constants.js must load before data/ascendancies.js');
// 전직(2차 직업) 정의. 예전에는 js/state.js에 있었다(2026-10-02 data로 옮기며 18종으로 개편).
// CLASS_TEMPLATES: 이름 · 설명 · 노드 능력치(m1 · m2 · d). CLASS_KEYSTONE_DEFS: 키스톤(기존 12종은 전투 코드에 효과가 있고,
// 새 6종은 stats 줄로 동작한다). 키스톤 id는 전직을 통틀어 겹치지 않아야 한다(getAscendKeystoneOwnerClass).

/** 키스톤 능력치 줄 하나(새 전직의 키스톤은 이 줄만으로 동작한다). */
function ascendancyStatLine(stat, val) { return { stat, val }; }
/** 고유 효과 줄: 고유 장비, 재능 카드와 같은 고유 효과 엔진 키(js/combat.js getPlayerStats). */
function ascendancyUniqueLine(key, params) { return params ? { key, params } : { key }; }
/** 기준값(진입 · 주요)에 배율을 곱하는 노드. from이 있으면 그 능력치의 기준값과 배율 규칙을 쓴다. */
function ascendancyScaledNode(stat, tier, mul, from) { return from ? { stat, tier, mul, from } : { stat, tier, mul }; }

const CLASS_TEMPLATES = {
    warrior: { name: '워리어', desc: '강력한 물리 압박과 방어 관통', m1: 'physPctDmg', m2: 'physIgnore', d: 'dr' },
    gladiator: { name: '글래디에이터', desc: '빠른 공격속도와 연속 타격', m1: 'meleePctDmg', m2: 'ds', d: 'aspd' },
    assassin: { name: '어쌔신', desc: '치명타 확률과 막대한 치명타 피해', m1: 'crit', m2: 'critDmg', d: 'chaosPctDmg' },
    ranger: { name: '레인저', desc: '신속한 이동과 투사체 장악', m1: 'projectilePctDmg', m2: 'move', d: 'crit' },
    elementalist: { name: '엘리멘탈리스트', desc: '원소 피해와 원소 저항 특화', m1: 'elementalPctDmg', m2: 'resAll', d: 'regen' },
    warlock: { name: '워록', desc: '혼돈 피해와 생명력 흡수', m1: 'chaosPctDmg', m2: 'dotPctDmg', d: 'pctHp' },
    guardian: { name: '가디언', desc: '방어도와 생명력으로 버티는 성벽', m1: 'armor', m2: 'flatHp', d: 'dr' },
    inquisitor: { name: '인퀴지터', desc: '원소 치명타 및 보조 스킬 전문', m1: 'elementalPctDmg', m2: 'critDmg', d: 'suppCap' },
    soulbinder: { name: '소울바인더', desc: '소환계열 특화', m1: 'dotPctDmg', m2: 'energyShield', d: 'regen' },
    catalyst: { name: '카탈리스트', desc: '상태 이상 및 지속 피해 특화', m1: 'elementalPctDmg', m2: 'chaosPctDmg', d: 'resPen' },
    hunter: { name: '헌터', desc: '치명타 및 단일 개체 특화', m1: 'projectilePctDmg', m2: 'critDmg', d: 'crit' },
    crusader: { name: '크루세이더', desc: '번개 피해 및 방어도 에너지 보호막 혼합 특화', m1: 'meleePctDmg', m2: 'resAll', d: 'dr' }
};

const CLASS_KEYSTONE_PICK_LIMIT = 5;
const CLASS_KEYSTONE_DEFS = {
    warrior: [
        { id: 'w1', name: '강철 태세', desc: '물리 피해 10% 증폭, 방어도 15% 증가', req: null },
        { id: 'w2', name: '전장의 리듬', desc: '치명타 및 연속 공격 발생 시 각각 2초간 공격속도 +3% (각각 최대 5중첩)', req: null },
        { id: 'w3', name: '쌍수 훈련', desc: '방패 슬롯에 무기 장착 가능', req: null },
        { id: 'w4', name: '갑주 분쇄', desc: '물리 피해 감소 무시가 마이너스까지 적용될 수 있음', req: 'w1' },
        { id: 'w5', name: '격노 순환', desc: '피격 시 5초간 물리 피해 +6% (최대 5중첩, 곱연산)', req: 'w2' },
        { id: 'w6', name: '거인의 힘', desc: '쌍수 상태에서, 각 무기의 효과 50% 증가', req: 'w3' },
        { id: 'w7', name: '불굴의 진군', desc: '생명력 50% 이하 시 받는 피해 15% 감폭, 주는 피해 10% 증폭', reqAny: ['w2', 'w4'] },
        { id: 'w8', name: '파괴 본능', desc: '생명력이 50% 이상으로 회복/흡수되지 않음, 치명타 확률 +3%p, 치명타 피해 배율 +15%, 연속 타격 +5%, 공격 속도 5% 증폭, 이동 속도 15% 증폭, 최종 피해 3% 증폭', req: 'w7' },
        { id: 'w9', name: '전쟁광', desc: '모든 주는 피해 10% 증폭, 받는 피해 10% 증폭', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],
    gladiator: [
        { id: 'g1', name: '결투 태세', desc: '물리 피해 15% 증폭, 물리가 아닌 피해 20% 감폭', req: null },
        { id: 'g2', name: '연참 호흡', desc: '연속 타격 발생 시 3초간 공격 속도 +2%, 회피 +3% (최대 12중첩)', req: null },
        { id: 'g3', name: '노련함', desc: '치명타가 아닌 타격 시 다음 타격 치명타 확률 +5%p, 치명타 발동 시 초기화', req: null },
        { id: 'g4', name: '난투 본능', desc: '적이 3기 이상 주변에 있으면 받는 피해 20% 감폭, 주는 피해 20% 증폭', req: 'g1' },
        { id: 'g5', name: '속공 전개', desc: '이동 후 첫 타격 피해 30% 증폭 및 첫 받는 피해 30% 감폭', req: 'g2' },
        { id: 'g6', name: '마무리 타격', desc: '공격 후 적 생명력 20% 미만 즉시 처치(보스 10%)', req: 'g3' },
        { id: 'g7', name: '투기 순환', desc: '회피 150당 연속 타격 +1%p(최대 +15%p), 방어도 500당 치명타 확률 +1%p(최대 +10%p)', reqAny: ['g4', 'g5'] },
        { id: 'g8', name: '검투의 화신', desc: '연속 타격 +15%, 피해 5% 증폭, 보스에게 주는 피해 10%/받는 피해 18% 증폭, 재생 50% 감폭, ES 재생 없음', req: 'g7' },
        { id: 'g9', name: '실전 특화', desc: '막기 확률 및 비껴내기 확률 판정에 행운 적용(2회 굴려 유리한 값 선택)', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],
    assassin: [
        { id: 'a1', name: '냉혹한 집중', desc: '치명타 피해 배율 +66%, 치명타 확률 -6%p', req: null },
        { id: 'a2', name: '그림자 질주', desc: '이동 시 흐릿함 상태 부여: 이동 속도 +20%, 치명타 피해 배율 +25%, 회피 20% 증폭. 피해를 받으면 해제', req: null },
        { id: 'a3', name: '독점 약점', desc: '치명타 발생 시 5초간 대상 받는 피해 +2% (개별 대상, 최대 10중첩, 적 상태이상에 표시)', req: null },
        { id: 'a4', name: '암전 절개', desc: '물리 피해 감소 무시 +25%, 저항 관통 +25%, 피해 8% 감폭', req: 'a1' },
        { id: 'a5', name: '사형 선고', desc: '모든 공격이 치명타로 간주됩니다. 치명타로 간주된 비-치명타 공격도 치명타 효과와 치명타 피해 배율 보너스를 받습니다.', req: 'a3' },
        { id: 'a6', name: '유리 심장', desc: '현재 생명력 66% 초과 시 치명타 피해 배율 20% 증폭, 이하 시 회피 20% 증폭', req: 'a2' },
        { id: 'a7', name: '살의 폭주', desc: '적이 1명일 경우 치명타가 원 피해의 50%로 한 번 더 들어감, 치명타 피해 배율 -200%', reqAny: ['a4', 'a5'] },
        { id: 'a8', name: '종말의 송곳니', desc: '치명타 피해 배율이 1.5배, 피해 25% 감폭', req: 'a7' },
        { id: 'a9', name: '암영 극의', desc: '치명타 피해 배율 20% 증폭 및 회피 20% 증폭', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],
    ranger: [
        { id: 'r1', name: '사냥꾼 보법', desc: '이동 속도 15% 증폭, 방어도/에너지 보호막 0', req: null },
        { id: 'r2', name: '가속 시위', desc: '공격 속도 15% 증폭', req: null },
        { id: 'r3', name: '탄도 감각', desc: '투사체 스킬 타겟 수 +2, 투사체 스킬 최소 피해 보정 -10%', req: null },
        { id: 'r4', name: '질풍 동조', desc: '이동 속도 1%당 공격 속도 0.1% 증폭', req: 'r1' },
        { id: 'r5', name: '급소 표식', desc: '같은 적 3회 연속 적중마다 적 최대 체력의 3% 추가 물리 피해 (보스에게는 그 적중 피해까지)', req: 'r2' },
        { id: 'r6', name: '궤적 관통', desc: '투사체 스킬 타겟 수 +1, 타겟마다 피해 4% 증폭', req: 'r3' },
        { id: 'r7', name: '추적 본능', desc: '피격되지 않은 시간 1초마다 치명타 확률 +3%p (피격 시 초기화)', reqAny: ['r4', 'r5'] },
        { id: 'r8', name: '폭풍 사냥', desc: '공격 속도와 이동 속도 상호 12% 효율 보정, 최대 생명력 -15%', req: 'r7' },
        { id: 'r9', name: '극한의 속사', desc: '공격 속도 소프트캡 기준치 +2', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],
    elementalist: [
        { id: 'e1', name: '원소 공명', desc: '원소 최종 피해 15% 증폭, 물리 피해 없음', req: null },
        { id: 'e2', name: '분광 외피', desc: '모든 원소 저항 +15%, 원소 저항 최대치 +3%, 카오스 저항 -10%', req: null },
        { id: 'e3', name: '마력 순환', desc: '에너지 보호막 재생이 끊기지 않음, 최대 생명력 -15%', req: null },
        { id: 'e4', name: '융해 결합', desc: '모든 스킬이 화염/냉기/번개 33% 영향 스킬로 변화', req: 'e1' },
        { id: 'e5', name: '공허 결합', desc: '카오스 저항이 가장 높은 원소 저항의 50%만큼 상승, 카오스 저항만큼 원소 최종 피해 증가', req: 'e2' },
        { id: 'e6', name: '원소 침식', desc: '저항 관통 +20%, 치명타 피해 배율 -25%', req: 'e3' },
        { id: 'e7', name: '삼원 폭주', desc: '화/냉/번 동시 사용 시 최종 피해 5% 증폭, 상태이상 강도는 최종 피해의 1.5배에 비례', req: 'e4' },
        { id: 'e8', name: '원소 과부하', desc: '치명타 공격마다 원소 과부하 중첩 획득: 중첩당 원소 최종 피해 +2%, 치명타 확률 -1%p (최대 20중첩). 비-치명타 공격 시 모든 중첩을 잃음', req: 'e7' },
        { id: 'e9', name: '절대 관통', desc: '원소 저항 관통 +30%, 원소 저항 관통이 -300%까지 확장됨', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],
    warlock: [
        { id: 'wlk1', name: '심연 각인', desc: '모든 피해가 카오스 피해가 됨. 카오스 피해 10% 증폭', req: null },
        { id: 'wlk2', name: '부패 증식', desc: '지속 피해 배율 20% 증폭, 주문 내장 피해 20% 증가, 즉발 피해 10% 감폭', req: null },
        { id: 'wlk3', name: '금단 대가', desc: '에너지 보호막 재생 불가, 흡수가 에너지 보호막에 대신 적용', req: null },
        { id: 'wlk4', name: '암흑 치환', desc: '각 원소 저항 최대치 초과분의 25%만큼 카오스 저항 증가', req: 'wlk1' },
        { id: 'wlk5', name: '전염 가속', desc: 'DOT 틱 속도 +50%, 지속시간 -50%', req: 'wlk2' },
        { id: 'wlk6', name: '공허 특이점', desc: '저항 관통 +21%, 치명타 불가, 치명타 확률의 50%가 저항 관통으로 전환. 공격 피해가 100%~(100+(저항 관통+치명타 피해 배율)의 50%)% 사이에서 무작위로 결정됨', req: 'wlk3' },
        { id: 'wlk7', name: '피의 계약', desc: '에너지 보호막 50% 이상에서 피해 10% 증폭. 공격 시 가능하면 생명력 4%를 소모해 해당 공격의 피해 10% 증폭', reqAny: ['wlk4', 'wlk6'] },
        { id: 'wlk8', name: '심연 군주', desc: '주얼 슬롯 2칸 추가, 카오스 피해 15% 증폭, 생명력 회복 효과 50% 감폭', req: 'wlk7' },
        { id: 'wlk9', name: '시체 역병', desc: '저주 최대치 +1. 카오스 피해로 적 처치 시 50% 확률로 시체 폭발(적 최대 생명력의 20%를 카오스 피해로 주변에). 모든 카오스 피해 적중 시 적에게 위축 부여(최대 10중첩, 1중첩당 받는 카오스 피해 +2%)', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],

    soulbinder: [
        { id: 'sb1', name: '영혼 결속', desc: '소환수 기본 피해 15% 증폭', req: null },
        { id: 'sb2', name: '나눠갖기', desc: '가장 가까운 소환수에게 플레이어가 받는 피해의 50%를 전달. 해당 피해로 소환수 사망 시 부활 시간 30% 단축', req: null },
        { id: 'sb3', name: '야생성', desc: '플레이어와 소환수 생명력 흡수 +3.5%', req: null },
        { id: 'sb4', name: '무리', desc: '소환수 한도 +1, 소환수 공격 속도 25% 증폭', req: 'sb1' },
        { id: 'sb5', name: '홀로서기', desc: '소환수의 기본 공격력과 공격적인 추가 스탯의 40%를 플레이어가 가짐, 소환수 생명력 등 방어적인 소환 옵션은 전이되지 않으며 소환수는 공격하지 않음', req: 'sb2' },
        { id: 'sb6', name: '꿰뚫는 이', desc: '저항 관통 +25%, 플레이어 저항 관통이 소환수 공격에도 100% 적용. 소환수 공격이 대상 주변 1칸의 적도 관통', req: 'sb3' },
        { id: 'sb7', name: '상호 보완', desc: '플레이어 공격력(타격당 기본 피해)의 25%를 소환수 타격에 더하고, 소환수 공격력의 25%를 플레이어 타격에 더함', reqAny: ['sb4', 'sb3'] },
        { id: 'sb8', name: '군주', desc: '소환수 한도 +3', req: 'sb7' },
        { id: 'sb9', name: '대군주', desc: '소환수 한도가 1.5배가 되고 최대 한도가 12로 증가합니다. 살아 있는 소환수 중 현재 생명력이 가장 낮은 하위 1/3(최대 4기)은 유령이 되어 피해를 받지 않고 칸을 점유하지 않습니다.', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],
    catalyst: [
        { id: 'ct1', name: '과잉 촉매', desc: '상태이상 지속 피해 유발 기준 피해가 실제 타격의 2배로 계산', req: null },
        { id: 'ct2', name: '약품 내성', desc: '지속 피해 배율의 5%만큼 모든 저항 상승, 0.5%만큼 최대 저항 상승(내림). 가장 높은 비-제한 원소 저항이 주는 상태이상 저항 +100% (공동 최고 저항은 모두 적용)', req: null },
        { id: 'ct3', name: '확산 반응', desc: '상태이상에 걸린 적이 사망 시 남은 상태이상을 모든 주변 적에게 확산', req: null },
        { id: 'ct4', name: '연막 포션', desc: '영구 은신: 이동 속도 +20%, 치명타 피해 배율 +25%, 회피 20% 증폭. 회피 성공 시 다음 타격에만 회피 30% 증폭', req: 'ct1' },
        { id: 'ct5', name: '감염 추적', desc: '적이 상태이상일 때 주는 피해 20% 증폭', req: 'ct2' },
        { id: 'ct6', name: '중첩 독성', desc: '중독/점화/출혈 최대 중첩 +1, 상태이상 피해 35% 증폭, 상태이상 지속 시간 25% 감폭', req: 'ct3' },
        { id: 'ct7', name: '완벽한 배합', desc: '모든 공격이 항상 치명타, 치명타 확률의 50% 및 치명타 피해 배율의 10%가 지속 피해 배율로 전환, 치명타에 치명타 피해 배율 대신 지속 피해 배율의 20% 적용', reqAny: ['ct4', 'ct5'] },
        { id: 'ct8', name: '파열 용해', desc: '중독/점화/출혈 최대 중첩 +2, 최대 중첩 시 1초 쿨로 누적 피해 즉시 폭발', req: 'ct6' },
        { id: 'ct9', name: '급성 발현', desc: '점화/중독/출혈의 피해 간격 및 지속 시간 30% 감폭(같은 피해를 더 빠르게 폭발)', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],
    hunter: [
        { id: 'h1', name: '단일 조준', desc: '투사체 피해 10% 증폭, 타겟이 하나면 15% 증폭', req: null },
        { id: 'h2', name: '약점 노출', desc: '공격 시 적에게 약점 노출 부여, 노출된 적이 받는 피해 10% 증가', req: null },
        { id: 'h3', name: '행운 발걸음', desc: '이동 속도의 20%를 회피로 전환, 회피 판정에 행운, 피격/상태이상 판정에 불운', req: null },
        { id: 'h4', name: '연쇄 관통', desc: '타겟이 하나면 공격이 100% 관통(초과 피해가 연쇄 관통, 전이마다 80%로 감쇄)', req: 'h1' },
        { id: 'h5', name: '급소 격발', desc: '치명타 피해 배율 +250%, 치명타 확률 -10%p', req: 'h2' },
        { id: 'h6', name: '사거리 장악', desc: '투사체 스킬 타겟 수 +1, 투사체 추가 발사 +1', req: 'h3' },
        { id: 'h7', name: '고독 사냥', desc: '타겟 수 1로 고정, 줄어든 타겟 5개까지 각 연속 타격 +10%p, 이후 각 +5%p', reqAny: ['h4', 'h5'] },
        { id: 'h8', name: '절멸 사격', desc: '연속 타격 불가, 연속 타격 확률을 치명타 확률로 전환(최대 100%), 치명타 피해 배율 +50%', req: 'h7' },
        { id: 'h9', name: '일격필살', desc: '공격 속도가 1로 고정되며, 공격 속도 증가가 모두 피해량 증폭으로 전환됨', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],
    crusader: [
        { id: 'cr1', name: '신성화', desc: '신성화 효과: 생명력 재생 +1.5%, 생명력 재생 속도 +40%', req: null },
        { id: 'cr2', name: '천뢰 교리', desc: '화염/냉기 피해 증가를 번개에도 100% 적용, 번개 피해가 번개 저항 무시, 번개에는 저항 관통 미적용', req: null },
        { id: 'cr3', name: '신성한 검', desc: '무기를 신성한 검으로 간주(무기 옵션 무효), ES 100당 번개 기본 피해 +(플레이어 레벨 x0.02)', req: null },
        { id: 'cr4', name: '전하 보루', desc: '받는 화염/냉기/카오스 피해의 30%를 번개로 전환, 최대 번개 저항 +3%', req: 'cr1' },
        { id: 'cr5', name: '이중 재생', desc: '생명력 재생이 ES에도 적용, 생명력 재생 +3%, 최대 생명력 +15%, 방어도/ES +40%', req: 'cr2' },
        { id: 'cr6', name: '천벌 단죄', desc: '번개 피해의 최종 최대 피해 보정 1.35배', req: 'cr3' },
        { id: 'cr7', name: '상호 전환', desc: '총 방어도의 50%를 ES로, 총 ES의 50%를 방어도로 전환, ES 재충전 시작 50% 가속', reqAny: ['cr4', 'cr5'] },
        { id: 'cr8', name: '번개 불사', desc: 'ES 0 시 4초간 ES 100% 재생, 동안 번개 피해 +75% (쿨 4초, 중첩불가)', req: 'cr7' },
        { id: 'cr9', name: '축복받은 무구', desc: '신성한 검 상태에서도 무기의 효과가 무효화되지 않음', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],

    guardian: [
        { id: 'gd1', name: '요새의 맹세', desc: '방어도 15% 증폭, 방어도 100당 피해 +2%(최대 +80%)', req: null },
        { id: 'gd2', name: '생명 성채', desc: '최대 생명력 20% 증폭, 에너지 보호막 20% 증폭', req: null },
        { id: 'gd3', name: '수호 재생', desc: '생명력 재생 회복 속도 20% 증가, 에너지 보호막 재생 속도 20% 감폭', req: null },
        { id: 'gd4', name: '철벽 전환', desc: '회피의 100%만큼 방어도 추가', req: 'gd1' },
        { id: 'gd5', name: '불침 보루', desc: '받는 최종 피해 15% 감폭', req: 'gd2' },
        { id: 'gd6', name: '인내 장전', desc: '피격 시 4초간 방어도 +11% (최대 5중첩, 곱연산), 5중첩 소모 반사 피해 후 2중첩 유지', req: 'gd3' },
        { id: 'gd7', name: '최후 저지선', desc: '생명력 50% 이하 시 받는 피해 20% 감폭/주는 피해 30% 증폭, 상태이상 제거(쿨 5초)', reqAny: ['gd4', 'gd5'] },
        { id: 'gd8', name: '절대 수호', desc: '막기 확률과 별개로 피해를 무효화할 확률 30%, 모든 상태 이상 저항 확률 +50%', req: 'gd7' },
        { id: 'gd9', name: '살아 있는 성채', desc: '한 번의 적중으로 생명력 최대치의 35%를 넘게 잃지 않음, 생명력 재생과 흡수 효과 35% 감폭', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],
    inquisitor: [
        { id: 'iq1', name: '교리 집행', desc: '원소 피해가 현재 사용 중인 총 공명력의 20%만큼 증폭', req: null },
        { id: 'iq2', name: '심판 렌즈', desc: '치명타 피해 배율 +75%, 치명타 확률 -8%p', req: null },
        { id: 'iq3', name: '성서 확장', desc: '보조 젬 한도 +1, 공명력 +10, 봉인된 젬 4개당 공명력 1 증가, 공격 속도 6% 감폭', req: null },
        { id: 'iq4', name: '순백 판결', desc: '적 원소 저항을 75%만 간주 (원소 관통 적용)', req: 'iq1' },
        { id: 'iq5', name: '계시 관통', desc: '저항 관통 +12%, 물리 피해 없음', req: 'iq2' },
        { id: 'iq6', name: '신성한 희생', desc: '모든 원소/보조 젬 레벨 +1, 보조 젬 한도 +1, 최대 생명력 -25%', req: 'iq3' },
        { id: 'iq7', name: '이단 심문', desc: '사용 중인 공명력에 따라 치명타 피해 배율 증가', reqAny: ['iq4', 'iq5'] },
        { id: 'iq8', name: '절대 교리', desc: '저항 관통의 15%만큼 원소 피해 증폭', req: 'iq7' },
        { id: 'iq9', name: '무한한 권능', desc: '보조 젬 한도 +2. 보조 젬 한도 +1당 공명력 +3', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ]
};

// ── 전직 18종(2026-10-02 개편): 직업 6개마다 전직 3종 ─────────────────────────────────────────────
// 예전에는 전직 12종을 어느 직업이든 골랐다. 이제 직업마다 셋이고, 기존 12종은 성격대로 나누고 비는 여섯 자리는
// 그 직업의 재능 성격을 이어받아 새로 만들었다(버서커 · 저거너트 · 검무사 · 폭풍궁수 · 숲지기 · 폭약술사).
// 새 여섯의 키스톤은 능력치 줄(stats)과 고유 효과 줄(uniques)로 동작한다(전투 코드에 전직별 분기가 없다). 수치는 임시.
// bloomMechanic은 얻을 수 없게 된 옛 재능 카드의 효과를 켠다(2026-10-02 재능 정리, js/talent-cards.js getGrantedBloomMechanics).
const ASCENDANCIES_BY_PLAYER_CLASS = Object.freeze({
    warrior: Object.freeze(['warrior', 'berserker', 'juggernaut']),
    wanderer: Object.freeze(['gladiator', 'assassin', 'bladedancer']),
    archer: Object.freeze(['ranger', 'hunter', 'stormarcher']),
    cleric: Object.freeze(['guardian', 'inquisitor', 'crusader']),
    occultist: Object.freeze(['elementalist', 'warlock', 'soulbinder']),
    alchemist: Object.freeze(['catalyst', 'grovewarden', 'bombardier'])
});

Object.assign(CLASS_TEMPLATES, {
    berserker: { name: '버서커', desc: '흡혈과 공격 속도로 몰아치는 광전사', m1: 'meleePctDmg', m2: 'leech', d: 'pctHp' },
    juggernaut: { name: '저거너트', desc: '강타와 두꺼운 갑주로 밀고 나가는 파성추', m1: 'meleePctDmg', m2: 'armorPct', d: 'flatHp' },
    bladedancer: { name: '검무사', desc: '회피와 비껴내기 속에서 빠르게 베는 검객', m1: 'aspd', m2: 'evasionPct', d: 'deflectChance' },
    stormarcher: { name: '폭풍궁수', desc: '번개 화살로 무리를 꿰뚫는 사수', m1: 'projectilePctDmg', m2: 'lightPctDmg', d: 'move' },
    grovewarden: { name: '숲지기', desc: '서리와 독초로 적을 묶고 오래 버티는 숲의 수호자', m1: 'coldPctDmg', m2: 'poisonChance', d: 'regen' },
    bombardier: { name: '폭약술사', desc: '포션 투척과 폭발로 무리를 쓸어 내는 폭약 전문가', m1: 'potionPctDmg', m2: 'aoePctDmg', d: 'igniteChance' }
});

Object.assign(CLASS_KEYSTONE_DEFS, {
    berserker: [
        { id: 'bz1', name: '피의 갈증', desc: '흡혈 +0.6%, 근접 피해 +30%', req: null, stats: [ascendancyStatLine('leech', 0.6), ascendancyStatLine('meleePctDmg', 30)] },
        { id: 'bz2', name: '광분', desc: '공격 속도 +14%', req: null, stats: [ascendancyStatLine('aspd', 14)] },
        { id: 'bz3', name: '상처투성이', desc: '최대 생명력 +12%, 생명력 재생 +0.6%', req: null, stats: [ascendancyStatLine('pctHp', 12), ascendancyStatLine('regen', 0.6)] },
        { id: 'bz4', name: '도살자', desc: '출혈 확률 +20%, 같은 적을 4번 공격하면 도살 표식. 표식 대상의 생명력이 30% 이하면 다음 공격이 일반 몬스터를 마무리하고, 보스에게는 잃은 생명력에 비례해 최대 12% 추가 피해', req: 'bz1', stats: [ascendancyStatLine('bleedChance', 20)], bloomMechanic: 'hero2__assassin' },
        { id: 'bz5', name: '멈추지 않는 칼날', desc: '공격 속도 +6%, 적을 처치하면 5초 동안 흡혈 효율 50% 증가', req: 'bz2', stats: [ascendancyStatLine('aspd', 6)], uniques: [ascendancyUniqueLine('leechEfficiencyOnKill', {duration: 5, efficiencyPct: 50})] },
        { id: 'bz6', name: '고통 무시', desc: '몬스터에게 받은 생명력 피해의 15%를 4초에 걸쳐 되찾음', req: 'bz3', uniques: [ascendancyUniqueLine('lifeRecoupTakenDamage', {pct: 15, duration: 4})] },
        { id: 'bz7', name: '피의 축제', desc: '치명타 피해 +40%, 흡혈의 10%를 바로 회복, 6% 확률로 피해 2배', reqAny: ['bz4', 'bz5'], stats: [ascendancyStatLine('critDmg', 40)], uniques: [ascendancyUniqueLine('instantLeechAndDoubleDamage', {instantLeechPct: 10, doubleDamageChance: 6})] },
        { id: 'bz8', name: '광전사의 분노', desc: '근접 피해 +90%, 공격 속도 +10%, 대신 물리 피해 감소 -10%', req: 'bz7', stats: [ascendancyStatLine('meleePctDmg', 90), ascendancyStatLine('aspd', 10), ascendancyStatLine('dr', -10)] },
        { id: 'bz9', name: '불사의 광기', desc: '근접 피해 +120%, 흡혈 +1%, 최대 생명력 10%의 보호막(깨지면 30초 뒤 다시 참)', fifthJobOnly: true, stats: [ascendancyStatLine('meleePctDmg', 120), ascendancyStatLine('leech', 1)], uniques: [ascendancyUniqueLine('realmDeathWard', {hpPct: 10, cooldown: 30})] }
    ],
    juggernaut: [
        { id: 'jg1', name: '대지 가르기', desc: '근접 피해 +20%, 강타 피해 +20%', req: null, stats: [ascendancyStatLine('meleePctDmg', 20), ascendancyStatLine('slamPctDmg', 20)] },
        { id: 'jg2', name: '철갑', desc: '방어도 +30%', req: null, stats: [ascendancyStatLine('armorPct', 30)] },
        { id: 'jg3', name: '거구', desc: '최대 생명력 +12%', req: null, stats: [ascendancyStatLine('pctHp', 12)] },
        { id: 'jg4', name: '여진', desc: '강타 메아리 확률 +15%, 강타 피해 +20%', req: 'jg1', stats: [ascendancyStatLine('slamEchoChance', 15), ascendancyStatLine('slamPctDmg', 20)] },
        { id: 'jg5', name: '방패 벽', desc: '막기 확률 +8%, 방어도 +20%, 막아 내면 2초 동안 최대 생명력 10%의 돌 보호막', req: 'jg2', stats: [ascendancyStatLine('blockChance', 8), ascendancyStatLine('armorPct', 20)], bloomMechanic: 'hero2__guardian' },
        { id: 'jg6', name: '불굴', desc: '물리 피해 감소 +4%, 빙결과 출혈에 걸리지 않음', req: 'jg3', stats: [ascendancyStatLine('dr', 4)], uniques: [ascendancyUniqueLine('immuneFreeze'), ascendancyUniqueLine('immuneBleed')] },
        { id: 'jg7', name: '파성추', desc: '강타 피해 +60%, 방어도 1000마다 물리 스킬 피해 +3%', reqAny: ['jg4', 'jg5'], stats: [ascendancyStatLine('slamPctDmg', 60)], uniques: [ascendancyUniqueLine('realmArmorToPhysicalDamage', {pctPer1000: 3})] },
        { id: 'jg8', name: '멈출 수 없는 진군', desc: '방어도 +40%, 최대 생명력 +15%, 몬스터에게 받는 피해 6% 감소(보스 10%), 대신 이동 속도 -8%', req: 'jg7', stats: [ascendancyStatLine('armorPct', 40), ascendancyStatLine('pctHp', 15), ascendancyStatLine('move', -8)], uniques: [ascendancyUniqueLine('guardianArmor', {takenLessPct: 6, bossTakenLessPct: 10})] },
        { id: 'jg9', name: '거신', desc: '강타 피해 +120%, 근접 타격마다 2초 동안 방어도 5% 증폭(최대 3중첩)', fifthJobOnly: true, stats: [ascendancyStatLine('slamPctDmg', 120)], uniques: [ascendancyUniqueLine('realmMeleeArmorAmp', {ampPct: 5, maxStacks: 3, duration: 2})] }
    ],
    bladedancer: [
        { id: 'bd1', name: '흐르는 칼끝', desc: '공격 속도 +12%', req: null, stats: [ascendancyStatLine('aspd', 12)] },
        { id: 'bd2', name: '잔상', desc: '회피 +20%', req: null, stats: [ascendancyStatLine('evasionPct', 20)] },
        { id: 'bd3', name: '비껴내기', desc: '비껴내기 확률 +8%', req: null, stats: [ascendancyStatLine('deflectChance', 8)] },
        { id: 'bd4', name: '연무', desc: '연속 타격 +8%, 치명타 확률 +3%', req: 'bd1', stats: [ascendancyStatLine('ds', 8), ascendancyStatLine('crit', 3)] },
        { id: 'bd5', name: '바람 걸음', desc: '회피할 때마다 4초 동안 회피 +4%, 이동 속도 +2%(최대 4중첩)', req: 'bd2', uniques: [ascendancyUniqueLine('evasionDanceOnEvade', {maxStacks: 4, evasionPctPerStack: 4, movePerStack: 2, duration: 4})] },
        { id: 'bd6', name: '흘려보내기', desc: '비껴내기 확률 +4%, 비껴내면 3초 동안 이동 속도 +15%, 회피 +15%, 치명타 피해 +15%', req: 'bd3', stats: [ascendancyStatLine('deflectChance', 4)], uniques: [ascendancyUniqueLine('deflectGrantShadowStealth', {duration: 3, move: 15, evasionPct: 15, critDmg: 15})] },
        { id: 'bd7', name: '검무', desc: '치명타 피해 +30%, 적이 하나뿐이면 참격이 되돌아와 원 피해의 20%로 한 번 더 스침(명중과 상태이상 판정은 따로)', reqAny: ['bd4', 'bd5'], stats: [ascendancyStatLine('critDmg', 30)], bloomMechanic: 'hero4__hunter' },
        { id: 'bd8', name: '칼바람', desc: '근접 피해 +70%, 연속 타격 +10%, 공격 대상 +1, 대신 최대 생명력 -10%', req: 'bd7', stats: [ascendancyStatLine('meleePctDmg', 70), ascendancyStatLine('pctHp', -10)], uniques: [ascendancyUniqueLine('dsAndTargetAnyBonus', {ds: 10, target: 1})] },
        { id: 'bd9', name: '천검의 춤', desc: '공격 속도 +18%, 치명타 피해 +50%, 적이 둘 이하일 때 회피 40% 증폭', fifthJobOnly: true, stats: [ascendancyStatLine('aspd', 18), ascendancyStatLine('critDmg', 50)], uniques: [ascendancyUniqueLine('fewEnemyEvasionMore', {minEnemies: 1, maxEnemies: 2, morePct: 40})] }
    ],
    stormarcher: [
        { id: 'sa1', name: '번개 화살', desc: '번개 피해 +35%, 피해의 20%를 번개 피해로 추가', req: null, stats: [ascendancyStatLine('lightPctDmg', 35), ascendancyStatLine('addedLightDamagePct', 20)] },
        { id: 'sa2', name: '질풍 시위', desc: '투사체 피해 +30%', req: null, stats: [ascendancyStatLine('projectilePctDmg', 30)] },
        { id: 'sa3', name: '바람 발', desc: '이동 속도 +10%', req: null, stats: [ascendancyStatLine('move', 10)] },
        { id: 'sa4', name: '감전', desc: '감전 확률 +20%, 감전된 적에게 주는 피해 10% 증폭', req: 'sa1', stats: [ascendancyStatLine('shockChance', 20), ascendancyStatLine('shockedEnemyHitDamageMorePct', 10)] },
        { id: 'sa5', name: '연사', desc: '공격 속도 +6%, 세 번째 공격마다 그 스킬의 대상 +3, 피해 +33%', req: 'sa2', stats: [ascendancyStatLine('aspd', 6)], bloomMechanic: 'hero1__gladiator' },
        { id: 'sa6', name: '폭풍 걸음', desc: '회피 +10%, 적을 처치하면 6초 동안 이동 속도 +4%(최대 5중첩)', req: 'sa3', stats: [ascendancyStatLine('evasionPct', 10)], uniques: [ascendancyUniqueLine('realmKillMoveStacks', {movePerStack: 4, maxStacks: 5, duration: 6, cooldownSec: 1})] },
        { id: 'sa7', name: '뇌전 폭우', desc: '번개 피해 +35%, 감전 효과 +15%, 감전된 적을 맞히면 그 타격 피해의 80%로 한 번 더 침(0.8초마다), 감전에 걸리지 않음', reqAny: ['sa4', 'sa5'], stats: [ascendancyStatLine('lightPctDmg', 35)], uniques: [ascendancyUniqueLine('shockTracerGreaves', {shockEffectPct: 15, strikeDamagePct: 80, icdSec: 0.8})] },
        { id: 'sa8', name: '폭풍의 눈', desc: '투사체 피해 +70%, 저항 관통 +10%, 대신 방어도 -30%', req: 'sa7', stats: [ascendancyStatLine('projectilePctDmg', 70), ascendancyStatLine('resPen', 10), ascendancyStatLine('armorPct', -30)] },
        { id: 'sa9', name: '하늘을 가르는 화살', desc: '투사체 피해 +60%, 번개 피해 +60%, 타격마다 감전 판정을 한 번 더 함', fifthJobOnly: true, stats: [ascendancyStatLine('projectilePctDmg', 60), ascendancyStatLine('lightPctDmg', 60)], uniques: [ascendancyUniqueLine('alwaysShock')] }
    ],
    grovewarden: [
        { id: 'gw1', name: '서리 이끼', desc: '냉기 피해 +35%', req: null, stats: [ascendancyStatLine('coldPctDmg', 35)] },
        { id: 'gw2', name: '독초', desc: '중독 확률 +20%', req: null, stats: [ascendancyStatLine('poisonChance', 20)] },
        { id: 'gw3', name: '수액 재생', desc: '생명력 재생 +0.8%', req: null, stats: [ascendancyStatLine('regen', 0.8)] },
        { id: 'gw4', name: '얼음 포자', desc: '빙결 확률 +10%, 한기와 빙결에 걸리지 않음', req: 'gw1', stats: [ascendancyStatLine('freezeChance', 10)], uniques: [ascendancyUniqueLine('frostSentinelBoots')] },
        { id: 'gw5', name: '맹독 수액', desc: '중독 피해 +25%, 중독 최대 중첩 +1', req: 'gw2', uniques: [ascendancyUniqueLine('venomStride', {poisonMorePct: 25, poisonExtraStack: 1})] },
        { id: 'gw6', name: '뿌리 갑주', desc: '모든 원소 저항 +10%, 생명력 재생 +1%, 재생 속도 +20%', req: 'gw3', stats: [ascendancyStatLine('resAll', 10)], uniques: [ascendancyUniqueLine('realmRegenRateAndRegen', {regenRatePct: 20, regen: 1})] },
        { id: 'gw7', name: '숲의 분노', desc: '원소 피해 +45%, 지속 피해 +30%, 끝난 상태이상이 씨앗으로 남아 다른 상태이상을 걸면 남은 피해가 터짐', reqAny: ['gw4', 'gw5'], stats: [ascendancyStatLine('elementalPctDmg', 45), ascendancyStatLine('dotPctDmg', 30)], bloomMechanic: 'hero3__catalyst' },
        { id: 'gw8', name: '고목의 맹세', desc: '최대 생명력 +15%, 타격 시 15% 확률로 2초 동안 최대 생명력 6%의 보호막', req: 'gw7', stats: [ascendancyStatLine('pctHp', 15)], uniques: [ascendancyUniqueLine('dragonVeinGuard', {chance: 15, duration: 2, hpPct: 6})] },
        { id: 'gw9', name: '세계수의 숨결', desc: '냉기 피해 +90%, 중독 피해 +60%, 원소 타격마다 그 적의 원소 저항 -2%(최대 -15%)', fifthJobOnly: true, stats: [ascendancyStatLine('coldPctDmg', 90), ascendancyStatLine('poisonDamageMultiplierPct', 60)], uniques: [ascendancyUniqueLine('stackingElementalResDownOnHit', {perHit: 2, max: 15})] }
    ],
    bombardier: [
        { id: 'bm1', name: '불붙은 병', desc: '포션 스킬 피해 +35%', req: null, stats: [ascendancyStatLine('potionPctDmg', 35)] },
        { id: 'bm2', name: '넓은 투척', desc: '범위 피해 +25%', req: null, stats: [ascendancyStatLine('aoePctDmg', 25)] },
        { id: 'bm3', name: '화약 냄새', desc: '점화 확률 +15%, 피해의 10%를 화염 피해로 추가', req: null, stats: [ascendancyStatLine('igniteChance', 15), ascendancyStatLine('addedFireDamagePct', 10)] },
        { id: 'bm4', name: '이중 폭발', desc: '피해 2배 확률 +6%', req: 'bm1', stats: [ascendancyStatLine('doubleDamageChance', 6)] },
        { id: 'bm5', name: '파편', desc: '범위 피해 +20%, 적을 처치하고 남은 피해가 다른 적 모두에게 튐', req: 'bm2', stats: [ascendancyStatLine('aoePctDmg', 20)], uniques: [ascendancyUniqueLine('overkillSplash')] },
        { id: 'bm6', name: '화상 연쇄', desc: '점화 피해 +35%, 점화가 점화 확률의 40% 확률로 30% 증폭되고, 증폭된 점화 위에 새 점화가 걸리면 남은 점화 피해의 15%가 바로 터짐', req: 'bm3', stats: [ascendancyStatLine('igniteDamageMultiplierPct', 35)], bloomMechanic: 'hero6__catalyst' },
        { id: 'bm7', name: '대폭발', desc: '포션 스킬 피해 +60%, 화염 피해 +35%, 처치한 적이 15% 확률로 터져 다른 적에게 그 적 최대 생명력 20%의 피해', reqAny: ['bm4', 'bm5'], stats: [ascendancyStatLine('potionPctDmg', 60), ascendancyStatLine('firePctDmg', 35)], uniques: [ascendancyUniqueLine('corpseExplodeOnKill', {chance: 15, lifePct: 20})] },
        { id: 'bm8', name: '방폭 장비', desc: '물리 피해 감소 +6%, 회피 +15%, 점화에 걸리지 않음', req: 'bm7', stats: [ascendancyStatLine('dr', 6), ascendancyStatLine('evasionPct', 15)], uniques: [ascendancyUniqueLine('immuneIgnite')] },
        { id: 'bm9', name: '연쇄 폭파', desc: '포션 스킬 피해 +120%, 범위 피해 +50%, 타격 시 10% 확률로 준 피해의 60%를 다른 적 모두에게', fifthJobOnly: true, stats: [ascendancyStatLine('potionPctDmg', 120), ascendancyStatLine('aoePctDmg', 50)], uniques: [ascendancyUniqueLine('realmRiftWaveOnHit', {chance: 10, damagePct: 60})] }
    ]
});

// ── 전직 노드(n1~n13d): 자리와 배율, 전직마다 바꾸는 노드 ─────────────────────────────────────────
// 자리(n1~n9)는 m1 · m2 · d 능력치를 진입(entry) · 주요(major) 기준값에 배율을 곱해 쓴다. nodes에 적은 노드는
// 그 자리를 바꾼다: { stat, val }(고정) · { stat, tier, mul, from }(from 능력치의 기준값과 배율) · { stats: [...] }.
// slots는 m1 · m2 · d 자체를 바꾼다. ult는 n10, core는 시련 4 뒤 n11 · n12, job은 재능 개화 n13c · n13d.
// 기존 12종의 값은 2026-10-02 개편 전 getClassTreeDef와 같다.
const ASCENDANCY_NODE_LAYOUT = Object.freeze([
    ['n1', 'm1', 'entry', 1.5, null], ['n2', 'm2', 'entry', 1.5, 'n1'], ['n3', 'd', 'entry', 1.5, 'n1'],
    ['n4', 'm1', 'major', 1.5, 'n2'], ['n5', 'm2', 'major', 1.5, ['n2', 'n3']], ['n6', 'd', 'major', 1.5, 'n3'],
    ['n7', 'm1', 'major', 2.2, 'n4'], ['n8', 'm2', 'major', 2.2, 'n5'], ['n9', 'd', 'major', 2.2, 'n6']
]);
const ASCENDANCY_NODE_FALLBACK = Object.freeze({
    ult: { stat: 'pctDmg', val: 100 },
    core: [{ stat: 'pctDmg', val: 55 }, { stat: 'critDmg', val: 45 }],
    job: [{ stat: 'pctDmg', val: 40 }, { stat: 'pctHp', val: 20 }]
});
const ASCENDANCY_NODE_DEFS = {
    warrior: { nodes: { n5: ascendancyScaledNode('critDmg', 'major', 1.15), n8: ascendancyScaledNode('physIgnore', 'major', 1.25), n10: { stat: 'physIgnore', val: 16 } },
        core: [{ stat: 'physPctDmg', val: 52 }, { stat: 'critDmg', val: 62 }], job: [{ stat: 'aspd', val: 16 }, { stat: 'dr', val: 12 }] },
    gladiator: { ult: { stat: 'meleePctDmg', val: 50 }, core: [{ stat: 'aspd', val: 15 }, { stat: 'ds', val: 20 }], job: [{ stat: 'critDmg', val: 55 }, { stat: 'evasionPct', val: 18 }] },
    assassin: { nodes: { n6: ascendancyScaledNode('physIgnore', 'major', 1.15) }, ult: { stat: 'critDmg', val: 90 },
        core: [{ stat: 'critDmg', val: 80 }, { stat: 'crit', val: 18 }], job: [{ stat: 'move', val: 18 }, { stat: 'evasionPct', val: 20 }] },
    ranger: { nodes: { n5: ascendancyScaledNode('aspd', 'major', 1.55) }, ult: { stat: 'projectilePctDmg', val: 80 },
        core: [{ stat: 'projectilePctDmg', val: 50 }, { stat: 'move', val: 20 }], job: [{ stat: 'aspd', val: 18 }, { stat: 'critDmg', val: 55 }] },
    elementalist: { nodes: { n6: ascendancyScaledNode('resPen', 'major', 1.2), n10: { stat: 'resPen', val: 16 } },
        core: [{ stat: 'elementalPctDmg', val: 52 }, { stat: 'resPen', val: 16 }], job: [{ stat: 'resPen', val: 14 }, { stat: 'critDmg', val: 50 }] },
    warlock: { nodes: {
        // 지속 피해 배율(%) 노드(n2 진입 · n5 주요)에는 같은 수치의 주문 내장 피해 증가(%)를 함께 준다.
        n2: { stats: [ascendancyScaledNode('dotPctDmg', 'entry', 1.5), ascendancyScaledNode('spellFlatPct', 'entry', 1.5, 'dotPctDmg')] },
        n5: { stats: [ascendancyScaledNode('dotPctDmg', 'major', 1.5), ascendancyScaledNode('spellFlatPct', 'major', 1.5, 'dotPctDmg')] },
        n8: ascendancyScaledNode('resPen', 'major', 1.15)
    }, ult: { stat: 'chaosPctDmg', val: 30 }, core: [{ stat: 'chaosPctDmg', val: 42 }, { stat: 'dotPctDmg', val: 28 }], job: [{ stat: 'resPen', val: 14 }, { stat: 'pctHp', val: 22 }] },
    guardian: { nodes: { n5: ascendancyScaledNode('armorPct', 'major', 1.6), n6: ascendancyScaledNode('resAll', 'major', 1.5), n8: ascendancyScaledNode('regen', 'major', 1.8), n10: { stat: 'dr', val: 14 } },
        core: [{ stat: 'armorPct', val: 24 }, { stat: 'regen', val: 2.4 }], job: [{ stat: 'resAll', val: 14 }, { stat: 'regen', val: 2.0 }] },
    inquisitor: { nodes: { n6: ascendancyScaledNode('critDmg', 'major', 1), n9: ascendancyScaledNode('resPen', 'major', 1), n10: { stat: 'resPen', val: 12 } },
        core: [{ stat: 'elementalPctDmg', val: 45 }, { stat: 'gemLevel', val: 2 }], job: [{ stat: 'resPen', val: 14 }, { stat: 'critDmg', val: 55 }] },
    soulbinder: { slots: { m1: 'summonPctDmg', m2: 'summonHpPct', d: 'summonAspd' }, nodes: { n4: ascendancyScaledNode('summonPctDmg', 'major', 1), n7: ascendancyScaledNode('summonPctDmg', 'major', 1.5), n6: ascendancyScaledNode('summonAspd', 'major', 1), n9: ascendancyScaledNode('summonAspd', 'major', 1.5), n10: { stat: 'summonPctDmg', val: 30 } }, core: [{ stat: 'summonPctDmg', val: 25 }, { stat: 'summonCritDmg', val: 45 }],
        job: [{ stat: 'summonPctDmg', val: 55 }, { stat: 'summonHpPct', val: 30 }] },
    catalyst: { slots: { m1: 'dotPctDmg', m2: 'igniteDamageMultiplierPct', d: 'poisonDamageMultiplierPct' }, nodes: {
        n4: ascendancyScaledNode('igniteDamageMultiplierPct', 'major', 1.5), n5: ascendancyScaledNode('dotPctDmg', 'major', 1.5),
        n7: ascendancyScaledNode('igniteDamageMultiplierPct', 'major', 2.2), n8: ascendancyScaledNode('dotPctDmg', 'major', 2.2), n10: { stat: 'dotPctDmg', val: 40 }
    }, core: [{ stat: 'poisonDamageMultiplierPct', val: 45 }, { stat: 'dotPctDmg', val: 40 }], job: [{ stat: 'dotPctDmg', val: 55 }, { stat: 'igniteDamageMultiplierPct', val: 35 }] },
    hunter: { ult: { stat: 'critDmg', val: 60 }, core: [{ stat: 'projectilePctDmg', val: 50 }, { stat: 'critDmg', val: 55 }], job: [{ stat: 'projectilePctDmg', val: 55 }, { stat: 'aspd', val: 16 }] },
    crusader: { nodes: {
        n1: { stats: [ascendancyScaledNode('physPctDmg', 'entry', 1.5), ascendancyScaledNode('lightPctDmg', 'entry', 1.5)] },
        n2: ascendancyScaledNode('armorPct', 'entry', 1.5), n3: ascendancyScaledNode('resAll', 'entry', 1.5),
        n4: { stats: [ascendancyScaledNode('physPctDmg', 'major', 1.5), ascendancyScaledNode('lightPctDmg', 'major', 1.5)] },
        n5: ascendancyScaledNode('energyShieldPct', 'major', 1.5), n6: ascendancyScaledNode('dr', 'major', 1.5),
        n7: { stats: [ascendancyScaledNode('physPctDmg', 'major', 2.2), ascendancyScaledNode('lightPctDmg', 'major', 2.2)] },
        n8: ascendancyScaledNode('armorPct', 'major', 2.2), n9: ascendancyScaledNode('resAll', 'major', 2.2)
    }, ult: { stat: 'lightPctDmg', val: 50 }, core: [{ stat: 'lightPctDmg', val: 52 }, { stat: 'energyShieldPct', val: 24 }], job: [{ stat: 'lightPctDmg', val: 50 }, { stat: 'armorPct', val: 20 }] },
    // 2026-10-02에 더한 여섯(임시 수치)
    berserker: { ult: { stat: 'aspd', val: 24 }, core: [{ stat: 'meleePctDmg', val: 52 }, { stat: 'leech', val: 0.8 }], job: [{ stat: 'aspd', val: 16 }, { stat: 'critDmg', val: 50 }] },
    juggernaut: { ult: { stat: 'slamPctDmg', val: 80 }, core: [{ stat: 'slamPctDmg', val: 50 }, { stat: 'armorPct', val: 26 }], job: [{ stat: 'dr', val: 12 }, { stat: 'slamPctDmg', val: 50 }] },
    bladedancer: { ult: { stat: 'critDmg', val: 70 }, core: [{ stat: 'aspd', val: 20 }, { stat: 'evasionPct', val: 24 }], job: [{ stat: 'move', val: 18 }, { stat: 'deflectChance', val: 12 }] },
    stormarcher: { ult: { stat: 'lightPctDmg', val: 70 }, core: [{ stat: 'lightPctDmg', val: 50 }, { stat: 'shockChance', val: 20 }], job: [{ stat: 'projectilePctDmg', val: 50 }, { stat: 'resPen', val: 12 }] },
    grovewarden: { ult: { stat: 'coldPctDmg', val: 70 }, core: [{ stat: 'coldPctDmg', val: 50 }, { stat: 'poisonDamageMultiplierPct', val: 30 }], job: [{ stat: 'freezeChance', val: 15 }, { stat: 'regen', val: 2 }] },
    bombardier: { ult: { stat: 'potionPctDmg', val: 80 }, core: [{ stat: 'aoePctDmg', val: 45 }, { stat: 'firePctDmg', val: 40 }], job: [{ stat: 'potionPctDmg', val: 50 }, { stat: 'igniteDamageMultiplierPct', val: 30 }] }
};

// 기존 12종 키스톤의 수치(2026-10-07 직업 밸런스, 예전에는 js/combat.js에 박혀 있었다). 전투, 효과 문구, 상태 표시가 같은 값을 쓴다.
// 실제 보스전으로 잰 루프 10 피해 배율이 전직마다 1.5~17배였다(크루세이더 17, 헌터와 글래디에이터 7, 워록 6.9, 가디언 6.3).
// 이 값으로 1.5~2.8배(인퀴지터 3.8). 측정과 근거는 docs/ascendancy-balance-20261007.md.
// w5(중첩당 물리 피해)는 js/combat.js WARRIOR_RAGE_STACK_DAMAGE_PCT와 같게 둔다(검사가 그 파일 일부만 떼어 돌린다).
const ASCENDANCY_KEYSTONE_VALUES = Object.freeze({
    // 워리어
    w1: { physMorePct: 10, armorMorePct: 15 }, w2: { aspdPctPerStack: 3 }, w4: { physIgnore: 0 }, w5: { physMorePctPerStack: 6 },
    w7: { damageMorePct: 10 }, w8: { crit: 3, critDmg: 15, aspdMorePct: 5, moveMorePct: 15, damageMorePct: 3, ds: 5 },
    w9: { damageMorePct: 10, takenMorePct: 10 },
    // 글래디에이터
    g1: { physMorePct: 15, otherLessPct: 20 }, g2: { aspdPctPerStack: 2 },
    g7: { evasionPerDs: 150, dsMax: 15, armorPerCrit: 500, critMax: 10 }, g8: { ds: 15, damageMorePct: 5, bossDamageMorePct: 10, bossTakenMorePct: 18 },
    // 어쌔신
    a3: { takenPctPerStack: 2 }, a7: { extraHitPct: 50 }, a8: { critDmgMul: 1.5 },
    // 레인저
    r2: { aspdMorePct: 15 }, r4: { aspdPctPerMovePct: 0.1 }, r6: { damageMorePctPerTarget: 4 }, r7: { critPerSecond: 3 },
    // 헌터(h8은 초과 치명타를 없애 화면 추정과 전투가 같다)
    h1: { singleMorePct: 15, multiMorePct: 10 }, h2: { takenMorePct: 10 }, h5: { critDmg: 250, critLess: 10 },
    h7: { dsPerTarget: 10, dsPerTargetAfterFive: 5 }, h8: { critDmg: 50 },
    // 크루세이더
    cr3: { levelMulPer100Es: 0.02 }, cr6: { maxRollMul: 1.35 },
    // 엘리멘탈리스트
    e7: { ailmentPowerMul: 1.5 }, e8: { morePctPerStack: 2 }, e9: { resPen: 30 },
    // 워록
    wlk1: { chaosMorePct: 10 }, wlk6: { critToPenPct: 50, rangePct: 50 }, wlk7: { esDamageMorePct: 10, bloodPactMorePct: 10 },
    wlk8: { chaosMorePct: 15 }, wlk9: { chaosTakenPctPerStack: 2 },
    // 가디언(gd4는 회피와 에너지 보호막을 지우지 않는다: 성직자 생존력이 1/3로 떨어지던 함정)
    gd1: { damagePctPer100Armor: 2, damagePctMax: 80 }, gd2: { lifeMorePct: 20, esMorePct: 20 }, gd4: { evasionToArmorPct: 100, keepEvasion: 1 },
    // 인퀴지터
    iq1: { resonancePct: 20 }, iq4: { resistanceKeptPct: 75 }, iq5: { resPen: 12 }, iq8: { penToDamagePct: 15 },
    iq9: { resonancePerSupport: 3, extraSupports: 2 },
    // 소울바인더
    sb1: { summonBaseMorePct: 15 }, sb5: { sharePct: 40 }, sb7: { sharePct: 25 },
    // 카탈리스트
    ct2: { resPctOfDot: 5, maxResPctOfDot: 0.5 }, ct6: { dotMorePct: 35, durationLessPct: 25 }, ct7: { critChanceToDotPct: 50, critDmgToDotPct: 10 },
    ct9: { fasterPct: 30 }
});

safeExposeData({ ASCENDANCY_KEYSTONE_VALUES, CLASS_TEMPLATES, CLASS_KEYSTONE_PICK_LIMIT, CLASS_KEYSTONE_DEFS, ASCENDANCIES_BY_PLAYER_CLASS, ASCENDANCY_NODE_LAYOUT, ASCENDANCY_NODE_FALLBACK, ASCENDANCY_NODE_DEFS });
