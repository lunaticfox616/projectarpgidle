/** 수확 계열의 식물(그 색의 꽃, 열매, 덩굴, 뿌리)이 없을 때의 말. */
export function sporeShortage(ctx, mode) {
    return (0, ctx.deps._t)('{name} 없음', { name: ctx.deps.stumpBox.harvestPriceName((0, ctx.deps.getSporeCraftPriceKey)(mode)) });
}

export function catalogCapture(ctx) { ctx.deps.craftingWorkspaceState.capture(ctx.deps.game); }

export function catalogVisible(ctx, key) {return !!catalogGroup(ctx, key)&&ctx.deps.game.craftingWorkspace.discovered.includes(key)&&ctx.deps.contentProgression.canDropCurrency(key);}

export function catalogGroup(ctx, key) { return ctx.deps.craftingWorkspaceState.group(key); }

export function catalogDescription(ctx, key, compact=false) {
    return esc(ctx, compact?catalogSummary(ctx, key):ctx.deps.ORB_DB[key].desc).replace(ctx.state.keywordPattern,word=>`<span class="cl-keyword" data-keyword="${ctx.state.keywordTones[word]}">${word}</span>`);
}

export function catalogActionLabel(ctx, key, state) {
    const blocked=state&&!state.enabled;
    const reason=blocked?(state.reason==='방어구 전용'?state.reason:'사용 불가'):'';
    return [key===(ctx.state.inspected||ctx.state.active)?'선택 중':'',reason,ctx.deps.game.currencies[key]?'':'보유 없음'].filter(Boolean).join(', ');
}

export function catalogCard(ctx, key) {
    const def=ctx.deps.ORB_DB[key], amount=ctx.deps.game.currencies[key]||0;
    const selected=key===(ctx.state.inspected||ctx.state.active);
    const state=ctx.state.useState(key), blocked=state&&!state.enabled;
    return `<button type="button" class="cl-resource ${amount?'':'is-empty'} ${selected?'is-selected':''} ${blocked?'is-unavailable':''}" data-theme="${ctx.state.theme(key)}" data-resource="${key}" aria-pressed="${selected}">
            <span class="cl-resource-head">${def.icon?`<img src="${esc(ctx, def.icon)}" alt="">`:''}<strong>${styledName(ctx, key)}</strong><b>${amount.toLocaleString(ctx.deps.i18n.locale)}</b></span>
            <span class="cl-resource-desc">${catalogDescription(ctx, key,true)}</span><small>${esc(ctx, catalogActionLabel(ctx, key,state))}</small></button>`;
}

export function catalogList(ctx) {
    catalogCapture(ctx);
    const keys=Object.keys(ctx.deps.ORB_DB).filter(ctx.handlers.listed)
        .filter(key=>(ctx.state.category==='all'||catalogGroup(ctx, key)===ctx.state.category)&&(!ctx.state.ownedOnly||ctx.deps.game.currencies[key]>0))
        .filter(key=>(name(ctx, key)+' '+ctx.deps.ORB_DB[key].desc).includes(ctx.state.query));
    ctx.state.dialog.querySelector('.cl-resource-list').innerHTML=keys.map(ctx.handlers.catalogCard).join('')||'<p class="cl-resource-empty">해당하는 재화가 없습니다.</p>';
    ctx.state.dialog.querySelector('.cl-resource-count').textContent=(0, ctx.deps._t)('{length}종', { length: keys.length });
}

export function catalogSelect(ctx, key) {
    if(!listed(ctx, key))return;
    ctx.state.inspected=key;catalogList(ctx);
    const detail=ctx.state.dialog.querySelector('.cl-resource-detail');
    const available=ctx.state.recipes.some(row=>row.key===key)||/^(spore|fossil)/.test(key);
    const label=['fossil','fossilPrimal','fossilAncientPrimal'].includes(key)?'정제/복원 열기':'제작실에서 선택';
    const state=ctx.state.useState(key), blocked=state&&!state.enabled;
    detail.innerHTML=`<div><strong>${styledName(ctx, key)}</strong><p>${catalogDescription(ctx, key)}</p>${blocked?`<small class="cl-use-reason">${esc(ctx, state.reason)}</small>`:''}</div>${available?`<button type="button" data-apply ${blocked?'disabled':''}>${label}</button>`:''}`;
    detail.hidden=false;
    const selectedCard=ctx.state.dialog.querySelector(`[data-resource="${key}"]`);
    if(selectedCard){selectedCard.focus({preventScroll:true});selectedCard.scrollIntoView({block:'nearest',inline:'nearest'});}
}

export function catalogClose(ctx) {ctx.state.dialog.close();ctx.deps.document.getElementById(ctx.state.openerId)?.focus({preventScroll:true});}

export function catalogRenderNavigation(ctx) {
    ctx.state.dialog.querySelector('#cl-catalog-title').textContent=ctx.state.craftingOnly?(0, ctx.deps._t)('제작 재화 선택'):(0, ctx.deps._t)('재화 인벤토리');
    if(ctx.state.craftingOnly&&ctx.state.category==='omen')ctx.state.category='all';
    ctx.state.dialog.querySelectorAll('[data-category]').forEach(tab=>{
        tab.hidden=ctx.state.craftingOnly&&tab.dataset.category==='omen';
        tab.setAttribute('aria-pressed',String(tab.dataset.category===ctx.state.category));
    });
}

export function catalogOpen(ctx, available, callback, settings={}) {
    ctx.state.recipes=available;ctx.state.onSelect=callback;ctx.state.active=settings.active||'';ctx.state.inspected='';
    ctx.state.craftingOnly=!!settings.craftingOnly;
    ctx.state.useState=settings.useState;
    ctx.state.openerId=ctx.deps.document.activeElement?.id||'cl-inventory-open';
    catalogCapture(ctx);if(!ctx.state.dialog)catalogCreate(ctx);
    catalogRenderNavigation(ctx);
    ctx.state.query='';ctx.state.dialog.querySelector('input[type="search"]').value='';
    ctx.state.dialog.querySelector('.cl-resource-detail').hidden=true;catalogList(ctx);ctx.state.dialog.querySelector('.cl-resource-list').scrollTop=0;if(!ctx.state.dialog.open)ctx.state.dialog.showModal();
    catalogSelectOpeningResource(ctx, settings.inspect);
}

export function catalogSelectOpeningResource(ctx, key) {
    const target=key||ctx.state.active;
    if(listed(ctx, target))catalogSelect(ctx, target);
}

export function catalogClick(ctx, event) {
    const button=event.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-close'))return catalogClose(ctx);
    if(button.hasAttribute('data-apply')){if(catalogVisible(ctx, ctx.state.inspected)){catalogClose(ctx);ctx.state.onSelect(ctx.state.inspected);}return;}
    if(button.dataset.resource)return catalogSelect(ctx, button.dataset.resource);
    ctx.state.category=button.dataset.category;
    ctx.state.dialog.querySelector('.cl-resource-detail').hidden=true;
    catalogRenderNavigation(ctx);catalogList(ctx);
}

export function catalogCreate(ctx) {
    ctx.state.dialog=ctx.deps.document.createElement('dialog');ctx.state.dialog.className='cl-catalog';ctx.state.dialog.setAttribute('aria-labelledby','cl-catalog-title');
    ctx.state.dialog.innerHTML=`<header><div><small>${(0, ctx.deps._t)('보관함')}</small><h2 id="cl-catalog-title">${(0, ctx.deps._t)('재화 인벤토리')}</h2></div><div><button type="button" data-close aria-label="${(0, ctx.deps._t)('재화 목록 닫기')}">${(0, ctx.deps._t)('닫기')}</button></div></header>
            <nav aria-label="${(0, ctx.deps._t)('재화 분류')}">${ctx.state.groups.map(([key,label])=>`<button type="button" data-category="${key}" data-theme="${key}" aria-pressed="${key===ctx.state.category}">${label}</button>`).join('')}</nav>
            <div class="cl-resource-tools"><input type="search" aria-label="${(0, ctx.deps._t)('재화 검색')}" placeholder="${(0, ctx.deps._t)('이름/효과 검색')}"><label><input type="checkbox"> ${(0, ctx.deps._t)('소진한 재화도 보기')}</label><small class="cl-resource-count"></small></div>
            <div class="cl-resource-list"></div><aside class="cl-resource-detail" tabindex="-1" hidden></aside>`;
    ctx.deps.document.body.append(ctx.state.dialog);
    ctx.state.dialog.addEventListener('click',ctx.handlers.catalogClick);
    ctx.state.dialog.addEventListener('input',event=>{
        if(event.target.type==='search')ctx.state.query=event.target.value.trim();
        else ctx.state.ownedOnly=!event.target.checked;
        catalogList(ctx);
    });
    ctx.state.dialog.addEventListener('cancel',()=>ctx.deps.document.getElementById(ctx.state.openerId)?.focus({preventScroll:true}));
}

export function esc(ctx, value) { return (0, ctx.deps.escapeHTML)(String(value)); }

export function name(ctx, key) { return (0, ctx.deps._t)(ctx.deps.ORB_DB[key].name).replace(/^[^가-힣A-Za-z0-9]+/u,''); }

export function listed(ctx, key) { return catalogVisible(ctx, key)&&(!ctx.state.craftingOnly||!ctx.state.separateMaterials.has(key)); }

export function styledName(ctx, key) { return `<span class="cl-currency-name" data-theme="${ctx.state.theme(key)}">${ctx.deps.window.getStyledOrbName(key)}</span>`; }

/** The short effect line (the stash's hover text, the cards here), plain text. */
export function catalogSummary(ctx, key) { return ctx.state.summaries[key]||ctx.deps.ORB_DB[key].desc; }
