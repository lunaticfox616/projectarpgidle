'use strict';
// 잠식 해방: prompt 제거 → 오버레이, 취소 없음, 셋 중 하나 반드시 선택.
// confirmEncroachmentLiberation 이 선택을 확정하고 pendingOptions 를 비우는지 검증한다.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'passives.js'), 'utf8');

// prompt 기반 선택이 제거되고 오버레이 기반으로 바뀌었는지 (소스 레벨)
assert(src.includes('function openEncroachmentLiberationOverlay'), '오버레이 함수가 있어야 합니다.');
assert(src.includes('function confirmEncroachmentLiberation'), 'confirm 함수가 있어야 합니다.');
assert(!/잠식 해방:[^\n]*prompt\(/.test(src), '잠식 해방에 prompt() 가 남아 있으면 안 됩니다.');

// 4개 함수 블록 추출
const start = src.indexOf('function liberateSelectedEncroachedItem');
const expose = src.indexOf('safeExposeGlobals({ liberateSelectedEncroachedItem');
assert(start >= 0 && expose > start, '함수 블록을 찾을 수 없습니다.');
const block = src.slice(start, src.indexOf('\n', expose));

// 한 줄에 하나씩 서서히 공개되는 연출(스태거 setTimeout)이 있는지
assert(/setTimeout\([^]*idx \* \d+/.test(block), '옵션을 순차 공개하는 스태거 연출이 있어야 합니다.');
// 취소/닫기 버튼이 오버레이 마크업에 없어야 한다 (innerHTML 템플릿만 검사)
const tmplStart = block.indexOf('overlay.innerHTML =');
const tmplEnd = block.indexOf('options.forEach', tmplStart);
const tmpl = block.slice(tmplStart, tmplEnd);
assert(tmplStart >= 0 && tmplEnd > tmplStart, '오버레이 템플릿을 찾을 수 없습니다.');
assert(!/취소|닫기/.test(tmpl), '오버레이 마크업에 취소/닫기 문구가 없어야 합니다.');
assert(!/onclick="[^"]*close/.test(tmpl), '오버레이에 닫기(close) 버튼이 없어야 합니다.');

// 런타임 스텁
const fakeEl = () => ({ style: {}, disabled: true, set innerHTML(v) {}, remove() {} });
const ctx = {
  Math, Object, Array, Number, JSON, console,
  setTimeout: () => 0,
  document: { getElementById: () => fakeEl(), body: { insertAdjacentHTML: () => {} } },
  addLog: () => {},
  updateStaticUI: () => {},
  getStatName: (id) => id,
  formatValue: (id, v) => v,
  rollEncroachmentLiberationOptions: (it) => it.encroached.pendingOptions,
  safeExposeGlobals: () => {},
};
let item = { id: 7, name: '잠식 반지', encroached: { liberated: false, pendingOptions: [
  { id: 'critDmg', val: 50, statName: '치명타 피해', tier: 10 },
  { id: 'resPen', val: 12, statName: '저항 관통', tier: 10 },
  { id: 'flatHp', val: 120, statName: '생명력', tier: 10 },
] } };
ctx.game = { inventory: [item], equipment: {}, pendingEncroachmentLiberation: null };
ctx.getSelectedCraftItem = () => item;
vm.createContext(ctx);
vm.runInContext(block, ctx);

// 1) 해방 시작 → pending 설정
vm.runInContext('liberateSelectedEncroachedItem();', ctx);
assert(ctx.game.pendingEncroachmentLiberation && ctx.game.pendingEncroachmentLiberation.itemId === 7, '해방 시작 시 pending 이 설정되어야 합니다.');

// 2) 두 번째 옵션 확정
vm.runInContext('confirmEncroachmentLiberation(1);', ctx);
assert.strictEqual(item.encroached.liberated, true, '선택 후 liberated 여야 합니다.');
assert.strictEqual(item.encroached.chosen.id, 'resPen', '선택한 옵션이 확정되어야 합니다.');
assert.strictEqual(item.encroached.chosen.encroachedFinal, true, '확정 옵션은 encroachedFinal 이어야 합니다.');
assert.strictEqual((item.encroached.pendingOptions || []).length, 0, 'pendingOptions 는 비워져야 합니다.');
assert.strictEqual(ctx.game.pendingEncroachmentLiberation, null, '확정 후 pending 은 정리되어야 합니다.');

// 3) 이미 해방된 아이템 재확정은 무해해야 함
vm.runInContext('game.pendingEncroachmentLiberation = { itemId: 7 }; confirmEncroachmentLiberation(0);', ctx);
assert.strictEqual(item.encroached.chosen.id, 'resPen', '이미 해방된 아이템은 다시 바뀌지 않아야 합니다.');

console.log('smoke-encroachment-liberation-overlay: OK (overlay, staggered reveal, no cancel, mandatory pick)');
