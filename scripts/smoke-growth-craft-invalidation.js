// 생장판 공간 시너지 스냅샷은 "배치가 바뀔 때"만 비워진다. 그런데 조건 판정은
// 아이템의 태그를 읽는다(adjTag / boardTagCount / tagItemCount / distinctElementTags).
// 즉 판에 올라간 아이템을 제작으로 바꾸면, 배치가 그대로여도 판정이 낡는다.
//
// 실측(브라우저): 이웃 아이템에 '폭발' 태그를 붙였는데 invalidateGrowthEffects 없이는
// "인접한 폭발 태그 1개당 범위 피해 +3%"가 계속 미충족으로 남았다. 비운 뒤에는 충족.
//
// 그래서 (1) 스냅샷이 실제로 그렇게 굳는지, (2) 생장 아이템을 대상으로 삼을 수 있는
// 제작 경로가 전부 스냅샷을 비우는지 두 가지를 고정한다.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// ── (1) 태그가 바뀌면 스냅샷을 비워야 판정이 따라온다 ────────────────────
{
    const context = {
        console,
        window: {},
        game: {
            season: 60, maxZoneId: 60,
            growthInventory: [], recentGrowthDrops: [], growthBoard: null,
            settings: {}, noti: {}
        },
        addLog: () => {},
        updateStaticUI: () => {},
        queueImportantSave: () => {},
        normalizeItem: item => item,
        salvageItemObject: () => {},
        passesItemPickupFilter: () => true
    };
    context.safeExposeData = map => Object.keys(map || {}).forEach(key => {
        if (typeof context[key] === 'undefined') context[key] = map[key];
    });
    context.safeExposeGlobals = map => Object.keys(map || {}).forEach(key => { context.window[key] = map[key]; });
    vm.createContext(context);
    vm.runInContext(fs.readFileSync('data/growth-items.js', 'utf8'), context);
    vm.runInContext(fs.readFileSync('js/growth-effects.js', 'utf8'), context);
    vm.runInContext(fs.readFileSync('js/growth-board.js', 'utf8'), context);
    const run = code => vm.runInContext(code, context);
    run('syncGrowthBoardUnlocks({ silent: true })');

    // 데이터에서 "인접 태그" 조건을 가진 베이스를 찾는다. 없으면 이 계약은 의미가 없다.
    const found = run(`(function () {
        for (const base of GROWTH_BASE_DB) {
            for (const eff of ((base.spatial && base.spatial.effects) || [])) {
                if (eff.when && eff.when.type === 'adjTag' && eff.when.tag) return { id: base.id, tag: eff.when.tag };
            }
        }
        return null;
    })()`);
    assert.ok(found, '인접 태그 조건을 가진 생장 베이스가 있어야 이 계약이 성립한다');

    const make = (baseId, id) => `(function () {
        let base = GROWTH_BASE_DB.find(row => row.id === ${JSON.stringify(baseId)});
        return { id: ${id}, growthBaseId: base.id, growthCategory: base.category, growthShapeId: 'dot1',
                 name: base.name, rarity: 'rare', baseStats: [], stats: [], growthTags: [], growthRemovedTags: [] };
    })()`;
    const otherBase = run(`GROWTH_BASE_DB.find(row => row.id !== ${JSON.stringify(found.id)}).id`);

    run(`game.growthInventory.push(${make(found.id, 901)}, ${make(otherBase, 902)});`);
    run('placeGrowthItem(901, 3, 1, 0); placeGrowthItem(902, 4, 1, 0); invalidateGrowthEffects();');

    const report = () => run('JSON.stringify(getGrowthItemConditionReport(901))');
    const before = report();
    assert.ok(before.includes('unmet'), '처음에는 인접 태그 조건이 미충족이어야 한다');

    // 이웃에 태그를 붙인다 (타락의 addTag, 융합의 태그 계승이 하는 일과 같다)
    run(`findAnyGrowthItemById(902).growthTags = [${JSON.stringify(found.tag)}];`);
    const stale = report();
    assert.strictEqual(stale, before, '스냅샷은 비우기 전까지 낡은 판정을 유지한다(캐시가 있다는 뜻)');

    run('invalidateGrowthEffects();');
    const fresh = report();
    assert.notStrictEqual(fresh, before, '스냅샷을 비우면 판정이 갱신되어야 한다');
    assert.ok(fresh.includes('"met"') && !fresh.includes('"unmet":[{'), '태그를 붙였으면 조건이 충족되어야 한다');
}

// ── (2) 생장 아이템을 대상으로 삼는 제작 경로는 스냅샷을 비워야 한다 ──────
{
    const html = fs.readFileSync('index.html', 'utf8');
    // 생장 아이템을 고를 수 있는 제작 화면(제작/화석/주입)
    ['ui-craft-growth-list', 'ui-fossil-growth-list', 'ui-infuser-growth-list'].forEach(id => {
        assert.ok(html.includes(`id="${id}"`), `${id}가 없으면 이 계약의 전제가 무너진다`);
    });

    const bodyOf = (source, name) => {
        const start = source.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
        assert.ok(start >= 0, `${name}을 찾지 못했다`);
        let open = source.indexOf('{', start);
        let depth = 0;
        for (let i = open; i < source.length; i++) {
            if (source[i] === '{') depth++;
            else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
        }
        throw new Error(`${name}의 끝을 찾지 못했다`);
    };

    const passives = fs.readFileSync('js/passives.js', 'utf8');
    const skills = fs.readFileSync('js/skills.js', 'utf8');
    [
        [passives, 'useCurrency', '오브(타락 포함)'],
        [skills, 'applyFossilChaosCraft', '화석 재련']
    ].forEach(([source, name, label]) => {
        assert.ok(/invalidateGrowthEffects/.test(bodyOf(source, name)),
            `${label}(${name})은 생장 아이템을 바꾸므로 공간 시너지 스냅샷을 비워야 한다`);
    });
}

console.log('smoke-growth-craft-invalidation passed');
