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
run("var bank={};registerDeferredBattleEffect(bank,{src:'assets/effects/basic-slash-sheet.webp',keys:['a','b']})");
assert.equal(requested.length,0,'registration cannot download unused effects');
assert.equal(run('bank.a'),null);
assert.equal(run('bank.b'),null);
assert.equal(requested.length,1,'aliases and repeated frames share one request');
requested[0].onload();
assert.strictEqual(run('bank.a'),requested[0]);
assert.strictEqual(run('bank.b'),requested[0]);
run("registerDeferredBattleEffect(bank,{src:'missing.webp',keys:['failed']});bank.failed");
requested[1].onerror();
assert.equal(run('bank.failed'),null);
assert.equal(requested.length,2,'failures cannot cause a hot retry loop');
now+=5000;run('bank.failed');
assert.equal(requested.length,3);
requested[2].onload();assert.strictEqual(run('bank.failed'),requested[2]);
run("registerDeferredBattleEffect(bank,{src:'old.webp',keys:['old']});bank.old;var oldBank=bank;bank={};registerDeferredBattleEffect(bank,{src:'new.webp',keys:['old']})");
requested[3].onload();assert.strictEqual(run('oldBank.old'),requested[3]);
assert.equal(run('bank.old'),null,'late completions must not contaminate a replacement bank');
assert.equal(requested[4].url,'new.webp');
console.log('deferred battle effects: no eager requests, alias reuse, retry and reload isolation passed');
