// 패시브 트리 전체 초기화(거래소)의 포인트 보존 계약.
//
// n0는 포인트를 쓰지 않고 주어지는 뿌리다. 반환 대상에 넣으면 초기화할 때마다
// 포인트가 1점씩 늘어난다. 노드를 하나도 찍지 않고 반복해도 늘어나므로,
// 황금률만 있으면 패시브 포인트를 무한히 만들 수 있었다(실측 +1/회).
// 레이아웃 마이그레이션 경로(js/ui.js의 refundedForRadialLayout)는 처음부터
// n0를 빼고 ['n0']로 되돌린다. 두 경로가 같은 규칙을 써야 한다.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function loadRespec(gameState) {
    const source = fs.readFileSync('js/items.js', 'utf8');
    const start = source.indexOf('async function marketResetPassiveTreeByDivine()');
    const end = source.indexOf('async function marketAnnulSelectedStat(');
    assert(start >= 0 && end > start, 'marketResetPassiveTreeByDivine을 찾지 못했다');
    const logs = [];
    const context = {
        console,
        game: gameState,
        addLog: text => logs.push(String(text)),
        updateStaticUI: () => {},
        calculateReachableNodes: () => {},
        refreshPassiveVisibility: () => {},
        isMarketUnlocked: () => true,
        requestGameConfirmation: async () => true
    };
    context.logs = logs;
    vm.createContext(context);
    vm.runInContext(source.slice(start, end), context);
    return context;
}

const baseGame = extra => ({
    woodsmanBuildLock: false,
    currencies: { goldenRule: 10 },
    passives: ['n0'],
    passiveAttributeChoices: {},
    passivePoints: 0,
    ...extra
});

async function main() {
    // ── 찍은 노드만큼만 돌려받는다 ──────────────────────────────────────
    {
        const ctx = loadRespec(baseGame({ passives: ['n0', 'a', 'b', 'c', 'd', 'e'], passivePoints: 15 }));
        await vm.runInContext('marketResetPassiveTreeByDivine()', ctx);
        assert.strictEqual(ctx.game.passivePoints, 20,
            `유료 노드 5개만 돌려받아야 한다 (현재 ${ctx.game.passivePoints}점)`);
        assert.strictEqual(JSON.stringify(ctx.game.passives), '["n0"]',
            '뿌리 n0는 남아 있어야 한다. 통째로 비우면 무료 시작 노드를 다시 사야 한다');
        assert.strictEqual(ctx.game.currencies.goldenRule, 9, '황금률 1개를 소모해야 한다');
        assert.ok(ctx.logs.some(text => text.includes('5점')), '반환 점수를 정확히 알려야 한다');
    }

    // ── 뿌리만 있는 트리는 초기화 대상이 아니다(반복 악용 차단) ────────
    {
        const ctx = loadRespec(baseGame({ passives: ['n0'], passivePoints: 7 }));
        await vm.runInContext('marketResetPassiveTreeByDivine()', ctx);
        assert.strictEqual(ctx.game.passivePoints, 7, '찍은 노드가 없으면 포인트가 늘면 안 된다');
        assert.strictEqual(ctx.game.currencies.goldenRule, 10, '거절할 때는 황금률도 쓰면 안 된다');
        assert.ok(ctx.logs.some(text => text.includes('초기화할 패시브 노드가 없습니다')), '이유를 알려야 한다');
    }

    // ── 몇 번을 반복해도 총량이 늘지 않는다 ────────────────────────────
    {
        const ctx = loadRespec(baseGame({ passives: ['n0', 'a', 'b'], passivePoints: 5 }));
        const totalBefore = ctx.game.passivePoints + (ctx.game.passives.length - 1);
        for (let i = 0; i < 5; i++) {
            await vm.runInContext('marketResetPassiveTreeByDivine()', ctx);
        }
        const totalAfter = ctx.game.passivePoints + (ctx.game.passives.length - 1);
        assert.strictEqual(totalAfter, totalBefore,
            `초기화를 반복해도 총 포인트가 늘면 안 된다 (${totalBefore} → ${totalAfter})`);
    }

    // ── 마이그레이션 경로와 같은 규칙을 쓴다 ───────────────────────────
    {
        const ui = fs.readFileSync('js/ui.js', 'utf8');
        assert.ok(/refundedForRadialLayout\s*=\s*\(merged\.passives \|\| \[\]\)\.filter\(id => id !== 'n0'\)/.test(ui),
            '마이그레이션 반환도 n0를 빼야 한다');
        assert.ok(/merged\.passives = \['n0'\]/.test(ui), '마이그레이션도 뿌리를 남겨야 한다');
        const items = fs.readFileSync('js/items.js', 'utf8');
        const respec = items.slice(items.indexOf('async function marketResetPassiveTreeByDivine'),
            items.indexOf('async function marketAnnulSelectedStat('));
        assert.ok(/filter\(nodeId => nodeId !== 'n0'\)/.test(respec), '거래소 초기화도 n0를 반환에서 빼야 한다');
        assert.ok(/game\.passives = \['n0'\]/.test(respec), '거래소 초기화도 뿌리를 남겨야 한다');
    }

    // ── 나머지 초기화 경로도 같은 보존 계약을 지킨다 ────────────────────
    // 패시브 트리와 달리 루프/전직/키스톤 목록에는 무료로 주어지는 뿌리가 없다.
    // 그래서 "목록 길이(루프는 레벨 합)만큼 반환"이 맞다. 브라우저 실측으로도
    // 셋 다 누수 0을 확인했고, 여기서 그 규칙이 유지되는지 고정한다.
    {
        const ui = fs.readFileSync('js/ui.js', 'utf8');
        const bodyOf = name => {
            const start = ui.search(new RegExp(`async function ${name}\\s*\\(`));
            assert.ok(start >= 0, `${name}을 찾지 못했다`);
            let open = ui.indexOf('{', start);
            let depth = 0;
            for (let i = open; i < ui.length; i++) {
                if (ui[i] === '{') depth++;
                else if (ui[i] === '}' && --depth === 0) return ui.slice(start, i + 1);
            }
            throw new Error(`${name}의 끝을 찾지 못했다`);
        };

        const season = bodyOf('resetSeasonNodes');
        assert.ok(/seasonPoints \|\| 0\)\) \+ totalLv/.test(season),
            '루프 패시브는 투자한 레벨 합만큼 돌려줘야 한다(노드 수가 아니다)');
        assert.ok(/game\.seasonNodes = \[\]/.test(season) && /game\.seasonNodeLevels = \{\}/.test(season),
            '루프 패시브 초기화는 노드와 레벨을 함께 비워야 한다(레벨이 남으면 다음 반환이 부풀려진다)');

        const ascend = bodyOf('resetAscendNodes');
        assert.ok(/ascendPoints \|\| 0\)\) \+ game\.ascendNodes\.length/.test(ascend),
            '전직 패시브는 찍은 노드 수만큼 돌려줘야 한다');

        const keystone = bodyOf('resetAscendKeystones');
        assert.ok(/ascendKeystonePoints \|\| 0\)\) \+ game\.ascendKeystones\.length/.test(keystone),
            '키스톤은 찍은 수만큼 돌려줘야 한다');

        // 셋 다 빈 목록이면 아무 일도 하지 않는다(반복 악용 차단).
        [['resetSeasonNodes', season, 'seasonNodes'],
         ['resetAscendNodes', ascend, 'ascendNodes'],
         ['resetAscendKeystones', keystone, 'ascendKeystones']].forEach(([name, body, field]) => {
            assert.ok(new RegExp(`game\\.${field}\\.length <= 0\\) return`).test(body),
                `${name}은 비어 있으면 즉시 돌아가야 한다(빈 상태 반복 초기화로 포인트가 생기면 안 된다)`);
        });
    }

    console.log('smoke-passive-respec-points passed');
}

main().catch(error => { console.error(error); process.exit(1); });
