const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const read = code => vm.runInContext(code, runtime);
const source = { x: 100, y: 180 };
const targets = [{ x: 180, y: 180 }, { x: 240, y: 180 }, { x: 220, y: 230 }];
const before = read('JSON.stringify(game)');
for (const skillName of ['화염 참격', '지진 파쇄', '회오리바람', '방패 돌진']) {
    read('battleVisualState.skillEffects = []');
    targets.forEach((target, id) => runtime.queueSkillGemVfx({ id, skillName, element: 'phys',
        damageTextGroupId: 'cast:0', repeatIndex: 0 }, target, source, {}, 1000, 1));
    const effects = read('battleVisualState.skillEffects');
    assert.strictEqual(effects.filter(fx => fx.family !== 'hitSpark').length, 1, `${skillName}: one skill effect for one stage`);
    assert.strictEqual(effects.filter(fx => fx.family === 'hitSpark').length, 3, `${skillName}: each victim retains a small hit`);
    runtime.queueSkillGemVfx({ id: 9, skillName, element: 'phys', damageTextGroupId: 'cast:1' }, targets[0], source, {}, 1080, 1);
    assert.strictEqual(effects.filter(fx => fx.family !== 'hitSpark').length, 2, 'another real stage must remain separate');
}
read('battleVisualState.skillEffects = []');
for (let repeatIndex = 0; repeatIndex < 3; repeatIndex++) {
    runtime.queueSkillGemVfx({ id: repeatIndex, skillName: '뇌격 삼연타', damageTextGroupId: 'triple:0', repeatIndex }, targets[0], source, {}, 1000, 1);
}
assert.strictEqual(read('battleVisualState.skillEffects.filter(fx => fx.family !== "hitSpark").length'), 1, 'native bridge groups same-stage repeats');
assert.strictEqual(read('battleVisualState.skillEffects.filter(fx => fx.family === "hitSpark").length'), 3, 'three confirmed contacts remain distinct');
read('battleVisualState.skillEffects = []');
targets.forEach((target, id) => runtime.queueSkillGemVfx({ id, skillName: '연쇄 폭풍',
    damageTextGroupId: 'chain:0', stageKind: 'chainJump' }, target, source, {}, 1000, 1));
assert.strictEqual(read('battleVisualState.skillEffects.filter(fx => fx.family === "hitSpark").length'), 3, 'each confirmed chain arrival retains its contact; travel owns the connecting motion');
read('battleVisualState.skillEffects = []');
targets.forEach((target, id) => runtime.queueSkillGemVfx({ id, skillName: '화염 참격' }, target, source, {}, 1000, 1));
assert.strictEqual(read('battleVisualState.skillEffects.filter(fx=>fx.family!=="hitSpark").length'), 1, 'native bridge uses the event time when no group ID is supplied');

const calls = [];
read('battleAssets.images.skillFxWorldTree={complete:true,naturalWidth:1024,naturalHeight:1728};');
const ctx = new Proxy({}, { get: (_, key) => (...args) => calls.push({ key, args }) });
read('battleAssets.images.skillFxImpactFlare = { complete: true, naturalWidth: 1280 };');
read('Object.values(SKILL_SIGNATURE_SPRITES).forEach(spec=>{battleAssets.images[spec.asset]={complete:true,naturalWidth:1254,naturalHeight:1254};});');
for (const skillName of ['중력 붕괴', '삼원 파동', '룬 지뢰', '불멸의 진동']) {
    calls.length = 0;
    runtime.worldTreeSkillFx.beginFrame();
    const gridSource={gx:3,gy:4}, aim={gx:4,gy:4};
    const definition=read(`SKILL_DB[${JSON.stringify(skillName)}]`);
    const footprint=runtime.getSkillStageFootprint(skillName,definition,{targets:[{enemy:aim}]},gridSource);
    const cast={owner:'player',skillName,start:1000,duration:800,flightMs:400,sourceCell:gridSource,
        targetCells:[aim],attackFootprint:footprint,delivery:'magicCell',element:'phys'};
    const projection={tileW:40,tileH:40,cellToScreen:(gx,gy)=>({x:gx*40,y:gy*40})};
    runtime.drawCombatTravelFx(ctx,cast,1460,projection,source,{});
    const sparse=JSON.stringify(calls);
    assert(calls.some(call=>call.key==='drawImage'),`${skillName}: sprite effect is visible`);
    calls.length=0;
    runtime.worldTreeSkillFx.beginFrame();
    runtime.drawCombatTravelFx(ctx,{...cast,targetCells:[aim,{gx:5,gy:4}]},1460,projection,source,{});
    assert.strictEqual(JSON.stringify(calls),sparse,`${skillName}: extra victims never duplicate the spell`);
}
calls.length = 0;
runtime.drawCombatCellFx(ctx, { owner: 'enemy', skillName: '', start: 1000, duration: 800 },
    1460, 1400, targets, 'skillFxImpactFlare', 'fire');
assert.strictEqual(calls.filter(call => call.key === 'drawImage').length, 3, 'enemy target-cell warnings must retain their coverage');
calls.length = 0;
runtime.drawCombatCellFx(ctx, { owner: 'player', skillName: '중력 붕괴', start: 1000, duration: 800 },
    1460, 1400, [], 'skillFxImpactFlare', 'phys');
assert.strictEqual(calls.length, 0, 'an empty target list must not create a phantom area');
assert.strictEqual(read('JSON.stringify(game)'), before, 'presentation grouping cannot change game state');

// One visual travels through every confirmed hit and continues over empty cells to its range.
{
    const { runtime: r, run } = require('./lib/replay-fixture')();
    run('battleAssets.images.skillFxWorldTree={complete:true,naturalWidth:1024,naturalHeight:1728};');
    const projection = { tileW:40, tileH:40, cellToScreen:(gx,gy)=>({x:gx*40,y:gy*40}) };
    for (const skillName of ['번개 창', '서리 파동']) {
        for (const count of [1, 3]) {
            run(`game.activeSkill=${JSON.stringify(skillName)}; game.skills.push(game.activeSkill);
                game.gemData[game.activeSkill]={level:1,exp:0,quality:0};
                game.gridPlayer={gx:3,gy:4}; pendingSkillStageHits=[]; battleFx=[];
                game.enemies=Array.from({length:${count}},(_,i)=>Object.assign(
                    createEnemy(getZone(1),{at:20,count:1},i),{gx:4+i,gy:4,hp:1000000,maxHp:1000000}));`);
            r.performPlayerAttack(r.getPlayerStats(), {skillName,forcedCrit:false});
            const pending = run('pendingSkillStageHits');
            const flights = run('battleFx.filter(fx=>fx.type==="combatTravel")');
            assert.strictEqual(pending.length,count,'visual range cannot add damage stages');
            assert.strictEqual(flights.length,1,'one wave or projectile per cast');
            const fx = flights[0];
            assert.strictEqual(fx.targetCells[0].gx,8,'the visual reaches the empty end of its range');
            const imageKey = r.getCombatTravelImageKey(fx);
            run(`battleAssets.images[${JSON.stringify(imageKey)}]={complete:true,naturalWidth:128,naturalHeight:64};`);
            const translations=[];
            const ctx = new Proxy({}, {get:(_,key)=>(...args)=>{if(key==='translate')translations.push(args);}});
            const castAt = run('game.combatTimeMs');
            for (const row of pending) {
                run(`game.combatTimeMs=${row.at};processPendingSkillStageHits();`);
                const state = run('JSON.stringify(game)');
                translations.length=0;
                r.drawCombatTravelFx(ctx,fx,fx.start+row.at-castAt,projection,{x:120,y:150},{});
                assert.deepStrictEqual(translations[0],[row.targetCells[0].gx*40,160],
                    'the image crosses each enemy when its original damage stage occurs');
                assert.strictEqual(run('JSON.stringify(game)'),state,'visual travel is read-only');
            }
            const state = run('JSON.stringify(game)');
            translations.length=0;
            const endAt=fx.start+fx.releaseDelayMs+fx.flightMs;
            r.drawCombatTravelFx(ctx,fx,endAt-.01,projection,{x:120,y:150},{});
            assert.deepStrictEqual(translations[0],[320,160],'the same image reaches the range endpoint');
            assert.strictEqual(run('JSON.stringify(game)'),state,'visual travel is read-only');
        }
    }
}

console.log('smoke-skill-cast-vfx passed');
