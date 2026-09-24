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

test('double click equips gems and highlights the equip action',async({page},info)=>{
    await openGems(page);
    const card=page.getByRole('group',{name:'연속 베기',exact:true});
    await card.click();
    await expect(page.locator('#gem-selection .gem-equip-primary')).toHaveCSS('background-color','rgb(215, 179, 107)');
    await page.screenshot({path:info.outputPath('equip-button.png')});
    await page.getByRole('button',{name:'젬 상세 닫기',exact:true}).click();
    if(info.project.use.isMobile){await card.click();await page.locator('#gem-selection [data-gem-action="equip"]').click();}
    else await card.dblclick();
    await expect.poll(()=>page.evaluate(()=>game.activeSkill)).toBe('연속 베기');
    if(info.project.use.isMobile)await page.locator('[data-mobile-gem-library="support"]').click();
    const support=page.locator('.support-gem.gem-library-card').first();
    if(info.project.use.isMobile){await support.click();await page.locator('#gem-selection [data-gem-action="equip"]').click();}
    else await support.dblclick();
    await expect.poll(()=>page.evaluate(()=>game.equippedSupports.length)).toBe(1);
    if(!info.project.use.isMobile)await support.dblclick();
    expect(await page.evaluate(()=>game.equippedSupports.length)).toBe(1);
    await page.evaluate(()=>{
        const base=BASE_ITEM_DB.filter(row=>row.slot==='무기').sort((a,b)=>b.reqTier-a.reqTier)[0];
        const item=createItemFromBase(base,'rare',1);
        game.inventory=[item];game.level=1;
        equipItemById(item.id);
    });
    await expect(page.locator('.game-toast').last()).toContainText('장착 실패');
});

test('gem detail translates ailments and lists only applied level sources including awakening',async({page})=>{
    await openGems(page);
    await page.evaluate(()=>{
        game.skills.push('서리 폭발');game.gemData['서리 폭발']=normalizeGemRecord({level:1});updateStaticUI();
    });
    const card=page.getByRole('group',{name:'서리 폭발',exact:true});await card.click();
    const panel=page.locator('#gem-selection');
    await expect(panel).toContainText('동결 상태인 적에게');
    await expect(panel).not.toContainText('freeze');
    await expect(panel).not.toContainText('군주의 핵');
    await expect(panel).not.toContainText('창공');
    await expect(panel).not.toContainText('패시브 0');
    await panel.getByRole('button',{name:'젬 상세 닫기',exact:true}).click();
    await page.evaluate(()=>{
        Object.assign(game.gemData['서리 폭발'],{level:5,bossCoreLevel:3,skyCoreLevel:2,awakened:true});updateStaticUI();
    });
    await card.click();
    await expect(panel).toContainText('총 레벨 7');
    await expect(panel).toContainText('군주의 핵 피해 12% 증폭');
    await expect(panel).toContainText('창공의 힘 공격·시전 속도 4% 증폭');
    await expect(panel).toContainText('각성 +2');
});

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

test('gem growth shows a target prompt and reflects affordable upgrades immediately', async ({ page }) => {
    await openGems(page);
    await page.locator('#btn-skill-tab-enhance').click();
    const actions = page.locator('#ui-gem-upgrade-actions');
    await expect(actions).not.toContainText('적용 후 최종');
    await actions.getByRole('button', { name: '공격 젬 장착하기', exact: true }).click();
    await expect(page.locator('#skill-tab-equip')).toBeVisible();
    await page.evaluate(() => { changeSkill('연속 베기'); switchSkillSubtab('skill-tab-enhance'); updateStaticUI(); });
    const core = page.locator('[data-forge-material="bossCore"]');
    const sky = page.locator('[data-forge-material="skyEssence"]');
    const permanent = actions.getByRole('button', { name: /^응축 창공 영구 강화/ });
    await expect(permanent).toBeDisabled();
    await core.click();
    const dialog = page.locator('#gem-core-forge-overlay');
    await expect(dialog.locator('[data-forge-attempt]')).toBeDisabled();
    await expect(dialog).toContainText('재료 부족');
    await dialog.getByRole('button', { name: '젬 강화 닫기' }).click();
    await page.evaluate(() => { game.currencies.bossCore = 1; game.currencies.skyEssence = 1; updateStaticUI(); });
    await core.click(); await dialog.locator('[data-forge-attempt]').click();
    await expect.poll(() => page.evaluate(() => game.gemData['연속 베기'].bossCoreLevel)).toBe(1);
    expect(await page.evaluate(() => game.currencies.bossCore)).toBe(0);
    expect(await page.evaluate(() => game.gemData['연속 베기'].level)).toBe(5);
    await expect(dialog).toContainText('강화 성공');
    await dialog.getByRole('button', { name: '젬 강화 닫기' }).click();
    await sky.click(); await dialog.locator('[data-forge-attempt]').click();
    await expect.poll(() => page.evaluate(() => game.gemData['연속 베기'].skyCoreLevel)).toBe(1);
    expect(await page.evaluate(() => game.currencies.skyEssence)).toBe(0);
    await expect(dialog).toContainText('강화 성공');
    await dialog.getByRole('button', { name: '젬 강화 닫기' }).click();
    await page.evaluate(() => { game.gemData['연속 베기'].bossCoreLevel = 5; game.currencies.bossCore = 100; updateStaticUI(); });
    await expect(core).toContainText('강화 완료');
    await core.click(); await expect(dialog.locator('[data-forge-attempt]')).toBeDisabled();
    await expect(dialog).toContainText('적용 중');
});

test('core forge has persistent pity, bounded feedback and usable mobile controls', async ({page}, info) => {
    const errors=[];page.on('pageerror', error=>errors.push(error.message));
    await openGems(page);
    await page.evaluate(()=>{
        changeSkill('연속 베기');game.gemData['연속 베기'].bossCoreLevel=4;
        game.currencies.bossCore=100;game.currencies.skyEssence=100;
        Math.random=()=>0.999999;switchSkillSubtab('skill-tab-enhance');updateStaticUI();
    });
    await page.locator('[data-forge-material="bossCore"]').click();
    const dialog=page.locator('#gem-core-forge-overlay');
    await expect(dialog.locator('.gem-forge-chance > strong')).toHaveText('10%');
    await page.screenshot({path:info.outputPath('forge-ready.png')});
    const attempt=dialog.locator('[data-forge-attempt]');
    const pendingFailure=await attempt.evaluate(button=>{
        button.click();
        const overlay=document.getElementById('gem-core-forge-overlay');
        overlay.querySelector('[data-forge-attempt]').click();
        return {text:overlay.innerText,disabled:overlay.querySelector('[data-forge-attempt]').disabled,
            chance:overlay.querySelector('.gem-forge-chance > strong').textContent,
            owned:game.currencies.bossCore,failures:game.gemData['연속 베기'].bossCoreFailures};
    });
    expect(pendingFailure.disabled).toBe(true);
    expect(pendingFailure.chance).toBe('10%');
    expect(pendingFailure.text).toContain('보유 100개');
    expect(pendingFailure.text).not.toContain('강화 실패');
    expect(pendingFailure.owned).toBe(95);expect(pendingFailure.failures).toBe(1);
    await expect(dialog).toContainText('강화 실패');
    expect(await page.evaluate(()=>game.currencies.bossCore)).toBe(95);
    await expect(dialog.locator('.gem-forge-chance > strong')).toHaveText('20%');
    await page.screenshot({path:info.outputPath('forge-pity.png')});
    await dialog.getByRole('button',{name:'젬 강화 닫기'}).click();
    await page.locator('[data-forge-material="skyEssence"]').click();
    await expect(dialog.locator('.gem-forge-chance > strong')).toHaveText('100%');
    await dialog.locator('[data-forge-track="bossCore"]').click();
    await expect(dialog.locator('.gem-forge-chance > strong')).toHaveText('20%');
    await expect(dialog).toContainText('실패 시 성공률 +9.6%p');
    for (const next of ['29.6%','38.6%','46.8%','54%','60%','65%','70%','75%','80%','85%','90%','95%','100%']) {
        await attempt.click();await expect(dialog).toContainText('강화 실패');
        await expect(dialog.locator('.gem-forge-chance > strong')).toHaveText(next);
    }
    const pendingSuccess=await attempt.evaluate(button=>{
        button.click();
        const overlay=document.getElementById('gem-core-forge-overlay');
        return {text:overlay.innerText,level:overlay.querySelector('.gem-forge-level').textContent,
            actualLevel:game.gemData['연속 베기'].bossCoreLevel};
    });
    expect(pendingSuccess.level).toBe('+4');expect(pendingSuccess.actualLevel).toBe(5);
    expect(pendingSuccess.text).toContain('강화 중');
    expect(pendingSuccess.text).not.toContain('최대 강화 달성');
    expect(pendingSuccess.text).not.toContain('적용 중');
    await expect(dialog).toContainText('최대 강화 달성');
    await expect(dialog.locator('.gem-forge-level')).toHaveText('+5');
    await expect(dialog.locator('.gem-forge-level-bonus')).toBeVisible();
    await expect(dialog).toContainText('젬 레벨 +1 획득');
    await expect(attempt).toBeDisabled();
    expect(await page.evaluate(()=>game.currencies.bossCore)).toBe(25);
    await page.screenshot({path:info.outputPath('forge-max.png')});
    const buttonBox=await attempt.boundingBox();const viewport=page.viewportSize();
    expect(buttonBox.x).toBeGreaterThanOrEqual(0);expect(buttonBox.y).toBeGreaterThanOrEqual(0);
    expect(buttonBox.x+buttonBox.width).toBeLessThanOrEqual(viewport.width);
    expect(buttonBox.y+buttonBox.height).toBeLessThanOrEqual(viewport.height);
    await dialog.getByRole('button',{name:'젬 강화 닫기'}).click();
    await page.locator('[data-forge-material="bossCore"]').click();
    await expect(dialog).toContainText('젬 레벨 +1 적용 중');
    await expect(dialog).not.toContainText('성공 확정');
    await dialog.getByRole('button',{name:'젬 강화 닫기'}).click();
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
    await page.getByRole('group', { name: '연속 베기', exact: true }).click();
    await expect(page.locator('#gem-selection')).toBeVisible();
    await page.screenshot({ path: info.outputPath('gem-selection.png') });
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
