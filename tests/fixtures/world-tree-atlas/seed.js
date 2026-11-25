// Isolated review fixture. The existing platform bridge supplies in-memory storage before boot.
(() => {
    let timer = null, speed = 1, battle = false, measurement = null;
    const origin = new URL(document.baseURI).origin;
    function measurePerformance() {
        if (measurement) return;
        const sample = { start:performance.now(), previousFrame:0, frames:[], ticks:[] };
        measurement = sample;
        function frame(now) {
            if (document.hidden) { finishPerformance(sample, true); return; }
            if (sample.previousFrame) sample.frames.push(now - sample.previousFrame);
            sample.previousFrame = now;
            if (now - sample.start >= 10000) { finishPerformance(sample, false); return; }
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }
    function finishPerformance(sample, interrupted) {
        measurement = null;
        const quantile = (values, fraction) => {
            const ordered = values.slice().sort((a,b)=>a-b);
            return ordered.length ? +ordered[Math.min(ordered.length-1,Math.floor(ordered.length*fraction))].toFixed(2) : null;
        };
        parent.postMessage({type:'worldtree-performance-result', interrupted,
            frames:sample.frames.length, ticks:sample.ticks.length, speed,
            frameMedian:quantile(sample.frames,.5), frameP95:quantile(sample.frames,.95),
            tickMedian:quantile(sample.ticks,.5), tickP95:quantile(sample.ticks,.95)},origin);
    }
    function seed(mode, snapshot) {
        if (timer) clearInterval(timer);
        window.GameModules.application.timers.stopCombat();
        game=mergeDefaults({});window.game=game;
        if(mode==='loop'){
            game.selectedClassId='warrior';game.heroSelectionInitialized=true;game.pendingLoopHeroSelection=false;
            game.settings.autoLoop=false;storyJournalUi.setAutoShow(false);game.level=45;
            tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
            closeAllWindows();switchTab('tab-battle');updateStaticUI();
            handleSeasonLoopConditionMet();
            parent.postMessage({type:'worldtree-lab-status',message:'루프 1 정산 · 실제 저장과 분리'},origin);
            return;
        }
        game.season=10;game.level=100;game.maxZoneId=29;game.combatHalted=true;
        game.pendingLoopHeroSelection=false;game.pendingLoopDecision=false;game.pendingLoopReady=false;
        game.selectedClassId='warrior';game.chaosRealm.unlocked=true;game.loopProgressCurrent.chaos20Cleared=true;
        game.loopProgressCurrent.bestAbyssDepth=21;game.abyssEndlessDepth=21;
        game.beehive.unlockedPermanent=mode!=='start';game.currencies.hiveKey=3;
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
        game.settings.mapCompleteAction='nextZone';game.settings.showDeathNotice=false;game.settings.autoEquipEmptySlots=false;
        game.settings.autoEnterGrandBreach=false;game.settings.autoEnterMeteor=false;
        game.seenTutorials=['tutorial_battle_basics','tutorial_starter_gem_equip'];
        game.equipment['무기']={id:99101,name:'탐험 흐름 확인용 무기',slot:'무기',rarity:'rare',baseStats:[{id:'flatDmg',val:1000000000}],stats:[]};
        // Synthetic recovery covers the underworld's percentage drain during navigation checks.
        // This is not a legal-build or difficulty fixture.
        game.equipment['갑옷']={id:99102,name:'탐험 흐름 확인용 갑옷',slot:'갑옷',rarity:'rare',baseStats:[{id:'flatHp',val:100000000}],stats:[{id:'regen',val:20}]};
        game.playerHp=getPlayerHpCap(getPlayerStats());
        if(mode==='challenge'){
            game.season=55;game.currentZoneId=29;game.settings.autoMove=false;game.settings.actExplorationMode='direct';
            const selected=new URL(parent.location.href).searchParams.get('region');
            const fragment=ATLAS.fragments.find(row=>row.encounter===selected && row.id!=='treasure')?.id || 'hive';
            atlas.sync(game);game.atlas.sextant=true;game.atlas.fragments[fragment]=1;atlas.setLoadout(game,[fragment]);
            const reason=atlasRun.open(game.atlas.stash[0].uid);
            if(reason)throw new Error(reason);
        }
        if(mode==='complete') {
            // Atlas progress: 시작 육분의 lit, every chart tier 1-3 map complete (their children open) and this loop's starter maps in the stash.
            game.atlas.unlocked=true;game.atlas.sextant=true;game.atlas.completed=atlas.nodes.filter(node=>node.kind==='map'&&node.tier<=3).map(node=>node.id);atlas.sync(game);
        }
        if(mode==='realms') {
            game.season=50;game.abyssEndlessDepth=30;game.labyrinthUnlockedMaxFloor=100;
            game.abyssUnlockedDepths=Array.from({length:11},(_,index)=>20+index);
            game.loopProgressCurrent.bestAbyssDepth=29;
            game.clearedRootBosses.push('s6_beast_cerberus');game.journalEntries.push('woodsman');
            game.underworldProgress.highestFloor=30;game.skyTower.unlocked=true;game.ocean.unlocked=true;
            game.seenTutorials.push(...MAP_PRIMARY_CONTENTS.map(row=>row.noticeKey).filter(Boolean));
        }
        if(mode==='wheel'){
            game.season=50;game.currentZoneId=29;atlas.sync(game);
            // The rest screen after a finished map (the old pinnacle is closed until the chart's bosses are wired).
            game.atlas.sextant=true;
            game.atlas.stash=['sun1','inner1','moon1'].map(id=>({...atlasMaps.create(id,1),uid:game.atlas.nextUid++}));
            const reason=atlasRun.open(game.atlas.stash[0].uid);
            if(reason)throw new Error(reason);
            atlasRun.finish(getZone(game.currentZoneId));
        }
        if(mode==='finishes'){
            const weapon=createItemFromBase(BASE_ITEM_DB.find(row=>row.id==='warden_greatsword'),'rare',12);
            const tiers=[9,2,4,6,5];
            weapon.stats=['weaponPhysFlatDmg','meleePctDmg','accuracy','aspd','crit'].map((id,i)=>rollAffixValueInTierRange(MOD_DB.find(mod=>mod.id===id),tiers[i],tiers[i]));
            const ring=createItemFromBase(BASE_ITEM_DB.find(row=>row.slot==='반지'),'rare',8);
            ring.stats=[rollAffixValueInTierRange(MOD_DB.find(mod=>mod.id==='resAll'),5,5)];
            game.inventory=[weapon,ring];
            Object.assign(game.currencies,{fossil:40,sealShard:4,underSilver:12,bossCore:4,catalystLight:4,pruningShears:30,sapBud:20,
                transferStone:4,artManual_doubleCut:2,artManual_slam:2,balanceWeight_physical:3,balanceWeight_speed:1,wardCord_light:2,wardCord_fire:2});
            game.runeSpares={'이중 베기':2,'강타':2};
            game.season=50;
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
        game.heroSelectionInitialized=true;
        battle=mode==='first'||mode==='wheel'||mode==='challenge';closeAllWindows();reconcileMapPrimaryContentUnlocks(game);updateStaticUI();
        parent.postMessage({type:'worldtree-view-status',battle},origin);
        if(mode==='finishes'){
            openTabPane('tab-items');switchItemSubtab('item-tab-craft');selectForCrafting(game.inventory[0].id,false);
            requestAnimationFrame(()=>{document.getElementById('cl-stash-tab-special')?.click(); document.getElementById('cl-stash-transferStone')?.click();});
        }else if(battle) switchTab('tab-battle');
        else {
            switchTab('tab-map');switchMapSubtab('map-tab-zones');switchMapExploreSubtab('map-explore-worldtree');
        }
        if(mode==='realms')explorationAtlasUi.open();
        let placeAtDoor=mode==='challenge';
        timer=setInterval(()=>{
            if(document.hidden)return;
            try {
                const tickStarted = measurement ? performance.now() : 0;
                // This fixture replaces runGameTick; retain its wall-clock commerce settlement.
                // Test speed affects combat only, as it does in the real game.
                settlePlayerStall();
                for(let i=0;i<speed;i++) {
                    if(isForegroundGameplayPausedForBackground())break;
                    coreLoop(getCombatTime()+100);
                    const run=game.actExploration;
                    if(placeAtDoor && run?.zoneId==='atlas_map' && !run.arrival){
                        const map=actExplorationMap.forRun(run),host=atlasEncounters.hostRooms(map)[0];
                        Object.assign(game.gridPlayer,{gx:host.gx,gy:host.gy});
                        run.visitedRooms=[...new Set([...run.visitedRooms,host.id])];placeAtDoor=false;
                    }
                }
                refreshCombatTickUi();
                if(pendingHeavyUiRefresh){pendingHeavyUiRefresh=false;updateStaticUI();}
                if(measurement) measurement.ticks.push(performance.now()-tickStarted);
            } catch(error) {clearInterval(timer);console.error('World tree review failed',error);}
        },100);
        const message=mode==='finishes'?'희귀 대검·반지 · 세공 재료 네 종류':mode==='first'?'루프 1 · 첫 액트 · 저장 분리':mode==='crafted'?'실제 전투 · T15 상위 제작 · 벌집 열쇠 3개 · 저장 분리'
            :mode==='legal'?'실제 전투 · T14 선별 장비 · 벌집 열쇠 3개 · 저장 분리':'실제 전투 · 진행 확인용 강화 장비 · 저장 분리';
        parent.postMessage({type:'worldtree-lab-status',message},origin);
        if(mode==='challenge')parent.postMessage({type:'worldtree-lab-status',message:'각인 지도 · 적을 눌러 처치한 뒤 열린 바닥 틈을 누르세요. 전체 탐색은 자동으로 입장합니다.'},origin);
    }
    function reviewChase() {
        // 예전에는 9×8 판의 칸 자리로 짠 재현이었다. 그 판은 없어졌고(2026-11-10) 군락지는 제 지도를 걷는다: 군락지가 내놓은 무리를
        // 그 자리에 30초 얼려 두고, 근접 주인공이 다가가 잡는지 본다.
        seed('realms');game.currencies.colonyTrace=1;startColonyRun();
        game.enemies.forEach(enemy=>Object.assign(enemy,{hp:1000,maxHp:1000,isBoss:false,ailments:[{type:'freeze',time:30}]}));
        game.combatTacticsUnlocked=false;resetCombatTacticsRuntime();
        closeAllWindows();switchTab('tab-battle');battle=true;
        parent.postMessage({type:'worldtree-view-status',battle},origin);
        parent.postMessage({type:'worldtree-lab-status',message:`멈춤 좌표 재현 · 적 ${game.enemies.length}마리 30초 동결 · 실제 접근/공격 · 밸런스 검증 아님`},origin);
    }
    function reviewTrade() {
        seed('realms');
        const start = Date.now() - 4 * 3600000;
        playerStall.advance(game, start);
        const item = createItemFromBase(BASE_ITEM_DB.find(base => base.id === 'apocalypse_greatblade'), 'rare', 20, {affixTierCap:20});
        item.stats = ['flatDmg','weaponFlatDmgPct','attackPctDmg','aspd','crit','critDmg'].map(id => {
            const stat = rollAffixValueInTierRange(MOD_DB.find(mod => mod.id === id),20,20);
            stat.val = stat.valMax; return stat;
        });
        item.baseStats.forEach(stat => { stat.val = stat.valMax; });
        game.inventory = [normalizeItem(item)];
        game.playerStall.rng = 1;
        const listed = playerStall.list(game,item.id,1000000,start,{currency:'goldenRule',negotiate:true});
        if (!listed.ok) throw new Error('Negotiation fixture could not list its item');
        playerStall.advance(game,Date.now());
        closeAllWindows();marketUi.open('stall');
        updateStaticUI();
        parent.postMessage({type:'worldtree-lab-status',message:'거래 UI 표본 · T20 최상급 장비 · 실제 거래 규칙으로 4시간 처리 · 검토 저장 초기화됨'},origin);
    }
    window.addEventListener('message',event=>{
        if(event.source!==parent||event.origin!==origin)return;
        if(event.data.type==='worldtree-performance-start')measurePerformance();
        if(event.data.type==='worldtree-lab')seed(event.data.mode,event.data.snapshot);
        if(event.data.type==='worldtree-loop-ready' && !game.pendingLoopReady && !game.pendingLoopDecision &&
            !game.pendingLoopHeroSelection && !window.GameModules.loopCinematic.onScreen())handleSeasonLoopConditionMet();
        if(event.data.type==='worldtree-speed')speed=event.data.speed===4?4:1;
        if(event.data.type==='worldtree-atlas')explorationAtlasUi.open();
        if(event.data.type==='worldtree-chase-review')reviewChase();
        if(event.data.type==='worldtree-trade-review')reviewTrade();
        if(event.data.type==='worldtree-skill-review') {
            ['그림자 점멸','화염 위습 소환'].forEach(name => {
                if (!game.skills.includes(name)) game.skills.push(name);
                game.gemData[name] ||= {level:5,quality:0,exp:0,skyEnhanceCap:0};
            });
            closeAllWindows();switchTab('tab-skills');updateStaticUI();
            parent.postMessage({type:'worldtree-lab-status',message:'이동·소환 룬만 지급 · 장착과 전투는 실제 UI에서 · 장비/능력치 유지'},origin);
        }
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
        if(event.data.type==='worldtree-defeat'&&atlas.inMap(game))handlePlayerDefeat(getZone(game.currentZoneId),getPlayerStats(),'체험용 실패',{noToast:true});
        if(event.data.type==='worldtree-view') {
            battle=!battle;
            parent.postMessage({type:'worldtree-view-status',battle},origin);
            if(battle){closeAllWindows();switchTab('tab-battle');}
            else{switchTab('tab-map');switchMapSubtab('map-tab-zones');switchMapExploreSubtab('map-explore-worldtree');}
        }
    });
})();
