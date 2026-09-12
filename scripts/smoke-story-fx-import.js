const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const {buildGameRuntime} = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const read = source => vm.runInContext(source,runtime);
const keys = () => JSON.parse(read('JSON.stringify(tutorialQueue.map(row=>row.key))'));

read('game=JSON.parse(JSON.stringify(defaultGame));tutorialQueue.length=0;game.seenTutorials=[];storyJournalUi.sync();storyJournalUi.sync();');
assert.deepStrictEqual(keys(),['story_prologue'],'fresh prologue is queued once');
read("tutorialQueue.length=0;game.level=35;game.currentZoneId=7;game.journalEntries=['prologue','act_2','act_4','act_5','act_6'];game.seenTutorials=['tutorial_battle_basics'];storyJournalUi.sync();");
assert.deepStrictEqual(keys(),[],'existing saves do not receive a flood of past scenes');
read("game.currentZoneId=8;storyJournalUi.sync();");
assert.deepStrictEqual(keys(),['story_act_9_start'],'the next act start remains discoverable on an old save');

read("game=JSON.parse(JSON.stringify(defaultGame));game.seenTutorials=['story_illustrations_v1','story_prologue'];tutorialQueue.length=0;game.currentZoneId=1;unlockJournalEntry('act_2');storyJournalUi.sync();");
assert.deepStrictEqual(keys(),['story_act_2_end'],'act 2 completion does not prematurely announce act 3');
const rewards=read('JSON.stringify(game.journalBonuses)');
read('tutorialQueue.length=0;game.currentZoneId=2;storyJournalUi.sync();storyJournalUi.sync();');
assert.deepStrictEqual(keys(),['story_act_3_start']);
assert.strictEqual(read('JSON.stringify(game.journalBonuses)'),rewards,'story presentation never grants another journal reward');
read('tutorialQueue.length=0;game.currentZoneId=999;storyJournalUi.sync();');
assert.deepStrictEqual(keys(),[],'non-story numeric zones do not reveal later story acts');
read("game.currentZoneId=9;game.isBackgroundCalculation=true;unlockJournalEntry('act_10');storyJournalUi.sync();");
assert.deepStrictEqual(keys(),[],'offline replay does not create presentation work');
read('game.isBackgroundCalculation=false;storyJournalUi.sync();');
assert(keys().includes('story_act_10_end'),'newly completed offline story can be shown on return');
const afterReturn=keys();read('storyJournalUi.sync();');
assert.deepStrictEqual(keys(),afterReturn,'return checks cannot duplicate scenes');

const scenes=JSON.parse(read('JSON.stringify(STORY_JOURNAL_SCENES)'));
assert.strictEqual(scenes.length,11);
for(const scene of scenes)assert(fs.statSync(scene.image).size>0,scene.image);
const atlas=JSON.parse(read('JSON.stringify(SKILL_FX_ATLAS)'));
assert.strictEqual(Object.keys(atlas).length,53);
assert.strictEqual(read('Object.keys(SKILL_FX_ATLAS).filter(name=>SKILL_DB[name]).length'),53);
const handoff=JSON.parse(fs.readFileSync('docs/skill-assets-v338/manifest.json','utf8'));
assert.strictEqual(handoff.skills.length,10);
const crypto=require('node:crypto'),path=require('node:path');
for(const skill of handoff.skills){
    assert.strictEqual(skill.playable,true);
    assert.strictEqual(read(`SKILL_DB[${JSON.stringify(skill.name)}].nativeCastId`),skill.id,'production controller mapping');
    assert(fs.statSync(skill.path).size>0,'prepared icon exists');
}
for(const [source,hash] of Object.entries(handoff.sourceSha256)){
    let target=source.endsWith('.js')?source+'.txt':source;
    if(source.startsWith('motions/')){
        const id=Number(path.basename(source,'.webp'));
        target=path.basename(handoff.skills.find(skill=>skill.id===id).path,'.png')+'.webp';
    }
    target=target.replace('-showcase.gif','.gif');
    assert.strictEqual(crypto.createHash('sha256').update(fs.readFileSync('docs/skill-assets-v338/reference/'+target)).digest('hex'),hash,'reference keeps original bytes: '+source);
}
for(const spec of Object.values(atlas)) {
    const frames=[...spec.frames,...Object.values(spec.variants).flat(),spec.rainFrame,spec.lanceFrame,spec.flaskFrame].filter(Boolean);
    for(const frame of frames)assert(frame.x>=0&&frame.y>=0&&frame.x+64<=1024&&frame.y+64<=1920,spec.name+' crop');
}
let draws=0;
const ctx={save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(){draws++;}};
read('battleAssets.images.skillFxWorldTree={complete:true,naturalWidth:1024,naturalHeight:1728};worldTreeSkillFx.beginFrame();');
const before=read('JSON.stringify(game)');
const effect={skillName:'연속 베기',family:'arc',x:100,y:100,size:64};
for(let i=0;i<100;i++)runtime.worldTreeSkillFx.impact(ctx,effect,.3);
assert.strictEqual(draws,48,'crowded frames remain limited to 48 supplied-art draws');
assert.strictEqual(runtime.worldTreeSkillFx.impact(ctx,{...effect,family:'hitSpark'},.3),true,'native half-size hit accents replace legacy contacts');
assert.strictEqual(runtime.worldTreeSkillFx.impact(ctx,{...effect,skillName:'unknown'},.3),false,'unmapped attacks keep their existing renderer');
assert.strictEqual(read('JSON.stringify(game)'),before,'rendering cannot alter combat or progression');
console.log('story timing, save compatibility and imported FX contracts passed');
