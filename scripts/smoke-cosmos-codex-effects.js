'use strict';
// 우주계 전용 도감(COSMOS_CODEX)의 모든 고유효과가 실제 구현된 효과 키이며,
// 표기 설명(effect)과 실제 효과(uniqueEffectKey)가 1:1로 일치함을 보장한다.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const items = fs.readFileSync(path.join(root, 'data/items.js'), 'utf8');
const combat = fs.readFileSync(path.join(root, 'js/combat.js'), 'utf8');

// 1) COSMOS_CODEX 추출 및 키 검증
const codexStart = items.indexOf('const COSMOS_CODEX');
const codexEnd = items.indexOf('const COSMOS_REALM_ENTRIES');
assert(codexStart >= 0 && codexEnd > codexStart, 'COSMOS_CODEX 정의를 찾을 수 없습니다.');
const codexBlock = items.slice(codexStart, codexEnd);

const entries = [...codexBlock.matchAll(/key:\s*'([A-Za-z0-9]+)'/g)].map(m => m[1]);
assert.strictEqual(entries.length, 50, `우주계 도감 효과는 50종이어야 합니다 (현재 ${entries.length}).`);
assert.strictEqual(new Set(entries).size, 50, '우주계 도감 효과 키는 모두 서로 달라야 합니다 (중복 금지).');

// 2) 제거되었어야 할 미구현 메타 옵션 흔적이 없어야 한다.
['COSMOS_EFFECT_KEYS', 'COSMOS_EFFECT_LINES', 'cosmosStatBundle'].forEach(token => {
  assert(!codexBlock.includes(token), `도감 블록에 제거 대상 토큰 ${token} 이 남아 있습니다.`);
});
assert(!items.includes('우주계 노드 도전 시 성공률'), '미구현 realm-메타 문구(노드 성공률)가 남아 있습니다.');
assert(!items.includes('우주계 보상 +15%'), '미구현 realm-메타 문구(우주계 보상)가 남아 있습니다.');
assert(!items.includes('은하 보스 격파 시 우주석'), '미구현 realm-메타 문구(우주석 드랍)가 남아 있습니다.');

// 3) 모든 키가 combat.js 의 구현된 고유효과 집합에 포함되어야 한다.
const implStart = combat.indexOf('let implemented = new Set');
const implEnd = combat.indexOf(']);', implStart);
assert(implStart >= 0 && implEnd > implStart, 'getUniqueEffectImplementationReport 의 implemented 집합을 찾을 수 없습니다.');
const implBlock = combat.slice(implStart, implEnd);
const implemented = new Set([...implBlock.matchAll(/'([A-Za-z][A-Za-z0-9]+)'/g)].map(m => m[1]));
const missing = entries.filter(k => !implemented.has(k));
assert.strictEqual(missing.length, 0, `미구현 효과 키가 도감에 사용됨: ${missing.join(', ')}`);

// 4) COSMOS_REALM_ENTRIES 가 COSMOS_CODEX 에서 파생되어 effect==desc 가 보장되는지 확인.
const derived = items.slice(codexEnd, codexEnd + 400);
assert(/COSMOS_CODEX\.map\(/.test(derived), 'COSMOS_REALM_ENTRIES 는 COSMOS_CODEX 에서 파생되어야 합니다(표기·효과 불일치 방지).');
assert(/uniqueEffectKey:\s*entry\.key/.test(derived), 'COSMOS_REALM_ENTRIES 가 entry.key 를 그대로 사용해야 합니다.');

console.log('smoke-cosmos-codex-effects: OK (50 distinct, all implemented, flavor==effect)');
