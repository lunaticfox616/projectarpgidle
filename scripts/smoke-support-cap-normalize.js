// 보조 젬 장착 한도 정리(normalizeSupportLoadout) 계약.
// getPlayerStats는 한 번에 2.7ms가 든다. 화면 갱신마다 여기서 한 번, 바로 뒤
// getUiPlayerStats에서 또 한 번 불러 매 프레임 5.4ms를 같은 계산에 쓰고 있었다.
// 계산해 둔 스탯을 넘길 수 있게 하되, 넘기지 않는 기존 호출부는 그대로 동작해야 한다.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function loadNormalizer(statsProvider, gameState) {
    const source = fs.readFileSync('js/skills.js', 'utf8');
    const start = source.indexOf('function normalizeSupportLoadout(');
    const end = source.indexOf('const GEM_LEVEL_TAG_RULES');
    assert(start >= 0 && end > start, 'normalizeSupportLoadout을 찾지 못했다');
    const logs = [];
    const context = {
        console,
        game: gameState,
        addLog: text => logs.push(String(text)),
        getPlayerStats: statsProvider
    };
    context.logs = logs;
    vm.createContext(context);
    vm.runInContext(source.slice(start, end), context);
    return context;
}

// ── 넘긴 스탯을 쓰면 getPlayerStats를 부르지 않는다 ──────────────────────
{
    let providerCalls = 0;
    const ctx = loadNormalizer(() => { providerCalls++; return { suppCap: 2 }; },
        { equippedSupports: ['a', 'b', 'c', 'd'] });

    const removed = vm.runInContext('normalizeSupportLoadout(true, { suppCap: 2 })', ctx);
    assert.strictEqual(removed, true, '한도를 넘으면 정리했다고 알려야 한다');
    assert.strictEqual(providerCalls, 0, '스탯을 넘겼으면 getPlayerStats를 다시 부르면 안 된다');
    assert.strictEqual(ctx.game.equippedSupports.length, 2, '한도까지 잘라야 한다');
    assert.strictEqual(JSON.stringify(ctx.game.equippedSupports), JSON.stringify(['a', 'b']),
        '앞쪽부터 남겨야 한다(뒤에서 장착한 것이 먼저 빠진다)');
    assert.ok(ctx.logs.some(text => text.includes('자동 해제')), '자동 해제는 로그로 알려야 한다');
}

// ── 스탯을 넘기지 않으면 예전처럼 직접 계산한다 ─────────────────────────
{
    let providerCalls = 0;
    const ctx = loadNormalizer(() => { providerCalls++; return { suppCap: 1 }; },
        { equippedSupports: ['a', 'b'] });
    assert.strictEqual(vm.runInContext('normalizeSupportLoadout(false)', ctx), true, '한도 초과를 정리해야 한다');
    assert.strictEqual(providerCalls, 1, '스탯을 넘기지 않으면 직접 계산해야 한다');
    assert.strictEqual(ctx.game.equippedSupports.length, 1, '한도까지 잘라야 한다');
}

// ── 한도 안이면 손대지 않는다 ────────────────────────────────────────────
{
    const ctx = loadNormalizer(() => ({ suppCap: 5 }), { equippedSupports: ['a', 'b'] });
    assert.strictEqual(vm.runInContext('normalizeSupportLoadout(true, { suppCap: 5 })', ctx), false,
        '한도 안이면 아무것도 하지 않아야 한다');
    assert.strictEqual(ctx.game.equippedSupports.length, 2, '한도 안의 젬을 건드리면 안 된다');
    assert.strictEqual(ctx.logs.length, 0, '바뀐 것이 없으면 로그도 남기지 않아야 한다');
}

// ── 스탯 제공자가 없으면 아무것도 하지 않는다 ───────────────────────────
// 부팅 중에는 전투 모듈이 아직 없을 수 있다. 이때 한도를 0으로 보고 정리하면
// 저장에서 막 불러온 보조 젬이 한 프레임 만에 전부 해제된다.
{
    const ctx = loadNormalizer(undefined, { equippedSupports: ['a', 'b', 'c'] });
    assert.strictEqual(vm.runInContext('normalizeSupportLoadout(true)', ctx), false,
        '스탯을 알 수 없으면 정리하지 않아야 한다');
    assert.strictEqual(ctx.game.equippedSupports.length, 3, '부팅 중에 보조 젬이 해제되면 안 된다');
}

// ── 화면 갱신 호출부 계약 (js/ui.js) ────────────────────────────────────
{
    const ui = fs.readFileSync('js/ui.js', 'utf8');
    const marker = ui.indexOf('let pStats = getUiPlayerStats();');
    assert.ok(marker > 0, '화면 갱신이 스탯을 한 번 계산하는 지점을 찾지 못했다');
    const block = ui.slice(marker - 400, marker + 400);
    assert.ok(/normalizeSupportLoadout\(true,[^)]*pStats/.test(block),
        '화면 갱신은 계산해 둔 스탯을 보조 젬 정리에 넘겨야 한다(같은 계산을 두 번 하면 안 된다)');
    assert.ok(/__uiFallbackStats\s*\?\s*null/.test(block),
        '폴백 스탯(suppCap 0)은 넘기면 안 된다. 넘기면 부팅 중 보조 젬이 전부 해제된다');
    assert.ok(/normalizeSupportLoadout\([^)]*\)\)\s*pStats = getUiPlayerStats\(\)/.test(block),
        '정리로 젬이 빠졌으면 스탯을 다시 계산해야 한다');
}

console.log('smoke-support-cap-normalize passed');
