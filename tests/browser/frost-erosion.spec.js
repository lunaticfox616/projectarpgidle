const fs = require('fs');
const { test, expect } = require('@playwright/test');

test('frost keeps one image over its full area and fades through the attack cycle', async ({page},testInfo) => {
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="alchemist"]').click();
    await page.waitForFunction(()=>battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(()=>{
        tutorialQueue.length=0; if(activeTutorial) dismissTutorial(false);
        game.settings.pauseGameOnOverlay=false;
        grantLoopStarterGemOnFirstKill(); changeSkill('빙결 침식'); switchTab('tab-battle');
    });
    const captures=await page.evaluate(()=>new Promise((resolve,reject)=>{
        const frames=[], deadline=performance.now()+35000;
        let cast=null;
        function observe() {
            tutorialQueue.length=0; if(activeTutorial) dismissTutorial(false);
            const now=battleVisualState.visualNow;
            if(!cast) cast=battleFx.find(fx=>fx.type==='combatTravel' && fx.skillName==='빙결 침식');
            if(cast) {
                const arrival=cast.start+cast.releaseDelayMs+cast.flightMs;
                const progress=(now-arrival)/(cast.start+cast.duration-arrival);
                const threshold=frames.length===0 ? 0.2 : 0.78;
                if(progress>=threshold && progress<1) {
                    frames.push({image:document.getElementById('battlefield-canvas').toDataURL('image/png'),
                        frame:cast.spriteFrame,progress,cells:cast.attackFootprint.cells.length});
                }
                if(frames.length===2) return resolve(frames);
            }
            if(performance.now()>deadline) return reject(new Error('A complete frost attack cycle was not observed'));
            requestAnimationFrame(observe);
        }
        requestAnimationFrame(observe);
    }));
    expect(captures[0].frame).toBe(captures[1].frame);
    expect(captures[0].cells).toBeGreaterThan(1);
    expect(captures[1].progress).toBeGreaterThan(captures[0].progress);
    captures.forEach((capture,index)=>fs.writeFileSync(testInfo.outputPath('frost-'+index+'.png'),Buffer.from(capture.image.split(',')[1],'base64')));
    expect(errors).toEqual([]);
});
