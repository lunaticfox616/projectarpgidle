// Small pixel props share the actors' ground plane and fog. DOM buttons provide touch/keyboard hit areas only.
actExplorationView.objects=(()=>{
    let layer,lastRun;
    const buttons=new Map();
    const labels=actExplorationState.objects.labels;
    function append(actors,view) {
        const run=actExplorationState.current(game);
        syncLayer(run);
        if(!run?.objects)return;
        const shown=new Set(),p=view.gridProj;
        for(const row of run.objects.entries) {
            if(!actExplorationState.objects.visible(run,row))continue;
            const point=p.cellToScreen(row.gx,row.gy),y=point.y+p.actorGroundOffsetY;
            actors.push({kind:'object',id:row.id,y,point,object:row});
            if(canClick(run,row)&&onScreen(point,view)) {
                button(row,point,p);shown.add(row.id);
            }
        }
        for(const [id,node] of buttons)if(!shown.has(id)){node.remove();buttons.delete(id);}
    }
    function canClick(run,row) {return row.phase==='ready'&&row.kind!=='ambush'&&!run.arrival&&!run.completionApplied&&run.status==='active';}
    function onScreen(point,view) {return point.x>=0&&point.y>=0&&point.x<=view.width&&point.y<=view.height;}
    function syncLayer(run) {
        if(!layer) {
            const wrap=document.getElementById('battlefield-wrap');if(!wrap)return;
            layer=document.createElement('div');layer.id='exploration-object-actions';layer.setAttribute('aria-label','발견한 상자와 오브젝트');
            wrap.appendChild(layer);
        }
        if(lastRun!==run){buttons.forEach(n=>n.remove());buttons.clear();lastRun=run;}
        layer.hidden=!run?.objects||!!game.isBackgroundCalculation;
    }
    function button(row,point,p) {
        if(!layer)return;
        let node=buttons.get(row.id);
        if(!node) {
            node=document.createElement('button');node.type='button';node.className='exploration-object-action';
            node.dataset.objectId=row.id;
            const action=['pot','crate'].includes(row.kind)?'부수기':row.kind==='nest'?'건드리기':'열기';
            node.setAttribute('aria-label',`${labels[row.kind]} ${action}`);
            const text=document.createElement('span');text.textContent=`${labels[row.kind]} · ${action}`;node.appendChild(text);
            node.addEventListener('click',event=>{event.stopPropagation();actExplorationProgress.objects.request(row.id);});
            layer.appendChild(node);buttons.set(row.id,node);
        }
        const size=Math.max(28,p.tileW*.9),x=Math.round(point.x-size/2),y=Math.round(point.y+p.actorGroundOffsetY-size);
        const style=`left:${x}px;top:${y}px;width:${size}px;height:${size}px`;
        if(node.dataset.bounds!==style){node.style.cssText=style;node.dataset.bounds=style;}
        node.disabled=game.combatHalted||game.playerHp<=0||game.moveTimer>0;
    }
    function draw(ctx,actor,view) {
        const row=actor.object,p=view.gridProj,scale=p.tileW/16;
        const distance=Math.hypot(row.gx-game.gridPlayer.gx,row.gy-game.gridPlayer.gy);
        ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=Math.max(.35,1-Math.max(0,distance-ACT_EXPLORATION_VISION.radius)*.08);
        ctx.translate(Math.round(actor.point.x-8*scale),Math.round(actor.y-13*scale));ctx.scale(scale,scale);
        rect(ctx,'#101712',1,11,14,3);
        if(row.phase==='spent')debris(ctx,row);
        else if(row.kind==='pot')pot(ctx);
        else if(row.kind==='crate')crate(ctx);
        else if(row.kind==='nest')nest(ctx,row);
        else if(row.kind==='ambush')tracks(ctx,row);
        else chest(ctx,row);
        if(row.phase==='warning') {
            ctx.strokeStyle='#dfae75';ctx.lineWidth=1;ctx.strokeRect(0,0,16,14);
            rect(ctx,'#dfae75',2,15,12*(1-row.remainingMs/1200),1);
        }
        ctx.restore();
    }
    function rect(ctx,color,...box){ctx.fillStyle=color;ctx.fillRect(...box);}
    function chest(ctx,row) {
        rect(ctx,'#242326',1,3,14,10);rect(ctx,'#564536',2,6,12,6);rect(ctx,'#967249',2,3,12,4);
        rect(ctx,'#bd9760',3,2,10,1);rect(ctx,'#352d2b',2,7,12,1);
        rect(ctx,'#c9a96b',3,4,1,8);rect(ctx,'#c9a96b',12,4,1,8);rect(ctx,'#e1c581',7,7,2,3);
        rect(ctx,'#766045',5,10,6,1);
        if(row.kind==='sealed'){rect(ctx,'#7a858f',2,5,12,1);rect(ctx,'#7a858f',6,3,1,9);rect(ctx,'#bf8cc0',7,6,3,3);}
    }
    function pot(ctx) {
        rect(ctx,'#352f30',5,1,6,2);rect(ctx,'#a68b68',4,3,8,2);rect(ctx,'#78634d',3,5,10,6);
        rect(ctx,'#635443',4,11,8,2);rect(ctx,'#c3a681',4,5,2,5);rect(ctx,'#4b4139',10,5,2,6);
        rect(ctx,'#c3a681',5,2,6,1);
    }
    function crate(ctx) {
        rect(ctx,'#342e26',2,2,12,11);rect(ctx,'#786144',3,3,10,9);rect(ctx,'#b0915f',3,3,10,1);
        rect(ctx,'#463b2e',3,6,10,1);rect(ctx,'#463b2e',3,9,10,1);rect(ctx,'#ac8c59',3,3,1,9);
        rect(ctx,'#a98a56',11,3,1,9);rect(ctx,'#c4a772',4,4,1,1);rect(ctx,'#c4a772',10,10,1,1);
    }
    function nest(ctx,row) {
        rect(ctx,'#3d3931',1,8,14,5);rect(ctx,'#686042',2,10,12,2);rect(ctx,'#9b9065',4,12,8,1);
        for(const [x,y] of [[4,4],[8,2],[10,6]]){rect(ctx,'#5a6953',x,y,4,6);rect(ctx,'#a9b18a',x,y,3,4);rect(ctx,'#d5d8af',x+1,y,1,2);}
        if(row.phase==='active')rect(ctx,'#273225',6,5,5,6);
    }
    function tracks(ctx,row) {
        rect(ctx,'#665e4d',3,9,3,2);rect(ctx,'#665e4d',9,7,3,2);rect(ctx,'#807355',5,12,3,1);
        if(row.phase!=='ready')rect(ctx,'#b39561',8,10,2,2);
    }
    function debris(ctx,row) {
        if(['chest','sealed'].includes(row.kind)) {
            rect(ctx,'#544537',2,8,12,5);rect(ctx,'#ac8c59',2,3,12,2);rect(ctx,'#292727',3,8,10,3);
        } else {
            rect(ctx,'#6c6048',2,11,4,2);rect(ctx,'#a28b61',9,10,3,1);rect(ctx,'#554a39',7,13,4,1);
        }
    }
    addEventListener('project-idle:exploration-object',event=>{
        const {kind,name}=event.detail;
        addLog(kind==='spawn'?`${name}에서 몬스터가 나타났습니다.`:`${name}의 전리품을 획득했습니다.`,kind==='spawn'?'attack-monster':'loot-magic',{noToast:true});
    });
    return {append,draw};
})();
