'use strict';

const PASSIVE_KEYSTONE_CONTRACTS = Object.freeze([
    contract('pt_core_keystone_01', '금단의 만상',
        '모든 명중 피해가 피해 유형과 관계없이 점화, 냉각, 감전, 중독 및 출혈을 유발할 수 있습니다.\n' +
        '이 방식으로 유발한 상태 이상의 피해와 위력이 50% 감폭됩니다.\n' +
        '총 방어도·회피·에너지 보호막이 60% 감폭됩니다.\n' +
        '막기 및 비껴내기의 최대 확률이 25%가 됩니다.'),
    contract('pt_core_keystone_02', '타락한 복음',
        '보유한 모든 계시가 광신으로 대체됩니다.\n계시의 효과를 받을 수 없습니다.\n' +
        '같은 주력 스킬을 계속 사용하면 광신 수치까지 열광을 획득합니다.\n' +
        '열광 1당 피해가 1.5% 증가하고 스킬 속도가 0.5% 증가하며, 총 방어도·회피·에너지 보호막이 0.75% 감폭됩니다.'),
    contract('pt_core_keystone_03', '육신과 정신의 성약',
        '패시브 트리에서 배분한 힘과 지능은 해당 능력치를 제공하지 않습니다.\n' +
        '배분한 힘 10과 지능 10당 계시 1을 얻습니다.\n기본 능력치, 장비 및 일시적인 효과는 전환되지 않습니다.'),
    contract('pt_core_keystone_04', '카르마',
        '정예 또는 고유 몬스터에게 실제로 잃은 생명력과 에너지 보호막에 따라, 해당 몬스터에게 귀속된 카르마를 축적합니다.\n' +
        '해당 몬스터를 공격하면 카르마를 모두 소비해 카르마 5당 그 대상에게 주는 피해가 1% 증폭됩니다.\n' +
        '대상별 카르마는 최대 500이며, 피해 증폭은 4초 또는 피해를 주는 스킬 행동 5회 중 먼저 충족되는 시점까지 지속됩니다.'),
    contract('pt_core_keystone_05', '아슈라',
        '피격된 피해 속성에 대응하는 상태 이상 유발 확률이 순환 1당 1%p 증가합니다.\n' +
        '대응 상태 이상이 이미 지속 중이면, 남은 지속시간 1초와 순환 1당 해당 속성으로 받는 피해가 0.1% 감폭됩니다(최대 50%).\n' +
        '대응 상태 이상을 유발한 최초 피해에는 이 피해 감폭이 적용되지 않습니다.'),
    contract('pt_core_keystone_06', '사중합일',
        '힘, 민첩, 지능 및 신비가 정확히 동일하고 각각 20 이상이면 전지 상태가 됩니다.\n' +
        '전지 상태에서 기본 피해의 능력치 1당 0.5%를 추가 고정 피해로 가합니다. 이 효과는 최대 25%입니다.\n' +
        '전지 상태에서 능력치에 비례한 전지 방벽을 얻습니다.\n' +
        '전지의 고정 피해는 치명타, 피해 증가·배율, 속성 전환, 상태 이상 및 생명력 흡수의 영향을 받지 않습니다.'),
    contract('npqq5m7h2ri', '순환의 원석',
        '힘 30당 순환 1을 얻습니다.\n순환 1당 주는 물리 피해의 3%를 추가 화염 피해로 가합니다.\n순환 5당 방어도가 5% 증가합니다.'),
    contract('n39ip40yc3d', '야만',
        '무기를 장착할 수 없습니다.\n레벨 1당 공격력이 5 증가합니다.\n힘 10당 공격력이 1 증가합니다.\n' +
        '민첩과 지능이 힘으로 전환됩니다.\n공격이 항상 명중합니다.'),
    contract('nv67fzprmet', '헌신의 서약',
        '연결된 능력치 노드 1개당 계시 1을 획득합니다.\n능력치 노드에서는 헌신의 서약을 할당할 수 없습니다.'),
    contract('nkr7zwrymol', '몰아의 통로',
        '채널링 스킬이 같은 대상에게 연속 적중할 때 집중을 얻습니다(최대 6).\n집중 1당 채널링 피해가 7% 증폭됩니다.\n' +
        '채널 종료, 대상 변경 또는 군중 제어로 중단되면 집중이 초기화됩니다.\n비채널링 스킬 피해가 20% 감폭됩니다.'),
    contract('nxsxdk1yr2y', '최후방 사격',
        '투사체 주력 스킬 사용 시 가능한 경우 적과 3칸 거리를 유지합니다.\n3칸 이상 떨어진 적에게 주는 투사체 피해가 25% 증폭됩니다.\n' +
        '인접한 적에게 주는 투사체 피해가 25% 감폭됩니다.'),
    contract('n2c51dapljo', '결투의 규율',
        '살아 있는 적이 1명일 때 근접 피해가 35% 증폭되고 받는 피해가 10% 감폭됩니다.\n' +
        '살아 있는 적이 2명 이상일 때 근접 피해가 15% 감폭됩니다.'),
    contract('nkf64engb6m', '지혜의 도약',
        '선택한 속성의 스킬 피해가 20% 증폭됩니다(공허 선택 시 카오스).\n선택하지 않은 속성의 스킬은 피해를 줄 수 없습니다.'),
    contract('backbone_branch_occultist_cleric_center_occultist_cleric_channel_guard_keystone', '혼의 성소',
        '생명력 재생률과 주문 흡혈이 에너지 보호막에 적용됩니다.\n생명력은 재생하거나 흡혈할 수 없습니다.'),
    contract('backbone_branch_cleric_warrior_center_cleric_warrior_guard_regen_keystone', '움직이는 성벽',
        '모든 회피가 같은 수치의 방어도로 전환됩니다.\n막기 확률 최대치가 5%p 증가합니다.\n' +
        '비껴내기를 사용할 수 없고 이동 속도가 10% 감소합니다.'),
    contract('backbone_branch_warrior_wanderer_center_warrior_wanderer_roll_speed_keystone', '피의 가속',
        '생명력을 재생할 수 없습니다.\n생명력이 최대일 때도 생명력 흡수가 유지됩니다.\n흡혈 중 공격 속도와 이동 속도가 15% 증가합니다.'),
    contract('backbone_branch_wanderer_archer_center_wanderer_archer_range_roll_keystone', '선제 사냥',
        '각 적에게 가하는 첫 공격의 피해가 100% 증폭됩니다.\n첫 공격 이후 해당 적에게 주는 피해가 20% 감폭됩니다.'),
    contract('backbone_branch_archer_alchemist_center_archer_alchemist_area_projectile_keystone', '오염된 탄두',
        '투사체 스킬은 치명타를 가할 수 없습니다.\n투사체로 유발하는 점화, 중독 및 출혈 확률이 20%p 증가하고 피해가 50% 증폭됩니다.'),
    contract('backbone_branch_alchemist_occultist_center_alchemist_occultist_energy_poison_keystone', '검은 증류',
        '원소 피해의 50%가 카오스 피해로 전환됩니다.\n원소 상태 이상을 유발할 수 없습니다.\n중독 확률이 20%p 증가합니다.'),
    contract('backbone_branch_occultist_outer_2_mystique_single_keystone', '단일 해석',
        '가장 높은 피해 속성에 대응하는 상태 이상만 유발할 수 있습니다.\n신비가 제공하는 상태 이상 확률, 피해 및 위력 효과가 2배가 됩니다.'),
    contract('backbone_branch_occultist_outer_4_occultist_summon_keystone', '남겨진 잠식',
        '적 처치 시 해당 적의 카오스 잠식 중첩 50%를 다음 공격 대상으로 이전합니다.\n카오스 잠식 최대치가 20 증가합니다.\n' +
        '카오스 명중 피해가 15% 감폭됩니다.'),
    contract('backbone_branch_cleric_outer_1_devotion_triple_keystone', '삼중 계시',
        '계시 방향을 선택할 수 없습니다.\n전투, 수호 및 생명 계시 효과를 각각 40%의 효과로 모두 받습니다.\n' +
        '타락한 복음과 동시에 할당할 수 없습니다.'),
    contract('backbone_branch_cleric_outer_4_cleric_summon_efficiency_keystone', '대리 성약',
        '방어형 소환수의 피해 대리 비율이 50%p 증가하고 생명력이 100% 증폭됩니다.\n플레이어는 막기와 비껴내기를 사용할 수 없습니다.\n' +
        '방어형 소환수의 부활 대기시간이 100% 증가합니다.'),
    contract('backbone_branch_warrior_outer_1_cycle_reverse_keystone', '역행 순환',
        '순환 효과가 상태 이상 종료 시가 아니라 상태 이상 시작 시 발동합니다.\n순환 효과는 한 종류만 유지되며 효과가 50% 감폭됩니다.'),
    contract('backbone_branch_warrior_outer_4_warrior_bleed_keystone', '한 번의 중량',
        '공격 피해 편차가 항상 최대 피해로 결정됩니다.\n공격 스킬 속도가 30% 감폭됩니다.'),
    contract('backbone_branch_wanderer_outer_4_wanderer_duel_keystone', '완전 회피',
        '방어도와 막기 확률이 0이 됩니다.\n회피 확률이 15%p 증가합니다(최대 90%).\n공격을 회피하면 다음 근접 공격의 치명타가 확정됩니다.'),
    contract('backbone_branch_archer_outer_4_archer_physical_keystone', '관통 행렬',
        '투사체 스킬 대상 수가 2 증가합니다.\n두 번째 이후 대상에게 주는 투사체 피해가 40% 감폭됩니다.\n' +
        '하나의 스킬 행동으로 같은 적을 중복 타격할 수 없습니다. 단, 회귀 타격은 예외입니다.'),
    contract('backbone_branch_alchemist_outer_1_universal_flask_keystone', '과잉 투여',
        '유틸리티 플라스크 효과가 50% 증폭됩니다.\n유틸리티 플라스크 최대 충전과 처치 시 획득 충전이 50% 감폭됩니다.'),
    contract('backbone_branch_alchemist_outer_2_universal_summon_keystone', '단 하나의 사역',
        '공격형 소환수 최대 한도가 1이 됩니다.\n잃은 소환수 최대 한도 1당 남은 공격형 소환수의 피해가 75%, 생명력이 50% 증폭됩니다.\n' +
        '해당 소환수의 부활 대기시간이 100% 증가합니다.'),
    contract('backbone_branch_alchemist_outer_4_alchemist_resist_keystone', '폭발성 증류',
        '포션 스킬은 치명타를 가할 수 없고 명중 피해가 25% 감폭됩니다.\n' +
        '포션 스킬의 상태 이상 유발 확률이 25%p 증가하고 상태 이상 피해가 75% 증폭됩니다.')
]);

function contract(id, name, desc) {
    return Object.freeze({ id, name, desc, keystoneEffectId: `keystone:${id}` });
}

function applyPassiveKeystoneContracts(tree) {
    const nodes = new Map((tree.nodes || []).map(node => [String(node.id), node]));
    return PASSIVE_KEYSTONE_CONTRACTS.map(definition => {
        const node = nodes.get(definition.id);
        if (!node || node.type !== 'keystone') throw new Error(`키스톤 노드가 없습니다: ${definition.id}`);
        const before = { name: node.name, desc: node.desc, keystoneEffectId: node.keystoneEffectId };
        node.name = definition.name;
        node.desc = definition.desc;
        node.keystoneEffectId = definition.keystoneEffectId;
        return { id: definition.id, before, after: { name: node.name, desc: node.desc,
            keystoneEffectId: node.keystoneEffectId } };
    }).filter(row => JSON.stringify(row.before) !== JSON.stringify(row.after));
}

module.exports = { PASSIVE_KEYSTONE_CONTRACTS, applyPassiveKeystoneContracts };
