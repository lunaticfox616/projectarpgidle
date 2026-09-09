const assert = require('assert');
const fixture = require('./lib/replay-fixture')();
const { runtime: r, run } = fixture;
const source = { gx: 3, gy: 4 };
const victim = { gx: 4, gy: 4 };
const stage = { targets: [{ enemy: victim }] };
const skill = run('SKILL_DB["중력 붕괴"]');
const area = r.getSkillStageFootprint('중력 붕괴', skill, stage, source);
const cells = area.cells;
const keys = new Set(cells.map(cell => `${cell.gx},${cell.gy}`));
assert.strictEqual(keys.size, 21, 'gravity starts with a broad five-cell-wide pull');
assert(keys.has('4,3') && keys.has('3,4') && keys.has('5,4') && keys.has('4,5'));
assert(keys.has('4,2') && keys.has('6,4'), 'the outer ring belongs to the initial pull');
assert(keys.has('5,3'), 'diagonals inside the circle are filled');
assert(!keys.has('6,2'), 'square corner centers outside the circle are excluded');
const dense = { targets: [...stage.targets, { enemy: { gx: 4, gy: 6 } }, { enemy: { gx: 6, gy: 4 } }] };
assert.deepStrictEqual(r.getSkillStageFootprint('중력 붕괴', skill, dense, source), area,
    'area size must be independent of victim count');
const edge = r.getSkillStageFootprint('중력 붕괴', skill, { targets: [{ enemy: { gx: 0, gy: 0 } }] }, { gx: 1, gy: 0 });
assert(edge.cells.every(cell => cell.gx >= 0 && cell.gx < 9 && cell.gy >= 0 && cell.gy < 8), 'map boundaries trim the footprint');
const projection = { tileW: 40, tileH: 40, cellToScreen: (gx, gy) => ({ x: gx * 40, y: gy * 40 }) };
const footprint = r.projectSkillFootprint(area, projection);
assert.strictEqual(footprint.width, 200);
assert.strictEqual(footprint.height, 200);
assert.strictEqual(footprint.x, 160);
const doubled = r.projectSkillFootprint(area, { tileW: 80, tileH: 80, cellToScreen: (gx, gy) => ({ x: gx * 80, y: gy * 80 }) });
assert.strictEqual(doubled.width, footprint.width * 2, 'viewport scale changes projection, not attack cells');
assert.strictEqual(r.projectSkillFootprint({cells:[]}, projection), null);
const rectangles = [], ellipses = [];
r.clipSkillFootprint({ beginPath() {}, clip() {}, ellipse(...args) { ellipses.push(args); }, rect(...args) { rectangles.push(args); } }, footprint);
assert.strictEqual(ellipses.length, 1, 'circular art has one smooth boundary');
assert.deepStrictEqual(ellipses[0].slice(0,4), [160,160,100,100]);
const atEdge = r.projectSkillFootprint(edge, projection);
assert.strictEqual(atEdge.x, 0, 'edge clipping must not move the cast center');
assert.strictEqual(atEdge.width, footprint.width, 'edge clipping must not shrink the effect');


// Actual scheduling carries the same immutable geometry through travel and confirmed hits.
run(`game.activeSkill = '중력 붕괴'; game.gridPlayer = {gx:3,gy:4};
    game.enemies = [createEnemy(getZone(1), {at:20,count:1}, 0)];
    Object.assign(game.enemies[0], {gx:4,gy:4,hp:100000,maxHp:100000}); battleFx = [];`);
const stats = r.getPlayerStats();
stats.sSkill = { ...stats.sSkill, ...skill };
r.performPlayerAttack(stats, { skillName: '중력 붕괴', forcedCrit: false });
const scheduled = run('pendingSkillStageHits[0]');
const snapshot = JSON.stringify(scheduled.options.attackFootprint);
assert.strictEqual(scheduled.options.attackFootprint.cells.length, 21);
assert.strictEqual(run('battleFx.find(fx => fx.type === "combatTravel").attackFootprint.cells.length'), 21);
run('game.gridPlayer.gx = 0; game.gridPlayer.gy = 0;');
assert.strictEqual(JSON.stringify(scheduled.options.attackFootprint), snapshot, 'movement after cast cannot relocate its area');
run('game.combatTimeMs = pendingSkillStageHits[0].at;');
r.processPendingSkillStageHits();
const hit = run('battleFx.find(fx => fx.type === "hit")');
assert(hit && hit.damage > 0, 'real damage still resolves');
assert.strictEqual(JSON.stringify(hit.attackFootprint), snapshot, 'confirmed hit preserves the cast snapshot');
assert.strictEqual(hit.sourceCell.gx, 3, 'the visual direction starts at the original caster cell');
const renderState = run('JSON.stringify(game)');
run('battleAssets.images.skillFxGravitySheet={complete:true,naturalWidth:1254,naturalHeight:1254};');
run('battleAssets.images.skillFxWorldTree={complete:true,naturalWidth:1024,naturalHeight:1728};');
let path = [], clips = [], images = [], imageScales = [], drawScale = [1,1];
const ctx = new Proxy({ globalAlpha: 1 }, { get: (object, key) => key in object ? object[key] : (...args) => {
    if (key === 'beginPath') path = [];
    if (key === 'rect' || key === 'ellipse') path.push(args);
    if (key === 'clip') clips.push(args[0]?.commands || path.slice());
    if (key === 'scale') drawScale = args;
    if (key === 'drawImage') { images.push(args); imageScales.push(drawScale); }
} });
const cast = { owner:'player', skillName:'중력 붕괴', delivery:'magicCell', start:1000, duration:800,
    flightMs:100, sourceCell:source, aimCell:victim, targetCells:[victim], attackFootprint:area, element:'phys' };
r.drawCombatTravelFx(ctx, cast, 1170, projection, {x:120,y:160}, {});
assert.strictEqual(clips.length,0,'sprite artwork can extend beyond the battlefield boundary');
assert(images[0][7]*imageScales[0][0]>200,'the full area sprite has a small visual margin beyond the damage footprint');
assert.strictEqual(images.length,1,'one image frame is drawn for the full spell footprint');
const sparseClips=JSON.stringify(clips);
images=[]; imageScales=[]; clips=[];
r.drawCombatTravelFx(ctx, {...cast,targetCells:[victim,{gx:6,gy:4}]}, 1170, projection, {x:120,y:160}, {});
assert.strictEqual(JSON.stringify(clips),sparseClips,'more victims cannot resize the rendered spell');
assert.strictEqual(run('JSON.stringify(game)'),renderState,'rendering cannot mutate combat state');
// Only fire core retains the compact round field; other spell identities have separate regressions.
const boundaryEnemies=[[70,4,4],[71,5,5],[72,6,4]].map(([id,gx,gy])=>({id,gx,gy,hp:100,maxHp:100}));
const core=run('SKILL_DB["화염 폭풍핵"]');
const coreTargets=r.selectGridSkillTargets('화염 폭풍핵',core,source,boundaryEnemies,{preferredEnemyId:70});
assert.deepStrictEqual(Array.from(coreTargets,hit=>hit.enemy.id),[70,71]);
assert.strictEqual(r.getSkillStageFootprint('화염 폭풍핵',core,{targets:coreTargets},source).cells.length,9);
// Filled breath includes enemies between the former rays, but excludes sides/rear/out-of-range.
const breath = run('SKILL_DB["용화 숨결"]');
const enemies = [[50,4,4], [51,6,5], [52,2,4], [53,4,6], [54,8,4]].map(([id,gx,gy]) => ({id,gx,gy,hp:100,maxHp:100}));
const selected = r.selectGridSkillTargets('용화 숨결', breath, source, enemies, {preferredEnemyId:50});
assert.deepStrictEqual(Array.from(selected, row => row.enemy.id), [50,51]);
const breathArea = r.getSkillStageFootprint('용화 숨결', breath, {targets:selected}, source);
const breathView = r.projectSkillFootprint(breathArea, projection, source);
assert.strictEqual(breathView.cone.length, 180);
assert.strictEqual(breathView.cone.width, 216);
assert.strictEqual(breathView.cone.vertices[0].x, 120, 'breath starts at the caster, not its victim');
// Every cell center shown inside the cast triangle has exactly the same attack membership.
for (const aim of [{gx:4,gy:4},{gx:4,gy:5},{gx:2,gy:4},{gx:3,gy:1}]) {
    const area = r.getSkillStageFootprint('용화 숨결', breath, {targets:[{enemy:aim}]}, source);
    const cone = area.cone;
    for (let gx=0; gx<9; gx++) for (let gy=0; gy<8; gy++) {
        const forward=(gx-source.gx)*cone.dx+(gy-source.gy)*cone.dy;
        const side=Math.abs((gx-source.gx)*cone.dy-(gy-source.gy)*cone.dx);
        const visible=forward>0 && forward<=cone.length && side<=forward*cone.halfWidth/cone.length;
        assert.strictEqual(area.cells.some(cell=>cell.gx===gx && cell.gy===gy), visible);
    }
}
run('battleAssets.images.skillFxDragonBreath = {complete:true,naturalWidth:512};');
images=[]; imageScales=[];
r.drawCombatTravelFx(ctx, {owner:'player',skillName:'용화 숨결',delivery:'magicCell',patternKind:'channel',
    start:1000,duration:900,flightMs:100,sourceCell:source,aimCell:victim,targetCells:[victim],
    attackFootprint:breathArea,element:'fire'}, 1170, projection, {x:120,y:160}, {});
assert.strictEqual(images.length, breathArea.cells.length, 'native breath stamps occupy each confirmed footprint cell');
assert.strictEqual(images[0][3], 64, 'sample one supplied frame');
assert.strictEqual(images[0][4], 64);
assert.strictEqual(images[0][7],64,'each breath piece retains the original square sprite size');
assert.strictEqual(run('JSON.stringify(game)'), renderState, 'rendering cannot alter combat');
console.log('smoke-skill-footprint passed');
