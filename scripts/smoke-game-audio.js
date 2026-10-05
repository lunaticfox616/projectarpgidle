'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const vm = require('node:vm');
const {buildGameRuntime} = require('./lib/game-runtime');
const root = 'assets/audio/game-sfx-v2/';
const bank = JSON.parse(fs.readFileSync(root + 'bank.json'));
const provenance = JSON.parse(fs.readFileSync(root + 'provenance.json'));

// Actual assets: no missing, silent, clipped, corrupt or oversized WAVs ship.
let total = 0;
for (const asset of provenance.assets) {
    const bytes = fs.readFileSync(root + asset.file); total += bytes.length;
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
    assert.equal(bytes.readUInt16LE(20), 1); assert.equal(bytes.readUInt16LE(22), asset.channels);
    assert.equal(bytes.readUInt16LE(34), 16); assert.equal(bytes.readUInt32LE(40), bytes.length - 44);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), asset.sha256);
    let peak = 0, sum = 0;
    for (let i = 44; i < bytes.length; i += 2) { const v = bytes.readInt16LE(i); peak = Math.max(peak, Math.abs(v)); sum += v*v; }
    assert.ok(peak > 100 && peak < 32767); assert.ok(sum > 0);
    assert.match(asset.sourceSha256, /^[a-f0-9]{64}$/);
    assert.ok(asset.sourceEnd > asset.sourceStart, 'new source interval is recorded');
    assert.ok(Math.abs(asset.sourceEnd-asset.sourceStart-asset.seconds)<1/asset.sampleRate);
    assert.equal(bytes.readInt16LE(44), 0); assert.equal(bytes.readInt16LE(bytes.length - 2), 0);
    assert.ok(peak <= 21300, 'bounded sample level leaves headroom for simultaneous hits');
    let firstAudible = Infinity;
    for(let i=44;i<bytes.length;i+=2)if(Math.abs(bytes.readInt16LE(i))>peak*.04){firstAudible=(i-44)/2/asset.channels/asset.sampleRate;break;}
    assert.ok(firstAudible < .045, asset.file+' has no delayed attack');
    const limit = asset.file === 'levelUp-a.wav' ? 3.3 : asset.file === 'lootMajor-a.wav' ? 2.5 : 1.4;
    assert.ok(asset.seconds <= limit);
    if (asset.file === 'levelUp-a.wav') {
        // A zero endpoint alone misses a loud cue abruptly chopped by a tiny fade.
        let tailEnergy = 0, samples = 0;
        for (let i = bytes.length - Math.round(asset.sampleRate * .35) * asset.channels * 2; i < bytes.length; i += 2) {
            tailEnergy += bytes.readInt16LE(i) ** 2; samples++;
        }
        assert.ok(Math.sqrt(tailEnergy / samples) < Math.sqrt(sum / ((bytes.length - 44) / 2)) * .1,
            'level-up has a quiet resolving tail before it ends');
    }
}
assert.ok(total < 4500000, 'short game samples stay below 4.5 MB');
for (const entry of Object.values(bank)) {
    for (const file of entry.files) assert.ok(provenance.assets.some(asset => asset.file === file));
}
const fileCount = new Set(Object.values(bank).flatMap(entry => entry.files)).size;
assert.equal(fileCount, 51, 'active attack and event slots exclude the retired ordinary-rare cue');
assert.equal(bank.lootRare, undefined, 'ordinary rare drops have no loaded sample');
assert.equal(new Set(provenance.assets.map(asset=>asset.sha256)).size,fileCount,'variations contain distinct audio');
assert.ok(!fs.existsSync('assets/audio/game-sfx-v1'), 'rejected audio is removed from deployment assets');

async function main() {
    const documentEvents = new EventTarget(), events = new EventTarget();
    const runtime = buildGameRuntime({}, events, {
        addEventListener: documentEvents.addEventListener.bind(documentEvents),
        removeEventListener: documentEvents.removeEventListener.bind(documentEvents)
    });
    const run = code => vm.runInContext(code, runtime);
    const sources = [], oscillators = [], fetches = [], decoded = [], warnings = [], contexts = [];
    let now = 1000, resumeCount = 0, permitFetch;
    const gate = new Promise(resolve => { permitFetch = resolve; });
    runtime.performance.now = () => now;
    runtime.console.warn = (...values) => warnings.push(values);
    runtime.fetch = async path => {
        fetches.push(path); await gate;
        return {ok:true,json:async()=>bank,arrayBuffer:async()=>({file:path.split('?')[0]})};
    };
    const param = () => ({value:1,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
    function node(type) {
        const item = {type,playbackRate:param(),frequency:param(),connect(){},disconnect(){this.disconnected=true;},
            start(){this.started=true;},stop(at){if(at===undefined){this.stopped=true;this.onended?.();}},
            finish(){this.stopped=true;this.onended?.();}};
        (type === 'sample' ? sources : oscillators).push(item); return item;
    }
    runtime.AudioContext = class {
        constructor(){this.currentTime=0;this.state='running';this.destination={};contexts.push(this);}
        createGain(){return{gain:param(),connect(){},disconnect(){}};}
        createDynamicsCompressor(){return{threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){}};}
        createBufferSource(){return node('sample');}
        createOscillator(){return node('tone');}
        async decodeAudioData(bytes){decoded.push(bytes.file);return bytes;}
        async resume(){resumeCount++;this.state='running';}
    };
    run('game=mergeDefaults({heroSelectionInitialized:true,settings:{uiSounds:true}});game.isBackgroundCalculation=false;');
    const saved = run('JSON.stringify(serializeSaveState(game))');
    const gesture = () => documentEvents.dispatchEvent(Object.assign(new Event('pointerdown'), {pointerType:'mouse',button:0,isPrimary:true}));
    run("playUiFeedbackSound('kill');"); assert.equal(contexts.length,0,'no autoplay context before a gesture');
    gesture();
    run("playUiFeedbackSound('killBoss');"); assert.equal(sources.length,0,'loading never queues sounds');
    permitFetch(); await new Promise(resolve=>setImmediate(resolve));
    assert.equal(decoded.length,fileCount); assert.equal(fetches.length,fileCount+1);
    assert.equal(sources.length,0,'no stale boss sound after decoding');
    gesture();
    assert.equal(contexts.length,1); assert.equal(fetches.length,fileCount+1,'no per-hit fetch or decode');

    const finish = () => [...sources,...oscillators].forEach(source=>source.finish());
    const play = kind => { now+=2000;runtime.playUiFeedbackSound(kind); };
    for (const kind of ['hitPhysical', 'hitProjectile', 'hitMagic']) {
        const sequence = [];
        for (let i=0;i<12;i++) {
            finish(); play(kind === 'hitPhysical' && i%2 ? 'hitCritical' : kind);
            sequence.push(sources.at(-1).buffer.file);
            runtime.playUiFeedbackSound(kind); // Rejected duplicate must not consume a variation.
        }
        for (let i=0;i<sequence.length;i+=3) assert.equal(new Set(sequence.slice(i,i+3)).size,3);
        for (let i=1;i<sequence.length;i++) assert.notEqual(sequence[i],sequence[i-1],'no adjacent repeated attack, even across bags/critical hits');
        assert.ok(sequence.every(file=>bank[kind].files.includes(file.slice(root.length))));
    }
    finish();
    play('chestOpen'); assert.equal(sources.at(-1).buffer.file,root+'chestOpen-a.wav');
    finish(); now+=2000;
    for(let i=0;i<200;i++) runtime.playUiFeedbackSound('hitPhysical');
    assert.equal(sources.filter(s=>!s.stopped).length,1,'same-frame area hits collapse');
    for(let i=0;i<10;i++){now+=200;runtime.playUiFeedbackSound('hitPhysical');}
    assert.equal(sources.filter(s=>!s.stopped).length,4,'continuous low-priority combat is bounded');
    for (const kind of ['chestOpen','potBreak','playerHurt','returnWarp']) play(kind);
    assert.equal(sources.filter(s=>!s.stopped).length,8);
    play('killBoss'); assert.equal(sources.filter(s=>!s.stopped).length,8);
    assert.equal(sources.at(-1).buffer.file,root+'killBoss-a.wav','boss replaces one ordinary voice');
    const beforeBlocked = sources.filter(s=>!s.stopped).slice();
    runtime.playUiFeedbackSound('killBoss');
    assert.deepEqual(sources.filter(s=>!s.stopped),beforeBlocked,'throttled priorities never evict another voice');
    finish(); now+=2000;
    runtime.playLootDropSound(false);
    runtime.playUiFeedbackSound('lootRare');
    assert.equal(sources.filter(s=>!s.stopped).length,0,'ordinary rare drops are silent');
    runtime.playLootDropSound(true);runtime.playLootDropSound(true);
    assert.equal(sources.filter(s=>!s.stopped).length,1,'major drop still sounds and is deduplicated');
    assert.equal(sources.at(-1).buffer.file,root+'lootMajor-a.wav');
    const importantDrop = sources.at(-1), alertCount = sources.length;
    now+=1000;runtime.playLootDropSound(true);
    assert.equal(sources.length,alertCount,'rapid valuable drops do not stack long alert tails');
    for(let i=0;i<12;i++){now+=120;runtime.playUiFeedbackSound('hitPhysical');}
    assert.equal(importantDrop.stopped,undefined,'ordinary combat never cuts off a valuable drop alert');
    run('game.settings.uiSounds=false;playUiFeedbackSound.syncSettings();');
    assert.equal(sources.filter(s=>!s.stopped).length,0,'mute stops already playing audio');
    const mutedCount = sources.length;
    runtime.playUiFeedbackSound('levelUp'); assert.equal(sources.length,mutedCount);
    run('game.settings.uiSounds=true;playUiFeedbackSound.syncSettings();game.isBackgroundCalculation=true;');
    play('killBoss'); assert.equal(sources.length,mutedCount,'offline calculations are silent');
    run('game.isBackgroundCalculation=false;'); play('levelUp');
    runtime.document.hidden=true;documentEvents.dispatchEvent(new Event('visibilitychange'));
    assert.equal(sources.filter(s=>!s.stopped).length,0,'hiding the document cuts tails');
    play('killBoss');assert.equal(sources.length,mutedCount+1);
    runtime.document.hidden=false;documentEvents.dispatchEvent(new Event('visibilitychange'));
    contexts[0].state='suspended';play('killBoss');assert.equal(sources.length,mutedCount+1);
    documentEvents.dispatchEvent(new Event('keydown'));await new Promise(resolve=>setImmediate(resolve));
    assert.equal(resumeCount,1);assert.equal(sources.length,mutedCount+1,'resume never replays discarded sounds');

    // Real presentation consumer routes confirmed FX; gameplay and saved state stay unchanged.
    for(const [fx,kind] of [
        [{type:'hit',damage:10},'hitPhysical'],
        [{type:'hit',damage:10,projectile:true},'hitProjectile'],
        [{type:'hit',damage:10,element:'cold'},'hitColdBurst'],
        [{type:'playerHit',damage:10},'playerHurt'],
        [{type:'objectReward',objectKind:'pot'},'potBreak'],
        [{type:'playerReturnDepart'},'returnWarp']
    ]) {
        finish();now+=2000;runtime.fx={...fx,start:now};
        run(`worldTreeSkillFx.feedback.observe(fx,${now});`);
        assert.ok(bank[kind].files.some(file => sources.at(-1).buffer.file === root+file));
    }
    for (const [name,kind] of [
        ['연속 베기','hitSlash'], ['암살','hitThrust'], ['지진 파쇄','hitSlam'], ['회오리바람','hitWhirl'],
        ['방패 투척','hitShield'], ['화염 참격','hitFireBlade'], ['유성 낙화','hitFireBurst'],
        ['용화 숨결','hitFireBreath'], ['얼음 창','hitColdPierce'], ['서리 폭발','hitColdBurst'],
        ['번개 타격','hitLightArc'], ['집중 광선','hitLightBeam'], ['룬 지뢰','hitLightBurst'],
        ['공허 베기','hitChaosCut'], ['암흑 파열','hitChaosPulse'], ['독창 투척','hitVenom'], ['빈 플라스크','hitFlask']
    ]) {
        const sequence=[];
        for(let i=0;i<4;i++) {
            finish(); now+=2000; runtime.fx={type:'hit',skillName:name,damage:10,start:now};
            run(`worldTreeSkillFx.feedback.observe(fx,${now});`);
            const file=sources.at(-1).buffer.file;
            assert.ok(bank[kind].files.some(sample=>file===root+sample),name+' uses its actual skill definition');
            if(sequence.length)assert.notEqual(file,sequence.at(-1));
            sequence.push(file);
        }
    }
    finish();now+=2000;
    runtime.fx={type:'hit',skillName:'삼원 파동',element:'cold',damage:10,start:now};
    run(`worldTreeSkillFx.feedback.observe(fx,${now});`);
    assert.ok(bank.hitColdBurst.files.includes(sources.at(-1).buffer.file.slice(root.length)),'actual stage element overrides base fire');
    finish();now+=2000;
    runtime.fx={type:'playerSwing',skillName:'화염 부패',start:now};
    run(`worldTreeSkillFx.feedback.observe(fx,${now});`);
    assert.ok(bank.hitFireBreath.files.includes(sources.at(-1).buffer.file.slice(root.length)),'DoT casting can sound while its damage ticks stay silent');
    const count = sources.length;
    for(const fx of [{type:'hit',damage:0},{type:'hit',damage:1,dot:true},{type:'playerHit',damage:5,deflected:true},{type:'levelUp',start:0}]) {
        runtime.fx={start:now,...fx};run(`worldTreeSkillFx.feedback.observe(fx,${now});`);
    }
    assert.equal(sources.length,count,'blocked, DoT and stale events stay quiet');
    const beforeSave = JSON.parse(JSON.parse(saved)), afterSave = JSON.parse(run('serializeSaveState(game)'));
    const changed = Object.keys(afterSave).filter(key => JSON.stringify(afterSave[key]) !== JSON.stringify(beforeSave[key]));
    assert.deepEqual(changed, [], 'audio leaves saved domain state unchanged');
    assert.equal(warnings.length,0);finish();
    assert.ok(sources.every(source=>source.disconnected),'finished sources disconnect');
    console.log(`game audio: ${provenance.assets.length} WAVs (${total} bytes), actual routing, bounded voices, gesture, mute/offline and save invariants OK`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
