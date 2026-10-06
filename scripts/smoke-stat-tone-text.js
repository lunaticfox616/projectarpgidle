// 설명 글의 옵션 색(js/stat-tone-text-ui.js, 2026-10-06 사용자 요청: "설명이 거의 흰색이나 한 색깔 뿐이라 읽기가 피로하다"):
// 핵심어는 장비 옵션과 같은 색표(getItemStatToneColor), 수치는 같은 절의 첫 핵심어 색, 이미 색이 있는 글은 그대로, 태그와 엔티티는 안 건드린다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const tone = id => run(`getItemStatToneColor(${JSON.stringify(id)})`);
const html = text => run(`statToneText.html(${JSON.stringify(text)})`);
const markup = text => run(`statToneText.markup(${JSON.stringify(text)})`);
const coloured = (out, word) => new RegExp(`style="color:([^"]+)">${word}</span>`).exec(out)?.[1] || null;

const fire = html('보스와 싸우는 동안 화염 피해 +12%, 받는 피해 감소 6%.');
assert.equal(coloured(fire, '화염 피해'), tone('firePctDmg'), 'element damage reads in the element colour, as on items');
assert.equal(coloured(fire, '\\+12%'), tone('firePctDmg'), 'its number takes the colour of the clause it belongs to');
assert.equal(coloured(fire, '피해 감소'), tone('dr'), 'a longer phrase wins over the word inside it');
assert.equal(coloured(fire, '6%'), tone('dr'), 'each clause colours its own numbers');
assert.match(fire, /^보스와 싸우는 동안 /, 'plain words stay plain');
assert.equal(coloured(html('공격 속도 1.2배, 1,033 피해'), '1.2배'), tone('aspd'), 'decimals and thousands stay one number');
assert.equal(coloured(html('3번째 공격마다 강타합니다'), '3'), '#f6e7c1', 'an ordinal with no keyword nearby is only brightened');
assert.equal(coloured(html('적중 시 3회 타격'), '3회'), '#f6e7c1', 'a number with no keyword in its clause is only brightened');
assert.equal(html('<b>화염</b> & "따옴표"').includes('&lt;b&gt;'), true, 'plain text is escaped');

const lines = markup('<div class="tooltip-line">냉기 저항 30% · 생명력 +5%</div><div style="color:#fff">화염 그대로<br>그대로</div>끝 &amp; 화염');
assert.equal(coloured(lines, '냉기 저항'), tone('resC'));
assert.equal(coloured(lines, '생명력'), tone('pctHp'));
assert.match(lines, /<div style="color:#fff">화염 그대로<br>그대로<\/div>/, 'a line that already has its colour is left alone (also past a <br>)');
assert.match(lines, /끝 &amp; <span/, 'entities stay entities');
assert.equal(markup('<span class="stat-tone" style="color:#123">화염</span>'), '<span class="stat-tone" style="color:#123">화염</span>', 'colouring twice changes nothing');
assert.equal(run("statToneText.lineColor('적이 3마리 이상이면 공격 속도 +6%')"), tone('aspd'), 'a line takes its subject colour');
assert.equal(run("statToneText.lineColor('특별한 말 없음', 'x')"), 'x');

// 핵심어마다 색표에 실제 색이 있다(기본 흰색으로 떨어지는 id를 쓰지 않는다).
const plain = tone('');
const words = JSON.parse(run(`JSON.stringify(statToneText.segments('${['화염', '냉기', '번개', '카오스', '생명력', '방어도', '회피', '에너지 보호막', '치명타', '공격 속도', '저항', '흡혈', '피해', '물리', '주문', '젬 레벨', '중독', '출혈', '감전', '동결', '점화'].join(' / ')}').filter(row => row.color))`));
assert.equal(words.length, 21, 'every keyword is found');
assert.ok(words.every(row => row.color !== plain), 'every keyword has a real tone, not the default white');
console.log('stat tone text: keyword and number colours from the item tone table, clauses, escaping, existing colours kept OK');
