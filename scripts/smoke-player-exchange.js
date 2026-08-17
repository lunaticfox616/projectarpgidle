const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { webcrypto } = require('crypto');
const { buildGameRuntime } = require('./lib/game-runtime');

async function runScenario() {
    const context = buildGameRuntime();
    const calls = [];
    const hosts = {
        'map-player-trade': { innerHTML: '' }, 'map-player-ranking': { innerHTML: '' },
        'player-trade-price': { value: '4' }
    };
    context.crypto = webcrypto;
    context.document.getElementById = id => hosts[id] || null;
    context.document.querySelectorAll = () => [];
    context.cloudState = vm.runInContext('cloudState', context);
    context.cloudState.configured = true;
    context.cloudState.user = { id: 'user-a' };
    context.cloudState.revisionSupported = true;
    context.cloudState.lastRemoteRevision = 1;
    context.game = vm.runInContext('game', context);
    context.game.inventory = [{ id: 11, name: '검증용 검', slot: '무기', rarity: 'rare', stats: [{ id: 'flatDmg', val: 12 }] }];
    context.game.currencies.goldenRule = 10;
    context.game.saveMeta.cloudRevision = 1;

    context.persistLocalSave = () => { calls.push({ path: 'persist' }); return true; };
    context.saveGame = () => true;
    context.requestGameConfirmation = async () => true;
    context.pushCloudSave = async () => {
        context.game.saveMeta.cloudRevision++;
        context.cloudState.lastRemoteRevision = context.game.saveMeta.cloudRevision;
    };
    context.cloudJsonRequest = async (path, options) => {
        calls.push({ path, options });
        if (path.endsWith('create_trade_listing')) {
            return { listingId: 7, item: { ...context.game.inventory[0], id: 9000000000007 }, currentRevision: 3, status: 'open' };
        }
        if (path.endsWith('buy_trade_listing')) {
            return { listingId: 8, item: { id: 9000000000008, tradeKey: 'be8f8f8f-1111-4111-8111-111111111111', name: '구매 장비', slot: '투구', rarity: 'magic' }, price: 3, goldenRule: 7, currentRevision: 5, status: 'sold' };
        }
        if (path.endsWith('cancel_trade_listing')) {
            return { listingId: 9, item: { id: 9000000000009, tradeKey: 'ce8f8f8f-1111-4111-8111-111111111111', name: '회수 장비', slot: '갑옷', rarity: 'rare' }, currentRevision: 7, status: 'cancelled' };
        }
        if (path.endsWith('claim_trade_proceeds')) {
            return { claimed: 6, goldenRule: 13, currentRevision: 9 };
        }
        if (path.endsWith('get_player_exchange')) return {
            listings: [{ id: 8, sellerName: '상대', item: { name: '구매 장비' }, price: 3, isMine: false }],
            mine: [{ id: 9, item: { name: '회수 장비' }, price: 2, status: 'open' }],
            unclaimedProceeds: 6, loopRanking: [], dpsRanking: []
        };
        if (path.endsWith('submit_player_ranking')) return { loopCount: 3, dps: options.body.p_dps, saveRevision: 8 };
        throw new Error(`unexpected ${path}`);
    };
    vm.runInContext(fs.readFileSync('js/player-exchange.js', 'utf8'), context, { filename: 'player-exchange.js' });

    context.setPlayerTradePrice(77);
    context.renderPlayerExchange();
    assert.match(hosts['map-player-trade'].innerHTML, /value="77"/, '거래 가격은 목록 재렌더 후에도 유지해야 한다');
    context.selectPlayerTradeItem(11);
    await context.createPlayerTradeListing();
    const createCall = calls.find(call => call.path && call.path.endsWith('create_trade_listing'));
    assert.ok(createCall, `판매 등록은 서버 RPC를 호출해야 한다: ${hosts['map-player-trade'].innerHTML}`);
    assert.match(createCall.options.body.p_item_key, /^[0-9a-f-]{36}$/i, '장비에 영구 거래 키를 부여해야 한다');
    assert.strictEqual(createCall.options.body.p_expected_revision, 2, '클라우드 저장 후 리비전으로 거래해야 한다');
    assert.strictEqual(context.game.inventory.length, 0, '서버 보관함 등록 성공 후에만 로컬 인벤토리에서 제거해야 한다');
    assert.strictEqual(context.game.saveMeta.cloudRevision, 3, '서버가 반환한 리비전을 로컬에 적용해야 한다');

    context.game.saveMeta.cloudRevision = 3;
    context.game.inventory = [];
    await context.buyPlayerTradeListing(8);
    assert.strictEqual(context.game.inventory[0].tradeKey, 'be8f8f8f-1111-4111-8111-111111111111', '구매 장비를 한 번만 받아야 한다');
    assert.strictEqual(context.game.currencies.goldenRule, 7, '서버가 확정한 황금률 잔액을 사용해야 한다');
    assert.strictEqual(context.game.saveMeta.cloudRevision, 5);

    await context.cancelPlayerTradeListing(9);
    assert.strictEqual(context.game.inventory.filter(item => item.name === '회수 장비').length, 1, '취소 장비를 한 번만 돌려받아야 한다');
    assert.strictEqual(context.game.saveMeta.cloudRevision, 7);

    await context.claimPlayerTradeProceeds();
    assert.strictEqual(context.game.currencies.goldenRule, 13, '서버에 적립된 판매금만 현재 저장에 수령해야 한다');
    assert.strictEqual(context.game.saveMeta.cloudRevision, 9);

    const stats = context.getPlayerStats();
    const expectedDps = Math.max(0, Math.floor(Number(stats.totalDps) || Number(stats.dps) || 0));
    await context.submitPlayerRanking();
    const rankCall = calls.find(call => call.path && call.path.endsWith('submit_player_ranking'));
    assert.strictEqual(rankCall.options.body.p_dps, expectedDps, '실제 전투 계산기의 현재 DPS를 등록해야 한다');
    assert.strictEqual(rankCall.options.body.p_expected_revision, 10, '랭킹도 최신 클라우드 리비전과 묶어야 한다');
}

runScenario().then(() => console.log('smoke-player-exchange passed'))
    .catch(error => { console.error(error); process.exitCode = 1; });
