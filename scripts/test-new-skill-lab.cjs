// Opt-in browser integration check. Build the laboratory, then run against serve-test.js.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const checkPositions = require('./lib/new-skill-position-checks.cjs');
const checkMotion = require('./lib/new-skill-motion-checks.cjs');
const checkInvestment = require('./lib/new-skill-investment-checks.cjs');
const checkAssassination = require('./lib/new-skill-assassination-checks.cjs');
const origin = 'http://127.0.0.1:' + (process.env.PLAYWRIGHT_PORT || 4216);
async function checkSmoothFlight(frame) {
    const result = await frame.evaluate(() => {
        const lab = newSkillLab;
        changeSkill('탄성 플라스크'); lab.reset();
        const now = getCombatTime();
        game.combatTimeMs = now-1; lab.sampleEffects(0);
        game.combatTimeMs = now; performPlayerAttack(getPlayerStats());
        const flight = lab.renderer.effects.find(e => e.flaskPhase === 'flight');
        const hp = game.enemies.map(e => e.hp);
        const motion = [0,16,32,48,64,80,96].map(t => lab.sampleEffects(t));
        game.combatHalted = true;
        const paused = [200,400,600].map(t => lab.sampleEffects(t));
        game.combatHalted = false;
        const end = flight.at+flight.duration;
        game.combatTimeMs = end-20; lab.sampleEffects(700);
        const landing = lab.sampleEffects(900);
        const unchanged = hp.every((n,i) => n === game.enemies[i].hp) && lab.history.length === 0;
        game.combatTimeMs = end;
        for(const row of lab.casts) row.cast.update(end);
        const hits = lab.history.length;
        const impact = lab.sampleEffects(920);
        const impactAgain = lab.sampleEffects(936);
        const stillHits = lab.history.length;
        game.combatTimeMs = now;
        lab.cancel();
        const cleared = lab.sampleEffects(950);
        performPlayerAttack(getPlayerStats());
        const restarted = lab.sampleEffects(950);
        lab.reset();
        return {motion,paused,landing,unchanged,hits,stillHits,impact,impactAgain,cleared,restarted};
    });
    assert.equal(new Set(result.motion.map(rows=>JSON.stringify(rows))).size,7,'flight moves between combat ticks');
    assert.equal(new Set(result.paused.map(rows=>JSON.stringify(rows))).size,1,'pause freezes visuals');
    assert.ok(result.landing.length>0,'bottle remains visible until confirmed landing');
    assert.ok(result.unchanged,'rendering cannot inflict damage');
    assert.equal(result.hits,1,'first landing hits once');
    assert.equal(result.stillHits,1,'more render frames cannot repeat the hit');
    assert.ok(result.impact.length>0 && result.impactAgain.length>0,'confirmed impact is visible');
    assert.deepEqual(result.cleared,[],'cancel clears visuals');
    assert.ok(result.restarted.length>0,'rewound battle clock starts a new flight');
    console.log('Smooth flight: 7 distinct poses per unchanged combat tick; pause, landing, damage and reset verified.');
}
async function checkBossCenter(page, frame, mobile) {
    await page.locator('#encounter').selectOption('boss');
    await frame.waitForFunction(()=>newSkillLab.bossMode && game.enemies[0]?.isBoss);
    const result = await frame.evaluate(() => {
        const lab = newSkillLab;
        changeSkill('탄성 플라스크'); lab.reset();
        const boss = game.enemies[0], anchor = {gx:boss.gx,gy:boss.gy};
        const center = getGridUnitCenter(boss), now = getCombatTime();
        performPlayerAttack(getPlayerStats());
        const cast = lab.casts[0].cast;
        for(let t=0;t<=6000;t+=50) {game.combatTimeMs=now+t; cast.update(now+t);}
        const flights = lab.renderer.effects.filter(e=>e.flaskPhase==='flight');
        const firstSource = flights[0].sourceCell;
        const targets = flights.map(e=>e.targetCells[0]);
        const sources = flights.slice(1).map(e=>e.sourceCell);
        const count = lab.history.length, cells = getGridUnitCells(boss).length;
        const intact = boss.gx === anchor.gx && boss.gy === anchor.gy;
        lab.reset(); performPlayerAttack(getPlayerStats());
        return {center,targets,sources,firstSource,count,cells,intact};
    });
    assert.equal(result.count,4,'large target still receives four hits, not four per occupied cell');
    assert.equal(result.cells,4); assert.ok(result.intact,'visual centering cannot move the boss');
    for(const cell of [...result.targets,...result.sources]) assert.deepEqual(cell,result.center);
    assert.deepEqual(result.firstSource,{gx:3,gy:4},'player launch remains unchanged');
    await page.waitForTimeout(150);
    await page.screenshot({path:'artifacts/new-skill-gems/boss-center-'+(mobile?'mobile':'desktop')+'.png'});
    await page.locator('#encounter').selectOption('normal');
    await frame.waitForFunction(()=>!newSkillLab.bossMode && game.enemies.length===6);
    console.log('2x2 boss: body-centered flight, bounce origin, four hits and unchanged collision cells verified.');
}
(async () => {
    const browser = await chromium.launch();
    try {
        for(const mobile of [false,true]) {
            const page = await browser.newPage({viewport:mobile ? {width:393,height:851} : {width:1440,height:1000}, isMobile:mobile, hasTouch:mobile});
            const errors = []; page.on('pageerror', error => errors.push(error.message));
            await page.goto(origin + '/artifacts/new-skill-gems/index.html?reference=1');
            await page.waitForFunction(() => !document.querySelector('#equip').disabled, {timeout:60000});
            const frame = page.frames().find(f => f !== page.mainFrame());
            await checkMotion(frame);
            await checkInvestment(frame);
            await checkPositions(frame);
            await checkAssassination(frame);
            await checkSmoothFlight(frame);
            await checkBossCenter(page, frame, mobile);
            const results = await frame.evaluate(() => {
                const lab = newSkillLab;
                // Combat evasion/crit and monster selection are random boundaries, not a damage failure.
                const random = Math.random; Math.random = () => .5;
                const output = [];
                for(const item of lab.items.filter(s => s.id !== 53)) {
                    changeSkill(item.name); lab.reset();
                    const stats = getPlayerStats(), now = getCombatTime();
                    performPlayerAttack(stats);
                    const rows = lab.casts.slice();
                    // Drive the original controller clock, without extra automatic casts/movement.
                    for(let t=0;t<=8000;t+=50) {
                        game.combatTimeMs = now+t;
                        for(const row of rows) row.cast.update(now+t);
                        lab.renderer.layout(now+t,()=>{});
                    }
                    output.push({name:item.name, hits:lab.history.length,
                        damage:lab.history.reduce((n,h)=>n+h.damage,0),
                        hpLost:game.enemies.reduce((n,e)=>n+e.maxHp-e.hp,0),
                        primaryDamage:game.enemies[0].maxHp-game.enemies[0].hp,
                        effects:lab.renderer.effects.length, statsDamage:stats.baseDmg});
                }
                changeSkill('인과'); lab.reset(); performPlayerAttack(getPlayerStats());
                const now = getCombatTime();
                for(let i=1;i<=4;i++) lab.reaction.receiveHit({sequence:i,at:now,targetId:'player',kind:'hit',damageTaken:1});
                const before = lab.reaction.snapshot();
                lab.reaction.receiveHit({sequence:5,at:now,targetId:'player',kind:'dot',damageTaken:1});
                const ignored = lab.reaction.snapshot();
                lab.reaction.receiveHit({sequence:6,at:now,targetId:'player',kind:'hit',damageTaken:1});
                const after = lab.reaction.snapshot();
                const reactiveDamage = lab.history.reduce((n,h)=>n+h.damage,0);
                lab.reaction.receiveHit({sequence:6,at:now,targetId:'player',kind:'hit',damageTaken:1});
                const duplicate = lab.reaction.snapshot();
                lab.reaction.reset(); lab.history.length = 0;
                lab.sequence = 10;
                for(let i=0;i<5;i++) addBattleFx('playerHit',{enemyId:game.enemies[0].id,damage:1,duration:200});
                const combatHook = lab.reaction.snapshot();
                addBattleFx('playerHit',{enemyId:game.enemies[0].id,damage:1,duration:200});
                game.playerAilments = [{type:'stun',time:1}];
                addBattleFx('playerHit',{enemyId:game.enemies[0].id,damage:1,duration:200});
                const interrupted = lab.reaction.snapshot();
                game.playerAilments = [];
                performPlayerAttack(getPlayerStats());
                game.gridPlayer.gx--;
                addBattleFx('playerHit',{enemyId:game.enemies[0].id,damage:1,duration:200});
                const moved = lab.reaction.snapshot();
                // Changing gems must cancel in-flight impacts; native handles must not survive the reset.
                changeSkill('폭발 혼합물'); lab.reset();
                const at = getCombatTime(); performPlayerAttack(getPlayerStats());
                const pending = lab.casts.map(row => row.cast);
                const initialHp = game.enemies.reduce((n,e)=>n+e.hp,0);
                changeSkill('광창 강림'); game.combatTimeMs = at+4000;
                pending.forEach(cast => cast.update(at+4000));
                const cancelIntact = game.enemies.reduce((n,e)=>n+e.hp,0) === initialHp;
                changeSkill('탄성 플라스크'); lab.reset();
                for(let i=0;i<5;i++) addBattleFx('playerHit',{enemyId:game.enemies[0].id,damage:1,duration:200});
                const unequipped = lab.reaction.snapshot();
                Math.random = random;
                return {output, before, ignored, after, duplicate, reactiveDamage, combatHook, interrupted, moved, unequipped, cancelIntact, gems:game.skills.length};
            });
            console.log(mobile?'mobile':'desktop', JSON.stringify(results));
            for(const row of results.output) {assert.ok(row.hits>0,row.name+' callbacks'); assert.ok(row.damage>0,row.name+' damage'); assert.ok(row.effects>0,row.name+' visuals');}
            assert.ok(results.output.find(r=>r.name==='과냉각 혼합물').primaryDamage>0,'cold ring hits intended enemy');
            assert.equal(results.gems,10); assert.equal(results.before.count,4); assert.equal(results.ignored.count,4);
            assert.equal(results.after.count,0); assert.equal(results.after.explosions,1);
            assert.equal(results.duplicate.explosions,1); assert.ok(results.reactiveDamage>0);
            assert.equal(results.combatHook.explosions,2); assert.equal(results.combatHook.count,0);
            for(const state of [results.interrupted,results.moved,results.unequipped]) {
                assert.equal(state.count,0); assert.equal(state.equipped,false); assert.equal(state.explosions,2);
            }
            assert.equal(results.cancelIntact,true);
            await page.locator('#gems').click();
            await frame.locator('#tab-skills').waitFor({state:'visible'});
            const gem = frame.locator('article.skill-gem').filter({has:frame.locator('strong', {hasText:'탄성 플라스크'})}).first();
            await gem.waitFor({state:'visible'});
            assert.match(await frame.locator('#tab-skills').innerText(), /탄성 플라스크/);
            await gem.scrollIntoViewIfNeeded();
            await page.screenshot({path:'artifacts/new-skill-gems/gems-'+(mobile?'mobile':'desktop')+'.png'});
            await page.locator('#reset').click();
            await page.locator('#skill').selectOption('인과'); await page.locator('#equip').click();
            await page.waitForFunction(() => document.querySelector('#counter').textContent.includes('집중 중'));
            assert.equal(await page.locator('#reaction').count(),0);
            assert.equal(await frame.evaluate(()=>game.activeSkill),'인과');
            await page.screenshot({path:'artifacts/new-skill-gems/battle-'+(mobile?'mobile':'desktop')+'.png'});
            await frame.evaluate(() => {game.combatHalted = true;});
            await page.waitForFunction(() => document.querySelector('#counter').textContent === '집중 대기');
            assert.equal(await frame.evaluate(()=>combatChannelRuntime.id),0);
            assert.deepEqual(errors,[]);
            await page.close();
        }
        fs.writeFileSync('artifacts/new-skill-gems/check.txt','PASS: 10 gems, actual damage, native visuals, reaction threshold/exclusions, gem UI, desktop/mobile.\n');
    } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;});
