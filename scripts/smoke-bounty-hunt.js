const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const run = source => vm.runInContext(source, context);
const merge = save => context.mergeDefaults(JSON.parse(JSON.stringify(save)));

function loadGame(save) {
    const state = merge(save);
    context.__bountyTestGame = state;
    run('game = __bountyTestGame;');
    return state;
}

assert.strictEqual(Object.keys(context.BOUNTY_TARGET_DB).length, 6, '현상금 표적 정의가 모두 로드되어야 한다');
run('__bountyOriginalRandom = Math.random; Math.random = () => 0.999;');

{
    const first = merge({});
    first.bountyHunt.pity = 7;
    const second = merge({});
    assert.strictEqual(second.bountyHunt.pity, 0, '새 저장의 현상금 상태가 이전 게임 객체와 공유되면 안 된다');
}

{
    const state = loadGame({ season: 1, loopCount: 0 });
    const result = context.bountyRuntime.advanceAfterBossKill({ type: 'act' }, { isBoss: true }, state);
    assert.strictEqual(context.bountyRuntime.isUnlocked(state), false, '루프 1에는 현상금이 잠겨야 한다');
    assert.strictEqual(result.reason, 'ineligible', '잠긴 상태의 보스 처치는 진행도를 올리면 안 된다');
    assert.strictEqual(state.bountyHunt.pity, 0, '잠긴 상태의 실패 보정은 그대로여야 한다');
}

{
    const state = loadGame({ season: 2, loopCount: 1 });
    for (let count = 0; count < 9; count++) {
        const result = context.bountyRuntime.advanceAfterBossKill({ type: 'act' }, { isBoss: true }, state);
        assert.strictEqual(result.reason, 'miss', '보장 전에는 실패 굴림이 누적되어야 한다');
    }
    assert.strictEqual(state.bountyHunt.pity, 9, '열 번째 보스 직전 보정은 9여야 한다');
    const guaranteed = context.bountyRuntime.advanceAfterBossKill({ type: 'act' }, { isBoss: true }, state);
    assert.strictEqual(guaranteed.offered, true, '열 번째 적격 보스는 현상금을 보장해야 한다');
    assert.strictEqual(new Set(guaranteed.offerIds).size, 3, '서로 다른 표적 3개를 제시해야 한다');
    assert.ok(!guaranteed.offerIds.includes('root_poacher'), '생장판 해금 전에는 생장 보상 표적을 제시하면 안 된다');
    assert.strictEqual(state.bountyHunt.pity, 0, '제안이 생성되면 실패 보정은 초기화되어야 한다');

    const beforeInvalid = JSON.stringify(state.bountyHunt);
    assert.strictEqual(context.bountyRuntime.acceptOffer('missing-target', state).accepted, false, '제안에 없는 표적은 수락할 수 없어야 한다');
    assert.strictEqual(JSON.stringify(state.bountyHunt), beforeInvalid, '잘못된 수락은 상태를 바꾸면 안 된다');

    const targetId = guaranteed.offerIds[0];
    assert.strictEqual(context.bountyRuntime.acceptOffer(targetId, state).accepted, true, '제시된 표적은 수락할 수 있어야 한다');
    assert.strictEqual(state.bountyHunt.status, 'queued', '수락한 표적은 다음 사냥 대기 상태여야 한다');
    const plan = [{ at: 20, count: 2 }, { at: 80, count: 1, boss: true }];
    assert.strictEqual(context.bountyRuntime.injectEncounterMarker(plan, { type: 'act' }, state), true, '적격 사냥에 현상금 표식을 주입해야 한다');
    assert.strictEqual(plan.filter(marker => marker.bountyId === targetId).length, 1, '표적 표식은 한 번만 들어가야 한다');
    assert.deepStrictEqual(plan.map(marker => marker.at), [20, 55, 80], '표식은 진행도 순서를 유지해야 한다');
    assert.strictEqual(context.bountyRuntime.injectEncounterMarker(plan, { type: 'act' }, state), false, '같은 사냥에 표적을 중복 주입하면 안 된다');
}

{
    const state = loadGame({
        season: 25,
        bountyHunt: { activeId: 'root_poacher', status: 'hunting', pity: 4 },
        enemies: [{ id: 91, hp: 100, maxHp: 100, name: 'target', isElite: true, isBountyTarget: true, bountyId: 'root_poacher' }],
        encounterPlan: [{ at: 55, count: 1, elite: true, bountyId: 'root_poacher' }],
        encounterIndex: 0
    });
    assert.strictEqual(state.bountyHunt.status, 'hunting', '살아 있는 표적을 포함한 로컬 저장은 교전 상태를 유지해야 한다');
    assert.strictEqual(state.encounterPlan[0].bountyId, 'root_poacher', '로컬 저장 마이그레이션이 현상금 표식을 보존해야 한다');
    const cloud = context.createCloudSavePayload(state);
    const restored = merge(cloud);
    assert.strictEqual(restored.bountyHunt.status, 'queued', '전투 엔트리를 제거하는 클라우드 저장은 표적을 다음 사냥으로 돌려야 한다');
    assert.strictEqual(restored.bountyHunt.activeId, 'root_poacher', '클라우드 복구가 수락한 표적 자체를 잃으면 안 된다');
}

{
    const state = loadGame({
        season: 25,
        bountyHunt: { activeId: 'iron_collector', status: 'hunting' },
        enemies: [
            { id: 1, hp: 20, maxHp: 20, name: 'normal' },
            { id: 2, hp: 20, maxHp: 20, name: 'bounty', isBountyTarget: true, bountyId: 'iron_collector' }
        ],
        encounterPlan: [{ at: 20, count: 1 }, { at: 55, count: 1, bountyId: 'iron_collector' }]
    });
    assert.strictEqual(context.bountyRuntime.abandon(state), true, '진행 중 현상금을 포기할 수 있어야 한다');
    assert.deepStrictEqual(state.enemies.map(enemy => enemy.id), [1], '포기는 일반 적을 제거하면 안 된다');
    assert.strictEqual(state.encounterPlan.length, 1, '포기는 일반 조우 표식을 제거하면 안 된다');
    assert.strictEqual(state.bountyHunt.abandoned, 1, '포기 횟수를 한 번만 기록해야 한다');
}

{
    const state = loadGame({
        season: 25,
        currentZoneId: 0,
        bountyHunt: { offerIds: ['iron_collector'] },
        loopStarterGemGranted: true,
        seenTutorials: ['unlock_growth_board', 'unlock_hideout', 'tutorial_battle_basics'],
        unlocks: { char: true, items: true, jewel: true, skills: true, season: true, codex: true, map: true, hideout: true, traits: true, expertise: true }
    });
    assert.strictEqual(context.bountyRuntime.acceptOffer('iron_collector', state).accepted, true, '통합 전투용 표적을 수락해야 한다');
    run('startEncounterRun();');
    const marker = state.encounterPlan.find(entry => entry && entry.bountyId === 'iron_collector');
    assert.ok(marker, '실제 전투 시작 경로가 현상금 표식을 넣어야 한다');
    context.__bountyMarker = marker;
    run('spawnEncounterMarker(__bountyMarker);');
    const enemy = state.enemies.find(entry => entry && entry.isBountyTarget);
    assert.ok(enemy && enemy.maxHp > 0, '실제 생성 경로가 강화 현상금 적을 만들어야 한다');
    assert.strictEqual(state.bountyHunt.status, 'hunting', '표적 생성 후에는 교전 상태여야 한다');
    assert.ok(enemy.name.includes('철갑 수집가'), '선택한 표적의 이름과 특성이 적용되어야 한다');
    enemy.hp = 0;
    context.__bountyEnemy = enemy;
    run('handleEnemyDeath(__bountyEnemy, getPlayerStats());');
    assert.strictEqual(state.bountyHunt.completed, 1, '표적 처치를 한 번 완료로 기록해야 한다');
    assert.strictEqual(state.bountyHunt.activeId, null, '완료한 표적은 활성 상태에서 제거되어야 한다');
    const ownedEquipment = state.inventory.concat(Object.values(state.equipment || {}).filter(Boolean));
    assert.ok(ownedEquipment.some(item => ['rare', 'unique'].includes(item.rarity)), '현상금 장비 보상은 최소 희귀 등급이어야 한다');
    assert.ok((state.currencies.formlessDew || 0) >= 1, '정의된 확정 재화 보상을 지급해야 한다');
    const completedBefore = state.bountyHunt.completed;
    run('handleEnemyDeath(__bountyEnemy, getPlayerStats());');
    assert.strictEqual(state.bountyHunt.completed, completedBefore, '같은 적의 사망 처리를 반복해 보상을 중복 지급하면 안 된다');
}

{
    const state = loadGame({ season: 25, currentZoneId: 0 });
    context.__dropEnemy = { isBoss: false, isElite: true };
    const item = run("generateEquipmentDrop(__dropEnemy, { minimumRarity: 'rare' });");
    assert.ok(['rare', 'unique'].includes(item.rarity), '확정 보상용 최소 희귀도 계약을 지켜야 한다');
    const normal = run("generateEquipmentDrop(__dropEnemy, { minimumRarity: 'invalid' });");
    assert.strictEqual(normal.rarity, 'normal', '잘못된 최소 희귀도는 일반 드랍 규칙을 바꾸면 안 된다');
}

run('Math.random = __bountyOriginalRandom;');
console.log('smoke-bounty-hunt passed');
