(() => {
    const query = new URLSearchParams(location.search);
    const previews = {
        baptism: { name:'불의 세례', base:'tin_censer' },
        viper: { name:'독사의 춤', base:'rusted_blade' },
        descent: { name:'강림', base:'dull_greatsword' }
    };
    const presets = { area:'대지의 함성', aim:'과냉각 혼합물', link:'암흑 파열', runes:'대지의 함성', balance:'화염 참격', slots:'대지의 함성',
        ...Object.fromEntries(Object.entries(previews).map(([key, rune]) => [key, rune.name])) };
    const mode = Object.hasOwn(presets,query.get('try')) ? query.get('try') : 'area';
    const name = presets[mode];
    const testLimits = mode === 'slots' && query.get('limits') === '1';
    const guides = ['opening_done','tutorial_battle_basics','unlock_content_tactics','tutorial_support_equip','unlock_skills',
        'action_tutorial_support_equip','action_tutorial_rune_engrave','tutorial_first_passive'];
    const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
    const panel = document.createElement('details');
    panel.id = 'rune-test-panel';
    panel.open = !['runes','slots'].includes(mode) || !matchMedia('(max-width: 600px)').matches;
    panel.innerHTML = '<summary>룬 체험 도구</summary><nav><a href="/?try=slots">보조룬 옮기기</a><a href="/?try=runes">룬 장착</a><a href="/?try=balance">원소 천칭</a><a href="/?try=area">범위</a><a href="/?try=aim">조준</a><a href="/?try=link">연쇄</a><button type="button" data-test-helm>천리안 장착</button><button type="button" data-test-tree>트리 열기</button><button type="button" data-test-battle>전투에서 사용</button></nav><output aria-live="polite">체험 캐릭터를 준비하고 있습니다.</output>';
    const style = document.createElement('style');
    style.textContent = '#rune-test-panel{margin:4px 0 7px;padding:6px 10px;background:#211e22;color:#f1e7d1;border:1px solid #806744;border-radius:4px;font:inherit}#rune-test-panel summary{cursor:pointer;font-weight:bold}#rune-test-panel nav{display:flex;flex-wrap:wrap;gap:4px;padding-top:5px}#rune-test-panel :is(a,button){padding:6px 9px;color:#fff0cb;background:#38302c;border:1px solid #776244;font:inherit;cursor:pointer;text-decoration:none}#rune-test-panel output{display:block;margin:5px 0 0;color:#e7cf9a}';
    document.head.append(style);
    document.querySelector('#tab-skills').prepend(panel);
    const output = panel.querySelector('output');
    if (previews[mode]) {
        const nav = panel.querySelector('nav');
        for (const item of [...nav.children]) if (!item.hasAttribute('data-test-battle')) item.hidden = true;
        for (const [key, rune] of Object.entries(previews)) {
            const link = document.createElement('a');
            link.href = '/?try=' + key;
            link.textContent = rune.name;
            nav.insertBefore(link, nav.querySelector('[data-test-battle]'));
        }
    }
    const nodes = {n_range_area_expansion:'넓게 퍼지는 힘', n_range_additional_targets:'다음 표적',
        n_range_far_horizon:'끝없는 지평', n_range_close_calamity:'발밑의 재앙'};
    if (mode === 'area') {
        const picker = panel.appendChild(document.createElement('select'));
        picker.setAttribute('aria-label','체험할 노드');
        for (const [id,title] of Object.entries(nodes)) picker.add(new Option(title,id));
        const apply = panel.appendChild(document.createElement('button'));
        apply.textContent = '연결 경로 할당';
        apply.onclick = () => {
            const result = activatePassivePath(picker.value,{attributeStat:'strength'});
            playerStatCache.invalidate(); updateStaticUI(); refresh();
            if (!result.activated) output.textContent += ' / ' + (result.message || '이미 할당했거나 연결할 수 없습니다.');
        };
    }
    function seed() {
        const support = ['가속','정밀 하한','넓은 판정','사거리 증가','추가 표적','연쇄 타격','분산','집속'];
        const equippedSupports = mode === 'slots' ? ['가속'] : [];
        if (mode === 'slots' && !testLimits) equippedSupports.push('추가 표적');
        if (mode === 'slots') support.push('날카로움','범위 피해','무자비','생명력 흡수','연속타격','갑주 파쇄','저항 침식','재생 억제','과충전 상한','밀어내기','휩쓸기','처형','터지는 시체');
        const skills = [...new Set([...Object.values(presets),'강타','돌진','강림','서리베기','번개 타격','화염 위습 소환','냉기 위습 소환','수액 골렘 소환','장군의 가호'])];
        const owner = mergeDefaults({heroSelectionInitialized:true,selectedClassId:'warrior',selectedHeroId:'hero1',
            seenTutorials:guides, season:6, level:101, talentSelectionInitialized:true, passivePoints:200, resonancePower:testLimits ? 8 : 100, skills, supports:support,
            equippedSupports, supportSlotByName:Object.fromEntries(equippedSupports.map((rune,index)=>[rune,index])),
            summonLoadoutInitialized:true, equippedSummonSkills:[], activeSkill:mode === 'descent' ? '강타' : name,
            mobilitySkill:mode === 'descent' ? name : '',
            settings:{autoMove:false,pauseGameOnOverlay:false,mapCompleteAction:'stop'}});
        owner.contentProgression.inherited = ['support','passiveTree'];
        owner.actRewardBonuses = ['strength','dexterity','intelligence','suppCap'].map(stat=>({actId:1,stat,value:stat==='suppCap'?3:100}));
        if (mode === 'balance') {
            for (const [stat,value] of Object.entries({firePctDmg:70,coldPctDmg:-10,lightPctDmg:5,igniteChance:50,chillChance:50,shockChance:50,freezeChance:50})) {
                owner.actRewardBonuses.push({actId:1,stat,value});
            }
        }
        for (const rune of support) owner.supportGemData[rune] = {level:1,exp:0,unlockedTier:SUPPORT_GEM_DB[rune].noTiers?1:3,activeTier:1};
        const baseId = previews[mode]?.base || (mode === 'aim' ? 'cracked_flask' : 'dull_greatsword');
        const base = BASE_ITEM_DB.find(row => row.id === baseId);
        owner.equipment['무기']=createItemFromBase(base,'normal',1);
        return owner;
    }
    function showBoard() {
        openTabPane('tab-skills');
        switchSkillSubtab('skill-tab-equip','library');
        updateStaticUI();
        skillGemBoardUi.pick(mode === 'descent' ? 'mobility' : previews[mode] || ['runes','balance'].includes(mode) ? 'active' : 'support');
    }
    function showScales() {
        openTabPane('tab-char');
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const scene = GameModules.passiveScene;
            scene.fitPassiveCameraToBounds(false);
            scene.resizePassiveTreeCanvas(true);
            const node = PASSIVE_TREE.nodes.pt_notable_elemental_balance;
            scene.state.camZoom = 1.35;
            scene.state.camX = -node.x * scene.state.camZoom;
            scene.state.camY = -node.y * scene.state.camZoom;
            drawPassiveTree();
        }));
    }
    function refresh() {
        if (previews[mode]) {
            output.textContent = name + ' / ' + game.equipment['무기'].name + ' 장착. ' +
                (mode === 'descent' ? '전투에서 이동 룬을 누르면 적 곁으로 도약합니다.' : '전투에서 사용을 누르면 이 룬으로 공격합니다.');
            return;
        }
        panel.querySelector('[data-test-helm]').textContent = game.equipment['투구']?.uniqueEffectKey === 'rangeFirstAim'?'천리안 해제':'천리안 장착';
        if (mode === 'slots') {
            if (testLimits) {
                output.textContent = '공명력 8. 정밀 하한을 빈 칸과 가속이 꽂힌 칸에 차례로 가져가 보세요.';
                return;
            }
            output.textContent = '장착 중인 보조룬 ' + game.equippedSupports.length + '개. 룬을 빈 칸이나 다른 룬 위에 끌어 놓으세요.';
            return;
        }
        if (mode === 'runes') {
            const worn = game.equippedSummonSkills.join(', ') || '비어 있음';
            output.textContent = ['주 공격 ' + game.activeSkill, '이동 ' + (game.mobilitySkill || '비어 있음'), '소환 ' + worn].join(' / ');
            return;
        }
        const s = getPlayerStats().sSkill, grid = getSkillGridProfile(game.activeSkill,s);
        const reach = mode === 'area' ? '반경 ' + grid.radius : '첫 조준 ' + grid.range;
        const target = s.areaHitsAll?'범위 안 전체':s.areaKind==='variable'?'최대 '+s.targets+'기':
            mode==='link' && s.supportEffects.linkedStrike?'인접한 적 1기에 '+s.supportEffects.linkedStrike+'%':'';
        output.textContent = [game.activeSkill, reach+'칸', target, mode==='aim'?'고리 반경 1 → 2 → 3칸':''].filter(Boolean).join(' / ');
    }
    async function boot() {
        for (let i=0; !window.GameModules?.application?.startup?.ready && i<300; i++) await sleep(100);
        if (!window.GameModules?.application?.startup?.ready) throw Error('게임을 불러오지 못했습니다.');
        localStorage.setItem(LOCAL_SAVE_KEY,serializeSaveState(seed()));
        await startGuestMode();
        GameModules.application.timers.stopCombat();
        const fixture = seed();
        game = fixture; window.game = game;
        resetHeroSelectionForSave();
        storyJournalUi.setAutoShow(false);
        document.querySelector('.background-result-continue')?.click();
        // The test character skips several loops. Acknowledge their historical notices in this guest only.
        const skipBacklog = () => { if (activeTutorial) dismissTutorial(false); };
        new MutationObserver(skipBacklog).observe(document.getElementById('tutorial-overlay'), {attributes:true,attributeFilter:['class']});
        skipBacklog();
        const helm = generateUniqueItem(12,'투구','천리안');
        game.inventory.push(helm);
        playerStatCache.invalidate();
        game.playerHp = getPlayerStats().maxHp;
        panel.querySelector('[data-test-helm]').onclick = () => {
            if (game.equipment['투구']?.id === helm.id) unequipItem('투구');
            else equipItem(game.inventory.findIndex(item=>item.id===helm.id),'투구');
            showBoard(); refresh();
        };
        panel.querySelector('[data-test-tree]').onclick = mode === 'balance' ? showScales : () => openTabPane('tab-char');
        const back = document.createElement('button');
        back.textContent = '룬판으로'; back.type = 'button'; back.hidden = true;
        back.style.cssText = 'position:fixed;top:8px;right:8px;z-index:9999;padding:8px 12px';
        document.body.append(back);
        back.onclick = () => { GameModules.application.timers.stopCombat(); back.hidden = true; showBoard(); refresh(); };
        panel.querySelector('[data-test-battle]').onclick = () => {
            game.settings.autoMove = true;
            ensureEncounterRun(); closeAllWindows(); switchTab('tab-battle');
            const run = actExplorationState.current(game), here = game.gridPlayer;
            if (run && here) {
                const offsets = [[2,0],[-2,0],[0,2],[0,-2]];
                offsets.some(([dx,dy]) => actExplorationState.selectDestination(run,{gx:here.gx+dx,gy:here.gy+dy}));
            }
            GameModules.application.syncGameplayTimers(); back.hidden = false;
        };
        showBoard(); refresh();
        const observer = new MutationObserver(refresh);
        const board = document.querySelector(mode === 'runes' ? '#ui-skill-board' : '#ui-support-slots');
        observer.observe(board,{childList:true,subtree:true});
        if (mode === 'balance') showScales();
        panel.dataset.ready = 'true';
    }
    boot().catch(error=>{ panel.dataset.error=error.message; output.textContent=error.message; console.error(error); });
})();
