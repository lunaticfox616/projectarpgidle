// 코어 큐브 회귀 검사: 재구성이 실제로 상태에 반영되는지, 조합 프리셋 저장/복원,
// 2번 저장칸 해금 조건(1~45 동력원 전부 각인), 루프 리셋 후 프리셋 유지.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function loadCubeContext(options = {}) {
    const logs = [];
    const context = {
        console,
        window: {},
        game: {
            season: 30,
            unlocks: { cube: true },
            noti: { cube: false },
            underworldProgress: { highestFloor: 20 },
            coreCube: null
        },
        addLog: (text) => logs.push(String(text)),
        updateStaticUI: () => {},
        // 확인창은 테스트가 지정한 값을 돌려준다. 실제 런타임처럼 await를 한 틱 넘긴다.
        requestGameConfirmation: () => Promise.resolve(options.confirm !== false),
        hashSeed: (text) => {
            let h = 2166136261;
            String(text).split('').forEach(ch => { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); });
            return h >>> 0;
        }
    };
    context.logs = logs;
    // ensureCoreCubeState는 window.game으로 살아 있는 상태를 판별한다(브라우저와 동일하게 연결).
    context.window.game = context.game;
    context.safeExposeGlobals = map => Object.keys(map || {}).forEach(key => { context[key] = map[key]; });
    vm.createContext(context);
    // 패널 렌더는 DOM에 의존하므로 로드 후 무해한 스텁으로 덮는다(도메인 동작만 본다).
    vm.runInContext(fs.readFileSync('js/core-cube.js', 'utf8'), context);
    vm.runInContext('renderCoreCubePanel = function () {};', context);
    return context;
}

const run = (ctx, code) => vm.runInContext(code, ctx);

// ── 재구성이 실제로 적용되어야 한다 (확인창 await 뒤에도) ─────────────────
// 회귀: ensureCoreCubeState가 매번 새 객체를 반환하던 시절, await 앞에서 잡아 둔
// 참조가 낡아버려 재구성 버튼을 눌러도 각인이 그대로 남았다.
async function testResetApplies() {
    const ctx = loadCubeContext({ confirm: true });
    run(ctx, 'let st = ensureCoreCubeState(); st.faces = [1,2,3,4,5,6]; st.completed = true;');
    assert.strictEqual(run(ctx, 'ensureCoreCubeState().faces.join(",")'), '1,2,3,4,5,6',
        '사전 조건: 6면이 각인되어 있어야 한다');
    // await 사이에 다른 코드가 상태를 다시 정규화하는 상황을 재현한다.
    await vm.runInContext('(async function () { let held = ensureCoreCubeState(); await resetCoreCube(); return held; })()', ctx);
    assert.strictEqual(run(ctx, 'ensureCoreCubeState().faces.filter(v => v !== null).length'), 0,
        '재구성은 각인된 동력원을 모두 비워야 한다');
    assert.strictEqual(run(ctx, 'ensureCoreCubeState().completed'), false, '재구성 후 완성 상태가 풀려야 한다');
}

// 확인창에서 취소하면 아무것도 바뀌면 안 된다.
async function testResetCancelled() {
    const ctx = loadCubeContext({ confirm: false });
    run(ctx, 'let st = ensureCoreCubeState(); st.faces = [1,2,3,4,5,6]; st.completed = true;');
    await vm.runInContext('resetCoreCube()', ctx);
    assert.strictEqual(run(ctx, 'ensureCoreCubeState().faces.join(",")'), '1,2,3,4,5,6', '취소하면 각인이 남아야 한다');
    assert.strictEqual(run(ctx, 'ensureCoreCubeState().completed'), true, '취소하면 완성 상태도 남아야 한다');
}

async function main() {
    await testResetApplies();
    await testResetCancelled();

    // ── ensureCoreCubeState는 객체 정체성을 유지해야 한다 ────────────────
    {
        const ctx = loadCubeContext();
        const sameRef = run(ctx, '(function () { let a = ensureCoreCubeState(); let b = ensureCoreCubeState(); return a === b; })()');
        assert.strictEqual(sameRef, true, '반복 호출이 같은 객체를 돌려줘야 한다');
        const survives = run(ctx, '(function () { let a = ensureCoreCubeState(); a.selectedFace = 3; ensureCoreCubeState(); return ensureCoreCubeState().selectedFace; })()');
        assert.strictEqual(survives, 3, '정규화를 다시 돌려도 앞선 변경이 살아 있어야 한다');
    }

    // ── 프리셋 저장/복원 ────────────────────────────────────────────────
    {
        const ctx = loadCubeContext();
        run(ctx, 'ensureCoreCubeState().faces = [3,9,14,22,31,44];');
        await vm.runInContext('saveCoreCubePreset(0)', ctx);
        assert.strictEqual(run(ctx, 'JSON.stringify(ensureCoreCubeState().presets[0].faces)'), '[3,9,14,22,31,44]',
            '6면이 채워진 조합은 저장되어야 한다');

        // 각인된 큐브가 있어도 한 번에 불러온다(재구성을 따로 누르지 않는다).
        run(ctx, 'let st0 = ensureCoreCubeState(); st0.faces = [1,1,1,1,1,1]; st0.completed = true; st0.powers = {};');
        run(ctx, 'applyCoreCubePreset(0)');
        assert.strictEqual(run(ctx, 'JSON.stringify(ensureCoreCubeState().faces)'), '[3,9,14,22,31,44]',
            '각인된 큐브 위에도 프리셋이 곧바로 덮여야 한다');

        // 비어 있는 큐브에서도 동일하게 동작한다.
        run(ctx, 'let st = ensureCoreCubeState(); st.faces = [null,null,null,null,null,null]; st.completed = false; st.powers = {};');
        run(ctx, 'applyCoreCubePreset(0)');
        assert.strictEqual(run(ctx, 'JSON.stringify(ensureCoreCubeState().faces)'), '[3,9,14,22,31,44]',
            '저장한 조합이 그대로 복원되어야 한다');
        assert.strictEqual(run(ctx, 'ensureCoreCubeState().completed'), true, '복원하면 곧바로 완성 상태여야 한다');
        assert.strictEqual(run(ctx, 'Object.keys(ensureCoreCubeState().powers).length'), 0,
            '복원은 동력원을 소모하지 않아야 한다');
        assert.ok(run(ctx, 'ensureCoreCubeState().revealedOptions.length') > 0, '복원 시 옵션이 발현되어야 한다');
    }

    // ── 같은 조합이면 같은 옵션이 나와야 프리셋이 의미가 있다 ─────────────
    {
        const ctx = loadCubeContext();
        const a = run(ctx, 'JSON.stringify(generateCoreCubeOptions([3,9,14,22,31,44]).options)');
        const b = run(ctx, 'JSON.stringify(generateCoreCubeOptions([3,9,14,22,31,44]).options)');
        assert.strictEqual(a, b, '옵션은 조합에서 결정론적으로 나와야 한다');
    }

    // ── 2번 저장칸 해금: 1~45 동력원을 모두 각인해야 한다 ─────────────────
    {
        const ctx = loadCubeContext();
        assert.strictEqual(run(ctx, 'isCoreCubePresetSlotUnlocked(0)'), true, '1번 칸은 처음부터 열려 있어야 한다');
        assert.strictEqual(run(ctx, 'isCoreCubePresetSlotUnlocked(1)'), false, '2번 칸은 처음에 잠겨 있어야 한다');

        // 44종만 써 본 상태에서는 아직 잠겨 있다.
        run(ctx, 'let st = ensureCoreCubeState(); for (let n = 1; n <= 44; n++) markCoreCubePowerUsed(st, n);');
        assert.strictEqual(run(ctx, 'getCoreCubeUsedPowerCount(ensureCoreCubeState())'), 44, '사용 이력이 집계되어야 한다');
        assert.strictEqual(run(ctx, 'isCoreCubePresetSlotUnlocked(1)'), false, '한 종류라도 빠지면 잠겨 있어야 한다');
        await vm.runInContext('saveCoreCubePreset(1)', ctx);
        assert.strictEqual(run(ctx, 'ensureCoreCubeState().presets[1]'), null, '잠긴 칸에는 저장되면 안 된다');

        run(ctx, 'markCoreCubePowerUsed(ensureCoreCubeState(), 45);');
        assert.strictEqual(run(ctx, 'isCoreCubePresetSlotUnlocked(1)'), true, '45종을 모두 채우면 2번 칸이 열려야 한다');
    }

    // ── 실제 각인이 사용 이력을 남겨야 한다 ──────────────────────────────
    {
        const ctx = loadCubeContext();
        run(ctx, 'let st = ensureCoreCubeState(); st.powers = { 7: 1 }; st.selectedFace = 0; socketCoreCubePower(7);');
        assert.strictEqual(run(ctx, 'ensureCoreCubeState().faces[0]'), 7, '각인이 반영되어야 한다');
        assert.strictEqual(run(ctx, 'getCoreCubeUsedPowerCount(ensureCoreCubeState())'), 1, '각인은 사용 이력에 남아야 한다');
    }

    // ── 루프 리셋: 프리셋과 사용 이력은 유지, 각인은 초기화 ───────────────
    {
        const ctx = loadCubeContext();
        run(ctx, `
            let st = ensureCoreCubeState();
            st.everUnlocked = true;
            st.unlocked = true;
            st.faces = [1,2,3,4,5,6];
            st.completed = true;
            st.powers = { 5: 3 };
            for (let n = 1; n <= 45; n++) markCoreCubePowerUsed(st, n);
        `);
        await vm.runInContext('saveCoreCubePreset(0)', ctx);
        run(ctx, 'relockCoreCubeForLoop()');
        assert.strictEqual(run(ctx, 'JSON.stringify(ensureCoreCubeState().presets[0].faces)'), '[1,2,3,4,5,6]',
            '프리셋은 루프를 건너 유지되어야 한다');
        assert.strictEqual(run(ctx, 'getCoreCubeUsedPowerCount(ensureCoreCubeState())'), 45,
            '동력원 사용 이력도 루프를 건너 유지되어야 한다(2번 칸이 다시 잠기면 안 된다)');
        assert.strictEqual(run(ctx, 'ensureCoreCubeState().faces.filter(v => v !== null).length'), 0,
            '루프 리셋은 각인을 비워야 한다');
        assert.strictEqual(run(ctx, 'Object.keys(ensureCoreCubeState().powers).length'), 0,
            '루프 리셋은 보유 동력원을 비워야 한다');
        assert.strictEqual(run(ctx, 'ensureCoreCubeState().everUnlocked'), true, '해금 이력은 유지되어야 한다');

        // 다음 루프에서 큐브가 다시 열리면 동력원 없이 프리셋을 되살릴 수 있다.
        run(ctx, 'let st2 = ensureCoreCubeState(); st2.unlocked = true; st2.relockUntilDrop = false; game.unlocks.cube = true; applyCoreCubePreset(0);');
        assert.strictEqual(run(ctx, 'JSON.stringify(ensureCoreCubeState().faces)'), '[1,2,3,4,5,6]',
            '루프가 지나도 동력원 없이 프리셋을 복원할 수 있어야 한다');
        assert.strictEqual(run(ctx, 'Object.keys(ensureCoreCubeState().powers).length'), 0,
            '복원에 동력원이 들어가면 안 된다');
    }

    // 저장칸 덮어쓰기는 확인을 받아야 한다. 취소하면 기존 조합이 그대로 남는다.
    {
        const ctx = loadCubeContext({ confirm: false });
        run(ctx, 'let st = ensureCoreCubeState(); st.faces = [1,2,3,4,5,6];');
        await vm.runInContext('saveCoreCubePreset(0)', ctx);
        assert.strictEqual(run(ctx, 'JSON.stringify(ensureCoreCubeState().presets[0].faces)'), '[1,2,3,4,5,6]',
            '빈 칸에 처음 저장할 때는 확인 없이 저장되어야 한다');
        run(ctx, 'ensureCoreCubeState().faces = [7,8,9,10,11,12];');
        await vm.runInContext('saveCoreCubePreset(0)', ctx);
        assert.strictEqual(run(ctx, 'JSON.stringify(ensureCoreCubeState().presets[0].faces)'), '[1,2,3,4,5,6]',
            '덮어쓰기를 취소하면 기존 조합이 남아야 한다');
    }

    console.log('smoke-core-cube-presets passed');
}

main().catch(error => { console.error(error); process.exit(1); });
