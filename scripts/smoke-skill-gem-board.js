// 스킬 젬 보드(2026-10-04 사용자 요청: 가운데 주 공격 젬, 둘레 각인, 따로 보조 젬 칸 — 상세는 고를 때만).
// 실제 화면 모듈(js/skill-gem-board-ui.js)이 그리는 칸 상태와, 칸 종류로 고르는 목록, 상세의 "장착하면" 비교가 빌드를 바꾸지 않는지 본다.
// 누르기 · 시트 배치는 실제 브라우저에서 확인한다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

// The test document has no elements: hand the board's parts to the real renderer and read what it paints.
run(`game = mergeDefaults({ season: 6, loopCount: 5, level: 60 }); window.game = game;
    window.boardNodes = {};
    window.boardNode = id => boardNodes[id] || (boardNodes[id] = { id, innerHTML: '', textContent: '', dataset: {} });
    window.realGetById = document.getElementById;
    document.getElementById = id => ['ui-skill-board', 'ui-support-slots', 'skill-tab-equip', 'ui-skill-picker-title'].includes(id) ? boardNode(id) : realGetById.call(document, id);
    ['연속 베기', '화염 참격', '그림자 점멸', '화염 위습 소환'].forEach(name => { game.skills.push(name); game.gemData[name] = { level: 5, quality: 0, exp: 0, skyEnhanceCap: 4 }; });
    game.activeSkill = '연속 베기';
    game.supports.push('가속', '날카로움');
    game.equippedSupports = ['가속'];`);
const render = () => run('skillGemBoardUi.render(getUiPlayerStats())');
const board = () => run("boardNode('ui-skill-board').innerHTML");
const supports = () => run("boardNode('ui-support-slots').innerHTML");

// ── 칸 종류: 소환 젬 · 이동 젬 · 그 밖의 공격 젬(주 공격) ──────────────────────────────────────
assert.deepEqual(json("['연속 베기', '그림자 점멸', '화염 위습 소환'].map(skillGemBoardUi.kindOf)"), ['active', 'mobility', 'summon']);

// ── 각인 고리: 해금 전에는 없고, 해금 뒤에는 찬 칸 · 빈 칸 · 다음 칸 · 잠긴 칸 ─────────────────────────
run("game.contentProgression.unlocked = game.contentProgression.unlocked.filter(id => id !== 'engraving'); game.contentProgression.inherited = game.contentProgression.inherited.filter(id => id !== 'engraving');");
render();
assert.ok(board().includes('continuous-slash') && !board().includes('skill-board-engrave'), 'before 젬 각인 the core shows alone');
run("game.contentProgression.inherited.push('engraving', 'support'); game.skyGemEnhancements = { '연속 베기': ['sky_fury', 'sky_swiftness', null, null, null] };");
render();
const states = [...board().matchAll(/skill-board-engrave is-(\w+)/g)].map(match => match[1]);
assert.deepEqual(states, ['full', 'full', 'open', 'open', 'next'], 'cap 4: two engraved, two open, the fifth is the next to open');
assert.match(board(), /각인 2 \/ 4칸/, 'the head counts engraved / open slots');
assert.match(board(), /폭풍 충전/, 'an engraved slot is named');

// ── 위성 칸: 이동 젬 · 소환 젬을 가졌으면 칸이 생기고, 비어 있으면 "+" ─────────────────────────────
assert.equal((board().match(/skill-board-satellite is-empty/g) || []).length, 2, 'owned but unworn mobility and summon gems leave two empty slots');
run("game.mobilitySkill = '그림자 점멸';");
render();
assert.match(board(), /data-board-pick="mobility" data-board-gem="그림자 점멸"/, 'a worn mobility gem fills its slot');

// ── 보조 젬 칸: 장착 한도만큼 + 다음 칸 하나, 남은 공명력 ───────────────────────────────────────
const cap = run('getUiPlayerStats().suppCap');
assert.equal((supports().match(/class="support-slot active"/g) || []).length, 1, 'one worn support');
assert.equal((supports().match(/support-slot is-empty/g) || []).length, cap - 1, 'the rest of the cap shows as empty slots');
assert.equal((supports().match(/support-slot is-lock/g) || []).length, 1, 'one locked preview of the next slot');
assert.match(supports(), new RegExp(`1 / ${cap}칸`));

// ── 고르는 칸: 보조 젬은 해금됐을 때만, 아니면 주 공격으로 되돌린다 ───────────────────────────────
run("skillGemBoardUi.pick('support')");
assert.equal(run('skillGemBoardUi.currentKind()'), 'support');
assert.equal(run("boardNode('skill-tab-equip').dataset.picking"), 'support', 'the picked slot is marked outside the board HTML');
run("game.contentProgression.inherited = game.contentProgression.inherited.filter(id => id !== 'support')");
assert.equal(run('skillGemBoardUi.currentKind()'), 'active', 'a locked support library falls back to the main attack');

// ── 상세의 "장착하면" 비교: 수치는 바꿔 끼운 빌드로 재고, 빌드는 그대로 돌려놓는다 ──────────────────────
const before = run('JSON.stringify([game.activeSkill, game.mobilitySkill, game.equippedSupports, game.equippedSummonSkills, game.summonSkillCounts])');
const swap = json("(() => { const r = gemSelectionUi.preview('active', '화염 참격'); return [r.before.dps, r.after.dps]; })()");
const summon = json("(() => { const r = gemSelectionUi.preview('active', '화염 위습 소환'); return [r.before.summonDps || 0, r.after.summonDps || 0]; })()");
run("game.contentProgression.inherited.push('support')");
json("gemSelectionUi.preview('support', '날카로움').after.crit");
assert.equal(run('JSON.stringify([game.activeSkill, game.mobilitySkill, game.equippedSupports, game.equippedSummonSkills, game.summonSkillCounts])'), before, 'previews leave the build exactly as it was');
assert.notEqual(swap[0], swap[1], 'swapping the main attack changes the previewed DPS');
assert.ok(summon[1] > summon[0], 'adding a summon gem raises the previewed summon DPS');

console.log('smoke-skill-gem-board passed');
