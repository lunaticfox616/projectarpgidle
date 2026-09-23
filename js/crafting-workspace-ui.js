const craftingWorkspaceUi = (() => {
    const recipes = [
        ...['magicBud','sapBud','formlessDew','goldenRule','blightSpore','blessing','pruningShears','fairyRing','emberBranch','deepWhetstone','rootIron','jewelPolish','abyssCatalyst','enchantedHoney','venomStinger','voidChisel','ouroboros','oceanRerollShard'].map(key=>({key,kind:({magicBud:'reroll',sapBud:'add',formlessDew:'reroll',goldenRule:'value',blightSpore:'reset'})[key]||'special',label:ORB_DB[key].name})),
        ...FOSSIL_DB.map(row=>({key:row.key,kind:'fossil',label:row.name}))
    ];
    let root, current=null, owner=null, goal, recipe=recipes[0], mode='none', extras='';
    let renderKey='', adapter;
    let busy=false, acknowledged='', count=0, spent={}, last=null, notice='';
    let auto=false, timer=0, runId=0, runCount=0, limit=20;
    let goalDialog;
    const esc = value => escapeHTML(String(value));
    const selected = () => getSelectedCraftItem();
    const signature = () => JSON.stringify([current,goal,selected()?.stats]);
    const targetGame = () => ({settings:{equipmentTargets:goal}});
    const matches = item => equipmentLootPolicy.matches(item,targetGame());
    const held = () => matches(selected()) && acknowledged!==signature();

    function workspaceSetGoal(statId,tier) {
        goal=equipmentLootPolicy.normalizeTargets({enabled:true,scope:'explicit',slot:'any',minMatches:1,
            rules:[{statId:statId,minTier:Number(tier),minValue:0}]});
        acknowledged='';
        game.craftingWorkspace.goal={statId:goal.rules[0]?.statId||'',minTier:Number(tier)||0};
        queueImportantSave(180);
    }

    function workspaceGoalOptions() { return craftingGoalOptions.get(selected(),recipe,mode); }

    function workspaceRefreshGoals() {
        if(!['add','reroll','fossil'].includes(recipe.kind))return;
        const rule=goal.rules[0];if(!rule)return;
        const choice=workspaceGoalOptions().find(row=>row.id===rule.statId);
        if(!choice||rule.minTier>choice.maxTier)workspaceSetGoal('',0);
    }

    function workspaceUseState() { return workspaceResourceState(recipe.key); }

    function workspaceResourceState(key) {
        if(!contentProgression.canOpen('item-tab-craft')||!contentProgression.canDropCurrency(key))return {enabled:false,reason:'아직 해금되지 않았습니다.'};
        const row=recipes.find(entry=>entry.key===key);if(!row)return null;
        if(row.kind==='fossil') {
            const reason=equipmentCrafting.getFossilUseReason(selected(),FOSSIL_DB.find(entry=>entry.key===key),game.season,game.currencies)||workspaceFossilSlotReason(key);
            return {enabled:!reason,reason};
        }
        if(['ouroboros','oceanRerollShard'].includes(key))return {enabled:!!selected()&&game.currencies[key]>0,reason:!selected()?'아이템을 선택하세요.':'재화 부족'};
        return adapter.useState(key,selected());
    }

    function workspaceFossilSlotReason(key=recipe.key) {
        const item=selected();if(!item)return '아이템을 선택하세요.';
        const candidate={...item,stats:item.stats.filter(stat=>stat.lockedByHoney||stat.lockedByRift),chaosInfusion:null};
        if(key==='fossilRift')return '';
        if(key==='fossilOld')return getFossilExclusivePool(candidate).length?'':'화석 전용 옵션을 부여할 수 없습니다.';
        const allowed=getFossilGuaranteedPool(item,FOSSIL_DB.find(row=>row.key===key)).length>0;
        if(!allowed&&key==='fossilBulwark')return '방어구 전용';
        return allowed?'':'이 장비 부위에 부여할 수 있는 화석 옵션이 없습니다.';
    }

    function workspaceOpenInventory(edit=false,inspect='',craftingOnly=false) {
        if(auto){workspaceStopAuto('재화 인벤토리를 열어 자동 사용을 멈췄어요.');workspaceRender();}
        craftingCatalogUi.open(recipes,workspacePickResource,{active:recipe.key,edit:edit,inspect:inspect,craftingOnly:craftingOnly,onPin:workspaceRender,useState:workspaceResourceState});
    }

    function workspacePickResource(key) {
        if(['fossil','fossilPrimal','fossilAncientPrimal'].includes(key)){
            const materials=document.getElementById('cl-materials');materials.open=true;
            renderFossilWorkbench(selected());materials.scrollIntoView({block:'nearest'});return;
        }
        if(key.startsWith('spore')){recipe=recipes.find(row=>row.key==='formlessDew');mode=({sporeFire:'fire',sporeCold:'cold',sporeLight:'light'})[key];game.sporeCraftModes[recipe.key]=mode;}
        else {recipe=recipes.find(row=>row.key===key);mode=game.sporeCraftModes[key]||'none';}
        workspaceRefreshGoals();workspaceRender();
    }

    function workspaceAffixValue(stat,value,exactRange=false) {
        const fractional=['resPen','physIgnore','leech','spellLeech','regen','regenSuppress','leechRateCap','leechTotalCap','leechInstanceCap'].includes(stat.id)
            || [stat.val,stat.valMin,stat.valMax].some(number=>Number.isFinite(number)&&!Number.isInteger(number));
        return fractional?Number(value).toFixed(exactRange?2:1).replace(/(\.\d)0$/,'$1'):formatValue(stat.id,value);
    }

    function workspaceAffixRange(stat) {
        if(!Number.isFinite(stat.valMin)||!Number.isFinite(stat.valMax))return '';
        return `[${workspaceAffixValue(stat,stat.valMin,true)} ~ ${workspaceAffixValue(stat,stat.valMax,true)}]`;
    }

    function workspaceAffixQuality(stat,changed) {
        if(!changed||isFixedEquipmentAffix(stat))return '';
        const mod=findStoredEquipmentAffix(selected(),stat);
        const cap=Math.min(getItemCraftTier(selected()),mod?.tierValues?.length||20);
        if(stat.tier>=cap)return 'is-max-tier';
        return stat.tier>=10?'is-high-tier':'';
    }

    function workspaceAffixNotes(stat,prior,changed,hit,quality) {
        return [stat.lockedByHoney?'벌꿀 고정':'',stat.lockedByRift?'균열 고정':'',
            changed&&prior?`이전 +${workspaceAffixValue(prior,prior.val)}`:'',hit?'목표 일치':'',
            quality==='is-max-tier'?'최고 티어':''].filter(Boolean)
            .map(note=>note==='목표 일치'?'<strong class="cl-goal-match">목표 일치</strong>':esc(note)).join(' · ');
    }

    function workspaceAffixHtml(stat,index) {
        const prior=last?.before.stats.find(row=>row.id===stat.id);
        const changed=last && JSON.stringify(prior)!==JSON.stringify(copyCraftResultStat(stat));
        const hit=matches({slot:selected().slot,stats:[stat]});
        const quality=workspaceAffixQuality(stat,changed);
        return `<li class="cl-affix ${hit?'is-target':''} ${changed?'is-changed':''} ${quality}" data-affix="${index}">
            <div><span style="--cl-affix-tone:${getItemStatToneColor(stat.id)}">${esc(stat.statName||getStatName(stat.id))} <span class="cl-affix-value"><b>+${esc(workspaceAffixValue(stat,stat.val))}</b> <span class="cl-affix-range">${esc(workspaceAffixRange(stat))}</span></span></span>
            <span class="cl-tier">${getItemAffixTierHtml(stat)}</span></div>
            <small>${workspaceAffixNotes(stat,prior,changed,hit,quality)}</small></li>`;
    }

    function workspaceItemHtml() {
        const item=selected(), sources=new Set(item.stats.map(stat=>equipmentCrafting.getSource(stat)));
        return `<section id="forge-item-display" class="cl-item ${matches(item)?'goal-hit':''}"><div class="cl-item-head"><div class="cl-art"><img src="${esc(getEquipmentGridVisualAsset(item))}" alt="${esc(item.slot)}"></div>
            <div><small>제작 중인 장비 &ensp; T${getItemCraftTier(item)}</small><h2>${esc(item.name)}</h2><span>${esc(item.baseName)} &ensp; 추가 옵션 ${getItemExplicitOptionCount(item)}/6</span></div></div>
            <div class="cl-sources"><span class="${sources.has('spore')?'filled':''}">홀씨 ${sources.has('spore')?'1':'0'}/1</span><span class="${sources.has('fossil')?'filled':''}">화석 ${sources.has('fossil')?'1':'0'}/1</span></div>
            <div class="cl-section-title">추가 옵션</div><ul class="cl-affixes">${item.stats.map(workspaceAffixHtml).join('')}${item.chaosInfusion?`<li class="cl-affix">혼돈 주입 ${esc(getStatName(item.chaosInfusion.id))} +${esc(workspaceAffixValue(item.chaosInfusion,item.chaosInfusion.val))}</li>`:''}</ul>
            <div class="cl-base">기본 옵션 &ensp; ${(item.baseStats||[]).map(stat=>`${esc(stat.statName||getStatName(stat.id))} +${esc(formatValue(stat.id,stat.val))} ${esc(workspaceAffixRange(stat))}`).join(' / ')}</div>${workspaceEncroachmentHtml(item)}
            ${extras}</section>`;
    }

    function workspaceGoalHtml() {
        if(!['add','reroll','fossil','value'].includes(recipe.kind))return '';
        const rule=goal.rules[0]||{statId:'',minTier:0};
        const available=workspaceGoalOptions(), choice=available.find(row=>row.id===rule.statId);
        const retained=!choice&&rule.statId;
        const tiers=Array.from({length:(choice?.maxTier||0)+1},(_,i)=>i);
        return `<section class="cl-goal"><div class="cl-section-title"><span class="cl-goal-help"><button type="button" id="cl-goal-help" aria-describedby="cl-goal-tooltip">목표 옵션</button><span role="tooltip" id="cl-goal-tooltip">확률은 변경되지 않으며, 목표 옵션 출현 시 강조됩니다.</span></span></div><div class="cl-goal-fields">
            <label>옵션<select id="cl-goal-stat"><option value="">목표 선택</option>${retained?`<option selected disabled value="${rule.statId}">${esc(getStatName(rule.statId))} (현재 목표)</option>`:''}${available.map(row=>`<option value="${row.id}" ${row.id===rule.statId?'selected':''}>${esc(row.name)}</option>`).join('')}</select></label>
            <label>최소 티어<select id="cl-goal-tier" ${!choice?'disabled':''}>${tiers.map(tier=>`<option value="${tier}" ${tier===rule.minTier?'selected':''}>${tier===0?'티어 무관':`T${tier} 이상`}</option>`).join('')}</select></label></div></section>`;
    }

    function workspaceEncroachmentHtml(item) {
        if(!item.encroached)return '';
        const stat=item.encroached.chosen;
        if(item.encroached.liberated&&stat)return `<div class="cl-base">잠식 ${esc(stat.statName||getStatName(stat.id))} +${esc(formatValue(stat.id,stat.val))}</div>`;
        return '<div class="cl-base">잠식 미해방 <button type="button" onclick="liberateSelectedEncroachedItem()">해방</button></div>';
    }

    function workspaceMethodsHtml() {
        const spore=isSporeCraftEquipment(selected())&&(recipe.kind==='add'||recipe.kind==='reroll');
        return `<section class="cl-methods"><div class="cl-section-title">주 재화<div><button data-command="pins">변경</button><button id="cl-catalog-open" data-command="catalog">기타 재화</button></div></div><div class="cl-recipes">${craftingCatalogUi.pinned().map(workspaceFavoriteHtml).join('')}</div>
            <p class="cl-method-note" data-theme="${craftingCatalogUi.theme(recipe.key)}"><span class="cl-method-heading"><strong>선택 중 &ensp; ${craftingCatalogUi.styledName(recipe.key)}</strong><small>보유 ${game.currencies[recipe.key]}</small></span>${craftingCatalogUi.description(recipe.key)}</p>${spore?`<label class="cl-spore">홀씨 함께 사용<select id="cl-mode">${[['none','사용 안 함'],['fire','화염'],['cold','냉기'],['light','번개'],...(getExpertLevel('mycologist')>=10?[['chaos','카오스'],['damage','피해']]:[])].map(([key,label])=>`<option value="${key}" ${mode===key?'selected':''}>${label}</option>`).join('')}</select></label>`:''}
            </section>`;
    }

    function workspaceFavoriteHtml(key,index) {
        if(!key)return `<button data-command="pins" class="cl-recipe"><strong>${index+1}번 빈 칸</strong><small>재화 지정</small></button>`;
        const row=recipes.find(entry=>entry.key===key), selected=key===recipe.key;
        const icon=ORB_DB[key]?.icon;
        return `<button class="cl-recipe ${selected?'selected':''} ${icon?'has-icon':''}" data-theme="${craftingCatalogUi.theme(key)}" ${row?`data-recipe="${key}"`:`data-favorite="${key}"`} aria-pressed="${selected}">${icon?`<img class="cl-recipe-icon" src="${esc(icon)}" alt="">`:''}<strong>${craftingCatalogUi.styledName(key)}</strong><small>${game.currencies[key]||0}개</small></button>`;
    }

    function workspaceCostText() {
        const pieces=['재화 1개 소모'];
        if(isSporeCraftEquipment(selected())&&['add','reroll'].includes(recipe.kind)&&mode!=='none') {
            const amount=getSporeCraftCost();
            pieces.push(['damage','chaos'].includes(mode)?`홀씨 3종 각 ${amount}`:`${({fire:'화염',cold:'냉기',light:'번개'})[mode]} 홀씨 ${amount}`);
        }
        if(['enchantedHoney','venomStinger','voidChisel','ouroboros','oceanRerollShard'].includes(recipe.key))return '';
        return pieces.join(' + ');
    }

    function workspacePreviousOptionsHtml() {
        if(!last)return '';
        return `<details><summary>이전 옵션 보기</summary>${last.before.stats.map(stat=>`<div>${esc(stat.statName||getStatName(stat.id))} +${esc(workspaceAffixValue(stat,stat.val))} · T${stat.tier||0} <small>${esc(workspaceAffixRange(stat))}</small></div>`).join('')}</details>`;
    }

    function workspaceAutoReason() {
        if(!['reroll','add','fossil'].includes(recipe.kind))return '이 재화는 한 번씩 사용합니다.';
        if(!goal.rules.length)return '목표 미설정';
        if(matches(selected()))return '이미 목표를 달성했어요.';
        if(!workspaceGoalOptions().some(row=>row.id===goal.rules[0].statId))return '현재 재화로 나올 수 없는 목표입니다.';
        return '';
    }

    function workspaceActionHtml(state,stopped) {
        if(auto)return `<button data-command="stop" class="cl-primary cl-stop">자동 사용 중지 ${runCount}/${limit}회</button>`;
        const button=stopped?'<button data-command="ack" class="cl-primary">목표 옵션 확인</button>':`<button data-command="craft" class="cl-primary" aria-label="${esc(ORB_DB[recipe.key].name)} 1회 사용" ${busy||!state.enabled?'disabled':''}>${busy?'사용 중…':'1회 사용'}</button>`;
        if(!['reroll','add','fossil'].includes(recipe.kind))return button;
        return button+workspaceAutoControlsHtml(state);
    }

    function workspaceAutoControlsHtml(state) {
        const reason=workspaceAutoReason();
        return `<div class="cl-auto"><label>최대 <input id="cl-limit" type="number" min="1" max="100" value="${limit}" aria-label="자동 사용 최대 횟수">회</label>
            <button data-command="auto" ${busy||!state.enabled||reason?'disabled':''}>목표까지 자동 사용</button></div>${reason&&goal.rules.length?`<small>${esc(reason)}</small>`:''}`;
    }

    function workspaceResultHtml() {
        const hit=matches(selected());
        return `<section class="cl-result ${hit?'goal-hit':''}" aria-live="polite"><div><h3>제작 경과</h3>
            ${last?craftingResultUi.getMetaRows(last).map(text=>`<p>${esc(text)}</p>`).join(''):''}
            ${hit?'<p>목표 옵션을 확보했어요</p>':''}${notice?`<p>${esc(notice)}</p>`:''}
            ${workspacePreviousOptionsHtml()}</div>
            <div class="cl-session"><b>${count}회 제작</b><small>${Object.entries(spent).map(([key,value])=>`${esc(ORB_DB[key]?.name||key)} ${value}`).join(' · ')||'소모 없음'}</small></div></section>`;
    }

    function workspaceSyncTarget() {
        craftingCatalogUi.capture();
        if(owner!==game){workspaceStopAuto('');owner=game;current=null;goal=equipmentLootPolicy.normalizeTargets({});const saved=game.craftingWorkspace.goal;if(saved.statId)workspaceSetGoal(saved.statId,saved.minTier);}
        const item=selected();
        if(current!==item){workspaceStopAuto('');current=item;last=null;acknowledged='';count=0;spent={};
            if(goalDialog?.open)goalDialog.close();
            if(item){recipe=recipes.find(row=>row.key===(item.rarity==='normal'?'magicBud':'formlessDew'));mode=game.sporeCraftModes[recipe.key]||'none';}
            workspaceRefreshGoals();}
        if(item)last=craftingResultLedger.getForItem(item)||last;
        return item;
    }

    function workspaceMount(controls) {
        if(controls){adapter=controls;extras=controls.details;}
        if(!root){root=document.getElementById('crafting-workspace');if(root)workspaceWire();}
        return root;
    }

    function workspaceRender(reveal=false, controls) {
        if(!workspaceMount(controls))return;
        const item=workspaceSyncTarget();
        if(!root.getClientRects().length){if(auto)workspaceStopAuto('');return;}
        if(!item){root.innerHTML='<div class="cl-empty">'+adapter.targetControls()+'</div>';renderKey='';return;}
        const state=workspaceUseState(), stopped=held();
        const html=`<div class="cl-heading">${adapter.targetControls()}<button id="cl-inventory-open" data-command="inventory">재화 인벤토리</button></div>
            <div class="cl-workspace">${workspaceItemHtml()}<div class="cl-controls">${workspaceMethodsHtml()}${workspaceGoalHtml()}<div class="cl-action"><small>${esc(workspaceCostText())}</small>
            ${workspaceActionHtml(state,stopped)}<span class="cl-block">${!state.enabled?esc(state.reason):''}</span></div></div></div>${workspaceResultHtml()}`;
        workspaceReplaceMarkup(html,reveal);
        if(reveal)root.querySelector('.cl-item').classList.add('just-crafted');
        if(reveal&&stopped)workspaceShowGoalDialog();
    }

    function workspaceReplaceMarkup(html,reveal) {
        if(html===renderKey&&!reveal)return;
        const focusId=root.querySelector(':focus')?.id;
        root.innerHTML=html;renderKey=html;
        if(focusId)root.querySelector('#'+focusId)?.focus({preventScroll:true});
    }

    function workspaceShowGoalDialog() {
        if(goalDialog?.open)return;
        if(!goalDialog){
            goalDialog=document.createElement('dialog');goalDialog.className='cl-goal-dialog';
            goalDialog.setAttribute('aria-labelledby','cl-goal-dialog-title');
            goalDialog.addEventListener('cancel',event=>event.preventDefault());
            window.addEventListener('keydown',event=>{
                if(!goalDialog.open)return;
                event.stopImmediatePropagation();
                if(event.key==='Escape'||event.repeat)event.preventDefault();
            },true);
            document.body.append(goalDialog);
        }
        const acceptedSignature=signature(), item=selected();
        goalDialog.innerHTML=`<header><strong class="cl-goal-match">목표 일치</strong>
            <h2 id="cl-goal-dialog-title" tabindex="-1">${esc(item.name)}</h2></header>
            <ul class="cl-affixes just-crafted">${item.stats.map(workspaceAffixHtml).join('')}</ul>
            <button type="button" disabled>확인했어요</button>`;
        const confirm=goalDialog.querySelector('button'), readyAt=performance.now()+800;
        confirm.addEventListener('click',event=>{
            if(confirm.disabled||performance.now()<readyAt||event.detail>1)return;
            confirm.disabled=true;
            // Keep the modal intercepting trailing double-clicks before exposing the crafting controls.
            setTimeout(workspaceAcknowledgeGoal,350,acceptedSignature);
        });
        goalDialog.showModal();goalDialog.querySelector('h2').focus();
        setTimeout(()=>{confirm.disabled=false;},800);
    }

    function workspaceAcknowledgeGoal(acceptedSignature) {
        if(signature()===acceptedSignature)acknowledged=acceptedSignature;
        goalDialog.close();workspaceRender();
        const title=root.querySelector('.cl-item h2');
        if(title){title.setAttribute('tabindex','-1');title.focus({preventScroll:true});}
    }

    async function workspaceCraft() {
        if(busy||!selected()||held()||!workspaceUseState().enabled)return false;
        busy=true;workspaceRender();const item=selected(), before={...game.currencies};
        const token=craftingResultLedger.begin(item,{currencyKey:recipe.key});
        let completed=false;
        try {
            const result=await workspaceExecuteCraft();
            completed=result===true||Object.entries(before).some(([key,value])=>value>game.currencies[key]);
            if(!completed){notice='제작 조건을 확인하세요.';return false;}
            last=craftingResultLedger.commit(token,item);count++;notice='';acknowledged='';
            Object.entries(before).forEach(([key,value])=>{const used=value-game.currencies[key];if(used>0)spent[key]=(spent[key]||0)+used;});
            queueImportantSave(180);return true;
        } finally {busy=false;workspaceRender(completed);}
    }

    function workspaceExecuteCraft() {
        if(recipe.kind==='fossil')return applyFossilChaosCraft(recipe.key);
        const actions={enchantedHoney:applyEnchantedHoneyToSelectedItem,venomStinger:applyVenomStingerToSelectedItem,voidChisel:applyVoidChiselToSelectedItem,ouroboros:applyWoodsmanTouchToSelectedItem};
        if(actions[recipe.key])return actions[recipe.key]();
        if(recipe.key==='oceanRerollShard')return rerollSingleBaseOption(selected(),'oceanRerollShard',1);
        return useCurrency(recipe.key);
    }

    function workspaceStopAuto(message) {
        auto=false;runId++;clearTimeout(timer);timer=0;notice=message;
    }

    function workspaceAutomaticStopReason() {
        if(document.hidden||!root.getClientRects().length||selected()!==current||owner!==game)return '화면을 벗어나 자동 사용을 중지했어요.';
        if(matches(selected()))return '목표 달성 · 자동 사용을 멈췄어요.';
        if(runCount>=limit)return `설정한 ${limit}회를 모두 사용했어요.`;
        const state=workspaceUseState();return state.enabled?workspaceAutoReason():state.reason;
    }

    async function workspaceAutoStep(id) {
        if(!auto||id!==runId)return;
        try {
            let reason=workspaceAutomaticStopReason();
            if(reason){workspaceStopAuto(reason);workspaceRender();return;}
            const used=await workspaceCraft();if(!auto||id!==runId)return;
            if(!used){workspaceStopAuto(notice);workspaceRender();return;}
            runCount++;reason=workspaceAutomaticStopReason();
            if(reason){workspaceStopAuto(reason);workspaceRender();return;}
            workspaceRender();timer=setTimeout(workspaceAutoStep,400,id);
        } catch(error) {console.error('Automatic crafting failed',error);workspaceStopAuto(`자동 사용 실패: ${error.message}`);workspaceRender();}
    }

    function workspaceStartAuto() {
        if(auto||busy||workspaceAutoReason()||!workspaceUseState().enabled)return;
        auto=true;runCount=0;notice='';const id=++runId;workspaceRender();
        timer=setTimeout(workspaceAutoStep,400,id);
    }

    function workspaceChooseGoal(statId) {
        const max=workspaceGoalOptions().find(row=>row.id===statId)?.maxTier||0;
        workspaceSetGoal(statId,Math.min(goal.rules[0]?.minTier||0,max));
    }

    function workspaceChange(event) {
        if(auto)workspaceStopAuto('설정 변경으로 자동 사용을 멈췄어요.');
        if(event.target.id==='cl-limit'){limit=clampNumber(Math.floor(Number(event.target.value)||1),1,100);workspaceRender();return;}
        if(event.target.id==='cl-mode'){mode=event.target.value;game.sporeCraftModes[recipe.key]=mode;}
        else if(event.target.id==='cl-goal-stat')workspaceChooseGoal(event.target.value);
        else if(event.target.id==='cl-goal-tier')workspaceSetGoal(goal.rules[0].statId,event.target.value);
        else return;
        workspaceRefreshGoals();workspaceRender();
    }

    async function workspaceCommand(action) {
        if(action==='catalog')return workspaceOpenInventory(false,'',true);
        if(action==='inventory')return workspaceOpenInventory();
        if(action==='pins')return workspaceOpenInventory(true);
        if(action==='craft')return workspaceCraft();
        if(action==='ack')workspaceShowGoalDialog();
    }

    async function workspaceClick(event) {
        const button=event.target.closest('button');if(!button)return;
        if(button.dataset.command==='stop'){workspaceStopAuto('자동 사용을 중지했어요.');workspaceRender();return;}
        if(busy)return;
        if(button.dataset.favorite){workspaceOpenInventory(false,button.dataset.favorite);return;}
        if(button.dataset.command==='auto'){workspaceStartAuto();return;}
        if(auto)workspaceStopAuto('조작 변경으로 자동 사용을 멈췄어요.');
        if(button.dataset.recipe){workspacePickResource(button.dataset.recipe);return;}
        return workspaceCommand(button.dataset.command);
    }

    function workspaceWire() {
        root.addEventListener('change',workspaceChange);
        root.addEventListener('click',workspaceHandleClick);
        document.addEventListener('visibilitychange',workspaceVisibilityChanged);
        window.addEventListener('pagehide',()=>workspaceStopAuto(''));
    }

    async function workspaceHandleClick(event) {
        try {await workspaceClick(event);}
        catch(error){console.error('Crafting action failed',error);notice=`제작 실패: ${error.message}`;busy=false;workspaceRender();}
    }

    function workspaceVisibilityChanged() {
        if(document.hidden&&auto){workspaceStopAuto('화면을 벗어나 자동 사용을 중지했어요.');workspaceRender();}
    }

    return { render:workspaceRender, openInventory:workspaceOpenInventory, stopAuto:workspaceStopAuto };
})();
safeExposeGlobals({ craftingWorkspaceUi });
