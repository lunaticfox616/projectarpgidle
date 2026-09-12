// Test host only. All definitions, acquisition, combat and rendering come from /index.html.
const newSkillLab = (() => {
    const items=Object.entries(SKILL_DB).filter(([,s])=>s.nativeCastId).map(([name,s])=>({name,id:s.nativeCastId}));
    const lab={items,ready:false,bossMode:false};
    lab.report=extra=>parent.postMessage({type:'new-skill-lab-state',...extra},new URL(document.baseURI).origin);
    lab.reset=()=>{
        game.currentZoneId=1;game.maxZoneId=1;game.enemies=[];game.encounterPlan=[];
        resetCombatTacticsRuntime();resetCombatChannelRuntime();
        game.playerCastDelayUntil=0;pendingSkillStageHits=[];battleFx=[];pTimer=0;
        startEncounterRun();game.moveTimer=0;game.gridPlayer={gx:3,gy:4,gridMoveTimer:0};
        const cells=lab.bossMode?[[5,3]]:[[4,4],[5,3],[5,5],[6,4],[2,3],[2,5]];
        game.enemies=cells.map(([gx,gy],i)=>Object.assign(createEnemy(getZone(1),{boss:lab.bossMode,at:0},i),
            {id:998500+i,gx,gy,hp:25000,maxHp:25000,regenRate:0,facingDirection:4}));
        game.playerHp=getPlayerHpCap(getPlayerStats());game.combatHalted=false;
        closeAllWindows();if(isMobilePrimaryNavigationEnabled())switchTab('tab-battle');
        updateStaticUI();
    };
    async function wait(check) {
        const end=Date.now()+60000;
        while(!check()){if(Date.now()>end)throw Error('게임 준비 시간 초과');await new Promise(r=>setTimeout(r,50));}
    }
    function quiet() {tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);}
    async function boot() {
        await wait(()=>window.__startupFirstPaintDone && document.getElementById('btn-startup-guest'));
        document.getElementById('btn-startup-guest').click();
        await wait(()=>document.querySelector('#loop-hero-select-overlay [data-class-id="warrior"]'));
        document.querySelector('#loop-hero-select-overlay [data-class-id="warrior"]').click();
        await wait(()=>battleAssets.ready && !isStartupOverlayOpen() && !isLoadingOverlayOpen() && !uiRefreshRunning && !uiRefreshQueued);
        clearInterval(gameTickHandle);gameTickHandle=null;quiet();
        game.season=2;game.level=30;
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(s=>s.id);contentProgression.sync();
        game.seenTutorials.push(...STORY_JOURNAL_SCENES.map(s=>'story_'+s.id),'story_illustrations_v1','tutorial_starter_gem_equip');
        game.skills=items.map(s=>s.name);
        for(const name of game.skills)game.gemData[name]={level:1,exp:0,quality:0};
        game.equipment['갑옷']={id:998201,name:'체험용 생명력 장비',slot:'갑옷',rarity:'rare',baseStats:[{id:'flatHp',val:100000}],stats:[]};
        game.activeSkill=items[0].name;lab.ready=true;lab.reset();
        lab.report({skills:items,active:game.activeSkill,hint:SKILL_DB[game.activeSkill].desc});
        lab.timer=setInterval(()=>{
            if(document.hidden || !lab.ready)return;
            try {
                if(!game.combatHalted)coreLoop(getCombatTime()+100);
                refreshCombatTickUi();quiet();
                lab.report({count:skillGemCombatRuntime?.channel?.count||0,equipped:!!skillGemCombatRuntime?.channel});
            }catch(error){fail(error);}
        },100);
    }
    function fail(error){console.error(error);game.combatHalted=true;lab.report({error:error.message});}
    window.addEventListener('message',event=>{
        if(event.source!==parent || event.origin!==new URL(document.baseURI).origin || event.data?.type!=='new-skill-lab' || !lab.ready)return;
        const {action,skill}=event.data;
        if(action==='equip' && items.some(s=>s.name===skill)) {
            changeSkill(skill);lab.reset();lab.report({active:skill,hint:SKILL_DB[skill].desc});
        }
        if(action==='reset')lab.reset();
        if(action==='encounter'){lab.bossMode=skill==='boss';lab.reset();}
        if(action==='gems')switchTab('tab-skills');
    });
    document.addEventListener('DOMContentLoaded',()=>boot().catch(fail),{once:true});
    return lab;
})();
