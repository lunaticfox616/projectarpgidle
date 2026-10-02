// 시련 함정의 실체 (js/canvas-trial-traps.js): 함정이 쓰는 모든 원소(전직 시련, 아틀라스 최종 보스 투기장, 불타는 땅)에 그림이 있고,
// 예고 3단계 × 4프레임과 폭발 8프레임이 바닥과 솟는 부분으로 만들어지며, 그리기는 칸마다 한 장씩, 그림 없는 원소는 예전 표시로 돌아간다.
// 불타는 땅 지도 옵션은 문구('불길 웅덩이') 그대로 불 원소로 터진다.
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
const { run } = fixture(83);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));

// ---------------------------------------------------------------- every element a trap can use has art
const used = copy(`[...new Set([...TRIAL_ZONES.flatMap(zone => zone.trapElements || []),
    ...ATLAS_ENDGAME.apexes.filter(row => row.hazard).map(row => row.ele), 'fire', 'phys'])]`);
assert.ok(used.length >= 5);
for (const element of used) assert.ok(run(`trialTrapArt.elements.includes(${JSON.stringify(element)})`), `${element} traps have art`);

// ---------------------------------------------------------------- frames: ground + rising part, warning stages and the impact run
const sheets = copy(`trialTrapArt.elements.map(element => { const sheet = trialTrapArt.sheetOf(element);
    return [sheet.warn.length, sheet.warn.every(stage => stage.length === 4), sheet.impact.every(variant => variant.length === 8), sheet.impact.length,
        [...sheet.warn.flat(), ...sheet.impact.flat()].every(frame => frame.ground.height === 16 && frame.rise.height >= 32 && frame.rise.width === 16)]; })`);
assert.ok(sheets.every(row => row[0] === 3 && row[1] && row[2] && row[4]), 'three warning stages of four frames, eight impact frames per shape, 16-dot tiles');
assert.deepEqual(sheets.map(row => row[3]), [1, 1, 1, 3, 1], 'lightning has three bolt shapes, one per cell, so a line of strikes never repeats one silhouette');

// ---------------------------------------------------------------- drawing: one image per cell and part; unknown elements fall back
const drawn = copy(`(() => {
    const calls = { image: 0, rect: 0 }, ctx = { save() {}, restore() {}, translate() {}, scale() {}, beginPath() {}, stroke() {}, setLineDash() {},
        rect() { calls.rect++; }, drawImage() { calls.image++; } };
    const grid = { tileW: 48, tileH: 48, cellToScreen: (gx, gy) => ({ x: gx * 48 + 24, y: gy * 48 + 24 }) };
    const cells = [{ gx: 1, gy: 1 }, { gx: 2, gy: 1 }, { gx: 3, gy: 1 }];
    const warning = { type: 'trialTrapWarning', element: 'fire', targetCells: cells, start: 0, duration: 1600 };
    const impact = { type: 'trialTrap', element: 'chaos', targetCells: cells, start: 0, duration: 760 };
    const out = {};
    out.risesWarning = trialTrapArt.drawRise(ctx, warning, 0.5, grid, true); out.afterWarning = { ...calls };
    out.risesImpact = trialTrapArt.drawRise(ctx, impact, 0.3, grid, false); out.afterImpact = { ...calls };
    trialTrapArt.drawGround(ctx, [warning, impact, { type: 'hit' }], 400, grid); out.afterGround = { ...calls };
    out.unknown = trialTrapArt.drawRise(ctx, { ...warning, element: 'sound' }, 0.5, grid, true);
    return out; })()`);
assert.deepEqual([drawn.risesWarning, drawn.afterWarning], [true, { image: 3, rect: 3 }], 'a warning draws its dotted edges and what peeks out of each cell');
assert.deepEqual([drawn.risesImpact, drawn.afterImpact.image], [true, 6], 'an impact draws what rises from each cell');
assert.equal(drawn.afterGround.image, 12, 'the ground layer draws both live traps under the actors and skips other effects');
assert.equal(drawn.unknown, false, 'an element without art keeps the old tile flash');

// ---------------------------------------------------------------- 불타는 땅 burns
run(`
    game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',level:100,
        combatTimeMs:1800000000000,settings:{pauseGameOnOverlay:false}});
    game.season=12;game.maxZoneId=29;game.currentZoneId=29;game.chaosRealm.unlocked=true;game.loopProgressCurrent.chaos20Cleared=true;
    game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();atlas.sync(game);
`);
const burning = copy(`(() => { const map = Object.assign(atlasMaps.create('roots_0', 3, 'magic'), { uid: game.atlas.nextUid++ });
    map.mods = [{ id: 'burningGround', roll: 0 }]; game.atlas.stash.push(map); atlas.begin(game, map.uid, 29, () => 0.5);
    const zone = getZone(ATLAS.zoneId); return { pattern: zone.trialHazard && zone.trialHazard.pattern, elements: zone.trapElements }; })()`);
assert.deepEqual(burning, { pattern: 'pool', elements: ['fire'] }, '불타는 땅 pools burn with fire, as the map option says');
console.log('trial trap art: every trap element drawn, frames, ground and rising parts, fallback, burning ground is fire: OK');
