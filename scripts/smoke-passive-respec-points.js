const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const replayFixture = require('./lib/replay-fixture');

const context = buildGameRuntime();
const run = source => vm.runInContext(source, context);

async function resetPassiveTree() {
    return vm.runInContext('resetPassiveTreeByGoldenRule()', context);
}

function verifyGrantedClassStarts() {
    const { run: play } = replayFixture();
    const rows = JSON.parse(play(`JSON.stringify((() => {
        game.season = 2;
        contentProgression.purchase('passiveTree');
        const initial = JSON.parse(serializeSaveState(game));
        return Object.entries(PASSIVE_START_GATE_CLASS_BY_TITLE).map(([title, classId]) => {
            game = mergeDefaults({ ...initial, selectedClassId: classId === 'warrior' ? 'archer' : 'warrior' });
            game.passivePoints = 999;
            const gate = Object.values(PASSIVE_TREE.nodes).find(node => node.title === title);
            const start = PASSIVE_TREE_V22.classStarts[classId];
            const neighbors = getPassiveTreeAdjacency().get(start);
            calculateReachableNodes();
            const closedBefore = !reachableNodes.has(start);
            const grant = activatePassivePath(gate.id);
            calculateReachableNodes();
            const remoteOpened = reachableNodes.has(start);
            const targets = neighbors.filter(id => !game.passives.includes(id));
            const onePoint = targets.every(id => getPassiveActivationPath(id).length === 1);
            const clickable = targets.every(id => reachableNodes.has(id));
            const before = game.passivePoints;
            const taken = activatePassivePath(targets[0]);
            const paidOnce = before - game.passivePoints === 1 && !game.passives.includes(start);
            const refundBlocked = !canRefundPassiveNode(gate.id);
            const ids = game.passives.slice(), points = game.passivePoints;
            game = mergeDefaults(JSON.parse(serializeSaveState(game)));
            calculateReachableNodes();
            const restored = JSON.stringify(ids) === JSON.stringify(game.passives) && points === game.passivePoints;
            const stillClickable = targets.slice(1).every(id => reachableNodes.has(id));
            game.passives = game.passives.filter(id => id !== targets[0]);
            const refundAllowed = canRefundPassiveNode(gate.id);
            game.passives = game.passives.filter(id => id !== gate.id);
            calculateReachableNodes();
            const closedAgain = !reachableNodes.has(start) && targets.every(id => getPassiveActivationPath(id).length > 1);
            game.passives = ids.filter(id => id !== grant.path[0]);
            const budget = passiveRouting.pointBudget(game);
            refreshPassiveConnectivity();
            const revoked = !game.passives.includes(gate.id) && !game.passives.includes(targets[0])
                && passiveRouting.pointBudget(game) === budget;
            return { title, unlocked: grant.activated, closedBefore, remoteOpened, count: targets.length, onePoint, clickable,
                activated: taken.activated, paidOnce, restored, stillClickable, closedAgain, refundBlocked, refundAllowed, revoked };
        });
    })())`));
    assert.strictEqual(rows.length, 6);
    for (const row of rows) {
        assert.ok(row.unlocked && row.count > 0, `${row.title}: the keystone is allocated through a legal path`);
        assert.ok(row.closedBefore && row.remoteOpened, `${row.title}: allocation grants the remote starting point immediately`);
        assert.ok(row.onePoint && row.clickable, `${row.title}: one-point nodes across the start must be clickable`);
        assert.ok(row.activated && row.paidOnce, `${row.title}: charge only the paid node, never the free start`);
        assert.ok(row.restored && row.stillClickable, `${row.title}: save/load preserves the route and points`);
        assert.ok(row.closedAgain, `${row.title}: a missing gate must close traversal`);
        assert.ok(row.refundBlocked && row.refundAllowed, `${row.title}: refund must protect nodes relying on the granted start`);
        assert.ok(row.revoked, `${row.title}: automatic removal must revoke the origin and refund dependent nodes immediately`);
    }
}

function verifyEditedTree() {
    const { run: play } = replayFixture();
    const read = expression => JSON.parse(play('JSON.stringify(' + expression + ')'));
    play(`
        const edited = ['pt_keystone_balance_resonance', 'pt_keystone_three_lights',
            'pt_keystone_critical_conversion', 'nmwc5dia92', 'nmwc5lu2h3'];
        const initial = game;
        const reward = (stat, value) => ({ stat, value });
        const evaluate = (overrides, passives) => {
            game = { ...initial, ...overrides, passives };
            playerStatCache.invalidate();
            const stats = getPlayerStats(false);
            return { stats, row: {
                attributes: [stats.strength, stats.dexterity, stats.intelligence], hp: stats.maxHp,
                crit: stats.crit, critDamage: stats.rawCritDmg, damage: stats.baseDmg, element: stats.sSkill.ele,
                slots: stats.suppCap, overflow: stats.supportResonanceOverflow,
                res: [stats.rawResF, stats.rawResC, stats.rawResL, stats.rawResChaos]
            } };
        };
        const paired = (index, state, nodes = []) => [evaluate(state, nodes).row, evaluate(state, [...nodes, edited[index]]).row];
        const supportTiers = Object.fromEntries(['가속', '날카로움'].map(name => [name, { unlockedTier: 1, activeTier: 1 }]));
        const supported = { resonancePower: 16, equippedSupports: ['가속'], supportGemData: supportTiers };
    `);
    assert.ok(read('edited.map(id => getPassiveActivationPath(id)?.length)').every(length => length > 0));
    const attr = read("paired(0, {actRewardBonuses:[reward('strength',4),reward('intelligence',20)]}, ['n3p74atcawv'])");
    assert.deepStrictEqual(attr.map(s => s.attributes), [[9, 0, 20], [6.5, 2.5, 0]]);
    assert.strictEqual(play('getPlayerStats(false,true,true).intelligence'), 0, 'gear requirements must also see zero intelligence');

    const critical = read("paired(2, {actRewardBonuses:[reward('crit',100)]})");
    assert.strictEqual(critical[1].crit, 50);
    assert.ok(Math.abs(critical[1].critDamage - critical[0].critDamage - (critical[0].crit - 50) * 5) < 1e-9);
    const lowCrit = read("paired(2, {actRewardBonuses:[reward('crit',10)]})");
    assert.strictEqual(lowCrit[1].crit, lowCrit[0].crit);
    assert.strictEqual(lowCrit[1].critDamage, lowCrit[0].critDamage);

    const fire = read(`paired(1, {
        level: 60, equipment: { ...initial.equipment, '무기': createClassStarterWeapon('occultist') },
        skills: [...initial.skills, '화염 폭풍핵'], activeSkill: '화염 폭풍핵',
        actRewardBonuses: [reward('firePctDmg',5),reward('coldPctDmg',80),reward('lightPctDmg',20)]
    })`);
    assert.deepStrictEqual(fire.map(s => s.element), ['fire', 'fire'], 'only the bonus changes, not the element');
    assert.ok(fire[1].damage > fire[0].damage);
    const ailments = read(`[[], [edited[1]]].map(ids => {
        const { stats } = evaluate({}, ids);
        return ['fire', 'light', 'phys'].map(ele => {
            const enemy = { maxHp: 1000, ailments: [] };
            applyEnemyAilmentFromHit(enemy, { ...stats, sSkill: {...stats.sSkill, ele} }, 300, false, { primaryAilmentChance: 1 });
            return enemy.ailments.map(ailment => ailment.type);
        });
    })`);
    assert.deepStrictEqual(ailments, [[['ignite'], ['shock'], ['bleed']], [[], [], ['bleed']]]);

    const life = read('paired(3, supported)');
    assert.strictEqual(life[1].hp - life[0].hp, 50, 'six spent out of sixteen leaves ten resonance');
    const overload = read(`[6, 7, 7].map((extraSlots, i) => evaluate({
        ...supported, resonancePower: 10, equippedSupports: ['가속','날카로움'],
        actRewardBonuses: [reward('suppCap',extraSlots)]
    }, i === 2 ? [] : [edited[4]]).row)`);
    assert.deepStrictEqual(overload.map(s => [s.slots,s.overflow,s.res]), [
        [8,0,[0,0,0,0]], [9,2,[-2,-2,-2,-2]], [9,0,[0,0,0,0]]
    ]);
    assert.deepStrictEqual(read('game.equippedSupports'), ['가속', '날카로움']);
    assert.strictEqual(play('normalizeSupportLoadout(false, null, true)'), true);
    assert.deepStrictEqual(read('game.equippedSupports'), ['가속']);

    const saved = read(`(() => {
        game = { ...initial, passivePoints: 999 };
        const neighbor = [...getPassiveTreeAdjacency().get(getPassiveTreeRootNodeId())]
            .find(id => PASSIVE_TREE.nodes[id].kind !== 'start');
        const changed = mergeDefaults({ ...game, passives: [neighbor,'nmvwdztdh1p','nmvsenvej3w'] });
        const restored = mergeDefaults({ ...changed });
        const newPath = getPassiveActivationPath(edited[0]);
        const newSave = mergeDefaults({ ...game, passives: newPath });
        return [changed.passives, neighbor, changed.autoRefundedPassivePoints,
            restored.passivePoints === changed.passivePoints, newSave.passives.includes(edited[0])];
    })()`);
    assert.deepStrictEqual(saved, [[saved[1]], saved[1], 2, true, true], 'retired nodes refund once; other reachable allocations stay');
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

    verifyGrantedClassStarts();
    verifyEditedTree();
    console.log('smoke-passive-respec-points passed');
}

main().catch(error => { console.error(error); process.exit(1); });
