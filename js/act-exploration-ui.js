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
        renderProgress(run,remaining);
    }
    // 지도 아래 진행 막대: 밝혀낸 바닥 비율과 남은 정예 수. 표시 전용이며 탐험 규칙과 무관하다.
    function renderProgress(run,remaining) {
        const host=document.getElementById('act-exploration-progress');if(!host)return;
        const map=actExplorationMap.layout(run.act);
        const floor=map.tiles.filter(Boolean).length;
        const seen=run.discovered.filter(id=>map.tiles[id]).length;
        const pct=floor?Math.round(seen/floor*100):0;
        host.style.setProperty('--explore-pct',pct+'%');
        host.setAttribute('aria-valuenow',String(pct));
        host.querySelector('b').textContent=`탐험 ${pct}%`+(remaining?` · 정예 ${remaining}`:' · 관문 개방');
    }
    // 지도 그리기: 안개 격자 → 밝혀낸 지형(바닥·벽·경계선) → 표식. 표시 전용이며 좌표·선택 규칙은 그대로다.
    // 캔버스는 2배로 그려 CSS 축소 시 표식 윤곽이 뭉개지지 않게 한다.
    // 전장 위 미니맵은 플레이어 주변 MINI_VIEW칸만, 크게 보기 창은 지도 전체를 그린다(클릭 좌표는 같은 창(view)으로 환산).
    const MAP_INK={fog:'#050807',grid:'rgba(201,164,92,.06)',floor:'#7d7152',floorAlt:'#877a58',wall:'#26342c',edge:'rgba(240,214,150,.85)'};
    const MINI_VIEW=21;
    function mapView(canvas,map) {
        if(canvas.id!=='act-exploration-map')return {x0:0,y0:0,cols:map.columns,rows:map.rows,scale:10};
        const cols=Math.min(MINI_VIEW,map.columns),rows=Math.min(MINI_VIEW,map.rows);
        const x0=Math.max(0,Math.min(map.columns-cols,game.gridPlayer.gx-Math.floor(cols/2)));
        const y0=Math.max(0,Math.min(map.rows-rows,game.gridPlayer.gy-Math.floor(rows/2)));
        return {x0,y0,cols,rows,scale:8};
    }
    function draw(canvas,run) {
        const map=actExplorationMap.layout(run.act),view=mapView(canvas,map),scale=view.scale,ss=2;
        canvas.width=view.cols*scale*ss;canvas.height=view.rows*scale*ss;
        canvas.dataset.view=[view.x0,view.y0,view.cols,view.rows].join(',');
        const ctx=canvas.getContext('2d'),seen=new Set(run.discovered);
        ctx.setTransform(ss,0,0,ss,-view.x0*scale*ss,-view.y0*scale*ss);
        drawFog(ctx,map,scale);
        drawTerrain(ctx,map,seen,scale);
        drawMarkers(ctx,run,map,seen,scale);
    }
    function drawFog(ctx,map,scale) {
        ctx.fillStyle=MAP_INK.fog;ctx.fillRect(0,0,map.columns*scale,map.rows*scale);
        ctx.fillStyle=MAP_INK.grid;
        for(let gx=0;gx<map.columns;gx+=4)ctx.fillRect(gx*scale,0,.5,map.rows*scale);
        for(let gy=0;gy<map.rows;gy+=4)ctx.fillRect(0,gy*scale,map.columns*scale,.5);
    }
    function drawTerrain(ctx,map,seen,scale) {
        for(const id of seen) {
            const gx=id%map.columns,gy=Math.floor(id/map.columns);
            ctx.fillStyle=map.tiles[id]?((gx+gy)%2?MAP_INK.floor:MAP_INK.floorAlt):MAP_INK.wall;
            ctx.fillRect(gx*scale,gy*scale,scale,scale);
        }
        ctx.fillStyle=MAP_INK.edge;
        for(const id of seen)if(map.tiles[id])drawFloorEdges(ctx,map,seen,id,scale);
    }
    // 바닥 칸의 네 변 중 바닥이 아닌 쪽에만 얇은 금빛 경계를 긋는다.
    const EDGE_SIDES=[[0,-1],[1,0],[0,1],[-1,0]];
    function drawFloorEdges(ctx,map,seen,id,scale) {
        const gx=id%map.columns,gy=Math.floor(id/map.columns),w=.7;
        for(const [dx,dy] of EDGE_SIDES) {
            if(isSeenFloor(map,seen,gx+dx,gy+dy))continue;
            const x=gx*scale+(dx>0?scale-w:0),y=gy*scale+(dy>0?scale-w:0);
            ctx.fillRect(x,y,dx?w:scale,dy?w:scale);
        }
    }
    function isSeenFloor(map,seen,gx,gy) {
        if(gx<0||gy<0||gx>=map.columns||gy>=map.rows)return false;
        const id=gy*map.columns+gx;
        return seen.has(id)&&!!map.tiles[id];
    }
    function drawDiamond(ctx,{x,y,r,fill}) {
        ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();
        ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=.8;ctx.strokeStyle='#140d08';ctx.stroke();
    }
    function drawMarkers(ctx,run,map,seen,scale) {
        const at=v=>v*scale+scale/2,r=Math.max(3,scale*.8);
        for(const pack of run.packs) {
            const room=map.rooms.find(item=>item.id===pack.roomId);
            if(!pack.aliveIds.length||!seen.has(actExplorationMap.index(map,room)))continue;
            const fill=pack.stage!==null?'#e78077':pack.eliteIds.some(id=>pack.aliveIds.includes(id))?'#e1bd62':'#ae9073';
            drawDiamond(ctx,{x:at(room.gx),y:at(room.gy),r,fill});
        }
        if(run.destination) {
            ctx.beginPath();ctx.arc(at(run.destination.gx),at(run.destination.gy),r+1,0,Math.PI*2);
            ctx.setLineDash([2,1.5]);ctx.lineWidth=1;ctx.strokeStyle='#f3e5b4';ctx.stroke();ctx.setLineDash([]);
        }
        drawPlayerMarker(ctx,at(game.gridPlayer.gx),at(game.gridPlayer.gy),r);
    }
    function drawPlayerMarker(ctx,x,y,r) {
        const glow=ctx.createRadialGradient(x,y,0,x,y,r*2.4);
        glow.addColorStop(0,'rgba(145,236,223,.55)');glow.addColorStop(1,'rgba(145,236,223,0)');
        ctx.fillStyle=glow;ctx.fillRect(x-r*2.4,y-r*2.4,r*4.8,r*4.8);
        ctx.beginPath();ctx.arc(x,y,r*.7,0,Math.PI*2);
        ctx.fillStyle='#91ecdf';ctx.fill();ctx.lineWidth=.8;ctx.strokeStyle='#0b1a17';ctx.stroke();
    }
    function mode(value) {
        const run=actExplorationState.current(game);if(!run||run.status!=='active')return;
        if(!['direct','full','manual'].includes(value))throw Error('알 수 없는 탐험 방식');
        run.mode=value;run.destination=null;
        if(value!=='manual')game.settings.actExplorationMode=value;
        render();
    }
    // 모바일의 작은 미니맵은 손가락으로 칸을 고르기 어려워, 누르면 크게 보기 창을 연다(칸 선택은 큰 지도에서).
    function choose(event) {
        if(event.currentTarget.id==='act-exploration-map'&&window.matchMedia('(max-width: 1080px)').matches)return expand();
        const run=actExplorationState.current(game);if(!run||run.status!=='active')return;
        const map=actExplorationMap.layout(run.act),rect=event.currentTarget.getBoundingClientRect();
        const view=mapView(event.currentTarget,map);
        const cell={gx:view.x0+Math.floor((event.clientX-rect.left)/rect.width*view.cols),
            gy:view.y0+Math.floor((event.clientY-rect.top)/rect.height*view.rows)};
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
