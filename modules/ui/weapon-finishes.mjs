import { finishRules, finishBooks, finishHeld, finishIngredients } from '../data/equipment-finishes.mjs';
import { selected, esc } from './crafting-workspace-selection.mjs';

function lineName(ctx, row) {
    const {stat} = row;
    return ctx.deps._t('{name} {value} (T{tier})', {name:ctx.deps._t(stat.statName || ctx.deps.getStatName(stat.id)), value:ctx.deps.formatValue(stat.id,stat.val), tier:stat.tier});
}

function choose(rows, preferred) {
    return rows?.find(row => row.index === preferred) || rows?.[0];
}

export function finishSelection(ctx, key = ctx.state.recipe.key) {
    const rule = finishRules[key], owner = ctx.deps.game, choice = ctx.state.finishChoice || {};
    const variants = Object.keys(rule.variants).filter(id => finishHeld(owner.currencies,key,id) > 0);
    const variant = variants.includes(choice.variant) ? choice.variant : variants[0] || Object.keys(rule.variants)[0];
    const plan = ctx.deps.equipmentCrafting.inspectFinish(owner,selected(ctx),key,variant);
    const low = choose(plan.lows, choice.low), high = choose(plan.highs, choice.high);
    return {key, rule, variants, variant, plan, low, high};
}

function selectHtml(ctx, label, id, options, value) {
    return '<label>' + esc(ctx,ctx.deps._t(label)) + ' <select data-finish-field="'+id+'">' +
        options.map(([key,text]) => '<option value="'+esc(ctx,key)+'" '+(key===value?'selected':'')+'>'+esc(ctx,text)+'</option>').join('') + '</select></label>';
}

function finishPreview(ctx, chosen) {
    const {key, plan, low, high, variant} = chosen;
    const { _t, equipmentCrafting } = ctx.deps;
    if (!low) return '';
    if (key === 'balanceWeight') return _t('새 옵션 T{tier} · {line} → T{lower}', {tier:plan.tier, line:lineName(ctx,high), lower:high.stat.tier-1});
    if (key === 'artManual') return _t('{effect} +16~24%', {effect:_t(finishBooks[variant].label)});
    if (key === 'wardCord') return _t('기본 재화로 옵션 추가 시 {element} 옵션 제외', {element:_t(finishRules[key].variants[variant])});
    const counts = equipmentCrafting.affixCounts(selected(ctx)), cap = selected(ctx).rarity === 'magic' ? 1 : 3;
    return _t('접두 {p}/{cap} → {nextP}/{cap}, 접미 {s}/{cap} → {nextS}/{cap}', {p:counts.prefix, nextP:counts.prefix+1,s:counts.suffix,nextS:counts.suffix-1,cap});
}

export function finishControls(ctx) {
    const chosen = finishSelection(ctx);
    const {key, rule, variants, variant, plan, low, high} = chosen, {game,_t} = ctx.deps;
    const variantRows = variants.map(id => [id, _t(rule.variants[id]) + ' (' + finishHeld(game.currencies,key,id) + ')']);
    const rows = (entries) => entries.map(row => [row.index,lineName(ctx,row)]);
    const controls = [
        variantRows.length ? selectHtml(ctx,'재료 종류','variant',variantRows,variant) : '',
        low ? selectHtml(ctx,'대상 옵션','low',rows(plan.lows),low.index) : '',
        high ? selectHtml(ctx,'한 등급 낮출 옵션','high',rows(plan.highs),high.index) : ''
    ];
    return '<div class="cl-finish-options"><strong>'+esc(ctx,_t(rule.name))+'</strong>'+controls.join('')+'<small>'+esc(ctx,finishPreview(ctx,chosen))+'</small></div>';
}

function stillSelected(ctx, game, item, key, before) {
    return game === ctx.deps.game && item === selected(ctx) && ctx.state.recipe.key === key && before === JSON.stringify(item);
}

export async function confirmFinish(ctx) {
    const {game, equipmentCrafting, _t} = ctx.deps, item = selected(ctx), chosen = finishSelection(ctx);
    if (chosen.plan.reason || !chosen.low) return false;
    const {key,variant,low,high} = chosen;
    const before = JSON.stringify(item);
    const count = finishHeld(game.currencies,key,variant);
    const text = [ctx.deps.getItemDisplayName(item), lineName(ctx,low), finishPreview(ctx,chosen),
        _t(ctx.deps.ORB_DB[key].name)+' · '+_t(chosen.rule.variants[variant])+' ('+count+'/1)'].join('\n');
    if (!await ctx.deps.requestGameConfirmation(text,{title:_t(chosen.rule.name),confirmLabel:_t('적용')})) return false;
    if (!stillSelected(ctx, game,item,key,before)) return false;
    const result = equipmentCrafting.applyFinish(game,item,key,{variant,low:low.index,high:high?.index});
    if (result.ok && Object.values(game.equipment).includes(item)) ctx.deps.playerStatCache.invalidate();
    if (result.ok) ctx.deps.updateStaticUI();
    return result.ok;
}

export function renderFinishExchange(ctx, panel) {
    if (!panel.open) return;
    const refresh = () => drawFinishPrice(ctx,panel);
    panel.onchange = refresh;
    panel.onclick = event => {
        const button = event.target.closest('button[data-finish-buy]');
        if (!button) return;
        const variant = panel.querySelector('select').value;
        if (ctx.deps.equipmentCrafting.exchangeFinish(ctx.deps.game,panel.dataset.exchange,variant,true).ok) {
            ctx.deps.craftingCatalogUi.capture();
            ctx.deps.queueImportantSave(180);
            ctx.deps.updateStaticUI();
        }
        refresh();
    };
    refresh();
}

function drawFinishPrice(ctx,panel) {
    const key = panel.dataset.exchange, rule = finishRules[key];
    const {game,_t,equipmentCrafting} = ctx.deps;
    const body = panel.querySelector('div');
    const variants = Object.keys(rule.variants);
    const variant = body.querySelector('select')?.value || variants.find(id=>equipmentCrafting.exchangeFinish(game,key,id).ok) || variants[0];
    const options = Object.entries(rule.variants).map(([id,name]) => [id,_t(name)]);
    const price = finishIngredients(key,variant).map(([id,n]) => _t(ctx.deps.ORB_DB[id].name)+' ('+(game.currencies[id]||0)+'/'+n+')');
    if (key === 'artManual') price.unshift(_t('여분 룬')+' ('+(game.runeSpares?.[finishBooks[variant].rune]||0)+'/1)');
    const {reason} = equipmentCrafting.exchangeFinish(game,key,variant);
    body.innerHTML = selectHtml(ctx,'종류','exchange',options,variant)+'<span>'+esc(ctx,price.join(' + '))+'</span><button type="button" data-finish-buy '+(reason?'disabled':'')+'>'+esc(ctx,_t('1개 교환'))+'</button><small role="status" class="'+(reason?'cl-error':'')+'">'+esc(ctx,reason?_t(reason):_t('보유 {currencies}',{currencies:finishHeld(game.currencies,key,variant)}))+'</small>';
}
