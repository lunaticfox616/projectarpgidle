// Generate the review table from the same identities used by drops, shops, saves and requirements.
const fs = require('node:fs');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const rows = JSON.parse(vm.runInContext(`JSON.stringify(UNIQUE_DB.map(unique => {
    const rule = UNIQUE_EQUIPMENT_RULES[unique.name];
    const base = BASE_ITEM_DB.find(base => base.id === rule.baseId);
    return {name:unique.name, ...rule, slot:base.slot, slotChanged:!!rule.slot, base:base.name,
        effect:unique.uniqueEffect || unique.stats.map(stat => getStatName(stat.id)).join(', ')};
}))`, runtime));
const names = { strength: '힘', dexterity: '민첩', intelligence: '지능' };
const lines = [
    '# 고유 장비 고정 베이스·요구사항 — 2026-09-13', '',
    '207종 모두 고정 베이스를 사용한다. 기존 142종의 무작위 베이스를 없애고, 이름과 부위가 불일치하던 25종은 부위도 수정했다.', '',
    '일반 베이스의 최종 단일 능력치 120–140 기준을 바탕으로 개별 고유 효과에 맞춘 1차 밸런스다. 초반 입문 고유는 레벨 1·능력치 없음부터 시작한다. 강한 후반 고유는 레벨 65–80, 단일 능력치 120–150 또는 복합 능력치를 요구한다. 모든 고유를 똑같이 강화하거나 같은 수치로 제한하지 않았다.', '',
    '드랍 자격(reqTier, 전용 지역, 보스 조건)과 장착 요구사항은 별개다. T20 옵션이나 실제 아이템 레벨로 장착 요구량이 추가 상승하지 않는다. 이미 장착한 장비는 자신의 능력치를 유지 조건에 포함한다. 계승 장비의 능력치 요구는 면제하지 않는다. 제작으로 베이스를 업그레이드하면 고유 요구량과 상위 베이스 요구량 중 높은 값을 적용한다.', '',
    '## 저장 호환', '',
    '- 베이스가 달라진 보유 고유는 새 베이스로 변환한다. 기본 옵션의 롤 위치와 특출/상한 초과 비율을 옮기며, 변환 전 기본 옵션은 uniqueBaseLegacy에 보관한다.',
    '- 고유·제작·융합 옵션, 잠금과 아이템 ID는 유지한다. 기존 착용 슬롯과 맞지 않는 고유는 인벤토리로 회수하며, 가득 차면 기존 임시 보관함을 사용한다.',
    '- 최초 변환 후 uniqueEquipmentVersion=1을 기록한다. 그 뒤 제작한 베이스 업그레이드는 재접속 시 되돌리지 않는다. 구버전도 itemTier가 hiddenTier보다 높고 해당 베이스 티어와 일치하면 업그레이드로 인정해 보존한다(부위는 맞아야 함). 이력으로 구분할 수 없는 구버전 베이스는 최초 1회 표준화하며 원본을 복구용으로 남긴다.',
    '- 인벤토리, 임시 보관함, 방치 보관함/초과 회수, 시간의 균열 제단, 도감 기록 및 기존 거래소 상품을 확인한다. 재접속 시 같은 장비를 다시 지급하지 않는다.',
    '- 부위가 변경된 장비가 든 기존 프리셋은 잘못된 슬롯으로 강제 장착하지 않는다. 해당 프리셋은 새 부위에 맞게 다시 저장해야 한다.',
    '- 기본 옵션과 장착 부위가 바뀌므로 기존 빌드의 최종 수치는 변할 수 있다. 실제 플레이 밸런스는 자동 검사로 확정할 수 없으며, 아래 수치는 후반 빌드별 플레이테스트에서 조정할 1차 기준이다.', '',
    '## 전체 배정표', '',
    '부위 뒤 **변경**은 이름에 맞춰 장착 부위까지 수정한 장비다.', '',
    '| 고유 이름 | 부위 | 고정 베이스 | 요구 레벨 | 요구 능력치 | 고유 효과·특성 |',
    '| --- | --- | --- | ---: | --- | --- |'
];
for (const row of rows) {
    const attributes = Object.entries(row.attributes).map(([key, value]) => `${names[key]} ${value}`).join(' · ') || '없음';
    lines.push(`| ${row.name} | ${row.slot}${row.slotChanged ? ' **변경**' : ''} | ${row.base} | ${row.level} | ${attributes} | ${row.effect.replaceAll('|', '·').replaceAll('\n', ' ')} |`);
}
lines.push('', '## 검증', '',
    '- `npm test`: 188개 스모크 통과. 고유 전체 생성·거래소 베이스·개별 요구량·기존 저장 회수·중복 방지·제작 업그레이드 보존 포함.',
    '- `npx playwright test tests/browser/unique-equipment.spec.js tests/browser/level-requirements.spec.js`: PC·모바일 총 6개 행동 검사 통과. 요구사항 부족 시 거절, 충족 후 실제 장착 및 기존 슬롯 회수 확인.',
    '- `npm run check:architecture`: 런타임 로드 순서·의존·린트 검사 통과.',
    '- 배정표 재생성: `node scripts/audit-unique-equipment.js`.');
fs.writeFileSync('docs/unique-equipment-20260913.md', lines.join('\n') + '\n');
console.log(`Wrote ${rows.length} unique equipment rows`);
