// 생장 아이템의 제작용 슬롯 매핑이 실제 장비 판정으로 새거나,
// 제작 후 생장판 UI가 이전 값을 유지하는 경계 회귀를 고정한다.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);

function resetGame() {
    run('game = JSON.parse(JSON.stringify(defaultGame)); window.game = game;');
}

function placeFlatHpFlower() {
    run(`(function () {
        game.season = 25;
        syncGrowthBoardUnlocks({ silent: true });
        let base = GROWTH_BASE_DB.find(row => row.category === 'flower');
        let item = createGrowthItemFromBase(base, 'normal', 10);
        item.baseStats = [{ id: 'flatHp', statName: '최대 생명력', val: 100 }];
        item.stats = [];
        game.growthInventory = [item];
        let target = null;
        for (let y = 0; y < GROWTH_BOARD_H && !target; y++) {
            for (let x = 0; x < GROWTH_BOARD_W; x++) {
                if (isGrowthCellUnlocked(x, y)) { target = { x, y }; break; }
            }
        }
        if (!target) throw new Error('해금된 생장판 칸을 찾지 못했다');
        let placed = placeGrowthItem(item.id, target.x, target.y, 0);
        if (!placed.ok) throw new Error('생장 아이템 배치 실패: ' + placed.reason);
        invalidateGrowthEffects();
    })()`);
}

// 꽃의 slot='무기'는 MOD_DB 제작 풀을 고르기 위한 내부 매핑일 뿐이다.
// 성전사의 무기 제거나 전사의 쌍수 무기 증폭이 생장판까지 건드리면 안 된다.
{
    resetGame();
    placeFlatHpFlower();
    const neutralHp = run('getPlayerStats().maxHp');

    run("game.ascendClass = 'crusader'; game.ascendKeystones = ['cr3'];");
    assert.strictEqual(run('getPlayerStats().maxHp'), neutralHp,
        '성전사의 무기 제거 효과가 꽃 생장 아이템을 제거하면 안 된다');

    run(`game.ascendClass = 'warrior'; game.ascendKeystones = ['w6'];
        game.equipment['무기'] = { id: 7001, slot: '무기', rarity: 'normal', baseStats: [], stats: [] };
        game.equipment['방패'] = { id: 7002, slot: '무기', rarity: 'normal', baseStats: [], stats: [] };`);
    assert.strictEqual(run('getPlayerStats().maxHp'), neutralHp,
        '전사의 쌍수 무기 증폭이 꽃 생장 아이템에 적용되면 안 된다');
}

// 유틸리티 플라스크 슬롯은 허리띠만 결정한다. 잎에 사용 불가능한 옵션을 만들지 않는다.
{
    resetGame();
    const leafBaseStats = run(`(function () {
        let base = GROWTH_BASE_DB.find(row => row.category === 'leaf');
        return createGrowthItemFromBase(base, 'normal', 15).baseStats;
    })()`);
    assert.ok(!Array.from(leafBaseStats).some(stat => stat && stat.id === 'flaskUtilSlots'),
        '잎 생장 아이템에 작동하지 않는 플라스크 슬롯 옵션이 붙으면 안 된다');
}

// 새 게임 상태의 판 크기는 정적 데이터와 처음부터 일치해야 한다.
{
    resetGame();
    assert.strictEqual(run('game.growthBoard.width'), run('GROWTH_BOARD_W'), '새 게임 생장판 폭');
    assert.strictEqual(run('game.growthBoard.height'), run('GROWTH_BOARD_H'), '새 게임 생장판 높이');
}

function createRenderHost() {
    return {
        style: {}, renderCount: 0, _html: '',
        querySelector: () => null,
        get firstChild() { return this.renderCount > 0 ? {} : null; },
        get innerHTML() { return this._html; },
        set innerHTML(value) { this._html = value; this.renderCount++; }
    };
}

function createScrollableRenderHost(top, left) {
    const host = createRenderHost();
    host.tray = { scrollTop: top, scrollLeft: left };
    host.querySelector = selector => selector === '.growth-tray-list' ? host.tray : null;
    Object.defineProperty(host, 'innerHTML', {
        get() { return this._html; },
        set(value) {
            this._html = value;
            this.renderCount++;
            this.tray = { scrollTop: 0, scrollLeft: 0 };
        }
    });
    return host;
}

// 빠른 배치함 카드 선택은 패널을 다시 그리더라도 사용자가 보고 있던 위치를 유지해야 한다.
{
    resetGame();
    placeFlatHpFlower();
    const panel = createScrollableRenderHost(137, 29);
    ctx.document.getElementById = id => id === 'ui-growth-panel' ? panel : null;
    run("growthSelection = { itemId: null, source: null, rotation: 0, hoverCell: null }; selectGrowthItem(game.growthInventory[0].id, 'tray')");
    assert.strictEqual(run('growthSelection.source'), 'tray', '빠른 배치함 클릭으로 아이템을 선택해야 한다');
    assert.strictEqual(panel.tray.scrollTop, 137, '빠른 배치함의 세로 스크롤을 복원해야 한다');
    assert.strictEqual(panel.tray.scrollLeft, 29, '모바일 빠른 배치함의 가로 스크롤도 복원해야 한다');
}

// 보관함 카드는 별도 제작 버튼 없이 카드 자체로 제작대 대상을 선택하고,
// 제작대는 실제 베이스/추가 옵션을 제작 전에 보여 줘야 한다.
{
    resetGame();
    run(`(function () {
        game.season = 25;
        let base = GROWTH_BASE_DB.find(row => row.category === 'flower');
        let item = createGrowthItemFromBase(base, 'rare', 12);
        item.name = '제작 미리보기 꽃';
        item.baseStats = [{ id: 'flatHp', statName: '최대 생명력', val: 77 }];
        item.stats = [{ id: 'crit', statName: '치명타 확률', val: 3, tier: 3 }];
        game.growthInventory = [item];
        growthCraftItemId = item.id;
    })()`);
    const itemCard = run("renderGrowthItemCard(game.growthInventory[0], 'inventory')");
    assert.ok(itemCard.includes('onclick="openGrowthCrafting('), '보관함 카드 자체가 제작대 선택 동작을 가져야 한다');
    assert.ok(!itemCard.includes('>제작</button>') && !itemCard.includes('>재각인</button>'),
        '생장판 카드에 별도 제작/재각인 버튼을 남기면 안 된다');
    const bench = run('renderGrowthCraftBench()');
    assert.ok(bench.includes('제작 미리보기 꽃') && bench.includes('최대 생명력') && bench.includes('77'),
        '제작대는 선택한 생장판의 이름과 베이스 옵션을 보여야 한다');
    assert.ok(bench.includes('치명타 확률'), '제작대는 추가 옵션 이름을 보여야 한다');
    assert.ok(bench.includes('+3'), '제작대는 추가 옵션 수치를 보여야 한다');
    assert.ok(bench.includes('T3'), '제작대는 추가 옵션 티어를 보여야 한다');
}

// 제작 탭에서 옵션 값·태그·품질이 바뀐 뒤 돌아오면 판의 시너지와 비교도 다시 그려야 한다.
{
    resetGame();
    placeFlatHpFlower();
    const panel = createRenderHost();
    const elements = {
        'ui-growth-panel': panel,
        'ui-growth-unlock-note': createRenderHost(),
        'ui-growth-recent': createRenderHost(),
        'ui-growth-recent-count': createRenderHost(),
        'ui-growth-inventory': createRenderHost(),
        'ui-growth-inv-count': createRenderHost(),
        'ui-growth-inv-limit': createRenderHost()
    };
    ctx.document.getElementById = id => elements[id] || null;
    run('renderGrowthTab({ force: true })');

    const expectRerender = (mutation, message) => {
        const before = panel.renderCount;
        run(mutation);
        run('renderGrowthTab()');
        assert.strictEqual(panel.renderCount, before + 1, message);
    };
    expectRerender('game.growthInventory[0].baseStats[0].val += 1', '옵션 값 변경을 렌더 지문이 감지해야 한다');
    expectRerender("game.growthInventory[0].growthTags = ['화염']", '태그 변경을 렌더 지문이 감지해야 한다');
    expectRerender('game.growthInventory[0].quality = 1', '품질 변경을 렌더 지문이 감지해야 한다');
}

console.log('smoke-growth-boundary-regressions passed');
