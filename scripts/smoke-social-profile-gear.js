// 공개 프로필의 장착 구성(2026-10-03, js/social.js buildProfileGear): 실제 게임 모듈로 만든 상태에서 해금하지 않았거나 끼지 않은
// 것은 싣지 않는다. 코어 칸은 열고 끼었을 때만, 그루터기 함 판은 얻고 하나라도 놓았을 때만, 소켓 주얼은 주얼을 열었을 때만.
// 장비 카드의 방어 수치와 추가 옵션 순서는 게임 툴팁과 같은 규칙(js/item-tooltip-rules.js)을 쓴다.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
vm.runInContext(fs.readFileSync('js/social.js', 'utf8'), context, { filename: 'js/social.js' });
const run = code => vm.runInContext(code, context);
const json = code => JSON.parse(run(`JSON.stringify((${code}) ?? null)`));

run(`game = mergeDefaults({ level: 85, season: 20, loopCount: 19, settings: { showLootLog: false } });
    globalThis.__zone = getZone(getAbyssZoneIdForDepth(40));
    globalThis.__drop = slot => {
        for (let i = 0; i < 400; i++) {
            const item = normalizeItem(generateEquipmentDrop(createEnemy(__zone, {}, 0), { zone: __zone, minimumRarity: 'rare' }));
            if (item.slot === slot) return item;
        }
        throw new Error('no drop for ' + slot);
    };
    game.equipment['무기'] = __drop('무기');
    game.equipment['갑옷'] = __drop('갑옷');
    game.equipment['무기'].abyssSockets = [{ jewel: generateJewelDrop(80) }, { jewel: null }];
    coreItems.ensure();
    globalThis.__core = coreItems.roll(() => 0.5);
    game.cores.equipped = __core;
    Object.assign(game.contentProgression, { unlocked: [], inherited: [] });`);

// 열지 않은 콘텐츠는 끼어 있어도 싣지 않는다(예전 저장에 남은 코어나 소켓 주얼).
assert.deepStrictEqual(json(`(() => { const gear = buildProfileGear(game); return [gear.core, gear.stump, gear.equipment.find(it => it.slot === '무기').sockets]; })()`),
    [null, null, null], '열지 않은 콘텐츠는 프로필에 싣지 않는다');

// 코어: 열고 끼면 게임 코어 툴팁과 같은 이름과 줄. 열었어도 끼지 않았으면 없다.
run(`game.contentProgression.unlocked.push('cube');`);
assert.deepStrictEqual(json('buildProfileGear(game).core'), json(`({ kind: 'core', name: __core.name, lines: __core.lines.map(line => coreItems.describe(line)) })`));
run(`game.cores.equipped = null;`);
assert.strictEqual(json('buildProfileGear(game).core'), null, '코어 칸이 비었으면 싣지 않는다');

// 소켓: 주얼을 열면 소켓 줄, 박힌 주얼은 주얼 탭에 자리와 함께. 빈 소켓은 카드에 나오지 않는다.
run(`game.contentProgression.unlocked.push('jewel');`);
const weapon = json(`buildProfileGear(game).equipment.find(it => it.slot === '무기')`);
assert.strictEqual(weapon.sockets.length, 2, '소켓은 모두 싣는다');
assert.strictEqual(weapon.sockets[0].jewel.kind, 'jewel');
const weaponCard = run(`renderProfileItemCard(buildProfileGear(game).equipment.find(it => it.slot === '무기'))`);
assert.ok(weaponCard.includes('◆ 심연 소켓 1: ') && !weaponCard.includes('빈 심연 소켓'), '카드에는 주얼이 박힌 소켓만');
assert.deepStrictEqual(json(`profileJewelRows({ equipment: buildProfileGear(game).equipment }).map(row => row.where)`), [`[${weapon.category}] 심연 소켓 1`]);

// 방어 수치와 옵션 순서: 프로필 카드가 게임 툴팁 규칙과 같은 값을 쓴다.
const armorView = json(`itemTooltipRules.defenseView(game.equipment['갑옷'])`);
const armorCard = run(`renderProfileItemCard(buildProfileGear(game).equipment.find(it => it.slot === '갑옷'))`);
for (const id of ['armor', 'evasion', 'energyShield']) {
    if (armorView[id] > 0) assert.ok(armorCard.includes(`>${armorView[id]}</span>`), `${id} 최종값 ${armorView[id]}이 카드에 있다`);
}
const explicitOrder = json(`game.equipment['갑옷'].stats.slice().sort(itemTooltipRules.compareStats)
    .map(stat => (Array.isArray(stat.extraStats) && stat.extraStats.length ? getStatName(stat.id) : stat.statName || getStatName(stat.id)))`);
const positions = explicitOrder.map(name => armorCard.indexOf(`;">${name} +`));
assert.ok(positions.every((at, i) => at > 0 && (i === 0 || at > positions[i - 1])), `추가 옵션은 게임 툴팁과 같은 순서: ${explicitOrder.join(', ')}`);

// 그루터기 함: 얻었어도 판이 비었으면 싣지 않는다. 놓으면 25칸(닫힌 칸은 null), 놓인 것은 게임과 같은 단계와 이름.
run(`game.stumpBox.acquired = true;`);
assert.strictEqual(json('buildProfileGear(game).stump'), null, '판이 비었으면 그루터기 함을 싣지 않는다');
run(`globalThis.__seed = stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1 });
    stumpBox.place(game, __seed.id, 12, 'flower');
    for (let i = 0; i < 40 && !stumpBox.isMature(__seed); i++) stumpBox.grow(game, { isBoss: true });
    game.contentProgression.unlocked.push('talisman');
    globalThis.__talisman = stumpBox.addTalisman(game, talismans.rollWild('boss'), true);
    stumpBox.place(game, __talisman.id, 7);`);
const stump = json('buildProfileGear(game).stump');
assert.strictEqual(stump.cells.length, 25);
assert.strictEqual(stump.cells.filter(row => row === null).length, 25 - run('stumpBox.openCount(game)'), '닫힌 칸은 null');
assert.deepStrictEqual([stump.cells[12].item.kind, stump.cells[12].item.stage, stump.cells[12].item.ripe, stump.cells[12].item.name],
    ['stump', 'flower', true, run('stumpBox.label(__seed)')], '다 자란 씨앗은 꽃 단계');
assert.ok(stump.cells[12].item.yieldText.startsWith('화염 피해 +'), '다 자란 꽃이 주는 것');
assert.deepStrictEqual([stump.cells[7].item.kind, stump.cells[7].item.stage, stump.cells[7].item.state], ['talisman', 'sealed', 'asleep'], '막 놓은 부적은 잠들어 있다');
const board = run('renderProfileStump(buildProfileGear(game).stump)');
for (const src of board.match(/assets\/px\/stump\/[a-z-]+\.png/g)) assert.ok(fs.existsSync(src), `판 그림 ${src}가 있다`);
assert.deepStrictEqual(json(`profileTabList({ ...buildProfileGear(game), skills: buildSkillSnapshot(game) }).map(([cat]) => cat)`),
    run('game.activeSkill') ? ['equipment', 'skills', 'jewels', 'stump'] : ['equipment', 'jewels', 'stump'], '내용이 있는 탭만');

// 주얼을 닫으면(새 루프 등) 소켓 줄도 주얼 탭도 사라진다.
run(`game.contentProgression.unlocked = game.contentProgression.unlocked.filter(id => id !== 'jewel');`);
assert.strictEqual(json(`buildProfileGear(game).equipment.find(it => it.slot === '무기').sockets`), null, '주얼을 열지 않았으면 소켓 줄이 없다');
console.log('smoke-social-profile-gear passed');
