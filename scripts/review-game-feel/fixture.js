// Local review controls only; never loaded by the game. All mutations require an explicit button.
(() => {
    const frame = document.querySelector('iframe'), status = document.querySelector('#status');
    let serial = 0, captureJob = 0, observedOwner = null, lastEvent = '';
    function app() {
        if (location.hostname !== '127.0.0.1' || location.port !== '4242') throw Error('4242 테스트 전용입니다.');
        const a = frame.contentWindow;
        if (!a.game || a.isStartupOverlayOpen()) throw Error('아래 게임에서 게스트로 시작해 주세요.');
        if (a.isLoadingOverlayOpen()) throw Error('게임 진입이 끝난 뒤 눌러 주세요.');
        if(observedOwner!==a.worldTreeSkillFx.feedback) {
            observedOwner=a.worldTreeSkillFx.feedback;
            const observe=observedOwner.observe;
            observedOwner.observe=(fx,now)=>{observe(fx,now);if(['enemyDeath','objectReward'].includes(fx.type))lastEvent=`${fx.type} 처리 ${Math.round(now-fx.start)}ms`;};
        }
        return a;
    }
    function refresh(a) { a.updateStaticUI(); a.renderBattlefield(true); }
    function prepare() {
        const a=app(),g=a.game;
        g.currentZoneId=0;g.moveTimer=0;g.combatHalted=true;g.isTownReturning=false;
        g.playerHp=a.getPlayerStats().maxHp;g.settings.pauseGameOnOverlay=false;g.settings.mapCompleteAction='stop';g.settings.autoMove=false;
        a.startEncounterRun(true);g.actExploration.mode='manual';g.combatHalted=true;
        a.clearBattleVisualBacklog();refresh(a);
        status.textContent='전투 준비 완료 · 전투 시간은 정지. 실제 피해·처치·개봉을 버튼으로 확인합니다.';
    }
    function pack(boss=false) {
        const a=app(),g=a.game,run=g.actExploration,map=a.actExplorationMap.forRun(run);
        const cells=[];
        for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++) {
            const c={gx:g.gridPlayer.gx+dx,gy:g.gridPlayer.gy+dy};
            if((dx||dy)&&a.actExplorationMap.walkable(map,c)&&!a.actExplorationState.objects.solidCells(run).has(c.gx+','+c.gy))cells.push(c);
        }
        g.enemies=Array.from({length:boss?1:5},(_,i)=>Object.assign(a.createEnemy(a.getZone(0),{boss,elite:!boss&&i===0},0),cells[i%cells.length]));
        a.actExplorationState.discover(run,g.gridPlayer);refresh(a);
        return g.enemies.slice();
    }
    function kill(boss) {
        const a=app();a.game.combatHalted=true;const enemies=pack(boss);
        // Let the actual renderer acquire the actors before a final blow removes them.
        setTimeout(()=>{for(const e of enemies) {
            a.addBattleFx('hit',{enemyId:e.id,damage:e.hp,crit:true,skillName:a.game.activeSkill,duration:260});
            e.hp=0;a.handleEnemyDeath(e,a.getPlayerStats());
        } refresh(a);capture();},500);
        status.textContent=boss?'실제 보스 처치와 전리품 지급':'실제 5마리 처치와 전리품 지급';
    }
    function object(kind) {
        const a=app();let row;
        for(let i=0;i<80&&!row;i++) {prepare();row=a.game.actExploration.objects.entries.find(e=>e.kind===kind);}
        if(!row)throw Error('오브젝트를 찾지 못했습니다.');
        const run=a.game.actExploration,map=a.actExplorationMap.forRun(run);
        const side=a.actExplorationMap.neighbors(map,row).find(c=>!a.actExplorationState.objects.solidCells(run).has(c.gx+','+c.gy));
        Object.assign(a.game.gridPlayer,side);a.actExplorationState.discover(run,side);a.game.enemies=[];a.game.combatHalted=false;refresh(a);
        status.textContent=`${a.actExplorationState.objects.name(row)} 앞입니다. 게임 안의 오브젝트를 직접 클릭하세요.`;
        const watch=++serial;
        const event=()=>{if(watch===serial){capture();status.textContent='개봉/파괴 완료 · 실제 보상 지급 및 칸별 드롭';}a.removeEventListener('project-idle:exploration-object',event);};
        a.addEventListener('project-idle:exploration-object',event,{once:true});
    }
    function capture() {
        const job=++captureJob,root=document.querySelector('#captures');root.style.gridTemplateColumns='';root.replaceChildren();
        // Parent controls may leave the mobile iframe outside the viewport (RAF throttled).
        // Paint the real renderer at 30 Hz for the review strip, without advancing combat.
        const paint=setInterval(()=>{if(job===captureJob)app().renderBattlefield(true);},1000/30);
        setTimeout(()=>clearInterval(paint),2600);
        for(const delay of [70,180,350,900,1600,2400])setTimeout(()=>{
            if(job!==captureJob)return;
            const canvas=app().document.querySelector('#battlefield-canvas'),figure=document.createElement('figure');
            const composite=document.createElement('canvas');composite.width=canvas.width;composite.height=canvas.height;
            const ctx=composite.getContext('2d');ctx.drawImage(canvas,0,0);
            const top=app().document.querySelector('.battle-loot-foreground');
            if(top&&!top.hidden)ctx.drawImage(top,0,0);
            const img=document.createElement('img');img.src=composite.toDataURL();img.alt=`동작 후 ${delay}ms 실제 캔버스 (DOM 전리품 제외)`;
            img.onclick=()=>{root.style.gridTemplateColumns='1fr';root.replaceChildren(figure);figure.scrollIntoView();};
            const caption=document.createElement('figcaption');caption.textContent=`${delay} ms · ${lastEvent} · ${app().document.visibilityState}`;
            figure.append(img,caption);root.append(figure);
        },delay);
    }
    const actions={prepare,fight(){const a=app();a.game.settings.autoMove=true;a.game.settings.mapCompleteAction='nextZone';a.game.combatHalted=false;a.game.actExploration.mode='full';status.textContent='실제 자동 전투 재개';},
        pack(){kill(false);},boss(){kill(true);},chest(){object('chest');},pot(){object('pot');},crate(){object('crate');},
        hit(){const a=app();a.game.combatHalted=true;const enemies=pack();setTimeout(()=>{
            enemies.slice(0,2).forEach((e,i)=>a.addBattleFx('hit',{enemyId:e.id,damage:10,crit:!!i,skillName:a.game.activeSkill,duration:260}));capture();
        },350);status.textContent='타격 그림 비교 · 이 버튼만 피해 정산 없이 시각 FX를 보여 줍니다.';},
        level(){const a=app();a.game.exp=a.getExpReq(a.game.level)-1;a.grantExpAndGem(a.createEnemy(a.getZone(0),{},0),a.getPlayerStats());refresh(a);capture();status.textContent='실제 경험치 지급 후 레벨업';},
        loot(){const a=app(),e={id:0,...a.game.gridPlayer};a.awardCurrency('goldenRule',1,'drop');a.queueEnemyGroundLoot(e,{currency:'goldenRule',amount:1});refresh(a);capture();status.textContent='테스트 황금률 1 지급 · 바닥 드롭 확인';}
    };
    document.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>{
        try{document.querySelector('#error').textContent='';actions[button.dataset.action]();}
        catch(error){document.querySelector('#error').textContent=error.message;console.error(error);}
    });
})();
