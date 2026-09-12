const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
    const browser=await chromium.launch();
    try {
        for(const mobile of [false,true]) {
            const page=await browser.newPage({viewport:mobile?{width:393,height:851}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
            const errors=[];page.on('pageerror',e=>errors.push(e.message));
            await page.goto('http://127.0.0.1:'+(process.env.PLAYWRIGHT_PORT||4216)+'/artifacts/new-skill-gems/index.html');
            await page.waitForFunction(()=>!document.querySelector('#equip').disabled,{timeout:60000});
            const frame=page.frames()[1];
            const result=await frame.evaluate(()=>{
                clearInterval(newSkillLab.timer);
                const rows=[],random=Math.random;Math.random=()=>.5;
                try {
                    for(const item of newSkillLab.items) {
                        changeSkill(item.name);newSkillLab.bossMode=true;newSkillLab.reset();
                        const boss=game.enemies[0];boss.gx=4;boss.gy=4;
                        const stats=getPlayerStats(),start=getCombatTime();
                        performPlayerAttack(stats);
                        const art=[],poses=new Set();
                        for(let t=0;t<=6500;t+=50) {
                            game.combatTimeMs=start+t;updateSkillGemCombat(stats);
                            if(item.id===53 && t>0 && t<=500 && t%100===0)receiveSkillGemPlayerHit(1,stats);
                            for(const e of skillGemCombatRuntime?.events||[]) {
                                const render=worldTreeNativeFx.create(e);
                                render.layout(start+t,s=>{art.push(s);poses.add(JSON.stringify(s));});
                            }
                        }
                        rows.push({name:item.name,damage:boss.maxHp-boss.hp,art:art.length,poses:poses.size,
                            finite:art.every(s=>[s.x,s.y,s.scale,s.scaleY,s.alpha,s.angle].every(Number.isFinite)),
                            player:{...game.gridPlayer},cells:getGridUnitCells(boss)});
                    }
                }finally{Math.random=random;}
                changeSkill('탄성 플라스크');newSkillLab.reset();performPlayerAttack(getPlayerStats());
                return rows;
            });
            fs.writeFileSync('artifacts/new-skill-gems/production-'+(mobile?'mobile':'desktop')+'.json',JSON.stringify(result,null,2));
            console.log(result);
            for(const row of result){assert.ok(row.damage>0,row.name+' damages boss');assert.ok(row.art>0,row.name+' renders');assert.ok(row.finite,row.name+' finite geometry');}
            assert.deepEqual(errors,[]);
            await page.screenshot({path:'artifacts/new-skill-gems/production-'+(mobile?'mobile':'desktop')+'.png'});
            await page.close();
        }
    }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
