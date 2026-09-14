// Opt-in host for real combat tests. Never include these scripts in production index.html.
const newSkillLab = (() => {
    const native = newSkillLabNative;
    const items = native.WT_CATALOG.filter(s => s.id >= 44);
    // First balance pass: per-contact coefficients; native controllers still own hit counts.
    const balance = [
        {baseDmg:.7, dmgScale:.038, baseSpd:.5, spdScale:.008, spellFlatBase:20, spellFlatScale:4.4, crit:6},
        {baseDmg:2.65, dmgScale:.15, baseSpd:.68, spdScale:.01, crit:6},
        {baseDmg:.7, dmgScale:.038, baseSpd:1, spdScale:0, spellFlatBase:24, spellFlatScale:5, crit:0},
        {baseDmg:2.5, dmgScale:.15, baseSpd:.78, spdScale:.014, crit:6},
        {baseDmg:2.65, dmgScale:.14, baseSpd:.76, spdScale:.012, crit:6},
        {baseDmg:.48, dmgScale:.032, baseSpd:.78, spdScale:.012, crit:6},
        {baseDmg:1.4, dmgScale:.072, baseSpd:.9, spdScale:.016, spellFlatBase:22, spellFlatScale:4.8, crit:6},
        {baseDmg:2.5, dmgScale:.14, baseSpd:.78, spdScale:.014, crit:8},
        {baseDmg:2.85, dmgScale:.16, baseSpd:.74, spdScale:.012, crit:10},
        {baseDmg:12, dmgScale:.7, baseSpd:1, spdScale:0, crit:0}
    ];
    const intervals = [0,0,5000,0,0,0,0,0,0,0];
    const descriptions = ['최대 4번 튕기는 카오스 플라스크', '주변 3칸의 적 위치에 광창 낙하',
        '5초간 자신을 따라오는 카오스 지속 피해', '투척 지점 3×3 화염 폭발',
        '적에게 직접 투척 · 착지 타격과 바깥으로 퍼지는 냉기 고리', '빈 병 적중 후 유리 파편 1~4개 발사',
        '인접 8칸 화염 주문 · 받는 화염 피해 +20%, 4초', '전방 2칸 지점의 십자형 번개 타격',
        '적 뒤로 순간이동 후 찌르기 · 중독 또는 출혈 30%', '집중 유지 중 유효한 피격 5회마다 물리 폭발 · 집중 중단 시 누적 초기화'];
    for (const item of items) {
        const i = item.id - 44;
        SKILL_DB[item.name] = {...item.skill, isGem:true, ...balance[i], leech:0, targets:99,
            desc:descriptions[i] + ' (체험용 수치)'};
        SKILL_GRID_DB[item.name] = {...item.grid};
    }
    Object.assign(SKILL_DB['인과'], {category:'attack', tags:['attack','physical','area','channeling'],
        targetMode:'area', combatPattern:{kind:'channel'}});
    const originalArt = getSkillGemArtPath;
    getSkillGemArtPath = name => {
        const item = items.find(s => s.name === name);
        return item ? 'assets/gems/world-tree/' + item.slug + '.png' : originalArt(name);
    };
    const originalRange = describeSkillGridProfile;
    const ranges = ['최대 4회 연쇄', '주변 3칸 · 적이 있는 칸에 낙하', '원형 반경 3칸 · 1초마다 5회',
        '사거리 4칸 · 착지 지점 3×3', '사거리 4칸 · 반경 1→2→3 고리', '사거리 4칸 · 파편 사거리 3칸',
        '주변 1칸 · 인접 8칸', '전방 2칸 · 십자 5칸', '사거리 4칸 · 후방 칸이 비어 있어야 함', '원형 반경 4칸 · 5회 피격'];
    describeSkillGridProfile = (name, skill) => {
        const item = items.find(s => s.name === name);
        return item ? ranges[item.id-44] : originalRange(name,skill);
    };
    const renderer = new native.PixelLabFX({maxSprites:48, maxEffects:128});
    const lab = {native, items, intervals, renderer, casts:[], nextCast:0, ready:false, bossMode:false,
        sequence:0, history:[], reaction:null, lastSkill:'', mist:native.WT_HOLY_MIST.createDebuffStore()};
    lab.report = extra => parent.postMessage({type:'new-skill-lab-state', ...extra}, new URL(document.baseURI).origin);
    lab.fail = error => {console.error('신규 젬 체험 오류', error); game.combatHalted = true; lab.report({error:error.message});};
    lab.cancel = () => {
        for(const row of lab.casts) row.cast.cancel(getCombatTime());
        lab.casts.length = 0; renderer.clear(); lab.nextCast = 0;
        cancelCombatChannel();
        lab.reaction?.setEquipped(false);
    };
    const originalChange = changeSkill;
    changeSkill = name => {
        lab.cancel(); originalChange(name); lab.lastSkill = name;
        lab.report({active:name, hint:SKILL_DB[name].desc});
    };
    lab.reset = () => {
        lab.cancel(); lab.mist.clear(); lab.history.length = 0; lab.reaction.reset();
        game.currentZoneId = 1; game.maxZoneId = 1; game.enemies = []; game.encounterPlan = [];
        resetCombatTacticsRuntime(); resetCombatChannelRuntime();
        game.playerCastDelayUntil = 0; pendingSkillStageHits = []; battleFx = []; pTimer = 0;
        startEncounterRun(); game.moveTimer = 0;
        game.gridPlayer = {gx:3, gy:4, gridMoveTimer:0};
        const cells = lab.bossMode ? [[5,3]] : [[4,4], [5,3], [5,5], [6,4], [2,3], [2,5]];
        game.enemies = cells.map(([gx,gy], i) => Object.assign(createEnemy(getZone(1), {boss:lab.bossMode, at:0}, i),
            {id:998500+i, gx, gy, hp:25000, maxHp:25000, regenRate:0, facingDirection:4}));
        game.playerHp = getPlayerHpCap(getPlayerStats()); game.combatHalted = false;
        closeAllWindows(); if(isMobilePrimaryNavigationEnabled()) switchTab('tab-battle');
        updateStaticUI(); lab.report(lab.reaction.snapshot());
    };
    return lab;
})();

(() => {
    const lab = newSkillLab;
    async function wait(check) {
        const end = Date.now() + 60000;
        while(!check()) {if(Date.now() > end) throw Error('게임 준비 시간 초과'); await new Promise(r => setTimeout(r,50));}
    }
    function quiet() {
        tutorialQueue.length = 0;
        if(activeTutorial) dismissTutorial(false);
    }
    async function boot() {
        await wait(() => window.__startupFirstPaintDone && document.getElementById('btn-startup-guest'));
        document.getElementById('btn-startup-guest').click();
        await wait(() => document.querySelector('#loop-hero-select-overlay [data-class-id="warrior"]'));
        document.querySelector('#loop-hero-select-overlay [data-class-id="warrior"]').click();
        await wait(() => battleAssets.ready && !isStartupOverlayOpen() && !isLoadingOverlayOpen() && !uiRefreshRunning && !uiRefreshQueued);
        clearInterval(gameTickHandle); gameTickHandle = null; quiet();
        game.season = 2; game.level = 30;
        game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(s => s.id); contentProgression.sync();
        game.seenTutorials.push(...STORY_JOURNAL_SCENES.map(s => 'story_' + s.id), 'story_illustrations_v1', 'tutorial_starter_gem_equip');
        game.skills = lab.items.map(s => s.name);
        for(const name of game.skills) game.gemData[name] = {level:1, exp:0, quality:0};
        game.equipment['갑옷'] = {id:998201, name:'체험용 생명력 장비', slot:'갑옷', rarity:'rare', baseStats:[{id:'flatHp',val:100000}], stats:[]};
        game.activeSkill = '탄성 플라스크'; lab.lastSkill = game.activeSkill;
        lab.ready = true; lab.reset();
        lab.report({skills:lab.items, active:game.activeSkill, hint:SKILL_DB[game.activeSkill].desc});
        setInterval(() => {
            if(document.hidden || !lab.ready) return;
            if(game.combatHalted && combatChannelRuntime.skillName === '인과') lab.cancel();
            try {if(!game.combatHalted) coreLoop(getCombatTime() + 100); refreshCombatTickUi(); quiet();}
            catch(error) {lab.fail(error);}
        }, 100);
    }
    window.addEventListener('message', event => {
        if(event.source !== parent || event.origin !== new URL(document.baseURI).origin || event.data?.type !== 'new-skill-lab' || !lab.ready) return;
        try {
            const {action, skill} = event.data;
            if(action === 'equip' && lab.items.some(s => s.name === skill)) {changeSkill(skill); lab.reset();}
            if(action === 'reset') lab.reset();
            if(action === 'encounter') {lab.bossMode = skill === 'boss'; lab.reset();}
            if(action === 'gems') switchTab('tab-skills');
        } catch(error) {lab.fail(error);}
    });
    document.addEventListener('DOMContentLoaded', () => boot().catch(lab.fail), {once:true});
})();
