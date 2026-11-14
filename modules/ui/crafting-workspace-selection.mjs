/** target: an option id, 'tag:<tag>' (count lines carrying the tag) or '' to clear. */
export function workspaceSetGoal(ctx, target, tier, count=2) {
    const rule=String(target).startsWith('tag:')?{tag:target.slice(4),minCount:Number(count),minTier:Number(tier)}:{statId:target,minTier:Number(tier),minValue:0};
    const rules=[rule,...(ctx.state.goal?.rules||[]).slice(1)];
    ctx.state.goal=ctx.deps.equipmentLootPolicy.normalizeTargets({enabled:true,scope:'explicit',slot:'any',minMatches:ctx.state.goalMatch==='all'?rules.length:1,rules});
    ctx.state.acknowledged='';
    workspaceSaveGoals(ctx);
}

export function workspaceSaveGoals(ctx) {
    ctx.deps.game.craftingWorkspace.goal=ctx.deps.craftingWorkspaceState.normalizeGoal({...ctx.state.goal.rules[0],match:ctx.state.goalMatch,extra:ctx.state.goal.rules.slice(1)});
    (0, ctx.deps.queueImportantSave)(180);
}

export function workspaceRestoreGoal(ctx) {
    const saved=ctx.deps.game.craftingWorkspace.goal;
    ctx.state.goalMatch=saved.match||'all';
    const rules=[saved,...(saved.extra||[])].map(rule=>rule.tag?{tag:rule.tag,minCount:rule.minCount,minTier:rule.minTier}:{statId:rule.statId,minTier:rule.minTier,minValue:0});
    ctx.state.goal=ctx.deps.equipmentLootPolicy.normalizeTargets({enabled:true,scope:'explicit',slot:'any',minMatches:ctx.state.goalMatch==='all'?rules.length:1,rules});
}

export function workspaceGoalOptions(ctx) { return ctx.deps.craftingGoalOptions.get(selected(ctx),ctx.state.recipe,ctx.state.mode,workspaceUsedOmen(ctx)); }

export function workspaceGoalTags(ctx) { return ctx.deps.craftingGoalOptions.tags(selected(ctx),ctx.state.recipe,ctx.state.mode,workspaceUsedOmen(ctx)); }

/** The option or tag row the current craft can reach for this rule (undefined when it cannot). */
export function workspaceGoalChoice(ctx, rule) {
    if(!rule)return undefined;
    return rule.tag?workspaceGoalTags(ctx).find(row=>row.id===rule.tag):workspaceGoalOptions(ctx).find(row=>row.id===rule.statId);
}

export function workspaceGoalReachable(ctx, rule) {
    if(ctx.deps.equipmentLootPolicy.matches(selected(ctx),{settings:{equipmentTargets:{...ctx.state.goal,rules:[rule],minMatches:1}}}))return true;
    const choice=workspaceGoalChoice(ctx, rule);
    return !!choice&&rule.minTier<=choice.maxTier&&(!rule.tag||rule.minCount<=choice.maxCount);
}

/** Whether the selected currency can be used now: nothing while a 성화의 뿌리 pick waits. */
export function workspaceUseState(ctx) { return ctx.deps.equipmentCrafting.pendingChoice(ctx.deps.game)?ctx.state.CHOICE_WAIT:workspaceResourceState(ctx, ctx.state.recipe.key); }

export function workspaceResourceState(ctx, key) {
    if(!ctx.deps.contentProgression.canOpen('item-tab-craft')||!ctx.deps.contentProgression.canDropCurrency(key))return {enabled:false,reason:(0, ctx.deps._t)('아직 해금되지 않았습니다.')};
    const locked=ctx.deps.equipmentCrafting.buildLockReason(ctx.deps.game);if(locked)return {enabled:false,reason:locked};
    const row=ctx.state.recipes.find(entry=>entry.key===key);if(!row)return null;
    if(row.kind==='fossil')return workspaceFossilState(ctx, key);
    const special=workspaceSpecialState(ctx, key);if(special)return special;
    if(['ouroboros','oceanRerollShard'].includes(key))return workspaceSelectedState(ctx, key);
    return ctx.state.adapter.useState(key,selected(ctx));
}

/** 우로보로스 and 심해의 파편: a selected item and the balance; the shard also leaves corrupted gear, fused relics and uniques alone. */
export function workspaceSelectedState(ctx, key) {
    const reason=key==='oceanRerollShard'?(0, ctx.deps.getOceanShardBlockReason)(selected(ctx)):(selected(ctx)?'':'아이템을 선택하세요.');
    return {enabled:!reason&&ctx.deps.game.currencies[key]>0,reason:reason||'재화 부족'};
}

export function workspaceFossilState(ctx, key) {
    const reason=ctx.deps.equipmentCrafting.getFossilUseReason(selected(ctx),ctx.deps.FOSSIL_DB.find(entry=>entry.key===key),ctx.deps.game.season,ctx.deps.game.currencies)||workspaceFossilSlotReason(ctx, key);
    return {enabled:!reason,reason};
}

/** Currencies with their own rules: the burning branch (loop 30) and the catalysts (loop 32). null for the rest. */
export function workspaceSpecialState(ctx, key) {
    if(key==='burningEmberBranch')return ctx.deps.emberCorruptionUi.useState(selected(ctx));
    if(ctx.deps.itemInfluences.isAltarCurrency(key))return ctx.deps.itemInfluencesUi.useState(key,selected(ctx));
    return ctx.deps.sapCatalysts.isCatalyst(key)?ctx.deps.sapCatalystsUi.useState(key,selected(ctx)):null;
}

export function workspaceFossilSlotReason(ctx, key=ctx.state.recipe.key) {
    const item=selected(ctx);if(!item)return '아이템을 선택하세요.';
    const candidate={...item,stats:item.stats.filter(stat=>ctx.deps.equipmentCrafting.keptOnReroll(item,stat)),chaosInfusion:null};
    if(key==='fossilRift')return '';
    if(key==='fossilOld')return (0, ctx.deps.getFossilExclusivePool)(candidate).length?'':'화석 전용 옵션을 부여할 수 없습니다.';
    const allowed=(0, ctx.deps.getFossilGuaranteedPool)(item,ctx.deps.FOSSIL_DB.find(row=>row.key===key)).length>0;
    if(!allowed&&key==='fossilBulwark')return '방어구 전용';
    return allowed?'':'이 장비 부위에 부여할 수 있는 화석 옵션이 없습니다.';
}

export function workspaceSporeReason(ctx, value) {
    if(!(0, ctx.deps.hasSporeCraftCost)(value))return ctx.deps.craftingCatalogUi.sporeShortage(value);
    const item=selected(ctx), action=ctx.deps.equipmentCrafting.resolveAction(ctx.state.recipe.key,item.rarity);
    const omen=workspaceArmedOmen(ctx), spec=omen?ctx.deps.equipmentCrafting.omenSpec(omen.key,omen.side):null;
    const side=spec?.effect==='side'&&ctx.deps.CRAFT_OMENS.effects[spec.key].actions.includes(action)?spec:null;
    return (0, ctx.deps.getSporeCraftBlockReason)(item,action,value,side)||(side?ctx.deps.equipmentCrafting.omenReason(item,action,side,value):'');
}

/** The armed omen if it changes the selected craft (the live rule, equipmentCrafting.omenFor), or null. */
export function workspaceUsedOmen(ctx) {
    const item=selected(ctx);
    return item?ctx.deps.equipmentCrafting.omenFor(ctx.deps.game,ctx.deps.equipmentCrafting.resolveAction(ctx.state.recipe.key,item.rarity),item,(0, ctx.deps.isSporeCraftEquipment)(item)?ctx.state.mode:'none'):null;
}

export function workspaceSideEffect(ctx, omen) {
    const side=omen.side==='prefix'?'접두어':'접미어';
    const verbs={formlessDew:'재련',sapBud:'1줄 추가',goldenRule:'옵션 수치만 재설정',blightSpore:'모두 제거',pruningShears:'무작위 1줄 제거'};
    return (0, ctx.deps._t)('{side}만 {verbs}', { side, verbs: verbs[ctx.state.recipe.key]||(0, ctx.deps._t)('변경') });
}

export function workspaceAutoReason(ctx) {
    if(!['reroll','add','fossil'].includes(ctx.state.recipe.kind))return '이 재화는 한 번씩 사용합니다.';
    if(!ctx.state.goal.rules.length)return '목표 미설정';
    if(matches(ctx, selected(ctx)))return '이미 목표를 달성했어요.';
    const reachable=ctx.state.goal.rules.map(ctx.handlers.workspaceGoalReachable);
    if(ctx.state.goalMatch==='all'?!reachable.every(Boolean):!reachable.some(Boolean))return '현재 재화로 나올 수 없는 목표입니다.';
    return '';
}

export function esc(ctx, value) { return (0, ctx.deps.escapeHTML)(String(value)); }

/** A currency picture before its name in a heading (ORB_DB icon), or nothing. */
export function workspaceCoin(ctx, key) { return ctx.deps.ORB_DB[key]&&ctx.deps.ORB_DB[key].icon?`<img class="cl-inline-icon" src="${esc(ctx, ctx.deps.ORB_DB[key].icon)}" alt="">`:''; }

export function selected(ctx) { return (0, ctx.deps.getSelectedCraftItem)(); }

export function signature(ctx) { return JSON.stringify([ctx.state.current,ctx.state.goal,selected(ctx)?.stats]); }

export function targetGame(ctx) { return {settings:{equipmentTargets:ctx.state.goal}}; }

export function matches(ctx, item) { return ctx.deps.equipmentLootPolicy.matches(item,targetGame(ctx)); }

export function held(ctx) { return matches(ctx, selected(ctx)) && ctx.state.acknowledged!==signature(ctx); }

export function workspaceArmedOmen(ctx) { return ctx.deps.game.craftOmen&&(ctx.deps.game.currencies[ctx.deps.game.craftOmen.key]||0)>0?ctx.deps.game.craftOmen:null; }
