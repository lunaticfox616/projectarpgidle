// New-content cards: every content that opens gets one card saying what it is and where it lives; content with its own
// card is not announced twice; notices about content not bought yet point at 해금; card text colours UI names/items.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
run('var toasts = []; showGameToast = text => toasts.push(text);');

function fresh(season) {
    run(`game = mergeDefaults({ season: ${season}, contentProgression: JSON.parse(JSON.stringify(defaultGame.contentProgression)) });
        game.seenTutorials = ['tutorial_battle_basics']; contentProgression.sync(game); checkUnlocks();
        tutorialQueue.length = 0; activeTutorial = null; toasts.length = 0;`);
}
function buyBefore(id) {
    run(`(() => {
        const buy = id => { const def = CONTENT_UNLOCK_CATALOG.find(row => row.id === id);
            for (const need of [def.after, ...(def.requires || [])].filter(Boolean)) buy(need);
            contentProgression.purchase(id, game); };
        const def = CONTENT_UNLOCK_CATALOG.find(row => row.id === ${JSON.stringify(id)});
        for (const need of [def.after, ...(def.requires || [])].filter(Boolean)) buy(need);
        checkUnlocks(); tutorialQueue.length = 0; toasts.length = 0;
    })()`);
}
const queued = () => json(`tutorialQueue.map(n => ({ key: n.key, title: n.title, body: n.body, tabId: n.tabId,
    subtabId: n.subtabId, contentId: n.contentId || null, openLabel: n.openLabel || null }))`);

// ── 해금 창에서 산 콘텐츠: 카드 한 장(무엇인지 + 어디 있는지 + 정확한 길), 같이 열린 무료 콘텐츠도 한 장씩 ──
fresh(3);
run("contentUnlockUi.purchase('craft')");
let cards = queued();
assert.deepStrictEqual(cards.map(card => card.key), ['unlock_content_craft', 'unlock_content_market', 'unlock_content_hall'],
    'free content bundled with a purchase gets its own card');
assert.strictEqual(cards[0].title, '장비 제련');
assert.match(cards[0].body, /\n‘장비 → 제작실’에 있습니다\.$/);
assert.deepStrictEqual([cards[0].tabId, cards[0].subtabId, cards[0].contentId, cards[0].openLabel],
    ['tab-items', 'item-tab-craft', 'craft', '장비 제련 열기']);
assert.match(cards[1].body, /나의 가판대/, 'the marketplace card mentions the player stall');
assert.strictEqual(run('toasts.length'), 0, 'the card replaces the purchase toast');
assert.ok(run(`tutorialQueue.every(n => contentProgression.canOpen(n.subtabId || n.tabId))`), 'every card survives the open-screen filter');

// ── 루프에 닿아 저절로 열린 무료 콘텐츠도 카드를 받는다. 불러온 저장에서 이미 열려 있던 것은 소식이 아니다 ──
fresh(7);
assert.strictEqual(run('tutorialQueue.length'), 0, 'loading a save announces nothing that was already open');
run('game.season = 8; checkUnlocks();');
const beehive = queued().find(card => card.key === 'unlock_content_beehive');
assert.ok(beehive, 'reaching loop 8 announces the beehive expedition');
assert.match(beehive.body, /‘지도 → 탐험 → 벌집’에 있습니다/);
assert.deepStrictEqual([beehive.tabId, beehive.subtabId], ['tab-map', 'map-explore-beehive']);

// ── 자기 카드가 있는 콘텐츠는 두 번 알리지 않는다(시간의 균열: 루프 전환이 전용 카드를 띄운다) ──
fresh(12);
run('game.season = 13; checkUnlocks();');
assert.ok(!queued().some(card => card.key === 'unlock_content_timerift'), 'a content with its own card gets no second, generic card');

// ── 아직 사지 않은 콘텐츠의 안내는 해금을 가리킨다(열 수 없는 창을 가리키면 보이지도 않고 사라졌다) ──
fresh(20);
run("queueContentNotice('unlock_arcana', '봉인된 카드', 'arcana', { open: 'OPEN', locked: 'LOCKED' }, 'tab-arcana')");
assert.deepStrictEqual(json('tutorialQueue.map(n => [n.body, n.tabId])'), [['LOCKED', 'tab-unlocks']]);
assert.strictEqual(run('contentProgression.canOpen(tutorialQueue[0].tabId)'), true, 'the card is shown, not dropped');
fresh(5);
buyBefore('codex');
run("contentProgression.purchase('codex', game); tutorialQueue.length = 0;");
run("queueContentNotice('unlock_codex', '첫 고유 장비', 'codex', { open: 'OPEN', locked: 'LOCKED' }, 'tab-codex')");
assert.deepStrictEqual(json('tutorialQueue.map(n => [n.body, n.tabId])'), [['OPEN', 'tab-codex']]);

// ── 알릴 콘텐츠마다 "…에 있습니다"를 쓸 수 있는 자리가 있다 ──
const places = json(`CONTENT_UNLOCK_CATALOG.filter(def => def.minLoop > 1 && !CONTENT_CARD_DEDICATED[def.id]).map(def => {
    const action = contentUnlockUi.routeAction(def), route = action ? contentUnlockUi.routeKey(action) : null;
    return { id: def.id, route, path: CONTENT_ROUTE_PATHS[route] || null }; })`);
for (const row of places) assert.ok(row.path, `${row.id}: the unlock card needs a known place (${row.route})`);

// ── 카드 글 색: ‘메뉴·단추’는 종류 색, [이름]은 하늘색. 대사(“…”)가 있으면 문단, 메뉴 이름으로 시작하는 줄은 목록 ──
const html = run("tutorialBodyHtml('[연속 베기] 젬을 얻었습니다.\\n‘스킬 젬’에서 ‘장착’을 누르세요.')");
assert.match(html, /^<p class="tutorial-summary"><span class="tutorial-name">\[연속 베기\]<\/span> 젬을 얻었습니다\.<\/p>/);
assert.match(html, /<li><span class="tutorial-ui">스킬 젬<\/span>에서 <span class="tutorial-ui">장착<\/span>을 누르세요\.<\/li>/);
assert.match(run("tutorialBodyHtml('첫 줄\\n‘지도’에서 고르세요.')"), /class="tutorial-steps"/);
assert.match(run("tutorialBodyHtml('첫 줄\\n“다음은 더 나은 세계를 바라지.”\\n둘째 줄')"), /class="tutorial-line"/);
assert.doesNotMatch(run("tutorialBodyHtml('<img src=x onerror=alert(1)>')"), /<img/, 'card text stays escaped');
console.log('content unlock cards: purchase/automatic cards, no duplicates, 해금 pointers, places and colour markup passed');
