// Controlled target damage, not clear speed or a claim about complete build balance.
const {chromium} = require('playwright');
const fs = require('node:fs');
(async () => {
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage();
        await page.goto('http://127.0.0.1:4216/artifacts/new-skill-gems/index.html');
        await page.waitForFunction(() => !document.querySelector('#equip').disabled);
        const rows = await page.frames()[1].evaluate(() => {
            const lab = newSkillLab, result = [], random = Math.random;
            Math.random = () => .5;
            try {
                const names = lab.items.map(s=>s.name).concat(['연속 베기','서리 폭발','서리 파동','빙결 침식','원소 포션 투척','암살자의 일격','난타 눈보라']);
                for(const level of [1,10,20]) for(const count of [1,6]) for(const name of names) {
                    changeSkill(name); lab.reset(); game.gemData[name] = {level,exp:0,quality:0};
                    game.enemies = game.enemies.slice(0,count);
                    game.enemies.forEach(e=>{e.hp=1e8;e.maxHp=1e8;e.evasion=0;e.ailments=[];});
                    const stats = getPlayerStats(), start = getCombatTime(), before = count*1e8;
                    let next = start, nextHit = start+1000;
                    for(let elapsed=0;elapsed<20000;elapsed+=50) {
                        game.combatTimeMs = start+elapsed;
                        processPendingSkillStageHits();
                        for(const row of lab.casts) row.cast.update(getCombatTime());
                        lab.casts = lab.casts.filter(row=>!row.cast.done&&!row.cast.cancelled&&getCombatTime()<row.end);
                        tickEnemyAilments(stats,.05); tickEnemyDotEffects(stats,.05);
                        if(getCombatTime()>=next) {performPlayerAttack(stats);next+=1000/stats.aspd;}
                        if(name==='인과' && getCombatTime()>=nextHit) {
                            addBattleFx('playerHit',{enemyId:game.enemies[0].id,damage:1,duration:200});nextHit+=1000;
                        }
                        lab.renderer.prune(getCombatTime());
                    }
                    result.push({name,level,targets:count,dps:Math.round((before-game.enemies.reduce((n,e)=>n+e.hp,0))/20),aspd:stats.aspd});
                }
                return result;
            } finally {Math.random=random;game.combatHalted=true;}
        });
        fs.writeFileSync('artifacts/new-skill-gems/balance.json',JSON.stringify(rows,null,2)+'\n');
        console.log(JSON.stringify(rows.filter(r=>r.level===20)));
    } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
