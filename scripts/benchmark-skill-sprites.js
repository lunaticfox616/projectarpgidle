// Rendering-only comparison; not a whole-game FPS benchmark. Original source is a review artifact.
const fs=require('fs');
const assert=require('assert');
const {chromium}=require('@playwright/test');

function inspectSheets() {
    return Object.entries(SKILL_SIGNATURE_SPRITES).map(([name,spec])=> {
        const image=battleAssets.images[spec.asset], canvas=document.createElement('canvas');
        canvas.width=image.naturalWidth; canvas.height=image.naturalHeight;
        const ctx=canvas.getContext('2d'); ctx.drawImage(image,0,0);
        const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let transparent=0;
        for(let i=3;i<pixels.length;i+=4) if(pixels[i]===0) transparent++;
        return {name,width:canvas.width,height:canvas.height,transparentRatio:transparent/(pixels.length/4)};
    });
}

function measureSprites(oldSource) {
    const previous=new Function(oldSource.replace(/safeExposeGlobals\(\{drawSkillSignatureTravel,drawSkillSignatureImpact,drawSkillMobilitySignature\}\);/,
        'return drawSkillSignatureTravel;'))();
    clearInterval(gameTickHandle); gameTickHandle=null;
    const raf=window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame=callback=>callback===gameLoop ? 0 : raf(callback);
    game.gridPlayer={gx:3,gy:4};
    game.enemies=[[4,4],[5,4],[4,5]].map(([gx,gy],id)=>({id:id+1,gx,gy,hp:100000,maxHp:100000}));
    const projection={tileW:48,tileH:48,cellToScreen:(gx,gy)=>({x:48+gx*48,y:48+gy*48})};
    const effects=Object.entries(SKILL_GEM_VFX_PROFILES).filter(([,profile])=>profile.signature).map(([name])=> {
        const skill=SKILL_DB[name], targets=selectGridSkillTargets(name,skill,game.gridPlayer,game.enemies,{preferredEnemyId:1});
        const stage=buildSkillHitSequence(name,skill,targets)[0];
        return {skillName:name,sourceCell:{...game.gridPlayer},attackFootprint:getSkillStageFootprint(name,skill,stage,game.gridPlayer),
            start:1000,duration:800,stageIndex:0,stageDelayMs:stage.delayMs,waveDurationMs:220,element:'fire'};
    });
    const canvas=document.createElement('canvas'); canvas.width=480; canvas.height=480;
    document.body.append(canvas);
    const ctx=canvas.getContext('2d'), times={previous:[],sprite:[]};
    const renderBatch=renderer=> {
        const begin=performance.now();
        for(let frame=0;frame<120;frame++) {
            ctx.clearRect(0,0,480,480);
            const time={now:1420+frame%120,launchAt:1000,arriveAt:1400,source:projection.cellToScreen(3,4)};
            effects.forEach(fx=>renderer(ctx,fx,time,projection));
        }
        ctx.getImageData(0,0,1,1); // Flush the same canvas for both renderers.
        return performance.now()-begin;
    };
    renderBatch(previous); renderBatch(drawSkillSignatureTravel);
    for(let trial=0;trial<7;trial++) {
        const order=trial%2 ? [['sprite',drawSkillSignatureTravel],['previous',previous]] : [['previous',previous],['sprite',drawSkillSignatureTravel]];
        order.forEach(([name,renderer])=>times[name].push(renderBatch(renderer)));
    }
    canvas.remove();
    const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
    return {skills:effects.length,framesPerBatch:120,trials:7,timesMs:times,
        previousMedianMs:median(times.previous),spriteMedianMs:median(times.sprite),scope:'19 simultaneous skill stages; isolated canvas render batches, not game FPS'};
}

(async()=> {
    const browser=await chromium.launch();
    try {
        const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
        const page=await context.newPage(), errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        await page.route('https://**',route=>route.fulfill({status:204,body:''}));
        await page.goto('http://127.0.0.1:4214/');
        await page.locator('#btn-startup-guest').click();
        await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
        await page.waitForFunction(()=>battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
        const sheets=await page.evaluate(inspectSheets);
        sheets.forEach(sheet=>assert(sheet.transparentRatio>0.1 && sheet.width>1000,`${sheet.name}: actual alpha and loaded sheet`));
        const performance=await page.evaluate(measureSprites,fs.readFileSync('artifacts/skill-procedural-before.js','utf8'));
        assert.deepStrictEqual(errors,[]);
        fs.writeFileSync('artifacts/sprite-vfx-performance.json',JSON.stringify({sheets,performance},null,2));
        console.log(JSON.stringify(performance));
        await page.goto('http://127.0.0.1:4214/artifacts/all-skill-vfx/pixel-motion.html?review=sprite-images');
        assert.strictEqual(await page.locator('video[autoplay]').count(),0);
        assert.strictEqual(await page.locator('video[preload="none"]').count(),20);
        await page.locator('video').nth(0).evaluate(video=>video.play());
        await page.locator('video').nth(1).evaluate(video=>video.play());
        assert.strictEqual(await page.evaluate(()=>[...document.querySelectorAll('video')].filter(video=>!video.paused).length),1);
        await page.screenshot({path:'artifacts/sprite-vfx-preview.png'});
        console.log('Atlas alpha and single-video playback passed.');
    } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
