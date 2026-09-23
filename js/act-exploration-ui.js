// Exploration controls render the domain snapshot; destination selection stays in the domain.
const actExplorationUi=(()=>{
    let lastKey='',lastRun=null,lastLoot=null,lastPhase='',lootRows=[],selectedLoot='';
    let departurePending=false,approvedDeparture=null;
    function render() {
        const panel=document.getElementById('act-exploration-panel');if(!panel)return;
        const run=actExplorationState.current(game);panel.hidden=!run;
        document.getElementById('btn-act-exploration-map').hidden=!run;
        renderLoot(run);
        if(!run){lastRun=null;lastKey='';return;}
        const remaining=actExplorationState.remainingElites(run);
        const key=[run.discovered.length,game.gridPlayer.gx,game.gridPlayer.gy,remaining,run.status,run.mode,
            run.destination?.gx,run.destination?.gy,run.packs.map(p=>p.aliveIds.length).join(',')].join(':');
        if(run===lastRun&&key===lastKey)return;lastRun=run;lastKey=key;
        for(const button of document.querySelectorAll('[data-exploration-mode]')) {
            button.setAttribute('aria-pressed',String(button.dataset.explorationMode===run.mode));
            button.disabled=run.status!=='active';
        }
        const seal=document.getElementById('act-exploration-seal');
        seal.textContent=remaining?'🔒 '+remaining:'🔓 개방';
        seal.setAttribute('aria-label',remaining?'남은 정예 몬스터 수: '+remaining:'보스 관문 개방');
        draw(document.getElementById('act-exploration-map'),run);
        draw(document.getElementById('act-exploration-map-large'),run);
    }
    function draw(canvas,run) {
        const map=actExplorationMap.layout(run.act),scale=canvas.id==='act-exploration-map-large'?10:5;
        canvas.width=map.columns*scale;canvas.height=map.rows*scale;
        const ctx=canvas.getContext('2d'),seen=new Set(run.discovered);
        ctx.fillStyle='#080f0d';ctx.fillRect(0,0,canvas.width,canvas.height);
        for(const id of seen) {
            ctx.fillStyle=map.tiles[id]?'#91a089':'#283e33';
            ctx.fillRect(id%map.columns*scale,Math.floor(id/map.columns)*scale,scale,scale);
        }
        drawMarkers(ctx,run,map,seen,scale);
    }
    function drawMarkers(ctx,run,map,seen,scale) {
        for(const pack of run.packs) {
            const room=map.rooms.find(r=>r.id===pack.roomId);
            if(!pack.aliveIds.length||!seen.has(actExplorationMap.index(map,room)))continue;
            ctx.fillStyle=pack.stage!==null?'#e78077':pack.eliteIds.some(id=>pack.aliveIds.includes(id))?'#e1bd62':'#ae9073';
            ctx.fillRect(room.gx*scale-1,room.gy*scale-1,7,7);
        }
        if(run.destination){ctx.strokeStyle='#f3e5b4';ctx.strokeRect(run.destination.gx*scale-1,run.destination.gy*scale-1,7,7);}
        ctx.fillStyle='#91ecdf';ctx.fillRect(game.gridPlayer.gx*scale-1,game.gridPlayer.gy*scale-1,7,7);
    }
    function mode(value) {
        const run=actExplorationState.current(game);if(!run||run.status!=='active')return;
        if(!['direct','full','manual'].includes(value))throw Error('알 수 없는 탐험 방식');
        run.mode=value;run.destination=null;
        if(value!=='manual')game.settings.actExplorationMode=value;
        render();
    }
    function choose(event) {
        const run=actExplorationState.current(game);if(!run||run.status!=='active')return;
        const map=actExplorationMap.layout(run.act),rect=event.currentTarget.getBoundingClientRect();
        const cell={gx:Math.floor((event.clientX-rect.left)/rect.width*map.columns),
            gy:Math.floor((event.clientY-rect.top)/rect.height*map.rows)};
        actExplorationState.selectDestination(run,cell);render();
    }
    function key(event) {
        const offsets={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
        const delta=offsets[event.key],run=actExplorationState.current(game);
        if(!delta||!run||run.status!=='active')return;
        event.preventDefault();
        actExplorationState.selectDestination(run,{gx:game.gridPlayer.gx+delta[0],gy:game.gridPlayer.gy+delta[1]});render();
    }
    function expand(){document.getElementById('act-exploration-dialog').showModal();render();}
    function collectLootRows(loot) {
        const rows=[];
        for(const kind of ['equipment','growthItems','jewels'])
            rows.push(...loot[kind].map(item=>({key:kind+':'+item.id,kind,item,name:item.name,rarity:item.rarity,amount:1})));
        for(const [key,amount] of Object.entries(loot.currencies))
            rows.push({key:'currency:'+key,kind:'currency',name:ORB_DB[key].name,currency:key,amount});
        rows.push(...loot.flasks.map(key=>({key:'flask:'+key,kind:'flask',name:FLASK_DB[key].name,description:FLASK_DB[key].desc,amount:1})));
        rows.push(...loot.gems.map(row=>({key:row.kind+':'+row.name,kind:'gem',name:row.name,
            description:row.kind==='support'?'보조 젬 T'+row.tier:'공격 젬',amount:1})));
        if(loot.alchemyGlass)rows.push({key:'glass',kind:'supply',name:'연금 유리',amount:loot.alchemyGlass});
        if(loot.blurred45)rows.push({key:'cube',kind:'supply',name:'흐릿한 45면체',amount:loot.blurred45});
        return rows;
    }
    function renderLoot(run,force=false) {
        const dialog=document.getElementById('act-exploration-loot-dialog');
        if(!run){dialog.close();lastLoot=null;lastPhase='';return;}
        if(!force&&lastLoot===run.loot&&lastPhase===run.loot.phase)return;
        lastLoot=run.loot;lastPhase=run.loot.phase;lootRows=collectLootRows(run.loot);
        document.querySelectorAll('[data-exploration-loot]').forEach(button=>{
            button.textContent='임시 전리품'+(lootRows.length?' '+lootRows.length:'');
        });
        if(!dialog.open)return;
        const status={pending:'보스 처치 후 획득',claimed:'전리품을 획득했습니다.',lost:'전리품이 소실되었습니다.'};
        document.getElementById('act-exploration-loot-status').textContent=status[run.loot.phase];
        const list=document.getElementById('act-exploration-loot-list');
        list.innerHTML=lootRows.map((row,index)=>lootRowHtml(row,index)).join('')||'<p>보관 중인 전리품이 없습니다.</p>';
        const index=lootRows.findIndex(row=>row.key===selectedLoot);
        inspectLoot(Math.max(0,index));
    }
    function lootRowHtml(row,index) {
        const name=row.kind==='currency'?window.getStyledOrbName(row.currency):escapeHTML(row.name);
        const color=row.rarity?getRarityColor(row.rarity):'inherit';
        return `<button type="button" class="act-exploration-loot-row" data-loot-index="${index}" aria-pressed="false" onclick="actExplorationUi.inspectLoot(${index})"><span style="color:${color}">${name}</span>${row.amount>1?'<b>×'+row.amount.toLocaleString()+'</b>':''}</button>`;
    }
    function inspectLoot(index) {
        const row=lootRows[index],details=document.getElementById('act-exploration-loot-details');
        details.innerHTML='';if(!row){selectedLoot='';return;}
        selectedLoot=row.key;
        document.querySelectorAll('[data-loot-index]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.lootIndex)===index)));
        if(row.kind==='equipment')showItemTooltip(null,-1,false,row.item,{target:details});
        else if(row.kind==='growthItems')details.innerHTML=buildGrowthTooltipHtml(row.item);
        else if(row.kind==='jewels')details.innerHTML=window.createJewelRangeTooltipHtml(row.item);
        else details.innerHTML=supplyDetails(row);
    }
    function supplyDetails(row) {
        const title=row.kind==='currency'?window.getStyledOrbName(row.currency):escapeHTML(row.name);
        const description=row.kind==='currency'?ORB_DB[row.currency].desc:row.description;
        return `<div class="tooltip-title">${title}</div><div class="tooltip-line">${description||''}</div><div class="tooltip-line">수량 ${row.amount.toLocaleString()}</div>`;
    }
    function openLoot() {
        const run=actExplorationState.current(game);if(!run)return;
        document.getElementById('act-exploration-loot-dialog').showModal();renderLoot(run,true);
    }
    function hint(event) {
        const run=actExplorationState.current(game);if(!run)return;
        const rect=event.currentTarget.getBoundingClientRect(),count=actExplorationState.remainingElites(run);
        showInfoTooltipHtml(rect.left,rect.bottom,count?'남은 정예 몬스터 수: '+count:'보스 관문이 열렸습니다.','#b79c58','act-gate-'+count);
    }
    // Only explicit travel controls participate. Automatic travel and combat never depend on this UI.
    function departureClick(event) {
        const button=event.target.closest('[onclick], [data-exploration-departure]');
        if(!button?.hasAttribute('data-exploration-departure') || button.disabled)return;
        if(button===approvedDeparture){approvedDeparture=null;return;}
        const run=actExplorationState.current(game);
        if(!run || run.completionApplied || run.loot.phase!=='pending')return;
        event.preventDefault();event.stopImmediatePropagation();
        if(!departurePending)confirmDeparture(button,run);
    }
    async function confirmDeparture(button,run) {
        departurePending=true;
        const origin={state:game,run,zoneId:game.currentZoneId,season:game.season};
        try {
            const accepted=await requestGameConfirmation(departureMessage(run),{
                title:'탐험을 포기하고 이동할까요?',tone:'danger',confirmLabel:'포기하고 이동',cancelLabel:'계속 탐험'
            });
            if(!accepted || !departureStillCurrent(origin))return;
            if(!button.isConnected || button.disabled) {
                showGameToast('이동할 화면이 변경되었습니다. 목적지를 다시 선택하세요.',{tone:'warning'});return;
            }
            approvedDeparture=button;button.click();
        } catch(error) {
            console.error('탐험 이동 확인 실패:',error);
            showGameToast('이동 확인에 실패했습니다. 탐험은 유지됩니다.',{tone:'danger'});
        } finally {approvedDeparture=null;departurePending=false;}
    }
    function departureStillCurrent(origin) {
        return game===origin.state && game.actExploration===origin.run &&
            game.currentZoneId===origin.zoneId && game.season===origin.season;
    }
    function departureMessage(run) {
        const rows=collectLootRows(run.loot);
        const preview=rows.slice(0,6).map(row=>row.name+(row.amount>1?' ×'+row.amount.toLocaleString():'')).join('\n');
        return '탐험 진행이 초기화됩니다.'+(rows.length?'\n임시 전리품은 모두 사라집니다.\n\n'+preview:'')+
            (rows.length>6?'\n외 '+(rows.length-6)+'개':'');
    }
    document.addEventListener('click',departureClick,true);
    return {render,mode,choose,key,expand,hint,openLoot,inspectLoot,collectLootRows,departurePending:()=>departurePending};
})();
safeExposeGlobals({actExplorationUi});
