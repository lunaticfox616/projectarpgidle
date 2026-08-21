const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { webcrypto } = require('crypto');
const { buildGameRuntime } = require('./lib/game-runtime');

async function runScenario() {
    const hallSql = fs.readFileSync('db/equipment-hall.sql', 'utf8');
    assert.match(hallSql, /drop function if exists public\.submit_player_ranking\(bigint, bigint\)/,
        '전당 SQL 재적용 시 기존 랭킹 등록 RPC를 제거해야 한다');
    assert.match(hallSql, /drop table if exists public\.player_rankings/,
        '전당 SQL 재적용 시 기존 랭킹 데이터를 제거해야 한다');
    assert.doesNotMatch(hallSql, /create (?:table|or replace function)[^;]*player_rankings?/s,
        '전당 SQL이 제거한 랭킹 테이블이나 RPC를 다시 만들면 안 된다');
    const context = buildGameRuntime();
    const calls = [];
    const hosts = { 'map-player-hall': { innerHTML: '' } };
    context.crypto = webcrypto;
    context.document.getElementById = id => hosts[id] || null;
    context.document.querySelectorAll = () => [];
    context.cloudState = vm.runInContext('cloudState', context);
    context.cloudState.configured = true;
    context.cloudState.user = { id: 'user-a' };
    context.cloudState.revisionSupported = true;
    context.cloudState.lastRemoteRevision = 1;
    context.game = vm.runInContext('game', context);
    context.game.inventory = [{
        id: 11, name: '검증용 검', baseId: 'rusted_blade', baseName: '녹슨 검', slot: '무기',
        rarity: 'rare', hiddenTier: 15, baseStats: [], stats: [{ id: 'flatDmg', val: 120, valMin: 100, valMax: 120, tier: 10 }]
    }];
    context.game.currencies.goldenRule = 900;
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
        if (path.endsWith('quote_hall_item')) return { score: 8400, price: 470, honorPerCopy: 3 };
        if (path.endsWith('create_hall_listing')) {
            return { listingId: 7, item: { ...context.game.inventory[0], id: 9100000000007 }, score: 8400,
                price: 470, honorPerCopy: 3, currentRevision: 3, status: 'open' };
        }
        if (path.endsWith('buy_hall_replica')) {
            return { listingId: 8, item: { id: 9200000000008, tradeKey: 'be8f8f8f-1111-4111-8111-111111111111',
                name: '전당 복제품', baseId: 'war_helm', slot: '투구', rarity: 'unique', locked: true, tradeLocked: true, hallReplica: true },
            price: 470, goldenRule: 430, currentRevision: 5, status: 'open' };
        }
        if (path.endsWith('withdraw_hall_listing')) {
            return { listingId: 9, item: { id: 9100000000009, tradeKey: 'ce8f8f8f-1111-4111-8111-111111111111',
                name: '회수 원본', baseId: 'plate_mail', slot: '갑옷', rarity: 'rare', hallRelistBlocked: true }, currentRevision: 7, status: 'withdrawn' };
        }
        if (path.endsWith('get_player_hall')) return {
            listings: [{ id: 8, curatorName: '상대', item: { name: '전당 복제품', rarity: 'unique', slot: '투구', hiddenTier: 15 },
                score: 10200, price: 470, honorPerCopy: 3, copiesSold: 1, copyCap: 5, isMine: false }],
            mine: [{ id: 9, item: { name: '회수 원본', rarity: 'rare', slot: '갑옷', hiddenTier: 12 },
                score: 7200, price: 400, copiesSold: 0, copyCap: 5, status: 'open' },
            { id: 10, item: { name: '공유 완료 원본', rarity: 'unique', slot: '무기', hiddenTier: 16 },
                score: 14200, price: 1000, copiesSold: 5, copyCap: 5, status: 'sold_out' }],
            honor: 14, copiesShared: 4, collectionCount: 2
        }
        throw new Error(`unexpected ${path}`);
    };
    vm.runInContext(fs.readFileSync('js/player-exchange.js', 'utf8'), context, { filename: 'player-exchange.js' });

    context.selectPlayerHallItem(11);
    await context.createPlayerHallListing();
    const quoteCall = calls.find(call => call.path && call.path.endsWith('quote_hall_item'));
    const createCall = calls.find(call => call.path && call.path.endsWith('create_hall_listing'));
    assert.ok(quoteCall, '등록 전에 서버 감정 RPC를 호출해야 한다');
    assert.ok(createCall, `감정 확인 후 전당 등록 RPC를 호출해야 한다: ${hosts['map-player-hall'].innerHTML}`);
    assert.match(createCall.options.body.p_item_key, /^[0-9a-f-]{36}$/i, '원본 장비에 영구 서버 식별자를 부여해야 한다');
    assert.strictEqual(createCall.options.body.p_price, undefined, '클라이언트가 전당 가격을 정할 수 없어야 한다');
    assert.strictEqual(context.game.inventory.length, 0, '전당 등록 성공 후에만 원본을 로컬 인벤토리에서 제거해야 한다');
    assert.strictEqual(context.game.saveMeta.cloudRevision, 3);

    context.game.saveMeta.cloudRevision = 3;
    await context.buyPlayerHallReplica(8);
    assert.strictEqual(context.game.inventory[0].hallReplica, true, '구매 결과는 전당 복제품으로 표시되어야 한다');
    assert.strictEqual(context.game.inventory[0].tradeLocked, true, '복제품은 재판매할 수 없게 귀속되어야 한다');
    assert.strictEqual(context.selectForCrafting(context.game.inventory[0].id, false), false, '복제품은 제작 대상으로 선택할 수 없어야 한다');
    assert.strictEqual(context.toggleItemLockById(context.game.inventory[0].id), false, '복제품의 보호 잠금을 해제할 수 없어야 한다');
    assert.strictEqual(context.game.inventory[0].locked, true, '복제품은 해체 보호 상태를 유지해야 한다');
    const restoredReplica = context.normalizeItem({ id: 31, name: '복원 소장품', baseName: '전투 투구', slot: '투구',
        rarity: 'rare', hallReplica: true, locked: false, tradeLocked: false, baseStats: [], stats: [] });
    assert.strictEqual(restoredReplica.locked, true, '저장 복원 후에도 복제품의 보호 잠금을 강제해야 한다');
    assert.strictEqual(restoredReplica.tradeLocked, true, '저장 복원 후에도 복제품의 재등록을 막아야 한다');
    assert.strictEqual(context.game.currencies.goldenRule, 430, '서버가 확정한 황금률 잔액을 사용해야 한다');

    await context.withdrawPlayerHallListing(9);
    const returnedOriginal = context.game.inventory.find(item => item.name === '회수 원본');
    assert.ok(returnedOriginal, '전시 종료 시 원본을 한 번만 돌려받아야 한다');
    assert.strictEqual(returnedOriginal.hallRelistBlocked, true, '복제 이력이 있는 원본에는 영구 재등록 금지 표식이 남아야 한다');
    context.selectPlayerHallItem(returnedOriginal.id);
    const quoteCountBeforeRetry = calls.filter(call => call.path && call.path.endsWith('quote_hall_item')).length;
    await context.createPlayerHallListing();
    assert.strictEqual(calls.filter(call => call.path && call.path.endsWith('quote_hall_item')).length, quoteCountBeforeRetry,
        '복제 이력이 있는 원본은 서버 감정 요청 전부터 재등록을 차단해야 한다');
    assert.match(hosts['map-player-hall'].innerHTML, /전시 등록 2\/3/, '복제 완료 원본도 회수 전까지 전시 3칸에 포함해야 한다');
    assert.match(hosts['map-player-hall'].innerHTML, /명예 14/, '재화 대신 전당 명예를 보여줘야 한다');
    assert.match(hosts['map-player-hall'].innerHTML, /황금률 470/, '서버 감정가를 전당 카드에 보여줘야 한다');

    assert.ok(hosts['map-player-hall'].innerHTML.length > 0, '랭킹 호스트 없이도 장비 전당을 렌더링해야 한다');
}

runScenario().then(() => console.log('smoke-player-exchange passed'))
    .catch(error => { console.error(error); process.exitCode = 1; });
