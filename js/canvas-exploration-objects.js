// Exploration objects drawn in the act maps' own style (2026-10-05): 16-dot sprites lit from the upper left, outlined in their darkest
// colour, with a ground shadow (scripts/act-maps/objects.cjs paints the map props the same way). Standing objects are actors sorted
// with the hero; broken pots and crates, a spent nest and ambush tracks are ground decals drawn on the terrain, under the fog, the
// loot and every actor. DOM buttons provide touch/keyboard hit areas only.
actExplorationView.objects=(()=>{
    let layer,lastRun;
    const buttons=new Map();
    const PAL={o:'#1a120d',1:'#3a281b',2:'#5a3f2b',3:'#7a5638',4:'#9c744a',5:'#c09763',
        i:'#2b2b31',j:'#585a62',k:'#9a9ca4',g:'#8a6420',h:'#d3a443',y:'#f6dc84',
        a:'#3d261c',b:'#623a2b',c:'#85503a',d:'#a2684a',e:'#bf8a62',
        p:'#1f1c27',q:'#383347',r:'#5a5372',s:'#857ea0',u:'#6a3c8c',v:'#b47ae0',w:'#f2d6ff',
        m:'#2b2a1a',n:'#4b4929',l:'#716b3b',E:'#8d8c6c',F:'#c4c39c',G:'#efeed2',z:'#0b0705'};
    // 16 × 16, the bottom row on the ground. Each row is 16 characters; '.' is transparent.
    const SPRITES={
        crate:['................','................','................','..oooooooooooo..','..o5555555554o..','..o4444444443o..','..oooooooooooo..',
            '..o4o3333332o2o.','..o4o3o33332o2o.','..o4o33o3332o2o.','..o4o333o332o2o.','..o4o3333o32o2o.','..o4o33333o2o2o.','..o3o2222222o1o.','..oooooooooooooo','................'],
        pot:['................','................','......oooo......','.....oeddco.....','......occo......','.....odddco.....','....oeddddco....',
            '...oeeddddcco...','...oedddddcbo...','...oddddddcbo...','...odddddccbo...','....occcccbbo...','....obbbbbbao...','.....oaaaaao....','......ooooo.....','................'],
        chest:['................','................','................','...oooooooooo...','..o5555555544o..','..o4444444443o..','..ojjj4hh4jjjo..',
            '..oiii3hy3iiio..','..o3333gh33322o.','..o3333gg3332o..','..ojjj33333jjo..','..o3333333332o..','..o2222222221o..','..oooooooooooo..','................','................'],
        chestOpen:['................','...oooooooooo...','..o5555555544o..','..o4444444443o..','..oooooooooooo..','..o1zzzzzzzz1o..','..ojzzzzzzzzjo..',
            '..oiii3333iiio..','..o3333gg33322o.','..o3333333332o..','..ojjj33333jjo..','..o3333333332o..','..o2222222221o..','..oooooooooooo..','................','................'],
        sealed:['................','................','................','...oooooooooo...','..osssssssssro..','..orrrrrrrrrqo..','..ojjjjvvjjjjo..',
            '..oqqqvwwvqqqo..','..orrrruvrrrqqo.','..okrrrvvrrkqo..','..ojjjrrrrjjjo..','..orrrrrrrrrqo..','..oqqqqqqqqqpo..','..oooooooooooo..','................','................'],
        sealedOpen:['................','...oooooooooo...','..osssssssssro..','..orrrrrrrrrqo..','..oooooooooooo..','..opzzzzzzzzpo..','..ojzzzzzzzzjo..',
            '..oqqqqrrqqqqo..','..orrrrrrrrrqqo.','..okrrrrrrrkqo..','..ojjjrrrrjjjo..','..orrrrrrrrrqo..','..oqqqqqqqqqpo..','..oooooooooooo..','................','................'],
        nest:['................','................','................','.......oo.......','......oGGo...oo.','..oo..oGFo..oGGo','.oGGo.oFFo..oFFo',
            '.oFFo.oFEo..oFEo','.oFEoooooooooooo','.ooolllllllllo..','.olllnnnlllnnno.','onnnnmmnnnnmmnno','ommmmmmmmmmmmmmo','.oooooooooooooo.','................','................'],
        nestSpent:['................','................','................','................','................','................','................',
            '..oFo.....oG....','.oEo.o..o.oFo...','.ooolllllllloo..','.olllnnnlllnnno.','onnnnmmnnnnmmnno','ommmmmmmmmmmmmmo','.oooooooooooooo.','................','................'],
        crateBroken:['................','................','................','................','................','................','................',
            '................','.......oo.......','...ooo.o4o..oo..','..o44oo.o3oo4o..','..oo33o..oo3o...','.o3oo.ooo.oo..o.','..o..o443oo.o3o.','.....oooo....o..','................'],
        potBroken:['................','................','................','................','................','................','................',
            '................','................','.....oo....o....','....oedo..oco...','.o..occo.oo.....','.oco.oo..odbo...','..o.....ooccbo..','.........oooo...','................'],
        tracks:['................','................','................','................','................','................','................',
            '...........b....','..b.......b.b...','.b.b.......b....','..b......b......','........b.b.....','....b....b......','...b.b..........','....b...........','................']
    };
    // Supply chest grades (data/maps.js EXPLORATION_CHEST_GRADES) repaint the wooden chest: silver gets steel bands and a silver lock,
    // gold a gilded body with a ruby lock. The wooden chest keeps the base palette.
    const TINTS={silver:{i:'#6e7280',j:'#c9ccd6',g:'#8f939e',h:'#e4e7ee',y:'#ffffff'},
        gold:{1:'#4a3210',2:'#7a5418',3:'#a8782a',4:'#d9a842',5:'#f6dc84',i:'#b88a2a',j:'#fff0b0',g:'#7a2018',h:'#d04a3a',y:'#ffb0a0'}};
    // 누를 수 있는 오브젝트는 그림 바깥에 밝은 도트 테를 한 겹 두르고 천천히 숨 쉬듯 밝아진다(2026-10-07 사용자 요청: 가장 어두운
    // 색의 제 테두리만으로는 어두운 바닥에 묻혔다). 색은 종류마다(상자 금빛, 봉인 보라, 몬스터가 나오는 둥지 주황, 항아리와 나무 상자
    // 옅은 빛), 마우스를 올리거나 초점이 가면 하얗게.
    const RIM={chest:'#ffd36b',sealed:'#e0b4ff',nest:'#ff9a6a',pot:'#f3d6a4',crate:'#f3d6a4'},RIM_HOT='#fff8e6';
    let hovered=null;
    const cache=new Map();
    /** 18 × 18: every empty dot that touches the sprite's 16 × 16 picture on a side. */
    function rim(name,color) {
        const key=`${name}|rim|${color}`;
        if(cache.has(key))return cache.get(key);
        const solid=(x,y)=>x>=0&&y>=0&&x<16&&y<16&&SPRITES[name][y][x]!=='.';
        const canvas=document.createElement('canvas');canvas.width=18;canvas.height=18;
        const ctx=canvas.getContext('2d');ctx.fillStyle=color;
        for(let y=-1;y<17;y++)for(let x=-1;x<17;x++)
            if(!solid(x,y)&&(solid(x-1,y)||solid(x+1,y)||solid(x,y-1)||solid(x,y+1)))ctx.fillRect(x+1,y+1,1,1);
        cache.set(key,canvas);return canvas;
    }
    function sheet(name,tint) {
        const key=`${name}|${tint||''}`;
        if(cache.has(key))return cache.get(key);
        const canvas=document.createElement('canvas');canvas.width=16;canvas.height=16;
        const ctx=canvas.getContext('2d'),pal={...PAL,...TINTS[tint]};
        SPRITES[name].forEach((row,y)=>{for(let x=0;x<16;x++){const color=pal[row[x]];if(color){ctx.fillStyle=color;ctx.fillRect(x,y,1,1);}}});
        cache.set(key,canvas);return canvas;
    }
    /** Which picture a row shows, and whether it stands (actor) or lies on the floor (decal). */
    function look(row) {
        const spent=row.phase==='spent';
        if(row.kind==='chest')return {name:spent?'chestOpen':'chest',standing:true,tint:row.grade};
        if(row.kind==='sealed')return {name:spent?'sealedOpen':'sealed',standing:true};
        if(row.kind==='nest')return {name:spent?'nestSpent':'nest',standing:!spent};
        if(row.kind==='ambush')return {name:'tracks',standing:false};
        return {name:spent?(row.kind==='pot'?'potBroken':'crateBroken'):row.kind,standing:!spent};
    }
    let pending=null;
    /** Actor pass: standing objects join the sort, and the clickable ones are noted for flushButtons. */
    function append(actors,view) {
        const run=actExplorationState.current(game),p=view.gridProj;
        pending={run,p,rows:[]};
        if(!run?.objects)return;
        for(const row of run.objects.entries) {
            if(!actExplorationState.objects.visible(run,row))continue;
            const point=p.cellToScreen(row.gx,row.gy),y=point.y+p.actorGroundOffsetY;
            const ready=canClick(run,row);
            if(look(row).standing)actors.push({kind:'object',id:row.id,y,point,object:row,ready});
            if(ready&&onScreen(point,view))pending.rows.push({row,point});
        }
    }
    /** The buttons' DOM side, once the frame has drawn (renderBattlefield's end). Moving them between canvas calls made the next
     * ctx.font or ctx.filter recompute the page's styles mid-frame, once or twice a frame while the camera scrolled (2026-10-07
     * frame drops). */
    function flushButtons() {
        if(!pending)return;
        const {run,p,rows}=pending;
        pending=null;
        syncLayer(run);
        if(!run?.objects)return;
        const shown=new Set();
        for(const {row,point} of rows){button(row,point,p);shown.add(row.id);}
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
            const name=actExplorationState.objects.name(row);
            node.setAttribute('aria-label',`${name} ${action}`);
            const text=document.createElement('span');text.textContent=`${name} ${action}`;node.appendChild(text);
            node.addEventListener('click',event=>{event.stopPropagation();actExplorationProgress.objects.request(row.id);});
            const hot=on=>()=>{if(on)hovered=row.id;else if(hovered===row.id)hovered=null;};
            node.addEventListener('pointerenter',hot(true));node.addEventListener('focus',hot(true));
            node.addEventListener('pointerleave',hot(false));node.addEventListener('blur',hot(false));
            layer.appendChild(node);buttons.set(row.id,node);
        }
        const size=Math.max(28,p.tileW*.9),x=Math.round(point.x-size/2),y=Math.round(point.y+p.actorGroundOffsetY-size);
        const style=`left:${x}px;top:${y}px;width:${size}px;height:${size}px`;
        if(node.dataset.bounds!==style){node.style.cssText=style;node.dataset.bounds=style;}
        node.disabled=game.combatHalted||game.playerHp<=0||game.moveTimer>0;
    }
    function fade(row) {
        const distance=Math.hypot(row.gx-game.gridPlayer.gx,row.gy-game.gridPlayer.gy);
        return Math.max(.35,1-Math.max(0,distance-ACT_EXPLORATION_VISION.radius)*.08);
    }
    /** A standing object (actor pass): ground shadow, the sprite, a shake and a fuse bar while an event is about to burst. */
    function draw(ctx,actor,view) {
        const row=actor.object,scale=view.gridProj.tileW/16,now=getCombatTime();
        const shake=row.phase==='warning'?Math.round(Math.sin(now/45))*scale:0;
        ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=fade(row);
        ctx.translate(Math.round(actor.point.x-8*scale+shake),Math.round(actor.y-15*scale));
        ctx.fillStyle='rgba(10,6,4,.38)';ctx.beginPath();ctx.ellipse(8*scale+scale,14.5*scale,6.5*scale,1.8*scale,0,0,Math.PI*2);ctx.fill();
        const {name,tint}=look(row);
        if(actor.ready&&RIM[row.kind]) {
            // the breath runs on the screen's clock: the combat clock steps every 100 ms
            const hot=hovered===row.id,breath=hot?1:.78+.22*Math.sin(performance.now()/300+row.gx+row.gy);
            ctx.globalAlpha=fade(row)*breath;
            ctx.drawImage(rim(name,hot?RIM_HOT:RIM[row.kind]),-scale,-scale,18*scale,18*scale);
            ctx.globalAlpha=fade(row);
        }
        ctx.drawImage(sheet(name,tint),0,0,16*scale,16*scale);
        if(row.phase==='ready'&&['chest','sealed'].includes(row.kind))twinkle(ctx,row,scale,now);
        if(row.phase==='warning') {
            ctx.fillStyle='#1a120d';ctx.fillRect(2*scale,0,12*scale,2*scale);
            ctx.fillStyle=row.kind==='sealed'?'#b47ae0':'#dfae75';ctx.fillRect(2*scale,0,12*scale*(1-row.remainingMs/actExplorationState.objects.warningMs[row.kind]),scale);
        }
        ctx.restore();
    }
    /** A glint that wanders over a closed chest's lid every couple of seconds: it can be opened. */
    function twinkle(ctx,row,scale,now) {
        const cycle=(now+row.gx*311+row.gy*173)%(row.grade==='gold'?1100:2200);if(cycle>420)return;
        const x=4+Math.floor(cycle/60)%8,size=cycle<140||cycle>280?1:2;
        ctx.fillStyle=row.kind==='sealed'?'#f2d6ff':'#fff3c4';ctx.fillRect((x)*scale,3*scale,size*scale,size*scale);
    }
    /** Floor decals (terrain pass): broken pots and crates, a spent nest, ambush tracks. The fog drawn after covers unseen ones. */
    function drawGround(ctx,run,p) {
        if(!run?.objects)return;
        const scale=p.tileW/16;
        for(const row of run.objects.entries) {
            const {name,standing}=look(row);
            if(standing||!actExplorationState.objects.visible(run,row))continue;
            const point=p.cellToScreen(row.gx,row.gy);
            ctx.globalAlpha=row.kind==='ambush'&&row.phase==='ready'?.75:1;
            ctx.drawImage(sheet(name),Math.round(point.x-8*scale),Math.round(point.y+p.actorGroundOffsetY-15*scale),16*scale,16*scale);
        }
        ctx.globalAlpha=1;
    }
    addEventListener('project-idle:exploration-object',event=>{
        const {kind,name,objectKind}=event.detail;
        if(objectKind==='pot'||objectKind==='crate')return;
        addLog(kind==='spawn'?`${name}에서 몬스터가 나타났습니다.`:`${name}의 전리품을 획득했습니다.`,kind==='spawn'?'attack-monster':'loot-magic',{noToast:true});
    });
    return {append,flushButtons,draw,drawGround};
})();
