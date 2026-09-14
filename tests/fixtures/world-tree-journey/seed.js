// Isolated review fixture. The existing platform bridge supplies in-memory storage before boot.
(() => {
    let timer = null, speed = 1, battle = false;
    const origin = new URL(document.baseURI).origin;
    function seed(mode, snapshot) {
        if (timer) clearInterval(timer);
        clearInterval(gameTickHandle); gameTickHandle = null;
        game=mergeDefaults({});window.game=game;
        game.season=10;game.level=100;game.maxZoneId=29;game.combatHalted=true;
        game.pendingLoopHeroSelection=false;game.pendingLoopDecision=false;game.pendingLoopReady=false;
        game.selectedClassId='warrior';game.chaosRealm.unlocked=true;game.loopProgressCurrent.chaos20Cleared=true;
        game.loopProgressCurrent.bestAbyssDepth=21;game.abyssEndlessDepth=21;
        game.beehive.unlockedPermanent=mode!=='start';game.currencies.hiveKey=3;
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
        game.settings.mapCompleteAction='nextZone';game.settings.showDeathNotice=false;game.settings.autoEquipEmptySlots=false;
        game.settings.autoEnterGrandBreach=false;game.settings.autoEnterMeteor=false;
        game.seenTutorials=['tutorial_battle_basics','tutorial_starter_gem_equip','unlock_growth_board'];
        game.equipment['무기']={id:99101,name:'탐험 흐름 확인용 무기',slot:'무기',rarity:'rare',baseStats:[{id:'flatDmg',val:1000000000}],stats:[]};
        // Synthetic recovery covers the underworld's percentage drain during navigation checks.
        // This is not a legal-build or difficulty fixture.
        game.equipment['갑옷']={id:99102,name:'탐험 흐름 확인용 갑옷',slot:'갑옷',rarity:'rare',baseStats:[{id:'flatHp',val:100000000}],stats:[{id:'regen',val:20}]};
        game.playerHp=getPlayerHpCap(getPlayerStats());
        if(mode==='complete') {
            game.worldTreeJourney.cleared=WORLD_TREE_JOURNEY.nodes.map(node=>'1:'+node.id);
            game.worldTreeJourney.hiveDiscovered=true;
        }
        if(mode==='realms') {
            game.season=50;game.abyssEndlessDepth=30;game.labyrinthUnlockedMaxFloor=100;
            game.abyssUnlockedDepths=Array.from({length:11},(_,index)=>20+index);
            game.loopProgressCurrent.bestAbyssDepth=29;
            game.clearedRootBosses.push('s6_beast_cerberus');game.journalEntries.push('woodsman');
            game.underworldProgress.highestFloor=30;game.skyTower.unlocked=true;game.ocean.unlocked=true;
            game.seenTutorials.push(...MAP_PRIMARY_CONTENTS.map(row=>row.noticeKey).filter(Boolean));
        }
        if(mode==='legal'||mode==='crafted') {
            game=mergeDefaults(snapshot);window.game=game;game.combatHalted=true;
            game.currencies.hiveKey=3; // Entry tickets only; the saved combat build is unchanged.
        }
        if(mode==='first') {
            game=mergeDefaults({});window.game=game;
            game.pendingLoopHeroSelection=false;game.selectedClassId='warrior';
            game.settings.showDeathNotice=false;
        }
        finishSeed(mode);
    }
    function finishSeed(mode) {
        battle=mode==='first';closeAllWindows();reconcileMapPrimaryContentUnlocks(game);updateStaticUI();
        parent.postMessage({type:'worldtree-view-status',battle},origin);
        if(mode==='first') switchTab('tab-battle');
        else {
            switchTab('tab-map');switchMapSubtab('map-tab-zones');switchMapExploreSubtab('map-explore-worldtree');
        }
        if(mode==='realms')explorationAtlasUi.open();
        timer=setInterval(()=>{
            if(document.hidden)return;
            try {
                for(let i=0;i<speed;i++)coreLoop(getCombatTime()+100);
                refreshCombatTickUi();
                if(pendingHeavyUiRefresh){pendingHeavyUiRefresh=false;updateStaticUI();}
            } catch(error) {clearInterval(timer);console.error('World tree review failed',error);}
        },100);
        const message=mode==='first'?'루프 1 · 첫 액트 · 저장 분리':mode==='crafted'?'실제 전투 · T15 상위 제작 · 벌집 열쇠 3개 · 저장 분리'
            :mode==='legal'?'실제 전투 · T14 선별 장비 · 벌집 열쇠 3개 · 저장 분리':'실제 전투 · 진행 확인용 강화 장비 · 저장 분리';
        parent.postMessage({type:'worldtree-lab-status',message},origin);
    }
    function reviewChase() {
        seed('realms');game.currencies.colonyTrace=1;startColonyRun();
        const cells=[[6,1],[5,1],[5,6],[1,6],[1,3],[4,1],[2,5],[6,6],[7,2],[4,6],[6,2],[3,6],[6,3]];
        game.enemies=cells.map(([gx,gy],index)=>Object.assign(createEnemy(getZone('colony_run'),{},index),{
            gx,gy,hp:1000,maxHp:1000,isBoss:false,ailments:[{type:'freeze',time:30}]
        }));
        game.gridPlayer={gx:4,gy:3,gridMoveTimer:0};game.combatTacticsUnlocked=false;
        resetCombatTacticsRuntime();game.colony.requiredKills=13;game.colony.wave=8;
        closeAllWindows();switchTab('tab-battle');battle=true;
        parent.postMessage({type:'worldtree-view-status',battle},origin);
        parent.postMessage({type:'worldtree-lab-status',message:'멈춤 좌표 재현 · 적 13마리 30초 동결 · 실제 접근/공격 · 밸런스 검증 아님'},origin);
    }
    window.addEventListener('message',event=>{
        if(event.source!==parent||event.origin!==origin)return;
        if(event.data.type==='worldtree-lab')seed(event.data.mode,event.data.snapshot);
        if(event.data.type==='worldtree-speed')speed=event.data.speed===4?4:1;
        if(event.data.type==='worldtree-atlas')explorationAtlasUi.open();
        if(event.data.type==='worldtree-chase-review')reviewChase();
        if(event.data.type==='worldtree-rune-review') {
            Object.entries({runeShard:500,underCopper:1000,underSilver:750,underGold:300}).forEach(([key,value])=>{game.currencies[key]+=value;});
            if(!document.getElementById('tab-map').classList.contains('active'))switchTab('tab-map');
            switchMapSubtab('map-tab-underworld');updateStaticUI();
            parent.postMessage({type:'worldtree-lab-status',message:'룬 제작 재료만 지급 · 룬/슬롯은 실제 층 격파로 해금 · 저장 분리'},origin);
        }
        if(event.data.type==='worldtree-colony-review') {
            game.currencies.colonyTrace++;
            if(!document.getElementById('tab-map').classList.contains('active'))switchTab('tab-map');
            switchMapExploreSubtab('map-explore-colony');updateStaticUI();
            parent.postMessage({type:'worldtree-lab-status',message:'군락지 입장권 1개만 지급 · 전투와 보상은 실제 처리 · 저장 분리'},origin);
        }
        if(event.data.type==='worldtree-altar-review') {
            const unique=generateUniqueItem(10,null,'첫 계약');
            const rare=createItemFromBase(BASE_ITEM_DB.find(base=>base.id===unique.baseId),'rare',10);
            addItemToInventory(unique,{guaranteedKeep:true});addItemToInventory(rare,{guaranteedKeep:true});
            if(!document.getElementById('tab-map').classList.contains('active'))switchTab('tab-map');
            switchMapExploreSubtab('map-explore-timerift');updateStaticUI();
            parent.postMessage({type:'worldtree-lab-status',message:'융합 재료 고유·희귀 각 1개 지급 · 제단은 실제 과거 클리어 필요 · 저장 분리'},origin);
        }
        if(event.data.type==='worldtree-grand-review') {
            game.voidRift.grandBreachUnlock=true;
            if(!document.getElementById('tab-map').classList.contains('active'))switchTab('tab-map');
            switchMapSubtab('map-tab-zones');switchMapExploreSubtab('map-explore-voidrift');
            updateStaticUI();
            parent.postMessage({type:'worldtree-lab-status',message:'대균열 입장 기회만 지급 · 장비와 전투 수치 유지 · 저장 분리'},origin);
        }
        if(event.data.type==='worldtree-defeat'&&game.worldTreeJourney.active)handlePlayerDefeat(getZone(game.currentZoneId),getPlayerStats(),'체험용 실패',{noToast:true});
        if(event.data.type==='worldtree-view') {
            battle=!battle;
            parent.postMessage({type:'worldtree-view-status',battle},origin);
            if(battle){closeAllWindows();switchTab('tab-battle');}
            else{switchTab('tab-map');switchMapSubtab('map-tab-zones');switchMapExploreSubtab('map-explore-worldtree');}
        }
    });
})();
