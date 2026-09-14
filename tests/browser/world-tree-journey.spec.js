const { test, expect } = require('@playwright/test');

test('expedition receipt shows committed rewards and opens equipment details',async({page,isMobile},info)=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/tests/fixtures/world-tree-journey/index.html');
    await expect(page.locator('#status')).toContainText('실제 전투');
    const frame=page.frameLocator('#game');
    const child=page.frames().find(entry=>entry.parentFrame());
    await frame.locator('[data-journey-travel]').click();
    await page.locator('#view').click();
    const rewardName=await child.evaluate(()=>{
        // Fixed reward case through the actual award/keep boundaries, not a fabricated display receipt.
        const item=createItemFromBase(BASE_ITEM_DB[0],'rare',8);
        combatLootReceipts.capture(game,()=>{
            awardCurrency('goldenRule',1);awardCurrency('magicBud',3);
            addItemToInventory(item,{guaranteedKeep:true});
        });
        for(let i=0;i<4500&&game.worldTreeJourney.active;i++)coreLoop(getCombatTime()+100);
        updateStaticUI();return item.name;
    });
    await frame.getByRole('button',{name:'획득 보기',exact:true}).click();
    const receipt=frame.locator('.journey-receipt');
    await expect(receipt).toHaveAttribute('open','');
    await expect(receipt).toContainText('황금률');await expect(receipt).toContainText('마법의 새싹');
    await child.evaluate(()=>worldTreeJourneyUi.select('worldtree_root'));
    await expect(receipt).toHaveAttribute('open','');
    await expect(receipt.locator('img,svg')).toHaveCount(0);
    const item=receipt.getByRole('button',{name:new RegExp(rewardName+' · 희귀 옵션 확인')}).first();
    if(isMobile)await item.click();else await item.hover();
    const tooltip=frame.locator('#item-tooltip-box');
    await expect(tooltip).toBeVisible();await expect(tooltip).toContainText(rewardName);
    const overflow=await receipt.evaluate(element=>element.scrollWidth>element.clientWidth+1);
    expect(overflow).toBe(false);
    await page.screenshot({path:info.outputPath('expedition-receipt.png')});
    const wallet=await child.evaluate(()=>JSON.stringify(game.currencies));
    await child.evaluate(()=>{finishEncounterRun();updateStaticUI();});
    expect(await child.evaluate(()=>JSON.stringify(game.currencies))).toBe(wallet);
    expect(errors).toEqual([]);
});

test('ordinary equipment review loads valid gear and starts real pack combat',async({page})=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/tests/fixtures/world-tree-journey/index.html');
    // An immediate fixture request must wait for boot, not race the initial class picker.
    await page.getByRole('button',{name:'제작 장비 체험',exact:true}).click();
    await expect(page.locator('#status')).toContainText('T15 상위 제작');
    await expect(page.frameLocator('#game').locator('#loop-hero-select-overlay')).not.toBeVisible();
    await page.getByRole('button',{name:'일반 장비 체험',exact:true}).click();
    await expect(page.locator('#status')).toContainText('T14 선별 장비');
    const frame=page.frameLocator('#game');
    const child=page.frames().find(entry=>entry.parentFrame());
    const build=await child.evaluate(()=>{
        const before=getPlayerStats(false);
        game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;
        const after=getPlayerStats(false);
        return {disabled:Object.keys(after.disabledEquipment),nodes:game.passives.length,
            points:game.passivePoints,hp:after.maxHp,dps:after.totalDps,oldHp:before.maxHp,oldDps:before.totalDps};
    });
    expect(build.disabled).toEqual([]);expect(build.nodes).toBeLessThanOrEqual(100);
    expect(build.points).toBeGreaterThanOrEqual(0);
    expect(build.hp).toBe(build.oldHp);expect(build.dps).toBeCloseTo(build.oldDps,6);
    expect(build.dps).toBeLessThan(1000000);
    await frame.locator('[data-journey-travel]').click();
    await expect.poll(()=>child.evaluate(()=>game.runProgress)).toBeGreaterThan(0);
    expect(await child.evaluate(()=>game.currentZoneId)).toBe('worldtree_root');
    await page.getByRole('button',{name:'제작 장비 체험',exact:true}).click();
    await expect(page.locator('#status')).toContainText('T15 상위 제작');
    const crafted=await child.evaluate(()=>({disabled:Object.keys(getPlayerStats(false).disabledEquipment),
        completed:game.worldTreeJourney.cleared.length,keystones:game.ascendKeystones.length}));
    expect(crafted).toEqual({disabled:[],completed:0,keystones:2});
    const route=frame.getByRole('button',{name:'균열 경유',exact:true});
    await expect(route).toContainText('대균열 발견');
    await frame.locator('[data-journey-node="worldtree_breach"]').click();
    await expect(frame.locator('.journey-reward')).toHaveText('대균열 발견 기회');
    const unlocks=await child.evaluate(()=>{
        const results=['fossil','jewel'].map(id=>contentProgression.purchase(id,game));
        updateStaticUI();return results.map(result=>result.ok);
    });
    expect(unlocks).toEqual([true,true]);
    await expect(frame.locator('.journey-reward')).toContainText('공허의 끌');
    await frame.locator('[data-journey-node="worldtree_guardian"]').click();
    await expect(route).toContainText('공허의 끌');
    await frame.locator('[data-journey-travel]').click();
    await expect.poll(()=>child.evaluate(()=>game.runProgress)).toBeGreaterThan(0);
    expect(errors).toEqual([]);
});

test('world tree travel opens paths, pauses at discoveries and retains progress after defeat',async({page},info)=>{
    const failures=[];
    page.on('pageerror',error=>failures.push(error.message));
    await page.goto('/tests/fixtures/world-tree-journey/index.html');
    await expect(page.locator('#status')).toContainText('실제 전투');
    const frame=page.frameLocator('#game');
    const panel=frame.locator('#ui-world-tree-journey');
    await expect(panel).toContainText('혼돈 수호자를 찾아서');
    await page.locator('#atlas').click();
    const atlas=frame.locator('#ui-exploration-atlas');
    await expect(atlas).toBeVisible();
    await expect(atlas.locator('[data-atlas-route="map-tab-cosmos"]')).toHaveCount(0);
    const atlasOverflow=await atlas.evaluate(root=>root.scrollWidth>root.clientWidth+1);
    expect(atlasOverflow).toBe(false);
    await atlas.screenshot({path:info.outputPath('exploration-overview.png')});
    await atlas.getByRole('button',{name:'혼돈의 뿌리',exact:true}).click();
    await atlas.locator('[data-atlas-route="map-explore-worldtree"]').click();
    await expect(panel).toBeVisible();
    const terrain=panel.locator('img.journey-terrain');
    await expect(terrain).toBeVisible();
    const child=page.frames().find(entry=>entry.parentFrame());
    expect(await child.evaluate(()=>game.beehive.unlockedPermanent)).toBe(false);
    await child.evaluate(()=>updateStaticUI());
    await expect(terrain).toBeVisible();
    expect(await terrain.evaluate(image=>image.complete&&image.naturalWidth>0)).toBe(true);
    await expect(panel.locator('[data-journey-node] svg, [data-journey-node] img')).toHaveCount(0);
    await panel.getByRole('button',{name:'사냥터 목록',exact:true}).click();
    await expect(frame.locator('#map-explore-hunting')).toHaveClass(/active/);
    await frame.locator('#mobile-map-destination').selectOption('btn-map-explore-worldtree');
    await page.waitForTimeout(1200);
    expect(await child.evaluate(()=>game.currentZoneId)).toBe(0);
    const layout=await panel.locator('.journey-map').evaluate(map=>{
        const rect=map.getBoundingClientRect();
        return [...map.querySelectorAll('[data-journey-node]')].map(node=>{
            const box=node.getBoundingClientRect();
            return {name:node.textContent,inside:box.left>=rect.left-1&&box.right<=rect.right+1&&box.top>=rect.top&&box.bottom<=rect.bottom};
        });
    });
    expect(layout.filter(node=>!node.inside)).toEqual([]);
    const forestPath=await panel.locator('.journey-links .is-route').evaluateAll(edges=>edges.map(edge=>edge.getAttribute('d')));
    await panel.getByRole('button',{name:'균열 경유',exact:true}).click();
    await expect(panel.getByRole('button',{name:'균열 경유',exact:true})).toBeFocused();
    const breachPath=await panel.locator('.journey-links .is-route').evaluateAll(edges=>edges.map(edge=>edge.getAttribute('d')));
    expect(breachPath).not.toEqual(forestPath);
    await panel.getByRole('button',{name:'숲길 경유',exact:true}).click();
    await panel.screenshot({path:info.outputPath('world-tree-start.png')});
    await page.screenshot({path:info.outputPath('world-tree-viewport.png')});
    await panel.locator('[data-journey-travel]').click();
    await child.evaluate(()=>{
        // Accelerate actual combat time; attacks, movement, drops and clears use production code.
        for(let i=0;i<4500 && game.worldTreeJourney.active;i++)coreLoop(getCombatTime()+100);
        updateStaticUI();
    });
    await expect(panel).toContainText('벌집 거점을 발견했습니다.');
    await expect(panel.locator('.journey-hive')).toBeVisible();
    await page.locator('#view').click();
    const hud=frame.locator('#ui-world-tree-combat');
    await expect(hud).toBeVisible();
    await expect(hud).toContainText('벌집을 발견했습니다');
    await expect(frame.locator('#ui-progress-label')).toHaveText('탐험 완료');
    const unobscured=await hud.evaluate(element=>{
        const rect=element.getBoundingClientRect();
        const copy=element.querySelector('strong').getBoundingClientRect();
        const top=element.ownerDocument.elementFromPoint(copy.left+2,copy.top+2);
        return rect.height>0&&element.contains(top);
    });
    expect(unobscured).toBe(true);
    await page.screenshot({path:info.outputPath('journey-discovery-battle.png')});
    await page.locator('#view').click();
    expect(await child.evaluate(()=>game.worldTreeJourney.cleared)).toContain('1:worldtree_grove');
    await expect(panel.locator('[data-journey-travel]')).toHaveCount(0);
    await panel.locator('[data-journey-resume]').click();
    await page.locator('#defeat').click();
    await expect(panel).toContainText('도전에 실패했습니다.');
    expect(await child.evaluate(()=>game.worldTreeJourney.cleared)).toContain('1:worldtree_grove');
    await panel.getByRole('button',{name:'사망 기록',exact:true}).click();
    const deathLog=frame.locator('#death-overlay');
    await expect(deathLog).toBeVisible();
    await expect(deathLog.locator('#deathlog-title')).toHaveText('전투에서 쓰러졌습니다.');
    await deathLog.getByRole('button',{name:'확인',exact:true}).click();
    await expect(deathLog).toBeHidden();
    expect(await child.evaluate(()=>game.worldTreeJourney.active)).toBeNull();
    await panel.locator('[data-journey-resume]').click();
    await expect(panel.getByRole('button',{name:'사망 기록',exact:true})).toHaveCount(0);
    await child.evaluate(()=>{
        for(let i=0;i<4500 && game.worldTreeJourney.active;i++)coreLoop(getCombatTime()+100);
        updateStaticUI();
    });
    await expect(panel).toContainText('수호자 처치 · 심도 완료');
    await expect(panel.getByRole('button',{name:'심도 2',exact:true})).toBeEnabled();
    await page.locator('#view').click();
    await hud.getByRole('button',{name:'다음 심도 열기',exact:true}).click();
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('button',{name:'심도 2',exact:true})).toHaveAttribute('aria-pressed','true');
    await panel.getByRole('button',{name:'균열 경유',exact:true}).click();
    await panel.locator('[data-journey-travel]').click();
    const result=await child.evaluate(()=>{
        const before=game.voidRift.breachClears;
        for(let i=0;i<7000 && game.worldTreeJourney.active;i++)coreLoop(getCombatTime()+100);
        updateStaticUI();
        return {before,after:game.voidRift.breachClears,completed:worldTreeJourney.cleared(game,'worldtree_guardian')};
    });
    expect(result.after).toBeGreaterThan(result.before);
    expect(result.completed).toBe(true);
    await panel.screenshot({path:info.outputPath('world-tree-cleared.png')});
    await panel.locator('.journey-hive').click();
    await expect(frame.locator('#map-explore-beehive')).toHaveClass(/active/);
    expect(await child.evaluate(()=>game.beehive.unlockedPermanent)).toBe(false);
    await child.evaluate(()=>{game.currencies.hiveKey=0;updateStaticUI();});
    const hiveEntry=frame.getByRole('button',{name:'벌집 입장',exact:true});
    await expect(hiveEntry).toBeDisabled();
    await child.evaluate(()=>{game.currencies.hiveKey=1;updateStaticUI();});
    await hiveEntry.click();
    expect(await child.evaluate(()=>({active:game.beehive.inRun,keys:game.currencies.hiveKey,cleared:game.beehive.unlockedPermanent})))
        .toEqual({active:true,keys:0,cleared:false});
    await frame.locator('#map-explore-beehive').getByRole('button',{name:'전투 보기',exact:true}).click();
    await expect(hud.getByRole('button',{name:'획득 보기',exact:true})).toHaveCount(0);
    await expect(hud.getByRole('button',{name:'탐험 지도',exact:true})).toBeVisible();
    if(info.project.name==='desktop-chromium') {
        await page.setViewportSize({width:900,height:740});
        await page.reload();
        await expect(panel).toContainText('혼돈 수호자를 찾아서');
        const overflow=await panel.evaluate(root=>root.scrollWidth>root.clientWidth+1);
        expect(overflow).toBe(false);
        await panel.screenshot({path:info.outputPath('world-tree-compact.png')});
    }
    expect(failures).toEqual([]);
});
