const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const run = source => vm.runInContext(source, context);

async function resetPassiveTree() {
    return vm.runInContext('marketResetPassiveTreeByDivine()', context);
}

async function main() {
    run(`
        requestGameConfirmation = async () => true;
        updateStaticUI = () => {};
        normalizeSupportLoadout = () => {};
        game.maxZoneId = 5;
        game.season = 2;contentProgression.purchase('craft');
        game.woodsmanBuildLock = false;
    `);
    const fixture = JSON.parse(run(`JSON.stringify((() => {
        const root = getPassiveTreeRootNodeId();
        const paid = Object.values(PASSIVE_TREE.nodes).filter(node => node.kind !== 'start').slice(0, 5).map(node => node.id);
        const edge = PASSIVE_TREE.edges.find(row => row.from === root || row.to === root);
        return { root, paid, neighbor: edge.from === root ? edge.to : edge.from };
    })())`));

    run(`
        game.currencies.goldenRule = 10;
        game.passives = ${JSON.stringify([fixture.root, ...fixture.paid])};
        game.passiveAttributeChoices = { ${JSON.stringify(fixture.paid[0])}: 'strength' };
        game.passivePoints = 15;
    `);
    await resetPassiveTree();
    assert.strictEqual(run('game.passivePoints'), 20, 'only the five paid nodes should be refunded');
    assert.deepStrictEqual(JSON.parse(run('JSON.stringify(game.passives)')), [],
        'authored class starts should remain implicit free connection points after a reset');
    assert.strictEqual(run('game.currencies.goldenRule'), 9);
    assert.deepStrictEqual(JSON.parse(run(`JSON.stringify(getPassiveActivationPath(${JSON.stringify(fixture.neighbor)}))`)),
        [fixture.neighbor], 'the first node next to the class start must still cost exactly one point');

    run(`
        game.currencies.goldenRule = 10;
        game.passives = [${JSON.stringify(fixture.root)}];
        game.passivePoints = 7;
    `);
    await resetPassiveTree();
    assert.strictEqual(run('game.passivePoints'), 7, 'a free start alone must never create a refund');
    assert.strictEqual(run('game.currencies.goldenRule'), 10, 'a rejected empty reset must not consume currency');

    run(`
        game.currencies.goldenRule = 10;
        game.passives = ${JSON.stringify(fixture.paid.slice(0, 2))};
        game.passivePoints = 5;
    `);
    const totalBefore = run('game.passivePoints + getPaidPassiveNodeIds(game.passives).length');
    for (let attempt = 0; attempt < 5; attempt++) await resetPassiveTree();
    const totalAfter = run('game.passivePoints + getPaidPassiveNodeIds(game.passives).length');
    assert.strictEqual(totalAfter, totalBefore, 'repeated resets must preserve total passive points');

    run(`
        const refundRoot = getPassiveTreeRootNodeId();
        PASSIVE_TREE.nodes.refund_bridge_test = { id:'refund_bridge_test', kind:'path', title:'반환 경로', effects:[] };
        PASSIVE_TREE.nodes.refund_leaf_test = { id:'refund_leaf_test', kind:'path', title:'생명력 재생', effects:[] };
        PASSIVE_TREE.edges.push(
            { from:refundRoot, to:'refund_bridge_test' },
            { from:'refund_bridge_test', to:'refund_leaf_test' }
        );
        capturedPassiveRefundLogs = [];
        addLog = message => capturedPassiveRefundLogs.push(message);
        game.passives = ['refund_bridge_test', 'refund_leaf_test'];
        game.passivePoints = 0;
        game.currencies.blightSpore = 2;
    `);
    assert.strictEqual(run("canRefundPassiveNode('refund_bridge_test')"), false,
        '바깥 노드가 끊기는 중간 패시브는 반환할 수 없어야 합니다.');
    run("refundPassiveNode('refund_bridge_test')");
    assert.deepStrictEqual(JSON.parse(run('JSON.stringify(game.passives)')), ['refund_bridge_test', 'refund_leaf_test'],
        '차단된 중간 패시브 반환은 할당 상태를 바꾸면 안 됩니다.');
    assert.strictEqual(run('game.currencies.blightSpore'), 2, '차단된 반환은 재화를 소모하면 안 됩니다.');
    assert.strictEqual(run("canRefundPassiveNode('refund_leaf_test')"), true,
        '연결을 끊지 않는 끝 패시브는 반환할 수 있어야 합니다.');
    run("refundPassiveNode('refund_leaf_test')");
    assert.deepStrictEqual(JSON.parse(run('JSON.stringify(game.passives)')), ['refund_bridge_test'],
        '끝 패시브는 정상적으로 반환되어야 합니다.');
    assert.strictEqual(run('game.passivePoints'), 1);
    assert.strictEqual(run('game.currencies.blightSpore'), 1);
    assert.ok(run("capturedPassiveRefundLogs.some(message => message.includes('패시브 노드 반환: 생명력 재생'))"),
        '반환 로그에는 내부 ID가 아니라 패시브 표시 이름이 나와야 합니다.');
    assert.ok(run("capturedPassiveRefundLogs.every(message => !message.includes('refund_leaf_test'))"),
        '반환 로그에 내부 패시브 ID를 노출하면 안 됩니다.');

    run(`
        game.currencies.blightSpore = 20;
        game.seasonNodes = ['season-a', 'season-b'];
        game.seasonNodeLevels = { 'season-a': 2, 'season-b': 3 };
        game.seasonPoints = 4;
    `);
    await vm.runInContext('resetSeasonNodes()', context);
    assert.strictEqual(run('game.seasonPoints'), 9, 'season reset should refund invested node levels');
    assert.deepStrictEqual(JSON.parse(run('JSON.stringify(game.seasonNodes)')), []);
    assert.deepStrictEqual(JSON.parse(run('JSON.stringify(game.seasonNodeLevels)')), {});

    run(`game.ascendNodes = ['a','b','c']; game.ascendPoints = 2; game.currencies.blightSpore = 20;`);
    await vm.runInContext('resetAscendNodes()', context);
    assert.strictEqual(run('game.ascendPoints'), 5, 'ascend reset should refund every invested node');
    assert.deepStrictEqual(JSON.parse(run('JSON.stringify(game.ascendNodes)')), []);

    run(`game.ascendKeystones = ['a','b']; game.ascendKeystonePoints = 1; game.currencies.blightSpore = 20;`);
    await vm.runInContext('resetAscendKeystones()', context);
    assert.strictEqual(run('game.ascendKeystonePoints'), 3, 'keystone reset should refund every allocation');
    assert.deepStrictEqual(JSON.parse(run('JSON.stringify(game.ascendKeystones)')), []);

    console.log('smoke-passive-respec-points passed');
}

main().catch(error => { console.error(error); process.exit(1); });
