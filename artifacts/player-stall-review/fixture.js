// Explicit test controls, loaded only by this review page, on its isolated local test origin.
const frame = document.getElementById('game-frame');
const statusLine = document.getElementById('status');
const errors = document.getElementById('errors');
function context() {
    if (location.hostname !== '127.0.0.1' || location.port !== '4227') throw new Error('이 예시 도구는 127.0.0.1:4227에서만 작동합니다.');
    const app = frame.contentWindow;
    if (!app.game || !app.playerStall) throw new Error('게임을 먼저 불러와 주세요.');
    return app;
}
function openStall(app) {
    app.updateStaticUI();
    if (!app.document.getElementById('tab-items').getClientRects().length) app.switchTab('tab-items');
    app.switchItemSubtab('item-tab-market');
    app.marketUi.show('stall');
    app.playerStallUi.render(true);
}
function prepare() {
    const app = context(), owner = app.game;
    owner.season = 2;
    app.contentProgression.sync(owner);
    app.contentProgression.purchase('craft', owner);
    const slots = ['무기', '갑옷', '반지', '신발'];
    owner.inventory = slots.map((slot, index) => {
        const base = app.chooseItemBase(slot, 10);
        return app.normalizeItem(app.createItemFromBase(base, index === 3 ? 'magic' : 'rare', 10));
    });
    owner.playerStall = { version:1, sequence:0, lastAt:0, nextVisitAt:0, rng:1357911, budgetMs:0, proceeds:0, listings:[], history:[] };
    app.playerStall.advance(owner, Date.now());
    app.saveGame();
    openStall(app);
    statusLine.textContent = '예시 장비 4개 준비 완료. 거래소의 나의 가판대에서 가격을 정하고 진열하세요.';
}
function age() {
    const app = context(), stall = app.game.playerStall;
    const elapsed = 2 * 3600000;
    stall.lastAt -= elapsed; stall.nextVisitAt -= elapsed;
    stall.listings.forEach(row => { row.listedAt -= elapsed; });
    stall.history.forEach(event => { event.at -= elapsed; });
    app.playerStall.advance(app.game, Date.now());
    app.saveGame(); openStall(app);
    statusLine.textContent = `실제 판매 규칙으로 2시간 정산 완료 · 미수령 ${stall.proceeds} 이슬 · 진열품 ${stall.listings.length}개`;
}
function action(fn) {
    return () => { try { fn(); errors.textContent = ''; } catch (error) { errors.textContent = error.message; console.error(error); } };
}
document.getElementById('prepare').addEventListener('click', action(prepare));
document.getElementById('age').addEventListener('click', action(age));
document.getElementById('mobile').addEventListener('click', () => document.body.classList.toggle('mobile'));
frame.addEventListener('load', () => {
    frame.contentWindow.addEventListener('error', event => { errors.textContent += `${event.message}\n`; });
});
