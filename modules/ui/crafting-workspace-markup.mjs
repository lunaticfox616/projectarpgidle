import { esc, selected, matches, workspaceCoin, workspaceGoalChoice, workspaceGoalTags, workspaceGoalOptions, workspaceArmedOmen, workspaceSporeReason, workspaceSideEffect, workspaceUsedOmen, workspaceAutoReason } from './crafting-workspace-selection.mjs';

export function workspaceAffixValue(ctx, stat, value, exactRange=false) {
    const fractional=['resPen','physIgnore','leech','spellLeech','regen','regenSuppress','leechRateCap','leechTotalCap','leechInstanceCap'].includes(stat.id)
        || [stat.val,stat.valMin,stat.valMax].some(number=>Number.isFinite(number)&&!Number.isInteger(number));
    return fractional?Number(value).toFixed(exactRange?2:1).replace(/(\.\d)0$/,'$1'):(0, ctx.deps.formatValue)(stat.id,value);
}

export function workspaceAffixRange(ctx, stat) {
    if(!Number.isFinite(stat.valMin)||!Number.isFinite(stat.valMax))return '';
    return `[${workspaceAffixValue(ctx, stat,stat.valMin,true)} ~ ${workspaceAffixValue(ctx, stat,stat.valMax,true)}]`;
}

/** ' is-max' when the roll sits at the top of its range (2026-11-08 사용자: 최대 옵션이면 강조). A fixed range ([5 ~ 5]) is always at
* its top, so it is not marked. */
export function workspaceMaxRollClass(ctx, stat) {
    const {val,valMin,valMax}=stat;
    return Number.isFinite(valMin)&&Number.isFinite(valMax)&&valMax>valMin&&val>=valMax-1e-9?' is-max':'';
}

/** One base option in the base line: the name in its stat colour like the added options, the value, its range. */
export function workspaceBaseStatHtml(ctx, item, stat) {
    return `<span class="cl-base-stat${workspaceMaxRollClass(ctx, stat)}" style="--cl-affix-tone:${(0, ctx.deps.getItemStatToneColor)(stat.id)}"><span class="cl-base-name">${esc(ctx, stat.statName||(0, ctx.deps.getStatName)(stat.id))}</span> `
        +`<b class="cl-base-value">${esc(ctx, (0, ctx.deps.formatSignedValue)(stat.id,stat.val))}</b> <span class="cl-affix-range">${esc(ctx, workspaceAffixRange(ctx, stat))}</span>${ctx.deps.itemInfluencesUi.lineBadgeHtml(item,stat)}</span>`;
}

export function workspaceAffixQuality(ctx, stat, changed) {
    if(!changed||(0, ctx.deps.isFixedEquipmentAffix)(stat))return '';
    const mod=(0, ctx.deps.findStoredEquipmentAffix)(selected(ctx),stat);
    const cap=Math.min((0, ctx.deps.getItemCraftTier)(selected(ctx)),mod?.tierValues?.length||20);
    if(stat.tier>=cap)return 'is-max-tier';
    return stat.tier>=10?'is-high-tier':'';
}

export function workspaceAffixNotes(ctx, stat, prior, feedback) {
    const { changed, hit, quality } = feedback;
    const kept=!stat.lockedByHoney&&!stat.lockedByRift&&ctx.deps.equipmentCrafting.keptOnReroll(selected(ctx),stat);
    return [stat.lockedByHoney?'벌꿀 고정':'',stat.lockedByRift?'균열 고정':'',kept?'다음 재굴림 보존':'',
        changed&&prior?(0, ctx.deps._t)('이전 +{prior}', { prior: workspaceAffixValue(ctx, prior,prior.val) }):'',hit?'목표 일치':'',
        quality==='is-max-tier'?'최고 티어':'',ctx.deps.emberCorruptionUi.scaleNote(stat)].filter(Boolean)
        .map(note=>note==='목표 일치'?'<strong class="cl-goal-match">목표 일치</strong>':esc(ctx, note)).join(', ');
}

export function workspaceAffixHtml(ctx, stat, index) {
    const prior=ctx.state.last?.before.stats.find(row=>row.id===stat.id);
    const changed=ctx.state.last && JSON.stringify(prior)!==JSON.stringify((0, ctx.deps.copyCraftResultStat)(stat));
    const hit=ctx.state.goal.rules.some(rule=>ctx.deps.equipmentLootPolicy.lineMatchesRule(stat,rule));
    const quality=workspaceAffixQuality(ctx, stat,changed);
    return `<li class="cl-affix ${hit?'is-target':''} ${changed?'is-changed':''} ${quality}" data-affix="${index}">
            <div><span style="--cl-affix-tone:${(0, ctx.deps.getItemStatToneColor)(stat.id)}">${esc(ctx, stat.statName||(0, ctx.deps.getStatName)(stat.id))} <span class="cl-affix-value${workspaceMaxRollClass(ctx, stat)}"><b>+${esc(ctx, workspaceAffixValue(ctx, stat,stat.val))}</b> <span class="cl-affix-range">${esc(ctx, workspaceAffixRange(ctx, stat))}</span></span></span>
            <span class="cl-tier">${(0, ctx.deps.getItemAffixTierHtml)(stat)}${ctx.deps.itemInfluencesUi.lineBadgeHtml(selected(ctx),stat)}</span></div>
            <small>${workspaceAffixNotes(ctx, stat,prior,{changed,hit,quality})}</small></li>`;
}

/** 허리띠의 액막이 칸 수(축복의 꽃잎이 다시 굴린다, js/colony-wards.js rerollBelt): 기본 옵션 줄 맨 앞에 "액막이 칸 +2 [1 ~ 3]". */
export function workspaceWardSlotsText(ctx, item) {
    const slots=ctx.deps.colonyWards.beltRoll(item),range=ctx.deps.COLONY_WARD_RULES.beltSlots;
    return slots?(0, ctx.deps._t)('액막이 칸 +{slots} [{min} ~ {max}]', { slots, min: range.min, max: range.max }):'';
}

export function workspaceItemHtml(ctx) {
    const item=selected(ctx), sources=new Set(item.stats.map(stat=>ctx.deps.equipmentCrafting.getSource(stat)));
    return `<section id="forge-item-display" class="cl-item ${matches(ctx, item)?'goal-hit':''}"><div class="cl-item-head"><div class="cl-art"><img src="${esc(ctx, (0, ctx.deps.getEquipmentGridVisualAsset)(item))}" alt="${esc(ctx, (0, ctx.deps.getItemSlotDisplayLabel)(item))}"></div>
            <div><small>${(0, ctx.deps._t)('제작 중인 장비 &ensp; T{item}', { item: (0, ctx.deps.getItemCraftTier)(item) })}</small><h2>${esc(ctx, (0, ctx.deps.getItemDisplayName)(item))}${ctx.api.imprintMark(item)}</h2>${ctx.deps.itemInfluencesUi.tagsHtml(item)}<span>${(0, ctx.deps._t)('{baseName} &ensp; 추가 옵션 {item}/6', { baseName: esc(ctx, (0, ctx.deps._t)(item.baseName)), item: (0, ctx.deps.getItemExplicitOptionCount)(item) })}</span></div></div>
            <div class="cl-sources"><span class="${sources.has('spore')?'filled':''}">${(0, ctx.deps._t)('수확 {value}/1', { value: sources.has('spore')?'1':'0' })}</span><span class="${sources.has('fossil')?'filled':''}">${(0, ctx.deps._t)('화석 {value}/1', { value: sources.has('fossil')?'1':'0' })}</span></div>
            <div class="cl-section-title">${(0, ctx.deps._t)('추가 옵션')}</div><ul class="cl-affixes">${item.stats.map(ctx.handlers.workspaceAffixHtml).join('')}${item.chaosInfusion?`<li class="cl-affix">${(0, ctx.deps._t)('혼돈 주입 {id} +{chaosInfusion}', { id: esc(ctx, (0, ctx.deps.getStatName)(item.chaosInfusion.id)), chaosInfusion: esc(ctx, workspaceAffixValue(ctx, item.chaosInfusion,item.chaosInfusion.val)) })}</li>`:''}</ul>
            <div class="cl-base">기본 옵션 &ensp; ${[esc(ctx, workspaceWardSlotsText(ctx, item)),...(item.baseStats||[]).map(stat=>workspaceBaseStatHtml(ctx, item,stat))].filter(Boolean).join(' / ')}</div>${workspaceImprintHtml(ctx, item)}${workspaceEncroachmentHtml(ctx, item)}${ctx.deps.emberCorruptionUi.cardHtml(item)}
            ${ctx.state.extras}</section>`;
}

/** 기억 조각칼: shown when the hero holds one or the item is engraved (기억 새겨짐). Engrave, restore, and the engraved lines. */
export function workspaceImprintHtml(ctx, item) {
    const have=ctx.deps.game.currencies.memoryImprint||0, imprint=ctx.deps.equipmentCrafting.normalizeImprint(item.imprint);
    if(!have&&!imprint)return '';
    return `<div class="cl-imprint" data-theme="special"><div class="cl-section-title"><span>${(0, ctx.deps._t)('{value}기억 조각칼', { value: workspaceCoin(ctx, 'memoryImprint') })}</span><small>${(0, ctx.deps._t)('보유 {have}', { have })}</small></div>
            <div class="cl-imprint-actions">${workspaceImprintButton(ctx, 'engrave',imprint?'다시 새기기':'지금 옵션 새기기',ctx.deps.equipmentCrafting.engraveReason(ctx.deps.game,item))}${imprint?workspaceImprintButton(ctx, 'restore','새긴 옵션으로 되돌리기',ctx.deps.equipmentCrafting.restoreReason(item)):''}</div>
            ${imprint?`<details><summary>${(0, ctx.deps._t)('기억 새겨짐, 새긴 옵션 {length}줄', { length: imprint.stats.length })}</summary><ul>${imprint.stats.map(stat=>`<li>${esc(ctx, stat.statName||(0, ctx.deps.getStatName)(stat.id))} +${esc(ctx, workspaceAffixValue(ctx, stat,stat.val))}${(0, ctx.deps.getItemAffixTierHtml)(stat)}</li>`).join('')}</ul></details>`:''}</div>`;
}

export function workspaceGoalHtml(ctx) {
    if(!['add','reroll','fossil','value'].includes(ctx.state.recipe.kind))return '';
    const rule=ctx.state.goal.rules[0]||{statId:'',minTier:0}, choice=workspaceGoalChoice(ctx, rule);
    const tiers=Array.from({length:(choice?.maxTier||0)+1},(_,i)=>i);
    return `<section class="cl-goal"><div class="cl-section-title"><span class="cl-goal-help"><button type="button" id="cl-goal-help" aria-describedby="cl-goal-tooltip">${(0, ctx.deps._t)('목표 옵션')}</button><span role="tooltip" id="cl-goal-tooltip">${(0, ctx.deps._t)('확률은 변경되지 않으며, 목표 옵션 출현 시 강조됩니다. 태그는 그 태그가 붙은 줄 수를 셉니다.')}</span></span></div><div class="cl-goal-fields ${rule.tag?'has-count':''}">
            <label>${(0, ctx.deps._t)('옵션')}<select id="cl-goal-stat">${workspaceGoalTargetOptions(ctx, rule,choice)}</select></label>${workspaceGoalCountHtml(ctx, rule,choice)}
            <label>${(0, ctx.deps._t)('최소 티어')}<select id="cl-goal-tier" ${!choice?'disabled':''}>${tiers.map(tier=>`<option value="${tier}" ${tier===rule.minTier?'selected':''}>${tier===0?(0, ctx.deps._t)('티어 무관'):(0, ctx.deps._t)('T{tier} 이상', { tier })}</option>`).join('')}</select></label></div>${workspaceExtraGoalsHtml(ctx)}</section>`;
}

export function workspaceExtraGoalsHtml(ctx) {
    const rows=ctx.state.goal.rules.slice(1).map((rule,index)=>`<li>${esc(ctx, rule.tag?ctx.deps.AFFIX_TAG_LABELS[rule.tag]+' '+rule.minCount+'줄':(0, ctx.deps.getStatName)(rule.statId))}, ${rule.minTier?'T'+rule.minTier+' 이상':(0, ctx.deps._t)('티어 무관')} <button data-command="remove-goal:${index+1}" aria-label="${(0, ctx.deps._t)('목표 조건 제거')}">${(0, ctx.deps._t)('제거')}</button></li>`).join('');
    const simulator=ctx.deps.contentProgression.status('craftSimulator');
    return `<ul class="cl-extra-goals">${rows}</ul><div class="cl-study-controls"><button data-command="add-goal" ${ctx.state.goal.rules.length>=3||!ctx.state.goal.rules.length?'disabled':''}>${(0, ctx.deps._t)('조건 추가')}</button><label>${(0, ctx.deps._t)('목표 조합')} <select id="cl-goal-match"><option value="all" ${ctx.state.goalMatch==='all'?'selected':''}>${(0, ctx.deps._t)('모두 충족')}</option><option value="any" ${ctx.state.goalMatch==='any'?'selected':''}>${(0, ctx.deps._t)('하나 이상')}</option></select></label><button data-command="study" ${simulator.unlocked?'':`disabled data-tip="${esc(ctx, simulator.reason)}"`}>${(0, ctx.deps._t)('제작 시뮬레이터{value}', { value: simulator.unlocked?'':(0, ctx.deps._t)(' (잠김)') })}</button></div>`;
}

/** Tags the craft can roll first, then single options; a goal it can no longer reach stays listed as the current one. */
export function workspaceGoalTargetOptions(ctx, rule, choice) {
    const key=rule.tag?'tag:'+rule.tag:rule.statId, name=rule.tag?(0, ctx.deps._t)('{AFFIX_TAG_LABELS} 태그', { AFFIX_TAG_LABELS: ctx.deps.AFFIX_TAG_LABELS[rule.tag] }):(0, ctx.deps.getStatName)(rule.statId);
    const retained=!choice&&key?`<option selected disabled value="${esc(ctx, key)}">${(0, ctx.deps._t)('{name} (현재 목표)', { name: esc(ctx, name) })}</option>`:'';
    const tags=workspaceGoalTags(ctx).map(row=>`<option value="tag:${row.id}" ${'tag:'+row.id===key?'selected':''}>${(0, ctx.deps._t)('{name} 태그', { name: esc(ctx, (0, ctx.deps._t)(row.name)) })}</option>`).join('');
    const options=workspaceGoalOptions(ctx).map(row=>`<option value="${row.id}" ${row.id===key?'selected':''}>${esc(ctx, (0, ctx.deps._t)(row.name))}</option>`).join('');
    return `<option value="">${(0, ctx.deps._t)('목표 선택')}</option>${retained}${tags?`<optgroup label="${(0, ctx.deps._t)('태그')}">${tags}</optgroup>`:''}<optgroup label="${(0, ctx.deps._t)('옵션')}">${options}</optgroup>`;
}

export function workspaceGoalCountHtml(ctx, rule, choice) {
    if(!rule.tag)return '';
    const counts=Array.from({length:choice?.maxCount||rule.minCount},(_,i)=>i+1);
    return `<label>${(0, ctx.deps._t)('최소 줄 수')}<select id="cl-goal-count" ${!choice?'disabled':''}>${counts.map(count=>`<option value="${count}" ${count===rule.minCount?'selected':''}>${(0, ctx.deps._t)('{count}줄 이상', { count })}</option>`).join('')}</select></label>`;
}

export function workspaceEncroachmentHtml(ctx, item) {
    if(!item.encroached)return '';
    const stat=item.encroached.chosen;
    if(item.encroached.liberated&&stat)return `<div class="cl-base">${(0, ctx.deps._t)('잠식 {statName} +{id}', { statName: esc(ctx, stat.statName||(0, ctx.deps.getStatName)(stat.id)), id: esc(ctx, (0, ctx.deps.formatValue)(stat.id,stat.val)) })}</div>`;
    return '<div class="cl-base">잠식 미해방 <button type="button" onclick="liberateSelectedEncroachedItem()">해방</button></div>';
}

/** 재화 보관함과 고른 재화. 오른쪽 아래에도 사용 단추가 있다(2026-11-08 사용자: 목표 조건을 많이 달면 아래 단추까지 내려가야 했다). */
export function workspaceMethodsHtml(ctx, state, stopped) {
    return `<section class="cl-methods"><div class="cl-section-title">${(0, ctx.deps._t)('재화 보관함')}</div>${ctx.deps.craftingStashUi.html({recipe:ctx.state.recipe.key,omen:workspaceArmedOmen(ctx)?.key||''})}
            <p class="cl-method-note" data-theme="${ctx.deps.craftingCatalogUi.theme(ctx.state.recipe.key)}"><span class="cl-method-heading"><strong>${(0, ctx.deps._t)('선택 중 &ensp; {styledName}', { styledName: ctx.deps.craftingCatalogUi.styledName(ctx.state.recipe.key) })}</strong><small>${(0, ctx.deps._t)('보유 {currencies}', { currencies: ctx.deps.game.currencies[ctx.state.recipe.key] })}</small></span>${ctx.deps.craftingCatalogUi.description(ctx.state.recipe.key)}</p>${workspaceSporeHtml(ctx)}${workspaceOmenHtml(ctx)}
            <div class="cl-method-use">${workspacePrimaryButtonHtml(ctx, state,stopped)}</div></section>`;
}

export function workspaceAddonNote(ctx, reason, effect, clear='', shortage=false) {
    return `<p class="cl-addon-note ${shortage?'is-shortage':''}" aria-live="polite">${esc(ctx, effect)}${reason?`<br>${esc(ctx, reason)}`:''}${clear}</p>`;
}

/** 계열과 그 값(그 색의 식물, data/stump-box.js STUMP_BOX_HARVEST_CRAFT)과 가진 수. */
export function workspaceSporeOption(ctx, value) {
    const key=value==='none'?'':(0, ctx.deps.getSporeCraftPriceKey)(value);
    const label=key?`${ctx.state.SPORE_LABELS[value]} 계열, ${ctx.deps.stumpBox.harvestPriceName(key)} ${ctx.deps.stumpBox.harvestPriceHeld(ctx.deps.game,key)}개`:'사용 안 함';
    return `<option value="${value}" ${ctx.state.mode===value?'selected':''}>${esc(ctx, label)}</option>`;
}

export function workspaceSporeNote(ctx) {
    if(ctx.state.mode==='none')return '';
    const reason=workspaceSporeReason(ctx, ctx.state.mode);
    const effect=(0, ctx.deps._t)('{SPORE_LABELS} 계열 옵션 1줄 보장', { SPORE_LABELS: ctx.state.SPORE_LABELS[ctx.state.mode] });
    return workspaceAddonNote(ctx, reason,effect,reason?` <button data-command="clear-spore">${(0, ctx.deps._t)('수확 사용 해제')}</button>`:'',!(0, ctx.deps.hasSporeCraftCost)(ctx.state.mode));
}

/** Only families with a plant of their colour appear; a depleted selection keeps a warning and an explicit off button. */
export function workspaceSporeHtml(ctx) {
    if(!(0, ctx.deps.isSporeCraftEquipment)(selected(ctx))||!['add','reroll'].includes(ctx.state.recipe.kind))return '';
    const available=(0, ctx.deps.getAvailableSporeCraftModes)().filter(value=>value!=='none'&&(0, ctx.deps.hasSporeCraftCost)(value));
    const note=workspaceSporeNote(ctx);
    if(!available.length)return note;
    const values=['none',...available];
    if(!values.includes(ctx.state.mode))values.push(ctx.state.mode);
    return `<label class="cl-spore">${(0, ctx.deps._t)('수확 함께 사용')}<select id="cl-mode">${values.map(ctx.handlers.workspaceSporeOption).join('')}</select></label>${note}`;
}

/** [value, label] for omen keys in a select: 허기 twice (접두, 접미). count(key) adds the held number. */
export function workspaceOmenOptions(ctx, keys, count=()=>'') {
    return keys.flatMap(key=>{const name=(0, ctx.deps._t)(ctx.deps.ORB_DB[key].name)+count(key);
        return ctx.deps.CRAFT_OMENS.effects[key].effect==='side'?[[`${key}:prefix`,(0, ctx.deps._t)('{name}, 접두', { name })],[`${key}:suffix`,(0, ctx.deps._t)('{name}, 접미', { name })]]:[[`${key}:prefix`,name]];});
}

/** 제작 뿌리 칸(data/items.js CRAFT_OMENS): 뿌리를 가졌을 때만. 아래 줄은 지금 고른 재화에 쓰이는지. */
export function workspaceOmenHtml(ctx) {
    const owned=ctx.deps.CRAFT_OMENS.keys.filter(key=>(ctx.deps.game.currencies[key]||0)>0), armed=workspaceArmedOmen(ctx);
    if(!owned.length)return '';
    const value=armed?`${armed.key}:${armed.side}`:'';
    const options=[['','사용 안 함'],...workspaceOmenOptions(ctx, owned,key=>` (${ctx.deps.game.currencies[key]})`)];
    const note=workspaceOmenNote(ctx, armed);
    return `<label class="cl-spore" data-theme="omen"><span>${(0, ctx.deps._t)('{value}뿌리 함께 사용', { value: armed?workspaceCoin(ctx, armed.key):'' })}</span><select id="cl-omen">${options.map(([key,label])=>`<option value="${key}" ${key===value?'selected':''}>${esc(ctx, label)}</option>`).join('')}</select></label>${note}`;
}

export function workspaceOmenNote(ctx, armed) {
    if(!armed)return '';
    const spec=ctx.deps.equipmentCrafting.omenSpec(armed.key,armed.side);
    const action=ctx.deps.equipmentCrafting.resolveAction(ctx.state.recipe.key,selected(ctx).rarity);
    const reason=ctx.deps.equipmentCrafting.omenReason(selected(ctx),action,spec,ctx.state.mode);
    const effect=spec.effect==='side'?workspaceSideEffect(ctx, spec):ctx.deps.ORB_DB[armed.key].desc;
    return workspaceAddonNote(ctx, reason,effect);
}

export function workspaceCostText(ctx) {
    const pieces=['재화 1개 소모'];
    if((0, ctx.deps.isSporeCraftEquipment)(selected(ctx))&&['add','reroll'].includes(ctx.state.recipe.kind)&&ctx.state.mode!=='none') {
        pieces.push(`${ctx.deps.stumpBox.harvestPriceName((0, ctx.deps.getSporeCraftPriceKey)(ctx.state.mode))} 1`);
    }
    const omen=workspaceUsedOmen(ctx);
    if(omen)pieces.push(`${(0, ctx.deps._t)(ctx.deps.ORB_DB[omen.key].name)} 1`);
    if(['enchantedHoney','venomStinger','voidChisel','ouroboros','oceanRerollShard'].includes(ctx.state.recipe.key))return '';
    return pieces.join(' + ');
}

export function workspacePreviousOptionsHtml(ctx) {
    if(!ctx.state.last)return '';
    return `<details><summary>${(0, ctx.deps._t)('이전 옵션 보기')}</summary>${ctx.state.last.before.stats.map(stat=>`<div>${esc(ctx, stat.statName||(0, ctx.deps.getStatName)(stat.id))} +${esc(ctx, workspaceAffixValue(ctx, stat,stat.val))}, T${stat.tier||0} <small>${esc(ctx, workspaceAffixRange(ctx, stat))}</small></div>`).join('')}</details>`;
}

/** The main button: stop the auto run, acknowledge a goal hit, or use the chosen currency once. Drawn twice: under the currency
* stash (workspaceMethodsHtml) and under the goal options (workspaceActionHtml). */
export function workspacePrimaryButtonHtml(ctx, state, stopped) {
    if(ctx.state.auto)return `<button data-command="stop" class="cl-primary cl-stop">${(0, ctx.deps._t)('자동 사용 중지 {runCount}/{limit}회', { runCount: ctx.state.runCount, limit: ctx.state.limit })}</button>`;
    if(stopped)return '<button data-command="ack" class="cl-primary">목표 옵션 확인</button>';
    return `<button data-command="craft" data-craft-resource="${ctx.state.recipe.key}" class="cl-primary" aria-label="${(0, ctx.deps._t)('{name} 1회 사용', { name: esc(ctx, (0, ctx.deps._t)(ctx.deps.ORB_DB[ctx.state.recipe.key].name)) })}" ${ctx.state.busy||!state.enabled?'disabled':''}>${ctx.state.busy?(0, ctx.deps._t)('사용 중…'):(0, ctx.deps._t)('1회 사용')}</button>`;
}

export function workspaceActionHtml(ctx, state, stopped) {
    const button=workspacePrimaryButtonHtml(ctx, state,stopped);
    if(ctx.state.auto||!['reroll','add','fossil'].includes(ctx.state.recipe.kind))return button;
    return button+workspaceAutoControlsHtml(ctx, state);
}

export function workspaceAutoControlsHtml(ctx, state) {
    const reason=workspaceAutoReason(ctx);
    return `<div class="cl-auto"><label>${(0, ctx.deps._t)('최대')} <input id="cl-limit" type="number" min="1" max="100" value="${ctx.state.limit}" aria-label="${(0, ctx.deps._t)('자동 사용 최대 횟수')}">${(0, ctx.deps._t)('회')}</label>
            <button data-command="auto" ${ctx.state.busy||!state.enabled||reason?'disabled':''}><span class="px-center">${(0, ctx.deps._t)('목표까지 자동 사용')}</span></button></div>${reason&&ctx.state.goal.rules.length?`<small>${esc(ctx, reason)}</small>`:''}`;
}

export function workspaceResultHtml(ctx) {
    const hit=matches(ctx, selected(ctx));
    return `<section class="cl-result ${hit?'goal-hit':''}" aria-live="polite"><div><h3>${(0, ctx.deps._t)('제작 경과')}</h3>
            ${ctx.state.last?.meta.outcome?`<p class="cl-outcome">${esc(ctx, ctx.state.last.meta.outcome)}</p>`:''}
            ${ctx.state.last?ctx.deps.craftingResultUi.getMetaRows(ctx.state.last).map(text=>`<p>${esc(ctx, text)}</p>`).join(''):''}
            ${hit?(0, ctx.deps._t)('<p>목표 옵션을 확보했어요</p>'):''}${ctx.state.notice?`<p>${esc(ctx, ctx.state.notice)}</p>`:''}
            ${workspacePreviousOptionsHtml(ctx)}</div>
            <div class="cl-session"><b>${(0, ctx.deps._t)('{count}회 제작', { count: ctx.state.count })}</b><small>${Object.entries(ctx.state.spent).map(([key,value])=>`${esc(ctx, ctx.deps.ORB_DB[key]?.name||key)} ${value}`).join(', ')||(0, ctx.deps._t)('소모 없음')}</small></div></section>`;
}

export function workspaceImprintButton(ctx, command, label, reason) { return `<button type="button" data-command="${command}" ${reason?`disabled data-tip="${esc(ctx, reason)}"`:''}>${label}</button>`; }
