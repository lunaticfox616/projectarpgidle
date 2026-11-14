import { selected, workspaceRestoreGoal, workspaceUseState, held, esc, signature, matches, workspaceAutoReason, workspaceGoalChoice, workspaceSetGoal, workspaceSaveGoals, workspaceArmedOmen, workspaceGoalOptions, workspaceCoin } from './crafting-workspace-selection.mjs';
import { workspaceItemHtml, workspaceMethodsHtml, workspaceGoalHtml, workspaceCostText, workspaceActionHtml, workspaceResultHtml, workspaceAffixValue } from './crafting-workspace-markup.mjs';

export function workspaceOpenInventory(ctx, inspect='', craftingOnly=false) {
    if(ctx.state.auto){workspaceStopAuto(ctx, '재화 인벤토리를 열어 자동 사용을 멈췄어요.');workspaceRender(ctx);}
    ctx.deps.craftingCatalogUi.open(ctx.state.recipes,ctx.handlers.workspacePickResource,{active:ctx.state.recipe.key,inspect:inspect,craftingOnly:craftingOnly,useState:ctx.handlers.workspaceResourceState});
}

export function workspacePickResource(ctx, key) {
    if(['fossil','fossilPrimal','fossilAncientPrimal'].includes(key)){
        const materials=ctx.deps.document.getElementById('cl-materials');materials.open=true;
        (0, ctx.deps.renderFossilWorkbench)(selected(ctx));materials.scrollIntoView({block:'nearest'});return;
    }
    ctx.state.recipe=ctx.state.recipes.find(row=>row.key===key);ctx.state.mode=ctx.deps.game.sporeCraftModes[key]||'none';
    workspaceRender(ctx);
}

export function workspaceSyncTarget(ctx) {
    ctx.deps.craftingCatalogUi.capture();
    if(ctx.state.owner!==ctx.deps.game){workspaceStopAuto(ctx, '');ctx.state.owner=ctx.deps.game;ctx.state.current=null;ctx.state.goal=ctx.deps.equipmentLootPolicy.normalizeTargets({});workspaceRestoreGoal(ctx);}
    const item=selected(ctx);
    if(ctx.state.current!==item){workspaceStopAuto(ctx, '');ctx.state.current=item;ctx.state.last=null;ctx.state.acknowledged='';ctx.state.count=0;ctx.state.spent={};
        if(ctx.state.goalDialog?.open)ctx.state.goalDialog.close();
        if(item){ctx.state.recipe=ctx.state.recipes.find(row=>row.key===(item.rarity==='normal'?'magicBud':'formlessDew'));ctx.state.mode=ctx.deps.game.sporeCraftModes[ctx.state.recipe.key]||'none';}
    }
    if(item)ctx.state.last=ctx.deps.craftingResultLedger.getForItem(item)||ctx.state.last;
    return item;
}

export function workspaceMount(ctx, controls) {
    if(controls){ctx.state.adapter=controls;ctx.state.extras=controls.details;}
    if(!ctx.state.root){ctx.state.root=ctx.deps.document.getElementById('crafting-workspace');if(ctx.state.root)workspaceWire(ctx);}
    return ctx.state.root;
}

/** 고른 대상이 없으면 착용 장비 칸을 바로 보여 준다(2026-10-09: 작은 단추 둘뿐인 빈 화면이었다). 같은 화면이면 다시 쓰지 않는다. */
export function workspacePaintEmpty(ctx) {
    const empty='<div class="cl-empty">'+ctx.state.adapter.emptyState()+'</div>';
    if(ctx.state.renderKey!==empty){ctx.state.root.innerHTML=empty;ctx.state.renderKey=empty;}
}

/** Whether the workspace is on screen, read from classes the way js/ui.js getRenderingUiTabIds reads them: asking the box
* (getClientRects) laid out the whole equipment window that had just opened, 27ms thrown away on every open (2026-10-31 profile). */
export function workspaceShown(ctx) {
    const panel=ctx.state.root.closest('.subtab-content'), pane=ctx.state.root.closest('.tab-content');
    if(!panel||!pane||!panel.classList.contains('active')||ctx.deps.document.hidden)return false;
    if(pane.classList.contains('ui-window')&&ctx.deps.document.body.classList.contains('desktop-windowed-ui'))return pane.classList.contains('ui-window-open')&&!pane.classList.contains('ui-window-minimized');
    return pane.classList.contains('active');
}

export function workspaceRender(ctx, reveal=false, controls) {
    if(!workspaceMount(ctx, controls))return;
    const item=workspaceSyncTarget(ctx);
    if(!workspaceShown(ctx)){if(ctx.state.auto)workspaceStopAuto(ctx, '');return;}
    if(!item){workspacePaintEmpty(ctx);return;}
    const state=workspaceUseState(ctx), stopped=held(ctx);
    const html=`<div class="cl-heading">${ctx.state.adapter.targetControls()}<button id="cl-inventory-open" data-command="inventory">${(0, ctx.deps._t)('재화 인벤토리')}</button></div>
            <div class="cl-workspace">${workspaceItemHtml(ctx)}<div class="cl-controls">${workspaceMethodsHtml(ctx, state,stopped)}${workspaceGoalHtml(ctx)}<div class="cl-action"><small>${esc(ctx, workspaceCostText(ctx))}</small>
            ${workspaceActionHtml(ctx, state,stopped)}<span class="cl-block cl-error" role="status">${!state.enabled?`<span class="px-center">${esc(ctx, state.reason)}</span>`:''}</span></div></div></div>${workspaceResultHtml(ctx)}`;
    workspaceReplaceMarkup(ctx, html,reveal);
    if(reveal)ctx.state.root.querySelector('.cl-item').classList.add('just-crafted');
    workspaceShowDialogs(ctx, reveal,stopped);
}

/** After a render: a waiting 성화의 뿌리 pick comes first, then the goal check of a fresh craft. */
export function workspaceShowDialogs(ctx, reveal, stopped) {
    const pending=ctx.deps.equipmentCrafting.pendingChoice(ctx.deps.game);
    if(pending)workspaceShowChoice(ctx, pending);
    else if(reveal&&stopped)workspaceShowGoalDialog(ctx);
}

export function workspaceReplaceMarkup(ctx, html, reveal) {
    if(html===ctx.state.renderKey&&!reveal)return;
    const focusId=ctx.state.root.querySelector(':focus')?.id;
    ctx.state.root.innerHTML=html;ctx.state.renderKey=html;
    if(focusId)ctx.state.root.querySelector('#'+focusId)?.focus({preventScroll:true});
}

export function workspaceShowGoalDialog(ctx) {
    if(ctx.state.goalDialog?.open)return;
    if(!ctx.state.goalDialog){
        ctx.state.goalDialog=ctx.deps.document.createElement('dialog');ctx.state.goalDialog.className='cl-goal-dialog';
        ctx.state.goalDialog.setAttribute('aria-labelledby','cl-goal-dialog-title');
        ctx.state.goalDialog.addEventListener('cancel',event=>event.preventDefault());
        ctx.deps.window.addEventListener('keydown',event=>{
            if(!ctx.state.goalDialog.open)return;
            event.stopImmediatePropagation();
            if(event.key==='Escape'||event.repeat)event.preventDefault();
            },true);
        ctx.deps.document.body.append(ctx.state.goalDialog);
    }
    const acceptedSignature=signature(ctx), item=selected(ctx);
    ctx.state.goalDialog.innerHTML=`<header><strong class="cl-goal-match">${(0, ctx.deps._t)('목표 일치')}</strong>
            <h2 id="cl-goal-dialog-title" tabindex="-1">${esc(ctx, (0, ctx.deps.getItemDisplayName)(item))}</h2></header>
            <ul class="cl-affixes just-crafted">${item.stats.map(ctx.handlers.workspaceAffixHtml).join('')}</ul>
            <button type="button" disabled>${(0, ctx.deps._t)('확인했어요')}</button>`;
    const confirm=ctx.state.goalDialog.querySelector('button'), readyAt=ctx.deps.performance.now()+800;
    confirm.addEventListener('click',event=>{
        if(confirm.disabled||ctx.deps.performance.now()<readyAt||event.detail>1)return;
        confirm.disabled=true;
        // Keep the modal intercepting trailing double-clicks before exposing the crafting controls.
        (0, ctx.deps.setTimeout)(ctx.handlers.workspaceAcknowledgeGoal,350,acceptedSignature);
    });
    ctx.state.goalDialog.showModal();ctx.state.goalDialog.querySelector('h2').focus();
    (0, ctx.deps.setTimeout)(()=>{confirm.disabled=false;},800);
}

export function workspaceAcknowledgeGoal(ctx, acceptedSignature) {
    if(signature(ctx)===acceptedSignature)ctx.state.acknowledged=acceptedSignature;
    ctx.state.goalDialog.close();workspaceRender(ctx);
    const title=ctx.state.root.querySelector('.cl-item h2');
    if(title){title.setAttribute('tabindex','-1');title.focus({preventScroll:true});}
}

export async function workspaceCraft(ctx) {
    if(ctx.state.busy||!selected(ctx)||held(ctx)||!workspaceUseState(ctx).enabled)return false;
    ctx.state.busy=true;workspaceRender(ctx);const item=selected(ctx), before={...ctx.deps.game.currencies};
    const token=ctx.deps.craftingResultLedger.begin(item,{currencyKey:ctx.state.recipe.key});
    let completed=false;
    try {
        const result=await workspaceExecuteCraft(ctx);
        completed=result===true||Object.entries(before).some(([key,value])=>value>ctx.deps.game.currencies[key]);
        if(!completed){ctx.state.notice='제작 조건을 확인하세요.';return false;}
        ctx.state.last=ctx.deps.craftingResultLedger.commit(token,item);ctx.state.count++;ctx.state.notice='';ctx.state.acknowledged='';
        if(!ctx.deps.equipmentCrafting.pendingChoice(ctx.deps.game))(0, ctx.deps.playUiFeedbackSound)('craftSuccess');
        Object.entries(before).forEach(([key,value])=>{const used=value-ctx.deps.game.currencies[key];if(used>0)ctx.state.spent[key]=(ctx.state.spent[key]||0)+used;});
        (0, ctx.deps.queueImportantSave)(180);return true;
    } finally {ctx.state.busy=false;workspaceRender(ctx, completed);}
}

export function workspaceExecuteCraft(ctx) {
    if(ctx.state.recipe.kind==='fossil')return (0, ctx.deps.applyFossilChaosCraft)(ctx.state.recipe.key);
    const actions={enchantedHoney:ctx.deps.applyEnchantedHoneyToSelectedItem,venomStinger:ctx.deps.applyVenomStingerToSelectedItem,voidChisel:ctx.deps.applyVoidChiselToSelectedItem,ouroboros:ctx.deps.applyWoodsmanTouchToSelectedItem,burningEmberBranch:ctx.deps.emberCorruptionUi.use};
    if(actions[ctx.state.recipe.key])return actions[ctx.state.recipe.key]();
    if(ctx.deps.itemInfluences.isAltarCurrency(ctx.state.recipe.key))return ctx.deps.itemInfluencesUi.use(ctx.state.recipe.key);
    if(ctx.state.recipe.key==='oceanRerollShard')return (0, ctx.deps.rerollSingleBaseOption)(selected(ctx),'oceanRerollShard',1);
    if(ctx.deps.sapCatalysts.isCatalyst(ctx.state.recipe.key))return ctx.deps.sapCatalystsUi.use(ctx.state.recipe.key);
    return (0, ctx.deps.useCurrency)(ctx.state.recipe.key);
}

export function workspaceStopAuto(ctx, message) {
    ctx.state.auto=false;ctx.state.runId++;(0, ctx.deps.clearTimeout)(ctx.state.timer);ctx.state.timer=0;ctx.state.notice=message;
}

export function workspaceAutomaticStopReason(ctx) {
    if(ctx.deps.document.hidden||!ctx.state.root.getClientRects().length||selected(ctx)!==ctx.state.current||ctx.state.owner!==ctx.deps.game)return '화면을 벗어나 자동 사용을 중지했어요.';
    if(matches(ctx, selected(ctx)))return '목표 달성, 자동 사용을 멈췄어요.';
    if(ctx.state.runCount>=ctx.state.limit)return (0, ctx.deps._t)('설정한 {limit}회를 모두 사용했어요.', { limit: ctx.state.limit });
    const state=workspaceUseState(ctx);return state.enabled?workspaceAutoReason(ctx):state.reason;
}

export async function workspaceAutoStep(ctx, id) {
    if(!ctx.state.auto||id!==ctx.state.runId)return;
    try {
        let reason=workspaceAutomaticStopReason(ctx);
        if(reason){workspaceStopAuto(ctx, reason);workspaceRender(ctx);return;}
        const used=await workspaceCraft(ctx);if(!ctx.state.auto||id!==ctx.state.runId)return;
        if(!used){workspaceStopAuto(ctx, ctx.state.notice);workspaceRender(ctx);return;}
        ctx.state.runCount++;reason=workspaceAutomaticStopReason(ctx);
        if(reason){workspaceStopAuto(ctx, reason);workspaceRender(ctx);return;}
        workspaceRender(ctx);ctx.state.timer=(0, ctx.deps.setTimeout)(ctx.handlers.workspaceAutoStep,400,id);
    } catch(error) {ctx.deps.console.error('Automatic crafting failed',error);workspaceStopAuto(ctx, (0, ctx.deps._t)('자동 사용 실패: {message}', { message: error.message }));workspaceRender(ctx);}
}

export function workspaceStartAuto(ctx) {
    if(ctx.state.auto||ctx.state.busy||workspaceAutoReason(ctx)||!workspaceUseState(ctx).enabled)return;
    ctx.state.auto=true;ctx.state.runCount=0;ctx.state.notice='';const id=++ctx.state.runId;workspaceRender(ctx);
    ctx.state.timer=(0, ctx.deps.setTimeout)(ctx.handlers.workspaceAutoStep,400,id);
}

/** A new target keeps the chosen tier and line count where the craft can still reach them. */
export function workspaceChooseGoal(ctx, target) {
    const previous=ctx.state.goal.rules[0]||{minTier:0};
    const choice=workspaceGoalChoice(ctx, target.startsWith('tag:')?{tag:target.slice(4)}:{statId:target})||{maxTier:0};
    workspaceSetGoal(ctx, target,Math.min(previous.minTier,choice.maxTier),Math.min(previous.minCount||2,choice.maxCount||1));
}

export function workspaceChange(ctx, event) {
    if(ctx.state.auto)workspaceStopAuto(ctx, '설정 변경으로 자동 사용을 멈췄어요.');
    if(event.target.id==='cl-limit'){ctx.state.limit=(0, ctx.deps.clampNumber)(Math.floor(Number(event.target.value)||1),1,100);workspaceRender(ctx);return;}
    if(!workspaceSetMethodOption(ctx, event.target)&&!workspaceSetGoalOption(ctx, event.target))return;
    workspaceRender(ctx);
}

/** The spore and omen selects; false for any other control. */
export function workspaceSetMethodOption(ctx, target) {
    if(target.id==='cl-mode'){ctx.state.mode=target.value;ctx.deps.game.sporeCraftModes[ctx.state.recipe.key]=ctx.state.mode;return true;}
    if(target.id==='cl-omen'){workspaceArmOmen(ctx, target.value);return true;}
    return false;
}

/** The goal controls; false for any other control. */
export function workspaceSetGoalOption(ctx, target) {
    if(target.id==='cl-goal-match'){ctx.state.goalMatch=target.value;ctx.state.goal.minMatches=ctx.state.goalMatch==='all'?ctx.state.goal.rules.length:1;workspaceSaveGoals(ctx);}
    else if(target.id==='cl-goal-stat')workspaceChooseGoal(ctx, target.value);
    else if(target.id==='cl-goal-tier')workspaceSetGoal(ctx, ctx.deps.equipmentLootPolicy.ruleKey(ctx.state.goal.rules[0]),target.value,ctx.state.goal.rules[0].minCount);
    else if(target.id==='cl-goal-count')workspaceSetGoal(ctx, ctx.deps.equipmentLootPolicy.ruleKey(ctx.state.goal.rules[0]),ctx.state.goal.rules[0].minTier,target.value);
    else return false;
    return true;
}

/** value 'key:side' from the omen select ('' disarms). */
export function workspaceArmOmen(ctx, value) {
    const [key,side]=value.split(':');
    ctx.state.notice=ctx.deps.equipmentCrafting.armOmen(ctx.deps.game,key,side).reason||'';
    (0, ctx.deps.queueImportantSave)(180);
}

/** A stash omen slot: arms that omen (허기 on its prefix side; the select below switches it), or disarms it when it is the armed one. */
export function workspaceToggleOmen(ctx, key) {
    workspaceArmOmen(ctx, workspaceArmedOmen(ctx)?.key===key?'':`${key}:prefix`);
}

export function workspaceEditGoals(ctx, action) {
    if(action==='add-goal'){
        if(ctx.state.goal.rules.length>=3)return;
        const keys=new Set(ctx.state.goal.rules.map(ctx.deps.equipmentLootPolicy.ruleKey));
        const next=workspaceGoalOptions(ctx).find(row=>!keys.has(row.id));
        if(!next)return;
        ctx.state.goal.rules.unshift({statId:next.id,minTier:0,minValue:0});
    }else ctx.state.goal.rules.splice(Number(action.split(':')[1]),1);
    ctx.state.goal.minMatches=ctx.state.goalMatch==='all'?ctx.state.goal.rules.length:1;
    ctx.state.acknowledged='';workspaceSaveGoals(ctx);workspaceRender(ctx);
}

/** 성화의 뿌리: the results side by side. The dialog stays until one is picked (no close button, Escape does nothing). */
export function workspaceShowChoice(ctx, pending) {
    if(!ctx.state.choiceDialog){
        ctx.state.choiceDialog=ctx.deps.document.createElement('dialog');ctx.state.choiceDialog.className='cl-goal-dialog cl-choice-dialog';
        ctx.state.choiceDialog.setAttribute('aria-labelledby','cl-choice-title');ctx.deps.document.body.append(ctx.state.choiceDialog);
        ctx.state.choiceDialog.addEventListener('cancel',event=>event.preventDefault());
        ctx.state.choiceDialog.addEventListener('click',ctx.handlers.workspaceChoiceClick);
    }
    if(ctx.state.choiceDialog.open)return;
    ctx.state.choiceDialog.innerHTML=`<header><small>${workspaceCoin(ctx, 'omenPyre')}${esc(ctx, (0, ctx.deps._t)(ctx.deps.ORB_DB.omenPyre.name))}</small><h2 id="cl-choice-title" tabindex="-1">${(0, ctx.deps._t)('결과 하나를 고르세요')}</h2><p>${esc(ctx, (0, ctx.deps._t)(pending.item.baseName))}</p></header>
            <div class="cl-choice-list">${pending.options.map(ctx.handlers.workspaceChoiceHtml).join('')}</div>`;
    ctx.state.choiceDialog.showModal();ctx.state.choiceDialog.querySelector('h2').focus({preventScroll:true});
}

export function workspaceChoiceHtml(ctx, option, index) {
    const lines=[...option.stats.map(stat=>`${ctx.deps.statToneText.statLine(stat.id,`${stat.statName||(0, ctx.deps.getStatName)(stat.id)} +${workspaceAffixValue(ctx, stat,stat.val)}`)}${(0, ctx.deps.getItemAffixTierHtml)(stat)}`),
        ...(option.chaosInfusion?[(0, ctx.deps._t)('혼돈 주입 {id} +{chaosInfusion}', { id: esc(ctx, (0, ctx.deps.getStatName)(option.chaosInfusion.id)), chaosInfusion: esc(ctx, workspaceAffixValue(ctx, option.chaosInfusion,option.chaosInfusion.val)) })]:[])];
    return `<section class="cl-choice"><h3>${(0, ctx.deps._t)('{value}번 결과', { value: index+1 })}</h3><ul>${lines.map(line=>`<li>${line}</li>`).join('')}</ul><button type="button" data-choice="${index}">${(0, ctx.deps._t)('이 결과로')}</button></section>`;
}

export function workspaceChoiceClick(ctx, event) {
    const button=event.target.closest('[data-choice]');if(!button)return;
    const item=ctx.deps.equipmentCrafting.pickChoice(ctx.deps.game,Number(button.dataset.choice));
    ctx.state.choiceDialog.close();
    if(item){ctx.state.last=ctx.deps.craftingResultLedger.amend(item)||ctx.state.last;(0, ctx.deps.queueImportantSave)(180);(0, ctx.deps.playUiFeedbackSound)('craftSuccess');}
    workspaceRender(ctx, !!item);
}

/** 기억 조각칼: engrave, always asking first (a 체이싱 티어 currency; an older imprint is replaced). */
export async function workspaceEngrave(ctx) {
    const item=selected(ctx);if(!item)return;
    const question=(0, ctx.deps._t)('{name} 1개로 지금 추가 옵션을 새깁니다.{value}', { name: ctx.deps.ORB_DB.memoryImprint.name, value: item.imprint?(0, ctx.deps._t)('\n전에 새긴 옵션은 지워집니다.'):'' });
    if(!await (0, ctx.deps.requestGameConfirmation)(question,{title:ctx.deps.ORB_DB.memoryImprint.name,confirmLabel:(0, ctx.deps._t)('새기기')}))return;
    if(selected(ctx)===item)workspaceImprintDone(ctx, ctx.deps.equipmentCrafting.engrave(ctx.deps.game,item),'지금 옵션을 새겼습니다.');
}

/** 기억 조각칼: go back to the engraved lines (asking first; the imprint is used up). */
export async function workspaceRestore(ctx) {
    const item=selected(ctx);if(!item)return;
    if(!await (0, ctx.deps.requestGameConfirmation)((0, ctx.deps._t)('지금 추가 옵션이 새긴 옵션으로 바뀌고, 새긴 기억은 사라집니다.'),{title:ctx.deps.ORB_DB.memoryImprint.name,confirmLabel:(0, ctx.deps._t)('되돌리기')})||selected(ctx)!==item)return;
    const result=ctx.deps.equipmentCrafting.restoreImprint(item);
    if(result.ok){ctx.deps.craftingResultLedger.clear();ctx.state.last=null;}
    workspaceImprintDone(ctx, result,'새긴 옵션으로 되돌렸습니다.');
}

export function workspaceImprintDone(ctx, result, done) {
    ctx.state.notice=result.ok?done:result.reason;
    if(result.ok){(0, ctx.deps.addLog)(`🍃 ${ctx.deps.ORB_DB.memoryImprint.name}: ${done}`,'loot-magic');(0, ctx.deps.queueImportantSave)(180);}
    workspaceRender(ctx, result.ok);
}

export function workspaceClearSpore(ctx) {
    ctx.state.mode='none';ctx.deps.game.sporeCraftModes[ctx.state.recipe.key]='none';(0, ctx.deps.queueImportantSave)(180);workspaceRender(ctx);
}

export async function workspaceCommand(ctx, action) {
    if(action==='add-goal'||action?.startsWith('remove-goal:'))return workspaceEditGoals(ctx, action);
    return Object.hasOwn(ctx.state.WORKSPACE_COMMANDS,action||'')?ctx.state.WORKSPACE_COMMANDS[action]():undefined;
}

export async function workspaceClick(ctx, event) {
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.command==='stop'){workspaceStopAuto(ctx, '자동 사용을 중지했어요.');workspaceRender(ctx);return;}
    if(ctx.state.busy)return;
    if(button.dataset.stashTab){ctx.deps.craftingStashUi.showTab(button.dataset.stashTab);workspaceRender(ctx);return;}
    if(button.dataset.command==='auto'){workspaceStartAuto(ctx);return;}
    if(ctx.state.auto)workspaceStopAuto(ctx, '조작 변경으로 자동 사용을 멈췄어요.');
    if(button.dataset.recipe){workspacePickResource(ctx, button.dataset.recipe);return;}
    if(button.dataset.omen){workspaceToggleOmen(ctx, button.dataset.omen);workspaceRender(ctx);return;}
    return workspaceCommand(ctx, button.dataset.command);
}

export function workspaceWire(ctx) {
    ctx.state.root.addEventListener('change',ctx.handlers.workspaceChange);
    ctx.state.root.addEventListener('click',ctx.handlers.workspaceHandleClick);
    ctx.deps.document.addEventListener('visibilitychange',ctx.handlers.workspaceVisibilityChanged);
    ctx.deps.window.addEventListener('pagehide',()=>workspaceStopAuto(ctx, ''));
}

export async function workspaceHandleClick(ctx, event) {
    try {await workspaceClick(ctx, event);}
    catch(error){ctx.deps.console.error('Crafting action failed',error);ctx.state.notice=(0, ctx.deps._t)('제작 실패: {message}', { message: error.message });ctx.state.busy=false;workspaceRender(ctx);}
}

export function workspaceVisibilityChanged(ctx) {
    if(ctx.deps.document.hidden&&ctx.state.auto){workspaceStopAuto(ctx, '화면을 벗어나 자동 사용을 중지했어요.');workspaceRender(ctx);}
}

/** After an item's name, where (타락) goes: (기억 새겨짐) when a 기억 조각칼 engraved it (item card, tooltip, this title). */
export function imprintMark(ctx, item) { return item&&item.imprint?' <span class="item-imprint-mark">(기억 새겨짐)</span>':''; }
