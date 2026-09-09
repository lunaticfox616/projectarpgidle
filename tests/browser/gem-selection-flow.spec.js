const { test, expect } = require('@playwright/test');

async function openGems(page) {
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        game.season = 10; contentProgression.sync();
        game.contentProgression.inherited = ['craft', 'support', 'condition', 'gemForge']; contentProgression.sync();
        game.skills = ['기본 공격', '연속 베기', '용암 강타', '서리늑대 소환', '방패 돌진'];
        game.skills.forEach(name => game.gemData[name] = normalizeGemRecord({ level: 5 }));
        game.supports = Object.keys(SUPPORT_GEM_DB).slice(0, 12); game.equippedSupports = [];
        game.conditionGemPool = ['긴급 회피', '철의 맹세']; game.skillAutoRules = [];
        switchTab('tab-skills'); updateStaticUI();
    });
    await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => { tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); });
}

test('gem inspection preserves loadout until explicit equip and keeps actions inside the viewport', async ({ page }, info) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await openGems(page);
    const card = page.getByRole('group', { name: '연속 베기', exact: true });
    if (info.project.use.isMobile) await card.tap(); else await card.click();
    const panel = page.locator('#gem-selection');
    await expect(panel).toBeVisible();
    expect(await page.evaluate(() => game.activeSkill)).toBe('기본 공격');
    await expect(panel).toContainText('후속 타격');
    const box = await panel.boundingBox(), view = page.viewportSize();
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(view.width);
    expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(view.height);
    const equip = panel.getByRole('button', { name: '장착', exact: true });
    const before = await equip.boundingBox();
    await panel.locator('.gem-selection-content').evaluate(el => { el.scrollTop = el.scrollHeight; });
    expect((await equip.boundingBox()).y).toBeCloseTo(before.y, 0);
    await page.screenshot({ path: info.outputPath('gem-inspection.png') });
    await equip.click(); await expect(panel).toBeHidden();
    await expect(page.getByRole('group', { name: '연속 베기, 장착 중', exact: true })).toBeVisible();
    await page.getByRole('group', { name: '연속 베기, 장착 중', exact: true }).click();
    await expect(page.locator('#skill-tab-equip')).toBeVisible();
    await panel.getByRole('button', { name: '강화 · 각인', exact: true }).click();
    await expect(page.locator('#skill-tab-enhance')).toBeVisible();
    expect(await page.evaluate(() => game.gemEnhanceTargetSkill)).toBe('연속 베기');
    expect(errors).toEqual([]);
});

test('support shows actual tag targets, inspection does not spend resonance, and locked equipment stays blocked', async ({ page }, info) => {
    await openGems(page);
    await page.evaluate(() => { changeSkill('연속 베기'); updateStaticUI(); });
    if (info.project.use.isMobile) await page.locator('[data-mobile-gem-library="support"]').click();
    const projectile = page.getByRole('group', { name: '투사체 강화', exact: true });
    await expect(projectile).toContainText('현재 주 공격·소환 젬에 적용되지 않음');
    await expect(page.getByRole('group', { name: '근접 물리 피해', exact: true })).toContainText('적용: 주 공격');
    await projectile.click();
    expect(await page.evaluate(() => game.equippedSupports)).toEqual([]);
    const panel = page.locator('#gem-selection');
    await panel.getByRole('button', { name: '장착', exact: true }).click();
    expect(await page.evaluate(() => game.equippedSupports)).toEqual(['투사체 강화']);
    await page.getByRole('group', { name: '투사체 강화, 장착 중', exact: true }).click();
    await panel.getByRole('button', { name: '장착 해제', exact: true }).click();
    expect(await page.evaluate(() => game.equippedSupports)).toEqual([]);
    if (info.project.use.isMobile) await page.locator('[data-mobile-gem-library="skill"]').click();
    await page.getByRole('group', { name: '방패 돌진, 방패 필요', exact: true }).click();
    await expect(panel.getByRole('button', { name: '장착', exact: true })).toBeDisabled();
    await panel.getByRole('button', { name: '젬 상세 닫기' }).click();
    expect(await page.evaluate(() => game.activeSkill)).toBe('연속 베기');
});

test('condition rules start from an owned gem and missing-gem warning updates immediately', async ({ page }, info) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await openGems(page);
    await page.getByRole('button', { name: '자동 사용 컨디션 젬 규칙', exact: true }).click();
    const gem = page.getByRole('button', { name: '긴급 회피 규칙 만들기', exact: true });
    await expect(gem).toHaveClass(/condition-gem-card/);
    await expect(gem).not.toContainText('규칙 만들기');
    if (info.project.use.isMobile) await gem.tap();
    else { await gem.focus(); await page.keyboard.press('Enter'); }
    const rule = page.locator('.condition-pattern-rule').first();
    await expect(rule.getByRole('combobox', { name: '발동 조건', exact: true })).toHaveValue('boss_warning');
    await expect(rule.getByRole('combobox', { name: '사용할 컨디션 젬', exact: true })).toHaveValue('긴급 회피');
    await expect(rule.getByRole('checkbox', { name: '사용', exact: true })).not.toBeChecked();
    await rule.getByRole('checkbox', { name: '사용', exact: true }).check();
    await expect(rule.locator('.condition-rule-draft')).toHaveCount(0);
    await rule.getByRole('combobox', { name: '사용할 컨디션 젬', exact: true }).selectOption('');
    await expect(rule.locator('.condition-rule-warning')).toBeVisible();
    await rule.getByRole('combobox', { name: '사용할 컨디션 젬', exact: true }).selectOption('긴급 회피');
    await expect(rule.locator('.condition-rule-warning')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('condition-rule.png') });
    const saved = await page.evaluate(() => structuredClone(game.skillAutoRules[0]));
    expect(saved.enabled).toBe(true); expect(saved.skillName).toBe('긴급 회피'); expect(saved.triggerType).toBe('boss_warning');
    await page.getByRole('button', { name: '철의 맹세 규칙 만들기', exact: true }).click();
    await page.locator('.condition-pattern-rule').nth(1).getByRole('button', { name: '규칙 위로 이동' }).click();
    expect(await page.evaluate(() => game.skillAutoRules.map(rule => rule.skillName))).toEqual(['철의 맹세', '긴급 회피']);
    expect(await page.evaluate(() => game.skillAutoRules[1].enabled)).toBe(true);
    expect(errors).toEqual([]);
});

test('loadout summary stays visible while browsing and all gem sections fit on phones', async ({ page }, info) => {
    await openGems(page);
    if (info.project.use.isMobile) {
        const menu = await page.locator('.skill-subtab-row').boundingBox();
        for (const id of ['equip', 'enhance', 'condition']) {
            const tab = await page.locator('#btn-skill-tab-' + id).boundingBox();
            expect(tab.y + tab.height).toBeLessThanOrEqual(menu.y + menu.height);
        }
    }
    const library = info.project.use.isMobile ? '.attack-library' : '.support-library';
    await page.locator(library + ' .gem-library-card').last().scrollIntoViewIfNeeded();
    const summary = await page.locator('#ui-skill-loadout-summary').boundingBox();
    expect(summary.y).toBeGreaterThanOrEqual(0);
    expect(summary.y + summary.height).toBeLessThan(page.viewportSize().height);
    const foreground = await page.locator('#ui-skill-loadout-summary').evaluate(el => {
        const rect = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    });
    expect(foreground).toBe(true);
    await page.screenshot({ path: info.outputPath('gem-summary-scroll.png') });
    await page.evaluate(() => document.body.classList.add('light-mode'));
    await page.getByRole('group', { name: '연속 베기', exact: true }).click();
    await expect(page.locator('#gem-selection')).toBeVisible();
    await page.screenshot({ path: info.outputPath('gem-selection-light.png') });
});

test('condition feedback reports real failures and casts without rebuilding rules or changing combat', async ({ page }, info) => {
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await openGems(page);
    await page.getByRole('button',{name:'자동 사용 컨디션 젬 규칙',exact:true}).click();
    await page.getByRole('button',{name:'긴급 회피 규칙 만들기',exact:true}).click();
    const rule=page.locator('.condition-pattern-rule').first();
    await rule.getByRole('checkbox',{name:'사용',exact:true}).check();
    await page.evaluate(()=>{
        conditionFeedbackUi.refresh();
        game.combatTimeMs=getCombatTime();game.playerCastDelayUntil=0;
        runConditionGemAutoRules(getPlayerStats());
    });
    const live=rule.locator('.condition-rule-live');
    const refresh=async()=>page.evaluate(()=>conditionFeedbackUi.refresh());
    await expect.poll(async()=>{await refresh();return live.getAttribute('data-state');}).toBe('unmatched');
    await live.locator('summary').click();
    await expect(live).toContainText('조건을 충족하지');
    const reasonFits = await live.locator('.condition-live-reason').evaluate(el => {
        const box = el.getBoundingClientRect();
        return box.left >= 0 && box.right <= innerWidth;
    });
    expect(reasonFits).toBe(true);
    await page.evaluate(()=>{
        game.currentZoneId=1;game.moveTimer=0;game.gridPlayer={gx:3,gy:4,gridMoveTimer:0};
        const boss=createEnemy(getZone(1),{boss:true,at:100},0);
        Object.assign(boss,{id:100,gx:7,gy:4,hp:100000,maxHp:100000,regenRate:0,patternMode:'slam',patternAttackCount:2,attackTimer:0.5});
        game.enemies=[boss];performMonsterAttacks(getPlayerStats());
        game.playerAilments=[{type:'freeze',time:2}];
        runConditionGemAutoRules(getPlayerStats());
    });
    await expect.poll(async()=>{await refresh();return live.getAttribute('data-state');}).toBe('immobilized');
    await expect(live).toHaveAttribute('open','');
    await expect(live).toContainText('동결');
    await page.evaluate(()=>{game.playerAilments=[];runConditionGemAutoRules(getPlayerStats());});
    await expect.poll(async()=>{await refresh();return rule.getAttribute('class');}).toContain('condition-just-cast');
    await expect(page.locator('[data-condition-gem="긴급 회피"] .condition-gem-cooldown')).toBeVisible();
    await page.screenshot({path:info.outputPath('condition-live-cast.png')});
    const measurement=await page.evaluate(async()=>{
        const before=JSON.stringify([game.playerHp,game.gridPlayer,game.conditionGemCooldowns,game.skillAutoRules]);
        const samples=[];let mutations=0;
        const observer=new MutationObserver(rows=>{mutations+=rows.length;});
        observer.observe(document.getElementById('ui-skill-rules-panel'),{subtree:true,attributes:true,childList:true,characterData:true});
        for(let i=0;i<20;i++){
            await new Promise(resolve=>setTimeout(resolve,260));
            const start=performance.now();conditionFeedbackUi.refresh();samples.push(performance.now()-start);
        }
        observer.disconnect();samples.sort((a,b)=>a-b);
        return {medianMs:samples[10],p95Ms:samples[18],mutations,unchanged:before===JSON.stringify([game.playerHp,game.gridPlayer,game.conditionGemCooldowns,game.skillAutoRules])};
    });
    expect(measurement.unchanged).toBe(true);expect(measurement.mutations).toBe(0);
    console.log('condition feedback UI',info.project.name,JSON.stringify(measurement));
    await info.attach('condition-feedback-performance',{body:JSON.stringify(measurement),contentType:'application/json'});
    expect(errors).toEqual([]);
});
