// Explicit test controls, loaded only by this review page, on its isolated local test origin.
const frame = document.getElementById('game-frame');
const statusLine = document.getElementById('status');
const errors = document.getElementById('errors');
function context() {
    if (location.hostname !== '127.0.0.1' || location.port !== '4227') throw new Error('이 예시 도구는 127.0.0.1:4227에서만 작동합니다.');
    const app = frame.contentWindow;
    if (!app.game || !app.playerStall) throw new Error('게임을 먼저 불러와 주세요.');
    if (app.isStartupOverlayOpen() || app.document.body.classList.contains('loading-active')) throw new Error('게스트로 시작한 뒤 전장이 열린 다음 눌러 주세요.');
    return app;
}
function openStall(app) {
    app.updateStaticUI();
    if (!app.document.getElementById('tab-items').getClientRects().length) app.switchTab('tab-items');
    app.switchItemSubtab('item-tab-market');
    app.marketUi.show('stall');
    app.playerStallUi.render(true);
}
function craftedSample(app, count) {
    // A tier-zero melee query returns real base definitions through the existing game API.
    const base = app.getBaseUpgradeCandidates({ slot: '무기', reqTier: 0, baseStats: [] })
        .find(row => row.id === 'apocalypse_greatblade');
    const item = app.createItemFromBase(base, 'rare', 20, { affixTierCap: 20 });
    item.stats = [];
    const available = app.getAvailableMods(item);
    item.stats = ['flatDmg','weaponFlatDmgPct','attackPctDmg','aspd','crit','critDmg'].slice(0, count).map(id => {
        const mod = available.find(row => row.id === id);
        const stat = app.rollAffixValueInTierRange(mod, 20, 20);
        stat.val = stat.valMax;
        return stat;
    });
    item.baseStats.forEach(stat => { stat.val = stat.valMax; });
    return app.normalizeItem(item);
}
function prepare() {
    const app = context(), owner = app.game;
    owner.season = 2;
    app.contentProgression.sync(owner);
    app.contentProgression.purchase('craft', owner);
    owner.inventory = [
        app.normalizeItem(app.createItemFromBase(app.chooseItemBase('무기', 1), 'normal', 1)),
        app.normalizeItem(app.createItemFromBase(app.chooseItemBase('갑옷', 10), 'rare', 10)),
        craftedSample(app, 3), craftedSample(app, 6)
    ];
    owner.playerStall = structuredClone(app.defaultGame.playerStall);
    app.playerStallUi.message = ''; app.playerStallUi.selectedId = null; app.playerStallUi.selectedListingId = null;
    app.playerStallUi.draftAsk = ''; app.playerStallUi.draftCurrency = ''; app.playerStallUi.draftNegotiate = true; app.playerStallUi.pendingSlot = null; app.playerStallUi.dragSource = null;
    app.playerStallUi.visitorsVisible = false; app.playerStallUi.visitorTickAt = 0; app.playerStallUi.visitors = [];
    app.playerStall.advance(owner, Date.now());
    app.saveGame();
    openStall(app);
    statusLine.textContent = '초기·중급 드랍과 상급·최상급 제작 예시 4개 준비 완료. 재화를 바꿔 거래하고 비교해 보세요. 감정 계산 내역은 표시하지 않습니다.';
}
function age(hours = 2) {
    const app = context(), stall = app.game.playerStall;
    const elapsed = Math.round(hours * 3600000);
    stall.lastAt -= elapsed;
    if (stall.nextVisitAt > 0) stall.nextVisitAt -= elapsed;
    stall.nextOfferAt = Math.max(0, stall.nextOfferAt - elapsed);
    stall.listings.forEach(row => {
        row.listedAt -= elapsed;
        row.priceChangedAt -= elapsed;
        if (row.offer) { row.offer.createdAt -= elapsed; row.offer.expiresAt -= elapsed; }
    });
    stall.history.forEach(event => { event.at -= elapsed; });
    stall.sales.forEach(sale => { sale.at -= elapsed; if (sale.listedAt !== null) sale.listedAt -= elapsed; });
    app.playerStall.advance(app.game, Date.now());
    app.saveGame(); openStall(app);
    const funds = app.playerStallUi.payouts(stall).map(row => `${app.ORB_DB[row.key].name} ${row.amount}개`).join(' / ') || '없음';
    statusLine.textContent = `실제 판매 규칙으로 ${elapsed / 60000}분 정산 완료 · 가격 제안 ${stall.listings.filter(row => row.offer).length}건 · 미수령 ${funds} · 진열품 ${stall.listings.length}개`;
}
function prepareBargain() {
    prepare();
    const app = context(), item = app.game.inventory[3];
    const price = app.itemAppraisal.quote(item, 'goldenRule').fair;
    app.game.playerStall.rng = 147926525;
    const result = app.playerStall.list(app.game, item.id, price, Date.now(), { currency: 'goldenRule', negotiate: true });
    if (!result.ok) throw new Error(result.reason);
    // A reproducible real visitor sequence from smoke-player-stall-timing, without fabricating an offer.
    age(32 / 60);
    app.playerStallUi.openOffers();
    const offer = app.game.playerStall.listings[0]?.offer;
    if (!offer) throw new Error('고정 손님 표본의 제안을 찾지 못했습니다. 게임 규칙과 표본을 확인해 주세요.');
    statusLine.textContent = `고정 손님 표본 · 실제 규칙 32분 반영 · 희망가 ${price}황금률에 진열한 장비에 ${offer.amount}황금률 제안. 역제안은 한 번 할 수 있습니다.`;
}
function prepareCrowd() {
    prepare();
    const app = context(), owner = app.game, at = Date.now();
    owner.inventory = Array.from({ length: 4 }, () => craftedSample(app, 6));
    owner.playerStall.rng = 2654435761;
    for (const item of [...owner.inventory]) {
        const result = app.playerStall.list(owner, item.id, 5, at, { currency: 'goldenRule', negotiate: false });
        if (!result.ok) throw new Error(result.reason);
    }
    // The real seeded arrival from smoke-player-stall-visits; no visitor or purchase is fabricated.
    app.playerStallUi.tickVisitors(Date.now());
    age(294655 / 3600000);
    const crowd = owner.playerStall.history.find(event => event.kind === 'crowd');
    if (!crowd) throw new Error('몰림 체험 표본을 찾지 못했습니다. 실제 방문 규칙을 확인해 주세요.');
    app.document.querySelector('.stall-visits').open = true;
    app.playerStallUi.visitorTickAt = 0;
    app.playerStallUi.tickVisitors(Date.now());
    app.document.getElementById('stall-visitors').scrollIntoView({ block: 'center' });
    statusLine.textContent = `실제 방문 규칙의 고정 표본 · 인기 최상급 장비를 5황금률에 진열 · ${crowd.visitors}명 동시 방문. 최근 방문에서 구매와 구경 후 떠난 손님을 확인하세요.`;
}
function prepareOffer(currency = 'formlessDew') {
    prepare();
    const app = context(), item = app.game.inventory[currency === 'goldenRule' ? 3 : 2];
    const result = app.playerStall.list(app.game, item.id, app.itemAppraisal.quote(item, currency).ceiling + 3,
        Date.now(), { currency, negotiate: true });
    if (!result.ok) throw new Error(result.reason);
    age();
    if (currency === 'goldenRule') {
        app.playerStallUi.openOffers();
        statusLine.textContent = '황금률 제안 체험 · 새 가판대에서 실제 규칙으로 2시간 방문을 반영했습니다.';
    }
}
function action(fn) {
    return () => { try { fn(); errors.textContent = ''; } catch (error) { errors.textContent = error.message; console.error(error); } };
}
document.getElementById('prepare').addEventListener('click', action(prepare));
document.getElementById('offer-demo').addEventListener('click', action(prepareOffer));
document.getElementById('gold-demo').addEventListener('click', action(() => prepareOffer('goldenRule')));
document.getElementById('bargain-demo').addEventListener('click', action(prepareBargain));
document.getElementById('crowd-demo').addEventListener('click', action(prepareCrowd));
document.getElementById('minute').addEventListener('click', action(() => age(1 / 60)));
document.getElementById('age').addEventListener('click', action(age));
document.getElementById('mobile').addEventListener('click', () => document.body.classList.toggle('mobile'));
frame.addEventListener('load', () => {
    frame.contentWindow.addEventListener('error', event => { errors.textContent += `${event.message}\n`; });
});
