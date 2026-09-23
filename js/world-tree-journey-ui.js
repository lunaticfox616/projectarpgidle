const worldTreeJourneyUi = (() => {
    let signature='',hudSignature='';
    const ledger = () => game.worldTreeJourney;
    const zoneFor = id => createWorldTreeJourneyZone(id,game);
    const eventName = zone => WORLD_TREE_JOURNEY.events.find(row=>row.id===zone.worldTreeKind)?.name || '권역 수호자';
    function select(id) {
        if (!worldTreeJourney.definition(id)) return;
        ledger().selected=id;
        worldTreeJourney.chooseBranch(game,id);
        render();
    }
    function route(value) { select(value==='breach'?'worldtree_breach':'worldtree_grove'); }
    function configure(key,value) {
        if (worldTreeJourney.configure(game,key,value)) { queueImportantSave(200); render(); }
    }
    function stage(value) {
        if (isBeehiveRunLockedForMapTravel()) return;
        if (worldTreeJourney.newChart(game,value)) { queueImportantSave(200); render(); }
    }
    function nextStage() { stage(Math.min(8,ledger().stage+1)); }
    function depart(path,plan,fresh) {
        if (!path.length || ledger().active) return;
        const reason=getZoneTravelBlockReason(path[0]);
        if (reason) return addLog(reason,'attack-monster');
        const previousLoot=game.explorationLoot;
        changeZone(path[0]);
        if (game.currentZoneId!==path[0] || !ledger().active) return;
        if (!fresh && previousLoot) game.explorationLoot=previousLoot;
        ledger().plan=plan;
        ledger().queue=path.slice(1);
        queueImportantSave(200);
        render();
    }
    function travel() {
        const path=worldTreeJourney.pathTo(game,'worldtree_guardian');
        depart(path,{nodes:path,stage:ledger().stage,index:0},true);
    }
    function resume() {
        const plan=ledger().plan;
        if (plan) depart(plan.nodes.slice(plan.index),plan,false);
    }
    function pause() {
        if (!ledger().active) return;
        ledger().queue=[];
        queueImportantSave(200);
        render();
    }
    function openMap() {
        if (!document.getElementById('tab-map').classList.contains('active')) switchTab('tab-map');
        switchMapSubtab('map-tab-zones');
        switchMapExploreSubtab('map-explore-worldtree');
    }
    function hive() {
        if (ledger().active || !contentProgression.canOpen('map-explore-beehive')) return;
        switchMapExploreSubtab('map-explore-beehive');
    }
    function chosenPath() {
        return ledger().plan?.nodes || worldTreeJourney.pathTo(game,'worldtree_guardian');
    }
    function nodeHtml(node) {
        const st=ledger(),zone=zoneFor(node.id),done=worldTreeJourney.cleared(game,node.id);
        const active=st.active?.id===node.id,chosen=chosenPath().includes(node.id);
        const label=active?'전투 중':done?'완료':eventName(zone);
        return '<button class="mapping-node '+(chosen?'is-route ':'')+(done?'is-cleared ':'')+(active?'is-active':'')+
            '" style="--x:'+node.x+'%;--y:'+node.y+'%" data-journey-node="'+node.id+'" aria-pressed="'+(st.selected===node.id)+
            '" onclick="worldTreeJourneyUi.select(\''+node.id+'\')"><span>'+label+'</span><strong>'+escapeHTML(zone.name)+
            '</strong><small>'+((node.kind==='boss')?'수호자':node.floor+'번째 지역')+'</small></button>';
    }
    function linksHtml() {
        const chosen=chosenPath();
        const edges=WORLD_TREE_JOURNEY.nodes.flatMap(node=>node.parents.map(id=>{
            const from=worldTreeJourney.definition(id),selected=chosen.includes(id)&&chosen.includes(node.id);
            return '<path class="'+(selected?'is-route':'')+'" d="M'+from.x+' '+from.y+' C'+((from.x+node.x)/2)+' '+from.y+
                ' '+((from.x+node.x)/2)+' '+node.y+' '+node.x+' '+node.y+'"/>';
        }));
        return '<svg class="mapping-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+edges.join('')+'</svg>';
    }
    function headerHtml() {
        const st=ledger(),done=worldTreeJourney.cleared(game,'worldtree_guardian');
        return '<header class="mapping-header"><div><h2>혼돈의 뿌리</h2><span>지도 '+st.stage+'단계</span></div>'+
            '<span class="mapping-objective">'+(done?'수호자 격파 완료':'수호자까지 '+Math.min(3,st.cleared.length)+'/3 지역')+'</span>'+
            '<div class="mapping-stages" aria-label="지도 단계">'+Array.from({length:8},(_,i)=>
                '<button aria-label="지도 '+(i+1)+'단계" aria-pressed="'+(st.stage===i+1)+'" onclick="worldTreeJourneyUi.stage('+(i+1)+')" '+
                (i+1>worldTreeJourney.unlockedStage(game)||(!done&&st.cleared.length)||st.active?'disabled':'')+'>'+(i+1)+'</button>').join('')+'</div></header>';
    }
    function choicesHtml() {
        const st=ledger(),locked=st.active||st.cleared.length||st.plan;
        return '<div class="mapping-settings"><div><span>위험도</span>'+WORLD_TREE_JOURNEY.risks.map((row,i)=>
            '<button aria-pressed="'+(st.risk===i)+'" onclick="worldTreeJourneyUi.configure(\'risk\','+i+')" '+(locked?'disabled':'')+'>'+row.name+'</button>').join('')+
            '</div><div><span>수호자 보상</span>'+WORLD_TREE_JOURNEY.focuses.filter(row=>contentProgression.canDropCurrency(row.currency)).map(row=>
            '<button aria-pressed="'+(st.focus===row.id)+'" onclick="worldTreeJourneyUi.configure(\'focus\',\''+row.id+'\')" '+(locked?'disabled':'')+'>'+row.name+'</button>').join('')+'</div></div>';
    }
    function traitsHtml(zone) {
        const risk=WORLD_TREE_JOURNEY.risks[zone.worldTreeRisk];
        const text={grove:'벌떼 무리와 정예 수호벌 출현',breach:'균열에서 연속으로 몬스터 출현',meteor:'플레이어 위치에 낙하 예고 후 운석 충돌',boss:'호위병 처치 후 수호자와 전투'}[zone.worldTreeKind];
        return '<div class="mapping-traits"><span>'+text+'</span><details><summary>위험도 '+risk.name+'</summary><p>적 생명력 +'+
            Math.round((risk.hp-1)*100)+'%<br>적 피해 +'+Math.round((risk.damage-1)*100)+'%<br>완료 보상 +'+
            Math.round((risk.reward-1)*100)+'%</p></details></div>';
    }
    function rewardHtml(zone) {
        const event=WORLD_TREE_JOURNEY.events.find(row=>row.id===zone.worldTreeKind);
        const focus=WORLD_TREE_JOURNEY.focuses.find(row=>row.id===ledger().focus);
        const currency=(event||focus).currency;
        const reward=contentProgression.canDropCurrency(currency)?window.getStyledOrbName(currency):'장비';
        return '<p class="mapping-reward">'+reward+'<span>장비 T'+getRealmEquipmentHiddenTierCap(zone)+'까지</span></p>';
    }
    function actionsHtml() {
        const st=ledger();
        if (st.active) return '<button onclick="worldTreeJourneyUi.pause()" '+(st.queue.length?'':'disabled')+'>'+
            (st.queue.length?'현재 지역 후 정지':'정지 예약됨')+'</button><button onclick="switchTab(\'tab-battle\')">전투 보기</button>';
        if (worldTreeJourney.cleared(game,'worldtree_guardian')) return '<button class="mapping-primary" onclick="worldTreeJourneyUi.nextStage()">'+
            (st.stage<8?'다음 지도 단계':'새 탐험')+'</button><button onclick="worldTreeJourneyUi.stage('+st.stage+')">같은 단계 탐험</button>';
        if (st.plan && st.plan.index<st.plan.nodes.length) return '<button class="mapping-primary" data-exploration-departure onclick="worldTreeJourneyUi.resume()">'+
            (st.notice?.kind==='defeat'?'재도전':'남은 경로 계속')+'</button>';
        return startActionHtml();
    }
    function startActionHtml() {
        const reason=worldTreeJourney.available(game)?'':'루프 10에서 혼돈 20층 클리어';
        return (reason?'<span>'+reason+'</span>':'')+'<button class="mapping-primary" data-journey-travel data-exploration-departure onclick="worldTreeJourneyUi.travel()" '+
            (reason?'disabled':'')+'>선택 경로 탐험</button>';
    }
    function detailHtml() {
        const zone=zoneFor(ledger().selected);
        return '<aside class="mapping-detail"><img class="mapping-preview" src="'+zone.background+'" alt="" decoding="async"><div><span class="mapping-event">'+eventName(zone)+
            '</span><h3>'+escapeHTML(zone.name)+'</h3>'+rewardHtml(zone)+traitsHtml(zone)+buildMapPowerEstimateHtml(zone)+
            '</div></aside><div class="mapping-actions">'+actionsHtml()+'</div>';
    }
    function receiptHtml() {
        const receipt=game.explorationLoot;
        if (!ledger().notice || !receipt) return '';
        const currencies=Object.entries(receipt.currencies).map(([key,n])=>'<span>'+window.getStyledOrbName(key)+' <b>+'+n+'</b></span>').join('');
        const items=receipt.items.map(item=>({...item,location:'획득 장비',reason:''}));
        return '<details class="journey-receipt"><summary>획득 보기 <span>장비 '+receipt.equipmentCount+'개</span></summary>'+
            '<div class="journey-receipt-currencies">'+currencies+'</div>'+equipmentLootUi.renderHighlights({items,total:items.length})+'</details>';
    }
    function showReceipt() {
        openMap();render();
        const panel=document.querySelector('#ui-world-tree-journey .journey-receipt');
        if (panel) {panel.open=true;panel.scrollIntoView({block:'nearest'});}
    }
    function render() {
        const panel=document.getElementById('ui-world-tree-journey');
        if (!panel || game.mapExploreSubtab!=='map-explore-worldtree' || game.mapSubtab!=='map-tab-zones') return;
        const st=ledger(),key=JSON.stringify([st,game.explorationLoot,getPersistentBuildSignature(game)]);
        if (key===signature && panel.innerHTML) return;
        signature=key;
        const opened=panel.querySelector('.journey-receipt')?.open;
        const focus=panel.contains(document.activeElement)?document.activeElement.getAttribute('data-journey-node'):null;
        panel.innerHTML='<div class="mapping-layout">'+headerHtml()+choicesHtml()+
            '<div class="mapping-map" role="group" aria-label="탐험 경로"><img class="mapping-terrain" src="assets/maps/chaos-roots.webp" alt="">'+
            linksHtml()+WORLD_TREE_JOURNEY.nodes.map(nodeHtml).join('')+'</div>'+detailHtml()+receiptHtml()+'</div>';
        restorePanelInteraction(panel,opened,focus);
    }
    function restorePanelInteraction(panel,opened,focus) {
        if (opened && panel.querySelector('.journey-receipt')) panel.querySelector('.journey-receipt').open=true;
        if (focus) panel.querySelector('[data-journey-node="'+focus+'"]')?.focus({preventScroll:true});
    }
    function updateHud(zone) {
        const host=document.getElementById('ui-world-tree-combat');
        if (!host) return;
        const st=ledger();host.hidden=!zone.worldTreeNode;
        if (host.hidden) {hudSignature='';return;}
        const key=JSON.stringify([st.active,st.plan,st.notice,st.queue]);
        if (hudSignature===key) return;
        hudSignature=key;
        const count=st.plan?Math.min(4,st.plan.index+Number(!!st.active)):st.cleared.length;
        host.innerHTML='<div class="journey-hud-copy"><strong>지도 '+st.stage+'단계 <span>'+count+'/4</span></strong><span>'+
            (st.active?eventName(zone):st.notice?.kind==='defeat'?'탐험 실패':'지역 완료')+'</span></div><div class="journey-hud-actions">'+
            (st.active?'<button onclick="worldTreeJourneyUi.pause()" '+(st.queue.length?'':'disabled')+'>현재 지역 후 정지</button>':actionsHtml())+
            '<button onclick="worldTreeJourneyUi.openMap()">탐험 지도</button></div>';
    }
    return {render,select,route,stage,configure,travel,hive,pause,resume,openMap,nextStage,updateHud,showReceipt};
})();
safeExposeGlobals({worldTreeJourneyUi});
