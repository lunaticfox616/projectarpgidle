const assert=require('node:assert');
const vm=require('node:vm');
const fs=require('node:fs');
const {createHash}=require('node:crypto');
const {buildGameRuntime}=require('./lib/game-runtime');
const r=buildGameRuntime(), requested=[];
let now=10000;
r.Date={now:()=>now};
r.location={protocol:'http:'};
r.Image=class { set src(value){this.url=value;requested.push(this);} };
const run=code=>vm.runInContext(code,r);
const compressed=JSON.parse(fs.readFileSync('assets/effects/lossless-manifest.json','utf8'));
for(const file of ['js/passives.js','data/skills.js']) {
    for(const match of fs.readFileSync(file,'utf8').matchAll(/skillFx\w+:\s*'(assets\/effects\/[^']+\.png)'/g)) {
        const webp=match[1].replace(/\.png$/,'.webp');
        assert(fs.existsSync(webp),`${webp}: the runtime compressed counterpart must be shipped`);
        assert.equal(fs.readFileSync(webp).toString('ascii',8,12),'WEBP');
        const proof=compressed.find(row=>row.source===match[1] && row.output===webp);
        assert(proof,`${webp}: run scripts/compress-battle-effects.py after editing a PNG master`);
        for(const [path,hash] of [[match[1],proof.sourceSha256],[webp,proof.outputSha256]]) {
            assert.equal(createHash('sha256').update(fs.readFileSync(path)).digest('hex'),hash,`${path}: compressed copy is stale`);
        }
    }
}
run("var bank={};registerDeferredBattleImage(bank,{src:'assets/effects/basic-slash-sheet.webp',keys:['a','b']})");
assert.equal(requested.length,0,'registration cannot download unused effects');
assert.equal(run('bank.a'),null);
assert.equal(run('bank.b'),null);
assert.equal(requested.length,1,'aliases and repeated frames share one request');
requested[0].onload();
assert.strictEqual(run('bank.a'),requested[0]);
assert.strictEqual(run('bank.b'),requested[0]);
run("registerDeferredBattleImage(bank,{src:'missing.webp',keys:['failed']});bank.failed");
requested[1].onerror();
assert.equal(run('bank.failed'),null);
assert.equal(requested.length,2,'failures cannot cause a hot retry loop');
now+=5000;run('bank.failed');
assert.equal(requested.length,3);
requested[2].onload();assert.strictEqual(run('bank.failed'),requested[2]);
run("registerDeferredBattleImage(bank,{src:'old.webp',keys:['old']});bank.old;var oldBank=bank;bank={};registerDeferredBattleImage(bank,{src:'new.webp',keys:['old']})");
requested[3].onload();assert.strictEqual(run('oldBank.old'),requested[3]);
assert.equal(run('bank.old'),null,'late completions must not contaminate a replacement bank');
assert.equal(requested[4].url,'new.webp');
run("var backgrounds={};var groups=prepareBattleAssetGroups({bgAct1:'one.webp',bgAct2:'two.webp',enemies:'enemies.png'},new Set(['bgAct1','enemies']),{},'',backgrounds)");
assert.equal(run('groups.length'),2,'only the current background and required sprites block entry');
assert.equal(requested.length,5,'registering unused backgrounds does not download them');
assert.equal(run('backgrounds.bgAct2'),null);
assert.equal(requested[5].url,'two.webp');
requested[5].onload();
assert.strictEqual(run('backgrounds.bgAct2'),requested[5]);
const beforeMaps=requested.length;
run("var actBank={};var actGroups=prepareBattleAssetGroups({...ACT_BATTLE_MAP_SOURCES,bgAct9Sap:ACT_BATTLE_MAP_EFFECTS.bgAct9.source},new Set(['bgAct1']),{},'',actBank)");
assert.equal(run('actGroups.length'),1,'only ACT1 blocks startup; the other nine maps and overlay stay deferred');
assert.equal(requested.length,beforeMaps,'registering the complete ACT package cannot download it');
run('actBank.bgAct9');
assert.equal(requested.length,beforeMaps+1,'visiting one act only requests that act');
assert.equal(requested.at(-1).url,run('ACT_BATTLE_MAP_SOURCES.bgAct9'));
run('actBank.bgAct9Sap');
assert.equal(requested.length,beforeMaps+2,'sap animation is a single additional sprite request');
requested.at(-1).onload();
const draws=[];r.mapEffectContext={imageSmoothingEnabled:true,drawImage(...args){draws.push(args);}};
run('battleAssets.backdrops=actBank;drawActMapEffect(mapEffectContext,{x:3,y:4,width:912,height:624},"bgAct9",1100)');
assert.deepStrictEqual(draws[0].slice(1),[2736,1248,912,624,3,4,912,624],'ACT9 uses the provided 4-column 12-frame sheet');
run('drawActMapEffect(mapEffectContext,{x:3,y:4,width:912,height:624},"bgAct9",1200)');
assert.deepStrictEqual(draws[1].slice(1,3),[0,0],'the 100 ms sequence loops after 1.2 seconds');
run('drawActMapEffect(mapEffectContext,{x:3,y:4,width:912,height:624},"bgAct1",1300)');
assert.equal(draws.length,2,'other acts never draw the sap animation');
assert.equal(r.mapEffectContext.imageSmoothingEnabled,true,'map pixel sampling cannot change actor rendering');
console.log('deferred battle images: bounded startup, alias reuse, retry and reload isolation passed');
