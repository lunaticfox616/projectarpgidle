// 그루터기 함 화면의 옮기기와 툴팁(2026-10-04 사용자 요청: 장비 창처럼 누르기 · 끌기로 옮기기, 마우스를 올리면 커스텀 툴팁,
// 설명은 짧게, 스크롤과 빈 공간은 줄이기). 끌기의 포인터 처리(js/stump-box-drag-ui.js)는 실제 브라우저에서 확인하고,
// 여기서는 누르기와 끌기가 함께 쓰는 놓기(dropOnCell · dropOnStorage), 툴팁 내용, 보관함 칸 수를 실제 화면 모듈로 검사한다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

// The test document has no elements: hand the tab's parts (and its click listener) to the real renderer and read what it paints.
run(`game = mergeDefaults({ season: 6, loopCount: 5, level: 60 }); window.game = game; contentProgression.sync(game);
    window.stumpNodes = {};
    window.stumpNode = id => stumpNodes[id] || (stumpNodes[id] = { id, innerHTML: '', clientWidth: id === 'tab-stump' ? 900 : 0,
        addEventListener(type, fn) { this.onclick = fn; } });
    window.realGetById = document.getElementById;
    document.getElementById = id => id === 'tab-stump' || id.startsWith('stump-') ? stumpNode(id) : realGetById.call(document, id);
    window.stumpClick = data => stumpNode('tab-stump').onclick({ target: { closest: () => ({ dataset: data }) } });
    window.make = (family, color) => stumpBox.createItem(game, { family, color, roll: 1 }).id;
    window.toasts = []; showGameToast = message => toasts.push(message);`);
const part = id => run(`stumpNode('${id}').innerHTML`);
const tip = dataset => json(`stumpBoxUi.tipFor({ dataset: ${JSON.stringify(dataset)} })`);
const board = () => json('game.stumpBox.board');
run('stumpBoxUi.refreshStumpTabNow();');
assert.equal(run('game.stumpBox.acquired'), true, 'a loop-6 save has the box');

// ── 누르기로 옮기기: 고르고 빈 칸을 누르면 심고, 찬 칸을 누르면 자리를 바꾸고, 보관함을 누르면 거둔다 ──────────────
const fire = run('make("sap", "fire")'), light = run('make("sap", "lightning")');
run(`stumpClick({ stumpAction: 'item', item: '${fire}' })`);
assert.match(part('stump-box-board'), /class="stump-cell is-open is-target"/, 'picking an item lights the empty open cells');
run("stumpClick({ stumpAction: 'cell', cell: '12' })");
assert.equal(board()[12], fire, 'pressing an empty cell plants the picked item');
assert.equal(part('stump-box-detail'), '', 'a finished move clears the selection');
run(`stumpClick({ stumpAction: 'item', item: '${light}' }); stumpClick({ stumpAction: 'cell', cell: '7' });`);
run("stumpClick({ stumpAction: 'cell', cell: '7' })");
assert.match(part('stump-box-detail'), /번개/, 'pressing a filled cell with nothing picked picks its item');
run("stumpClick({ stumpAction: 'cell', cell: '12' })");
assert.deepEqual([board()[12], board()[7]], [light, fire], 'pressing another filled cell trades places');
run("stumpClick({ stumpAction: 'cell', cell: '7' }); stumpClick({ stumpAction: 'storage' });");
assert.equal(board()[7], null, 'pressing the storage takes a board item back');
assert.deepEqual(json('stumpBox.storage(game).map(item => item.id)'), [fire]);

// ── 끌기와 같은 놓기: 닫힌 칸은 거절하고 아무것도 바꾸지 않는다, 길을 고르지 않은 씨앗은 꽃으로 심는다 ───────────
const before = JSON.stringify(board());
assert.equal(run(`stumpBoxUi.dropOnCell(${fire}, 0)`), false, 'a closed cell refuses the drop');
assert.equal(JSON.stringify(board()), before, 'and the board is unchanged');
assert.match(json('toasts').at(-1), /이 칸은 루프 \d+에 열립니다/, 'the refusal says why');
assert.equal(run(`stumpBoxUi.dropOnStorage(${fire})`), false, 'a stored item has nowhere to go back to');
const seed = run('make("seed", "cold")');
assert.equal(run(`stumpBoxUi.dropOnCell(${seed}, 13)`), true, 'a dragged seed without a path is planted');
assert.equal(run(`stumpBox.itemById(game, ${seed}).path`), 'flower', 'as a flower (the picker can still switch it before it grows)');
assert.equal(run(`stumpBoxUi.dropOnCell(${fire}, 13)`), true, 'dropping a stored item on a filled cell trades with storage');
assert.deepEqual([board()[13], json('stumpBox.storage(game).map(item => item.id)')], [fire, [seed]]);

// ── 툴팁: 이름과 품질, 자라는 정도, 주는 능력치, 멈춤 · 공명 · 보관함은 그럴 때만 ────────────────────────
run(`stumpBoxUi.dropOnCell(${seed}, 8);`);
const near = tip({ stumpTip: 'cell', stumpDrag: String(fire), stumpDropCell: '13' });
assert.match(near.html, /품질 100%/);
assert.match(near.html, /성장 0 \/ \d+ \(0%\)/);
assert.match(near.html, /stump-tip-yield">다 자라면 화염 저항/, 'what it will give, in the yield colour');
assert.match(near.html, /냉기에 막혀 멈춤/, 'fire next to cold says it is stopped');
assert.equal(near.tone, run('STUMP_BOX_COLORS.fire.tone'), 'the border takes the item colour');
const away = tip({ stumpTip: 'cell', stumpDrag: String(light), stumpDropCell: '12' });
assert.doesNotMatch(away.html, /막혀|공명|보관함/, 'the normal case adds no status line');
run(`stumpBoxUi.dropOnStorage(${light})`);
assert.match(tip({ stumpTip: 'item', stumpDrag: String(light) }).html, /보관함 · 자라지 않음/);
assert.match(tip({ stumpTip: 'cell', stumpDropCell: '0' }).html, /닫힌 칸.*루프 \d+에 열립니다/);
assert.equal(tip({ stumpTip: 'cell', stumpDropCell: '6' }), null, 'a plain empty cell has nothing to say');
const rules = tip({ stumpTip: 'rules' }).html;
assert.match(rules, /공명 \+10%/);
assert.match(rules, /찬 칸에 놓으면 자리를 바꿉니다/);
assert.doesNotMatch(rules, /접붙이기/, 'grafting is only explained once it opens (loop 18)');

// ── 짧은 화면: 머리줄에 색 개수와 열린 칸, 보관함은 가진 것 + 줄 끝 + 빈 줄 하나 ─────────────────────────
run('stumpBoxUi.refreshStumpTabNow();');
assert.match(part('stump-box-head'), /칸 \d+\/25/);
assert.match(part('stump-box-head'), /data-stump-tip="rules"/, 'the rules sit behind the ? button');
const storage = part('stump-box-storage');
const cells = (storage.match(/class="stump-item/g) || []).length + (storage.match(/class="stump-slot"/g) || []).length;
const columns = Number(storage.match(/--stump-columns:(\d+)/)[1]);
assert.equal(cells, columns * 2, 'one row of items plus one free row, not all 50 slots');
assert.match(storage, /data-stump-drop-storage="1"/, 'the storage takes drops');
assert.match(part('stump-box-board'), /data-stump-drag="\d+"[^>]*data-stump-drop-cell="13"/, 'board items can be dragged; every cell takes drops');
run('document.getElementById = realGetById;');
console.log('stump box screen: press and drag moves, refusals, tooltips, head line and compact storage: OK');
