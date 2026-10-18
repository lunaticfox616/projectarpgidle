const craftingWorkspaceUi = (() => {
    const recipes = [
        ...['magicBud','sapBud','formlessDew','goldenRule','blightSpore','blessing','pruningShears','fairyRing','emberBranch','burningEmberBranch','deepWhetstone','rootIron','jewelPolish','abyssCatalyst','catalystFire','catalystCold','catalystLight','catalystChaos','catalystCrit','catalystSummon','enchantedHoney','venomStinger','voidChisel','ouroboros','oceanRerollShard','altarEmber','altarIchor'].map(key=>({key,kind:({magicBud:'reroll',sapBud:'add',formlessDew:'reroll',goldenRule:'value',blightSpore:'reset'})[key]||'special',label:ORB_DB[key].name})),
        ...FOSSIL_DB.map(row=>({key:row.key,kind:'fossil',label:row.name}))
    ];
    let root, current=null, owner=null, goal, recipe=recipes[0], mode='none', extras='';
    let renderKey='', adapter;
    let busy=false, acknowledged='', count=0, spent={}, last=null, notice='';
    let auto=false, timer=0, runId=0, runCount=0, limit=20;
    let goalDialog, studyDialog, choiceDialog, studyRun=0, goalMatch='all';
    const esc = value => escapeHTML(String(value));
    const selected = () => getSelectedCraftItem();
    const signature = () => JSON.stringify([current,goal,selected()?.stats]);
    const targetGame = () => ({settings:{equipmentTargets:goal}});
    const matches = item => equipmentLootPolicy.matches(item,targetGame());
    const held = () => matches(selected()) && acknowledged!==signature();

    /** target: an option id, 'tag:<tag>' (count lines carrying the tag) or '' to clear. */
    function workspaceSetGoal(target,tier,count=2) {
        const rule=String(target).startsWith('tag:')?{tag:target.slice(4),minCount:Number(count),minTier:Number(tier)}:{statId:target,minTier:Number(tier),minValue:0};
        const rules=[rule,...(goal?.rules||[]).slice(1)];
        goal=equipmentLootPolicy.normalizeTargets({enabled:true,scope:'explicit',slot:'any',minMatches:goalMatch==='all'?rules.length:1,rules});
        acknowledged='';
        workspaceSaveGoals();
    }

    function workspaceSaveGoals() {
        game.craftingWorkspace.goal=craftingWorkspaceState.normalizeGoal({...goal.rules[0],match:goalMatch,extra:goal.rules.slice(1)});
        queueImportantSave(180);
    }

    function workspaceRestoreGoal() {
        const saved=game.craftingWorkspace.goal;
        goalMatch=saved.match||'all';
        const rules=[saved,...(saved.extra||[])].map(rule=>rule.tag?{tag:rule.tag,minCount:rule.minCount,minTier:rule.minTier}:{statId:rule.statId,minTier:rule.minTier,minValue:0});
        goal=equipmentLootPolicy.normalizeTargets({enabled:true,scope:'explicit',slot:'any',minMatches:goalMatch==='all'?rules.length:1,rules});
    }

    function workspaceGoalOptions() { return craftingGoalOptions.get(selected(),recipe,mode); }
    function workspaceGoalTags() { return craftingGoalOptions.tags(selected(),recipe,mode); }

    /** The option or tag row the current craft can reach for this rule (undefined when it cannot). */
    function workspaceGoalChoice(rule) {
        if(!rule)return undefined;
        return rule.tag?workspaceGoalTags().find(row=>row.id===rule.tag):workspaceGoalOptions().find(row=>row.id===rule.statId);
    }

    function workspaceGoalReachable(rule) {
        if(equipmentLootPolicy.matches(selected(),{settings:{equipmentTargets:{...goal,rules:[rule],minMatches:1}}}))return true;
        const choice=workspaceGoalChoice(rule);
        return !!choice&&rule.minTier<=choice.maxTier&&(!rule.tag||rule.minCount<=choice.maxCount);
    }


    const CHOICE_WAIT={enabled:false,reason:'성화의 뿌리로 굴린 결과 가운데 하나를 먼저 고르세요.'};
    /** Whether the selected currency can be used now: nothing while a 성화의 뿌리 pick waits. */
    function workspaceUseState() { return equipmentCrafting.pendingChoice(game)?CHOICE_WAIT:workspaceResourceState(recipe.key); }

    function workspaceResourceState(key) {
        if(!contentProgression.canOpen('item-tab-craft')||!contentProgression.canDropCurrency(key))return {enabled:false,reason:'아직 해금되지 않았습니다.'};
        const row=recipes.find(entry=>entry.key===key);if(!row)return null;
        if(row.kind==='fossil') {
            const reason=equipmentCrafting.getFossilUseReason(selected(),FOSSIL_DB.find(entry=>entry.key===key),game.season,game.currencies)||workspaceFossilSlotReason(key);
            return {enabled:!reason,reason};
        }
        const special=workspaceSpecialState(key);if(special)return special;
        if(['ouroboros','oceanRerollShard'].includes(key))return {enabled:!!selected()&&game.currencies[key]>0,reason:!selected()?'아이템을 선택하세요.':'재화 부족'};
        return adapter.useState(key,selected());
    }

    /** Currencies with their own rules: the burning branch (loop 30) and the catalysts (loop 32). null for the rest. */
    function workspaceSpecialState(key) {
        if(key==='burningEmberBranch')return emberCorruptionUi.useState(selected());
        if(itemInfluences.isAltarCurrency(key))return itemInfluencesUi.useState(key,selected());
        return sapCatalysts.isCatalyst(key)?sapCatalystsUi.useState(key,selected()):null;
    }

    function workspaceFossilSlotReason(key=recipe.key) {
        const item=selected();if(!item)return '아이템을 선택하세요.';
        const candidate={...item,stats:item.stats.filter(stat=>equipmentCrafting.keptOnReroll(item,stat)),chaosInfusion:null};
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
        workspaceRender();
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
        const kept=!stat.lockedByHoney&&!stat.lockedByRift&&equipmentCrafting.keptOnReroll(selected(),stat);
        return [stat.lockedByHoney?'벌꿀 고정':'',stat.lockedByRift?'균열 고정':'',kept?'다음 재굴림 보존':'',
            changed&&prior?`이전 +${workspaceAffixValue(prior,prior.val)}`:'',hit?'목표 일치':'',
            quality==='is-max-tier'?'최고 티어':'',emberCorruptionUi.scaleNote(stat)].filter(Boolean)
            .map(note=>note==='목표 일치'?'<strong class="cl-goal-match">목표 일치</strong>':esc(note)).join(', ');
    }

    function workspaceAffixHtml(stat,index) {
        const prior=last?.before.stats.find(row=>row.id===stat.id);
        const changed=last && JSON.stringify(prior)!==JSON.stringify(copyCraftResultStat(stat));
        const hit=goal.rules.some(rule=>equipmentLootPolicy.lineMatchesRule(stat,rule));
        const quality=workspaceAffixQuality(stat,changed);
        return `<li class="cl-affix ${hit?'is-target':''} ${changed?'is-changed':''} ${quality}" data-affix="${index}">
            <div><span style="--cl-affix-tone:${getItemStatToneColor(stat.id)}">${esc(stat.statName||getStatName(stat.id))} <span class="cl-affix-value"><b>+${esc(workspaceAffixValue(stat,stat.val))}</b> <span class="cl-affix-range">${esc(workspaceAffixRange(stat))}</span></span></span>
            <span class="cl-tier">${getItemAffixTierHtml(stat)}${itemInfluencesUi.lineBadgeHtml(selected(),stat)}</span></div>
            <small>${workspaceAffixNotes(stat,prior,changed,hit,quality)}</small></li>`;
    }

    /** 허리띠의 액막이 칸 수(축복의 꽃잎이 다시 굴린다, js/colony-wards.js rerollBelt): 기본 옵션 줄 맨 앞에 "액막이 칸 +2 [1 ~ 3]". */
    function workspaceWardSlotsText(item) {
        const slots=colonyWards.beltRoll(item),range=COLONY_WARD_RULES.beltSlots;
        return slots?`액막이 칸 +${slots} [${range.min} ~ ${range.max}]`:'';
    }

    function workspaceItemHtml() {
        const item=selected(), sources=new Set(item.stats.map(stat=>equipmentCrafting.getSource(stat)));
        return `<section id="forge-item-display" class="cl-item ${matches(item)?'goal-hit':''}"><div class="cl-item-head"><div class="cl-art"><img src="${esc(getEquipmentGridVisualAsset(item))}" alt="${esc(item.slot)}"></div>
            <div><small>제작 중인 장비 &ensp; T${getItemCraftTier(item)}</small><h2>${esc(item.name)}</h2>${itemInfluencesUi.tagsHtml(item)}<span>${esc(item.baseName)} &ensp; 추가 옵션 ${getItemExplicitOptionCount(item)}/6</span></div></div>
            <div class="cl-sources"><span class="${sources.has('spore')?'filled':''}">홀씨 ${sources.has('spore')?'1':'0'}/1</span><span class="${sources.has('fossil')?'filled':''}">화석 ${sources.has('fossil')?'1':'0'}/1</span></div>
            <div class="cl-section-title">추가 옵션</div><ul class="cl-affixes">${item.stats.map(workspaceAffixHtml).join('')}${item.chaosInfusion?`<li class="cl-affix">혼돈 주입 ${esc(getStatName(item.chaosInfusion.id))} +${esc(workspaceAffixValue(item.chaosInfusion,item.chaosInfusion.val))}</li>`:''}</ul>
            <div class="cl-base">기본 옵션 &ensp; ${[workspaceWardSlotsText(item),...(item.baseStats||[]).map(stat=>`${esc(stat.statName||getStatName(stat.id))} +${esc(formatValue(stat.id,stat.val))} ${esc(workspaceAffixRange(stat))}${itemInfluencesUi.lineBadgeHtml(item,stat)}`)].filter(Boolean).join(' / ')}</div>${workspaceImprintHtml(item)}${workspaceEncroachmentHtml(item)}${emberCorruptionUi.cardHtml(item)}
            ${extras}</section>`;
    }

    /** 기억 새김: shown when the hero holds one or the item has an imprint. Engrave, restore, and the engraved lines. */
    function workspaceImprintHtml(item) {
        const have=game.currencies.memoryImprint||0, imprint=equipmentCrafting.normalizeImprint(item.imprint);
        if(!have&&!imprint)return '';
        return `<div class="cl-imprint" data-theme="special"><div class="cl-section-title">기억 새김 <small>보유 ${have}</small></div>
            <div class="cl-imprint-actions">${workspaceImprintButton('engrave',imprint?'다시 새기기':'지금 옵션 새기기',equipmentCrafting.engraveReason(game,item))}${imprint?workspaceImprintButton('restore','새긴 옵션으로 되돌리기',equipmentCrafting.restoreReason(item)):''}</div>
            ${imprint?`<details><summary>새긴 옵션 ${imprint.stats.length}줄</summary><ul>${imprint.stats.map(stat=>`<li>${esc(stat.statName||getStatName(stat.id))} +${esc(workspaceAffixValue(stat,stat.val))}${getItemAffixTierHtml(stat)}</li>`).join('')}</ul></details>`:''}</div>`;
    }
    const workspaceImprintButton=(command,label,reason)=>`<button type="button" data-command="${command}" ${reason?`disabled title="${esc(reason)}"`:''}>${label}</button>`;

    function workspaceGoalHtml() {
        if(!['add','reroll','fossil','value'].includes(recipe.kind))return '';
        const rule=goal.rules[0]||{statId:'',minTier:0}, choice=workspaceGoalChoice(rule);
        const tiers=Array.from({length:(choice?.maxTier||0)+1},(_,i)=>i);
        return `<section class="cl-goal"><div class="cl-section-title"><span class="cl-goal-help"><button type="button" id="cl-goal-help" aria-describedby="cl-goal-tooltip">목표 옵션</button><span role="tooltip" id="cl-goal-tooltip">확률은 변경되지 않으며, 목표 옵션 출현 시 강조됩니다. 태그는 그 태그가 붙은 줄 수를 셉니다.</span></span></div><div class="cl-goal-fields ${rule.tag?'has-count':''}">
            <label>옵션<select id="cl-goal-stat">${workspaceGoalTargetOptions(rule,choice)}</select></label>${workspaceGoalCountHtml(rule,choice)}
            <label>최소 티어<select id="cl-goal-tier" ${!choice?'disabled':''}>${tiers.map(tier=>`<option value="${tier}" ${tier===rule.minTier?'selected':''}>${tier===0?'티어 무관':`T${tier} 이상`}</option>`).join('')}</select></label></div>${workspaceExtraGoalsHtml()}</section>`;
    }

    function workspaceExtraGoalsHtml() {
        const rows=goal.rules.slice(1).map((rule,index)=>`<li>${esc(rule.tag?AFFIX_TAG_LABELS[rule.tag]+' '+rule.minCount+'줄':getStatName(rule.statId))}, ${rule.minTier?'T'+rule.minTier+' 이상':'티어 무관'} <button data-command="remove-goal:${index+1}" aria-label="목표 조건 제거">제거</button></li>`).join('');
        return `<ul class="cl-extra-goals">${rows}</ul><div class="cl-study-controls"><button data-command="add-goal" ${goal.rules.length>=3||!goal.rules.length?'disabled':''}>조건 추가</button><label>목표 조합 <select id="cl-goal-match"><option value="all" ${goalMatch==='all'?'selected':''}>모두 충족</option><option value="any" ${goalMatch==='any'?'selected':''}>하나 이상</option></select></label><button data-command="study">옵션과 확률 살펴보기</button></div>`;
    }

    /** Tags the craft can roll first, then single options; a goal it can no longer reach stays listed as the current one. */
    function workspaceGoalTargetOptions(rule,choice) {
        const key=rule.tag?'tag:'+rule.tag:rule.statId, name=rule.tag?`${AFFIX_TAG_LABELS[rule.tag]} 태그`:getStatName(rule.statId);
        const retained=!choice&&key?`<option selected disabled value="${esc(key)}">${esc(name)} (현재 목표)</option>`:'';
        const tags=workspaceGoalTags().map(row=>`<option value="tag:${row.id}" ${'tag:'+row.id===key?'selected':''}>${esc(row.name)} 태그</option>`).join('');
        const options=workspaceGoalOptions().map(row=>`<option value="${row.id}" ${row.id===key?'selected':''}>${esc(row.name)}</option>`).join('');
        return `<option value="">목표 선택</option>${retained}${tags?`<optgroup label="태그">${tags}</optgroup>`:''}<optgroup label="옵션">${options}</optgroup>`;
    }

    function workspaceGoalCountHtml(rule,choice) {
        if(!rule.tag)return '';
        const counts=Array.from({length:choice?.maxCount||rule.minCount},(_,i)=>i+1);
        return `<label>최소 줄 수<select id="cl-goal-count" ${!choice?'disabled':''}>${counts.map(count=>`<option value="${count}" ${count===rule.minCount?'selected':''}>${count}줄 이상</option>`).join('')}</select></label>`;
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
            <p class="cl-method-note" data-theme="${craftingCatalogUi.theme(recipe.key)}"><span class="cl-method-heading"><strong>선택 중 &ensp; ${craftingCatalogUi.styledName(recipe.key)}</strong><small>보유 ${game.currencies[recipe.key]}</small></span>${craftingCatalogUi.description(recipe.key)}</p>${spore?`<label class="cl-spore">홀씨 함께 사용<select id="cl-mode">${[['none','사용 안 함'],['fire','화염'],['cold','냉기'],['light','번개'],...(contentProgression.isUnlocked('advancedSpores')?[['chaos','카오스'],['damage','피해']]:[])].map(([key,label])=>`<option value="${key}" ${mode===key?'selected':''}>${label}</option>`).join('')}</select></label>`:''}${workspaceOmenHtml()}
            </section>`;
    }

    /** [value, label] for omen keys in a select: 허기 twice (접두, 접미). count(key) adds the held number. */
    function workspaceOmenOptions(keys,count=()=>'') {
        return keys.flatMap(key=>{const name=ORB_DB[key].name+count(key);
            return CRAFT_OMENS.effects[key].effect==='side'?[[`${key}:prefix`,`${name}, 접두`],[`${key}:suffix`,`${name}, 접미`]]:[[`${key}:prefix`,name]];});
    }
    const workspaceArmedOmen=()=>(game.craftOmen&&(game.currencies[game.craftOmen.key]||0)>0?game.craftOmen:null);
    /** The armed omen if it changes the selected craft (the live rule, equipmentCrafting.omenFor), or null. */
    function workspaceUsedOmen() {
        const item=selected();
        return item?equipmentCrafting.omenFor(game,equipmentCrafting.resolveAction(recipe.key,item.rarity),item,isSporeCraftEquipment(item)?mode:'none'):null;
    }
    /** 제작 뿌리 칸(data/items.js CRAFT_OMENS): 뿌리를 가졌을 때만. 아래 줄은 지금 고른 재화에 쓰이는지. */
    function workspaceOmenHtml() {
        const owned=CRAFT_OMENS.keys.filter(key=>(game.currencies[key]||0)>0), armed=workspaceArmedOmen();
        if(!owned.length)return '';
        const value=armed?`${armed.key}:${armed.side}`:'', name=ORB_DB[recipe.key].name;
        const options=[['','사용 안 함'],...workspaceOmenOptions(owned,key=>` (${game.currencies[key]})`)];
        const note=!armed?'':workspaceUsedOmen()?`다음 ${name} 사용에 쓰입니다.`:`${name}에는 쓰이지 않고 걸어 둔 채 남습니다.`;
        return `<label class="cl-spore" data-theme="omen">뿌리 함께 사용<select id="cl-omen">${options.map(([key,label])=>`<option value="${key}" ${key===value?'selected':''}>${esc(label)}</option>`).join('')}</select></label>${note?`<small class="cl-block">${esc(note)}</small>`:''}`;
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
        const omen=workspaceUsedOmen();
        if(omen)pieces.push(`${ORB_DB[omen.key].name} 1`);
        if(['enchantedHoney','venomStinger','voidChisel','ouroboros','oceanRerollShard'].includes(recipe.key))return '';
        return pieces.join(' + ');
    }

    function workspacePreviousOptionsHtml() {
        if(!last)return '';
        return `<details><summary>이전 옵션 보기</summary>${last.before.stats.map(stat=>`<div>${esc(stat.statName||getStatName(stat.id))} +${esc(workspaceAffixValue(stat,stat.val))}, T${stat.tier||0} <small>${esc(workspaceAffixRange(stat))}</small></div>`).join('')}</details>`;
    }

    function workspaceAutoReason() {
        if(!['reroll','add','fossil'].includes(recipe.kind))return '이 재화는 한 번씩 사용합니다.';
        if(!goal.rules.length)return '목표 미설정';
        if(matches(selected()))return '이미 목표를 달성했어요.';
        const reachable=goal.rules.map(workspaceGoalReachable);
        if(goalMatch==='all'?!reachable.every(Boolean):!reachable.some(Boolean))return '현재 재화로 나올 수 없는 목표입니다.';
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
            ${last?.meta.outcome?`<p class="cl-outcome">${esc(last.meta.outcome)}</p>`:''}
            ${last?craftingResultUi.getMetaRows(last).map(text=>`<p>${esc(text)}</p>`).join(''):''}
            ${hit?'<p>목표 옵션을 확보했어요</p>':''}${notice?`<p>${esc(notice)}</p>`:''}
            ${workspacePreviousOptionsHtml()}</div>
            <div class="cl-session"><b>${count}회 제작</b><small>${Object.entries(spent).map(([key,value])=>`${esc(ORB_DB[key]?.name||key)} ${value}`).join(', ')||'소모 없음'}</small></div></section>`;
    }

    function workspaceSyncTarget() {
        craftingCatalogUi.capture();
        if(owner!==game){workspaceStopAuto('');owner=game;current=null;goal=equipmentLootPolicy.normalizeTargets({});workspaceRestoreGoal();}
        const item=selected();
        if(current!==item){workspaceStopAuto('');current=item;last=null;acknowledged='';count=0;spent={};
            if(goalDialog?.open)goalDialog.close();
            if(item){recipe=recipes.find(row=>row.key===(item.rarity==='normal'?'magicBud':'formlessDew'));mode=game.sporeCraftModes[recipe.key]||'none';}
            }
        if(item)last=craftingResultLedger.getForItem(item)||last;
        return item;
    }

    function workspaceMount(controls) {
        if(controls){adapter=controls;extras=controls.details;}
        if(!root){root=document.getElementById('crafting-workspace');if(root)workspaceWire();}
        return root;
    }

    /** 고른 대상이 없으면 착용 장비 칸을 바로 보여 준다(2026-10-09: 작은 단추 둘뿐인 빈 화면이었다). 같은 화면이면 다시 쓰지 않는다. */
    function workspacePaintEmpty() {
        const empty='<div class="cl-empty">'+adapter.emptyState()+'</div>';
        if(renderKey!==empty){root.innerHTML=empty;renderKey=empty;}
    }

    function workspaceRender(reveal=false, controls) {
        if(!workspaceMount(controls))return;
        const item=workspaceSyncTarget();
        if(!root.getClientRects().length){if(auto)workspaceStopAuto('');return;}
        if(!item){workspacePaintEmpty();return;}
        const state=workspaceUseState(), stopped=held();
        const html=`<div class="cl-heading">${adapter.targetControls()}<button id="cl-inventory-open" data-command="inventory">재화 인벤토리</button></div>
            <div class="cl-workspace">${workspaceItemHtml()}<div class="cl-controls">${workspaceMethodsHtml()}${workspaceGoalHtml()}<div class="cl-action"><small>${esc(workspaceCostText())}</small>
            ${workspaceActionHtml(state,stopped)}<span class="cl-block">${!state.enabled?esc(state.reason):''}</span></div></div></div>${workspaceResultHtml()}`;
        workspaceReplaceMarkup(html,reveal);
        if(reveal)root.querySelector('.cl-item').classList.add('just-crafted');
        workspaceShowDialogs(reveal,stopped);
    }

    /** After a render: a waiting 성화의 뿌리 pick comes first, then the goal check of a fresh craft. */
    function workspaceShowDialogs(reveal,stopped) {
        const pending=equipmentCrafting.pendingChoice(game);
        if(pending)workspaceShowChoice(pending);
        else if(reveal&&stopped)workspaceShowGoalDialog();
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
        const actions={enchantedHoney:applyEnchantedHoneyToSelectedItem,venomStinger:applyVenomStingerToSelectedItem,voidChisel:applyVoidChiselToSelectedItem,ouroboros:applyWoodsmanTouchToSelectedItem,burningEmberBranch:emberCorruptionUi.use};
        if(actions[recipe.key])return actions[recipe.key]();
        if(itemInfluences.isAltarCurrency(recipe.key))return itemInfluencesUi.use(recipe.key);
        if(recipe.key==='oceanRerollShard')return rerollSingleBaseOption(selected(),'oceanRerollShard',1);
        if(sapCatalysts.isCatalyst(recipe.key))return sapCatalystsUi.use(recipe.key);
        return useCurrency(recipe.key);
    }

    function workspaceStopAuto(message) {
        auto=false;runId++;clearTimeout(timer);timer=0;notice=message;
    }

    function workspaceAutomaticStopReason() {
        if(document.hidden||!root.getClientRects().length||selected()!==current||owner!==game)return '화면을 벗어나 자동 사용을 중지했어요.';
        if(matches(selected()))return '목표 달성, 자동 사용을 멈췄어요.';
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

    /** A new target keeps the chosen tier and line count where the craft can still reach them. */
    function workspaceChooseGoal(target) {
        const previous=goal.rules[0]||{minTier:0};
        const choice=workspaceGoalChoice(target.startsWith('tag:')?{tag:target.slice(4)}:{statId:target})||{maxTier:0};
        workspaceSetGoal(target,Math.min(previous.minTier,choice.maxTier),Math.min(previous.minCount||2,choice.maxCount||1));
    }

    function workspaceChange(event) {
        if(auto)workspaceStopAuto('설정 변경으로 자동 사용을 멈췄어요.');
        if(event.target.id==='cl-limit'){limit=clampNumber(Math.floor(Number(event.target.value)||1),1,100);workspaceRender();return;}
        if(!workspaceSetMethodOption(event.target)&&!workspaceSetGoalOption(event.target))return;
        workspaceRender();
    }
    /** The spore and omen selects; false for any other control. */
    function workspaceSetMethodOption(target) {
        if(target.id==='cl-mode'){mode=target.value;game.sporeCraftModes[recipe.key]=mode;return true;}
        if(target.id==='cl-omen'){workspaceArmOmen(target.value);return true;}
        return false;
    }
    /** The goal controls; false for any other control. */
    function workspaceSetGoalOption(target) {
        if(target.id==='cl-goal-match'){goalMatch=target.value;goal.minMatches=goalMatch==='all'?goal.rules.length:1;workspaceSaveGoals();}
        else if(target.id==='cl-goal-stat')workspaceChooseGoal(target.value);
        else if(target.id==='cl-goal-tier')workspaceSetGoal(equipmentLootPolicy.ruleKey(goal.rules[0]),target.value,goal.rules[0].minCount);
        else if(target.id==='cl-goal-count')workspaceSetGoal(equipmentLootPolicy.ruleKey(goal.rules[0]),goal.rules[0].minTier,target.value);
        else return false;
        return true;
    }

    /** value 'key:side' from the omen select ('' disarms). */
    function workspaceArmOmen(value) {
        const [key,side]=value.split(':');
        notice=equipmentCrafting.armOmen(game,key,side).reason||'';
        queueImportantSave(180);
    }

    function workspaceEditGoals(action) {
        if(action==='add-goal'){
            if(goal.rules.length>=3)return;
            const keys=new Set(goal.rules.map(equipmentLootPolicy.ruleKey));
            const next=workspaceGoalOptions().find(row=>!keys.has(row.id));
            if(!next)return;
            goal.rules.unshift({statId:next.id,minTier:0,minValue:0});
        }else goal.rules.splice(Number(action.split(':')[1]),1);
        goal.minMatches=goalMatch==='all'?goal.rules.length:1;
        acknowledged='';workspaceSaveGoals();workspaceRender();
    }

    function workspaceStudyRows(rows) {
        return rows.map(row=>`<tr class="${row.allowed?'':'cl-pool-blocked'}" data-search="${esc(row.name+' '+row.tags.map(tag=>AFFIX_TAG_LABELS[tag]).join(' '))}"><td>${esc(row.name)}<small>${esc(row.tags.map(tag=>AFFIX_TAG_LABELS[tag]).join(', '))}</small></td><td>${{prefix:'접두',suffix:'접미',special:'특수'}[row.kind]}</td><td>${row.maxTier?'T1~'+row.maxTier:'고정'}</td><td>${row.allowed?row.weight:esc(row.reason)}</td></tr>`).join('');
    }

    function workspaceShowStudy() {
        if(!selected())return;
        studyRun++;
        if(!studyDialog){
            studyDialog=document.createElement('dialog');studyDialog.className='cl-study-dialog';
            studyDialog.setAttribute('aria-labelledby','cl-study-title');document.body.append(studyDialog);
            studyDialog.addEventListener('close',()=>studyRun++);
        }
        const item=JSON.parse(JSON.stringify(selected())), method={...recipe}, spore=mode;
        const rules=JSON.parse(JSON.stringify(goal)), rows=craftingGoalOptions.catalogue(item,method,spore);
        const reason=craftingGoalOptions.rehearsalReason(item,method,spore);
        studyDialog.innerHTML=`<header><div><h2 id="cl-study-title">제작 연구</h2><p>${esc(item.name)}, ${esc(method.label)}, 옵션 상한 T${getItemCraftTier(item)}</p></div><button data-study-close aria-label="제작 연구 닫기">닫기</button></header>
            <section class="cl-study-simulator"><h3>재화 없이 연습</h3><p>현재 장비에서 각각 새로 시작하는 독립 시도입니다. 실제 제작과 같은 굴림을 쓰며 장비와 재화는 변하지 않습니다.</p>
            ${workspaceStudyOmenHtml(item,method)}<div class="cl-study-controls"><button data-study-sample="1" ${reason?'disabled':''}>1회 연습</button><button data-study-sample="2000" ${reason||!rules.rules.length?'disabled':''}>목표 확률 2,000회 측정</button></div>
            <small>${esc(reason||('실제 제작 시: '+workspaceCostText()))}</small><div data-study-result aria-live="polite">표본 결과는 실제 획득 보장이 아닙니다.</div></section>
            <details open><summary>출현 후보와 차단된 옵션, ${rows.filter(row=>row.allowed).length}종 가능</summary>
            <label class="cl-study-search">이름이나 태그 검색 <input type="search" data-study-search></label><p>가중치가 큰 옵션일수록 선택되기 쉽습니다. 화석 보장 줄과 일반 줄은 따로 굴립니다. T가 높을수록 상위 옵션입니다.</p>
            <div class="cl-pool-scroll"><table><thead><tr><th>옵션</th><th>종류</th><th>티어</th><th>가중치 / 차단 이유</th></tr></thead><tbody>${workspaceStudyRows(rows)}</tbody></table></div></details>`;
        studyDialog.querySelector('[data-study-close]').onclick=()=>studyDialog.close();
        studyDialog.querySelector('[data-study-search]').oninput=event=>{
            const query=event.target.value.trim().toLowerCase();
            studyDialog.querySelectorAll('tr[data-search]').forEach(row=>row.hidden=!row.dataset.search.toLowerCase().includes(query));
        };
        studyDialog.querySelectorAll('[data-study-sample]').forEach(button=>button.onclick=()=>workspaceSampleStudy(item,method,spore,rules,Number(button.dataset.studySample)));
        studyDialog.showModal();
    }

    /** 연습에 걸 뿌리(깨어난 아틀라스에서): 이 재화를 바꾸는 뿌리라면 가지지 않아도 고른다. 처음에는 걸어 둔 뿌리. */
    function workspaceStudyOmenHtml(item,method) {
        const action=equipmentCrafting.resolveAction(method.key,item.rarity), armed=workspaceArmedOmen();
        const keys=atlasEndgame.awakened(game)?CRAFT_OMENS.keys.filter(key=>CRAFT_OMENS.effects[key].actions.includes(action)):[];
        if(!keys.length)return '';
        const value=armed?`${armed.key}:${armed.side}`:'';
        return `<label class="cl-study-omen">뿌리와 함께 연습 <select data-study-omen>${[['','뿌리 없이'],...workspaceOmenOptions(keys)].map(([key,label])=>`<option value="${key}" ${key===value?'selected':''}>${esc(label)}</option>`).join('')}</select></label>`;
    }
    /** The practice omen the study dialog shows ({ key, side, effect }), or null. */
    function workspaceStudyOmen() {
        const [key,side]=(studyDialog.querySelector('[data-study-omen]')?.value||'').split(':');
        return key?equipmentCrafting.omenSpec(key,side):null;
    }

    /** One practice: a result, or with 성화의 뿌리 (where the live craft would use it) as many as it lets the player pick from. */
    function workspaceRehearse(item,method,spore,omen) {
        const picks=omen&&omen.effect==='choice'&&equipmentCrafting.omenFits(item,equipmentCrafting.resolveAction(method.key,item.rarity),omen,spore)?CRAFT_OMENS.choices:1;
        return Array.from({length:picks},()=>craftingGoalOptions.rehearse(item,method,spore,omen));
    }
    const workspacePracticeHtml=results=>`<strong>연습 결과${results.length>1?`, ${results.length}개 가운데 고르기`:''}</strong>${results.map(result=>`<ul>${result.stats.map(stat=>`<li>${esc(stat.statName||getStatName(stat.id))} +${esc(formatValue(stat.id,stat.val))} (T${stat.tier||0})</li>`).join('')}</ul>`).join('')}`;

    /** The measurement: hits out of count (picks: results to pick from in each practice), its 95% range and the mean cost. */
    function workspaceSampleHtml(hits,count,picks) {
        const p=hits/count,z=1.96,den=1+z*z/count,centre=(p+z*z/(2*count))/den;
        const delta=z*Math.sqrt(p*(1-p)/count+z*z/(4*count*count))/den;
        return `<strong>목표 달성 ${hits}/${count}회${picks>1?`(${picks}개 가운데 하나라도)`:''}, ${(p*100).toFixed(2)}%</strong><p>95% 추정 범위 ${(Math.max(0,centre-delta)*100).toFixed(2)}~${(Math.min(1,centre+delta)*100).toFixed(2)}%, ${hits>=5?`평균 약 ${Math.round(1/p)}회 / 주 재화 ${Math.round(1/p)}개`:'관측이 적어 평균 비용 추정 보류'}</p>`;
    }

    async function workspaceSampleStudy(item, method, spore, rules, count) {
        const run=++studyRun, out=studyDialog.querySelector('[data-study-result]'), buttons=[...studyDialog.querySelectorAll('[data-study-sample]')];
        buttons.forEach(button=>button.disabled=true);
        let hits=0, results=[];
        const omen=workspaceStudyOmen();
        try{
            for(let i=0;i<count;i++){
                if(run!==studyRun||!studyDialog.open)return;
                results=workspaceRehearse(item,method,spore,omen);
                if(results.some(result=>equipmentLootPolicy.matches(result,{settings:{equipmentTargets:rules}})))hits++;
                if(i%50===49){out.textContent=`측정 중 ${i+1}/${count}`;await new Promise(resolve=>setTimeout(resolve,0));}
            }
            if(count===1)out.innerHTML=workspacePracticeHtml(results);
            else out.innerHTML=workspaceSampleHtml(hits,count,results.length);
        }catch(error){console.error('Craft rehearsal failed',error);out.textContent=`연습 실패: ${error.message}`;}
        finally{if(run===studyRun)buttons.forEach(button=>button.disabled=button.dataset.studySample!=='1'&&!rules.rules.length);}
    }

    /** 성화의 뿌리: the results side by side. The dialog stays until one is picked (no close button, Escape does nothing). */
    function workspaceShowChoice(pending) {
        if(!choiceDialog){
            choiceDialog=document.createElement('dialog');choiceDialog.className='cl-goal-dialog cl-choice-dialog';
            choiceDialog.setAttribute('aria-labelledby','cl-choice-title');document.body.append(choiceDialog);
            choiceDialog.addEventListener('cancel',event=>event.preventDefault());
            choiceDialog.addEventListener('click',workspaceChoiceClick);
        }
        if(choiceDialog.open)return;
        choiceDialog.innerHTML=`<header><small>${esc(ORB_DB.omenPyre.name)}</small><h2 id="cl-choice-title" tabindex="-1">결과 하나를 고르세요</h2><p>${esc(pending.item.baseName)}</p></header>
            <div class="cl-choice-list">${pending.options.map(workspaceChoiceHtml).join('')}</div>`;
        choiceDialog.showModal();choiceDialog.querySelector('h2').focus({preventScroll:true});
    }
    function workspaceChoiceHtml(option,index) {
        const lines=[...option.stats.map(stat=>`${esc(stat.statName||getStatName(stat.id))} +${esc(workspaceAffixValue(stat,stat.val))}${getItemAffixTierHtml(stat)}`),
            ...(option.chaosInfusion?[`혼돈 주입 ${esc(getStatName(option.chaosInfusion.id))} +${esc(workspaceAffixValue(option.chaosInfusion,option.chaosInfusion.val))}`]:[])];
        return `<section class="cl-choice"><h3>${index+1}번 결과</h3><ul>${lines.map(line=>`<li>${line}</li>`).join('')}</ul><button type="button" data-choice="${index}">이 결과로</button></section>`;
    }
    function workspaceChoiceClick(event) {
        const button=event.target.closest('[data-choice]');if(!button)return;
        const item=equipmentCrafting.pickChoice(game,Number(button.dataset.choice));
        choiceDialog.close();
        if(item){last=craftingResultLedger.amend(item)||last;queueImportantSave(180);}
        workspaceRender(!!item);
    }

    /** 기억 새김: engrave (asking first when it replaces an older imprint). */
    async function workspaceEngrave() {
        const item=selected();if(!item)return;
        if(item.imprint&&!await requestGameConfirmation('전에 새긴 옵션이 지금 옵션으로 바뀝니다.',{title:ORB_DB.memoryImprint.name,confirmLabel:'새기기'}))return;
        if(selected()===item)workspaceImprintDone(equipmentCrafting.engrave(game,item),'지금 옵션을 새겼습니다.');
    }
    /** 기억 새김: go back to the engraved lines (asking first; the imprint is used up). */
    async function workspaceRestore() {
        const item=selected();if(!item)return;
        if(!await requestGameConfirmation('지금 추가 옵션이 새긴 옵션으로 바뀌고, 새긴 기억은 사라집니다.',{title:ORB_DB.memoryImprint.name,confirmLabel:'되돌리기'})||selected()!==item)return;
        const result=equipmentCrafting.restoreImprint(item);
        if(result.ok){craftingResultLedger.clear();last=null;}
        workspaceImprintDone(result,'새긴 옵션으로 되돌렸습니다.');
    }
    function workspaceImprintDone(result,done) {
        notice=result.ok?done:result.reason;
        if(result.ok){addLog(`🍃 ${ORB_DB.memoryImprint.name}: ${done}`,'loot-magic');queueImportantSave(180);}
        workspaceRender(result.ok);
    }
    const WORKSPACE_COMMANDS={study:()=>workspaceShowStudy(),catalog:()=>workspaceOpenInventory(false,'',true),inventory:()=>workspaceOpenInventory(),
        pins:()=>workspaceOpenInventory(true),craft:()=>workspaceCraft(),ack:()=>workspaceShowGoalDialog(),engrave:()=>workspaceEngrave(),restore:()=>workspaceRestore()};

    async function workspaceCommand(action) {
        if(action==='add-goal'||action?.startsWith('remove-goal:'))return workspaceEditGoals(action);
        return Object.hasOwn(WORKSPACE_COMMANDS,action||'')?WORKSPACE_COMMANDS[action]():undefined;
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
