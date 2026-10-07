// 접두 3, 접미 3(2026-10-07 사용자 "15. 해줘", docs/affix-kinds-tags-plan-20261007.md): 드랍, 재굴림, 덧붙이기, 한 줄 바꾸기가 모두
// 종류 한도(마법 1과 1, 희귀 3과 3)를 지킨다. 한도를 넘은 예전 장비는 줄을 잃지 않고 넘친 종류에는 더 붙지 않는다. 툴팁과 프로필 머리말.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const run = source => vm.runInContext(source, context);
run(`game.contentProgression.inherited = ['craft']; game.season = Math.max(3, game.season || 1); game.inventory = [];
    window.kinds = item => equipmentCrafting.affixCounts(item);
    window.within = item => { const rule = EXPLICIT_AFFIX_RULES[item.rarity], used = kinds(item); return !rule || (used.prefix <= rule.prefix && used.suffix <= rule.suffix); };
    window.makeRare = (slot, stats) => { const item = createItemFromBase(BASE_ITEM_DB.find(row => row.slot === slot), 'rare', 10);
        item.stats = stats || []; item.chaosInfusion = null; item.corrupted = false; game.inventory.push(item); return item; };
    window.line = id => rollAffixValue(MOD_DB.find(mod => mod.id === id), 10);
    window.fullRare = slot => { const item = makeRare(slot); item.stats = pickRandomMods(getAvailableMods(item), 6, { prefix: 3, suffix: 3 }).map(mod => rollAffixValue(mod, 10)); return item; };
    addLog = () => {};`);

// 1. 모든 줄에 종류가 있다. 신발이 접두 셋을 채우도록 이동 속도는 접두.
assert.deepEqual(JSON.parse(run(`JSON.stringify(MOD_DB.filter(mod => !['prefix', 'suffix'].includes(mod.type)).map(mod => mod.id))`)), [],
    'every explicit line is a prefix or a suffix');
assert.equal(run(`MOD_DB.find(mod => mod.id === 'move').type`), 'prefix', 'movement speed is a prefix');

// 2. 드랍: 한도를 넘는 장비가 없다.
const drops = JSON.parse(run(`(() => { const out = { checked: 0, over: 0 }, zone = getZone(29) || getZone(0);
    for (let i = 0; i < 500; i++) {
        const item = generateEquipmentDrop({ isBoss: i % 3 === 0 }, { zone, minimumRarity: i % 2 ? 'rare' : 'magic' });
        if (!item || !EXPLICIT_AFFIX_RULES[item.rarity]) continue;
        out.checked++; if (!within(item)) out.over++;
    }
    return JSON.stringify(out); })()`));
assert.ok(drops.checked > 300, `fixture: enough magic and rare drops (${drops.checked})`);
assert.equal(drops.over, 0, 'no dropped item breaks prefix 3 and suffix 3');

(async () => {
    // 3. 수액 봉오리로 채우면 모든 부위가 6줄, 접두 3과 접미 3(신발 포함).
    for (const slot of ['무기', '투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠', '방패']) {
        const id = run(`makeRare('${slot}').id`);
        run(`selectForCrafting(${id}, false); game.currencies.sapBud = 10; game.sporeCraftModes = {};`);
        for (let i = 0; i < 6; i++) await run(`useCurrency('sapBud')`);
        const used = JSON.parse(run(`JSON.stringify({ ...kinds(game.inventory.find(item => item.id === ${id})), lines: game.inventory.find(item => item.id === ${id}).stats.length })`));
        assert.deepEqual(used, { prefix: 3, suffix: 3, special: 0, lines: 6 }, `${slot}: six additions fill three of each`);
    }

    // 4. 형체 없는 이슬로 다시 굴려도 한도 안.
    const ringId = run(`makeRare('반지').id`);
    run(`selectForCrafting(${ringId}, false); game.currencies.formlessDew = 40;`);
    for (let i = 0; i < 40; i++) {
        await run(`useCurrency('formlessDew')`);
        assert.ok(run(`within(game.inventory.find(item => item.id === ${ringId}))`), `reroll ${i} stays within the limits`);
    }

    // 5. 한도를 넘은 예전 장비: 줄을 잃지 않고, 남은 종류(접미)에만 붙는다. 툴팁은 경고색과 안내 한 줄.
    const oldId = run(`makeRare('무기', ['flatDmg', 'weaponFlatDmgPct', 'pctDmg', 'meleePctDmg', 'aspd'].map(line)).id`);
    assert.deepEqual(JSON.parse(run(`JSON.stringify(equipmentCrafting.affixRoom(game.inventory.find(item => item.id === ${oldId})))`)), { prefix: 0, suffix: 2 });
    run(`selectForCrafting(${oldId}, false); game.currencies.sapBud = 1;`);
    await run(`useCurrency('sapBud')`);
    assert.deepEqual(JSON.parse(run(`JSON.stringify(kinds(game.inventory.find(item => item.id === ${oldId})))`)), { prefix: 4, suffix: 2, special: 0 },
        'an old 4-prefix weapon keeps its lines and gains only a suffix');
    const header = run(`itemExplicitAffixHeaderHtml(game.inventory.find(item => item.id === ${oldId}), 6)`);
    assert.ok(header.includes('추가 옵션 6/6 (접두 4/3, 접미 2/3)') && header.includes('#ffb454') && header.includes('넘친 종류에는 더 붙지 않습니다'),
        `the tooltip header flags an old over-limit item: ${header}`);
    assert.ok(run(`itemExplicitAffixHeaderHtml(makeRare('반지', ['flatHp', 'resF'].map(line)), 2)`).includes('추가 옵션 2/6 (접두 1/3, 접미 1/3)'));

    // 6. 한 줄 바꾸기(바다의 선물, 심해의 파편, 봉인 재단): 꽉 찬 장비에서는 바뀌는 줄과 같은 종류만 들어온다.
    const swaps = JSON.parse(run(`(() => { const item = fullRare('갑옷');
        let same = 0, total = 0;
        for (let i = 0; i < 200; i++) {
            const choice = equipmentCrafting.pickReplacement(item, getAvailableMods({ ...item, stats: [] }), item.stats.map((_, index) => index), pickWeightedMod);
            if (!choice) continue;
            total++;
            if (equipmentCrafting.affixKind(choice.mod) === equipmentCrafting.storedAffixKind(item, item.stats[choice.index])) same++;
        }
        return JSON.stringify({ same, total, used: kinds(item) }); })()`));
    assert.deepEqual(swaps.used, { prefix: 3, suffix: 3, special: 0 }, 'fixture: a full rare');
    assert.ok(swaps.total > 150 && swaps.same === swaps.total, `a full item swaps a line for one of the same kind (${JSON.stringify(swaps)})`);

    // 7. 잿불가지의 줄 바꾸기도 빠진 줄의 종류로.
    const ember = JSON.parse(run(`(() => { let broke = 0;
        for (let i = 0; i < 40; i++) { const item = fullRare('장갑');
            rerollTaintedLine(item); if (!within(item)) broke++; }
        return JSON.stringify({ broke }); })()`));
    assert.equal(ember.broke, 0, 'an ember branch reroll keeps the limits');

    // 8. 독벌침과 혼돈 주입도 남은 종류만.
    run(`window.venomWeapon = makeRare('무기', ['flatDmg', 'pctDmg', 'physPctDmg', 'aspd'].map(line)); selectForCrafting(venomWeapon.id, false); game.currencies.venomStinger = 1;`);
    run(`applyVenomStingerToSelectedItem()`);
    assert.deepEqual(JSON.parse(run(`JSON.stringify(kinds(venomWeapon))`)), { prefix: 3, suffix: 2, special: 0 }, 'a full-prefix weapon takes a venom suffix');
    const infusion = JSON.parse(run(`JSON.stringify(getChaosInfuserOptionsForItem(makeRare('반지', ['flatHp', 'pctDmg', 'elementalPctDmg', 'resF'].filter(id => MOD_DB.some(mod => mod.id === id)).map(line)))
        .map(opt => equipmentCrafting.storedAffixKind({ slot: '반지' }, { id: opt.id })))`));
    assert.ok(infusion.length > 0 && infusion.every(kind => kind !== 'prefix'), `a ring with three prefixes is offered only suffix infusions: ${infusion}`);

    // 9. 공개 프로필: 스냅샷이 줄 종류를 남기고 머리말이 게임과 같다. 예전 스냅샷(종류 없음)은 "(n/6)".
    vm.runInContext(fs.readFileSync('js/social.js', 'utf8'), context, { filename: 'social.js' });
    const snapshot = run(`buildItemSnapshot(makeRare('반지', ['flatHp', 'resF', 'resC'].map(line)))`);
    assert.deepEqual([...snapshot.stats].map(stat => stat.kind), ['prefix', 'suffix', 'suffix'], 'the snapshot keeps each line kind');
    assert.ok(run(`profileAffixHeaderText`)({ rarity: 'rare' }, snapshot.stats) === '추가 옵션 3/6 (접두 1/3, 접미 2/3)');
    assert.equal(run(`profileAffixHeaderText`)({ rarity: 'rare' }, [{ id: 'flatHp' }]), '추가 옵션 (1/6)', 'an older profile keeps its plain header');
    console.log(`affix kinds: ${drops.checked} drops, nine slots filled, rerolls, old item, swaps, ember, venom, infusion and profile OK`);
})().catch(error => { console.error(error); process.exit(1); });
