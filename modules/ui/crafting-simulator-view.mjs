import { esc, selected, workspaceCoin, workspaceArmedOmen } from './crafting-workspace-selection.mjs';
import { workspaceOmenOptions } from './crafting-workspace-markup.mjs';

export function studyWeightHtml(ctx, row, top) {
    if(!row.allowed)return `<span class="cl-study-blocked">${esc(ctx, row.reason)}</span>`;
    return `<span class="cl-study-weight" style="--share:${(row.share/top*100).toFixed(1)}%"><b>${row.weight}</b><small>${(row.share*100).toFixed(1)}%</small></span>`;
}

export function workspaceStudyRow(ctx, row, rules, top) {
    const [kind,kindClass]=ctx.state.STUDY_KINDS[row.kind]||ctx.state.STUDY_KINDS.special, isGoal=studyGoalRow(ctx, row,rules);
    const name=`<span class="cl-study-name">${ctx.deps.statToneText.statLine(row.statId,row.name)}${isGoal?(0, ctx.deps._t)('<span class="cl-study-goal">목표</span>'):''}</span>`;
    // 범위의 끝은 거의 언제나 장비의 옵션 상한이라 줄마다 같다: 색은 머리말의 상한에만 둔다.
    const tier=row.maxTier?`T1~${row.maxTier}`:'고정';
    return `<tr class="${row.allowed?'':'cl-pool-blocked'}${isGoal?' is-goal':''}" data-search="${esc(ctx, row.name+' '+row.tags.map(tag=>ctx.deps.AFFIX_TAG_LABELS[tag]).join(' '))}"><td>${name}<small>${row.tags.map(ctx.handlers.studyTagHtml).join('')}</small></td><td><span class="cl-study-kind ${kindClass}">${kind}</span></td><td>${tier}</td><td>${studyWeightHtml(ctx, row,top)}</td></tr>`;
}

export function workspaceStudyRows(ctx, rows, rules=[]) {
    const top=Math.max(0,...rows.map(row=>Number(row.share)||0))||1;
    return rows.map(row=>workspaceStudyRow(ctx, row,rules,top)).join('');
}

export function workspaceShowStudy(ctx) {
    if(!selected(ctx)||!ctx.deps.contentProgression.isUnlocked('craftSimulator'))return;
    ctx.state.studyRun++;
    if(!ctx.state.studyDialog){
        ctx.state.studyDialog=ctx.deps.document.createElement('dialog');ctx.state.studyDialog.className='cl-study-dialog';
        ctx.state.studyDialog.setAttribute('aria-labelledby','cl-study-title');ctx.deps.document.body.append(ctx.state.studyDialog);
        ctx.state.studyDialog.addEventListener('close',()=>ctx.state.studyRun++);
    }
    const context={item:JSON.parse(JSON.stringify(selected(ctx))),recipe:{...ctx.state.recipe},mode: ctx.state.mode,rules:JSON.parse(JSON.stringify(ctx.state.goal)),omen:null};
    ctx.state.studyDialog.innerHTML=`<header><div><h2 id="cl-study-title">${(0, ctx.deps._t)('제작 시뮬레이터')}</h2><p><span class="cl-study-item" style="color:${(0, ctx.deps.getRarityColor)(context.item.rarity)}">${esc(ctx, (0, ctx.deps._t)(context.item.name))}</span>${(0, ctx.deps._t)(', {key}{label}, 옵션 상한 {item}', { key: workspaceCoin(ctx, context.recipe.key), label: esc(ctx, (0, ctx.deps._t)(context.recipe.label)), item: studyTierHtml(ctx, (0, ctx.deps.getItemCraftTier)(context.item)) })}</p></div><button data-study-close aria-label="${(0, ctx.deps._t)('제작 시뮬레이터 닫기')}">${(0, ctx.deps._t)('닫기')}</button></header>
            <section class="cl-study-simulator">
            ${workspaceStudyOmenHtml(ctx, context.item,context.recipe)}<div class="cl-study-controls"><button data-study-sample="1">${(0, ctx.deps._t)('1회 시뮬레이션')}</button><button data-study-sample="2000">${(0, ctx.deps._t)('목표 확률 2,000회 측정')}</button></div>
            <small data-study-reason aria-live="polite"></small><div data-study-result aria-live="polite"></div></section>
            <details open><summary data-study-summary></summary>
            <label class="cl-study-search">${(0, ctx.deps._t)('이름이나 태그 검색')} <input type="search" data-study-search></label>
            <div class="cl-pool-scroll"><table><thead><tr><th>${(0, ctx.deps._t)('옵션')}</th><th>${(0, ctx.deps._t)('종류')}</th><th>${(0, ctx.deps._t)('티어')}</th><th>${(0, ctx.deps._t)('첫 선택 가중치 / 차단 이유')}</th></tr></thead><tbody></tbody></table></div></details>`;
    ctx.state.studyDialog.querySelector('[data-study-close]').onclick=()=>ctx.state.studyDialog.close();
    ctx.state.studyDialog.querySelector('[data-study-search]').oninput=ctx.handlers.workspaceFilterStudy;
    ctx.state.studyDialog.onchange=event=>{if(event.target.matches('[data-study-omen]'))workspaceRefreshStudy(ctx, context);};
    ctx.state.studyDialog.querySelectorAll('[data-study-sample]').forEach(button=>button.onclick=()=>workspaceSampleStudy(ctx, {...context},Number(button.dataset.studySample)));
    workspaceRefreshStudy(ctx, context);
    ctx.state.studyDialog.showModal();
}

export function workspaceFilterStudy(ctx) {
    const query=ctx.state.studyDialog.querySelector('[data-study-search]').value.trim().toLowerCase();
    ctx.state.studyDialog.querySelectorAll('tr[data-search]').forEach(row=>row.hidden=!row.dataset.search.toLowerCase().includes(query));
}

export function workspaceStudyButtons(ctx, context, reason) {
    ctx.state.studyDialog.querySelectorAll('[data-study-sample]').forEach(button=>button.disabled=!!reason||(button.dataset.studySample!=='1'&&!context.rules.rules.length));
}

/** Any research selection invalidates earlier results and refreshes every consumer of the same context. */
export function workspaceRefreshStudy(ctx, context) {
    ctx.state.studyRun++;
    context.omen=workspaceStudyOmen(ctx);
    const {rows,reason}=ctx.deps.craftingGoalOptions.study(context);
    ctx.state.studyDialog.querySelector('tbody').innerHTML=workspaceStudyRows(ctx, rows,context.rules.rules);
    ctx.state.studyDialog.querySelector('[data-study-summary]').textContent=`출현 후보와 차단된 옵션, ${rows.filter(row=>row.allowed).length}종 가능`;
    ctx.state.studyDialog.querySelector('[data-study-reason]').textContent=reason;
    ctx.state.studyDialog.querySelector('[data-study-result]').textContent='';
    workspaceStudyButtons(ctx, context,reason);
    workspaceFilterStudy(ctx);
}

/** 연습에 걸 뿌리(깨어난 아틀라스에서, 또는 뿌리를 가졌거나 걸어 두었으면: 시대 재생 뒤에도 지갑의 뿌리는 남고 걸어 둔 뿌리는 실제
* 제작에 쓰인다): 이 재화를 바꾸는 뿌리라면 가지지 않아도 고른다. 처음에는 걸어 둔 뿌리. */
export function workspaceStudyOmenHtml(ctx, item, method) {
    const action=ctx.deps.equipmentCrafting.resolveAction(method.key,item.rarity), armed=workspaceArmedOmen(ctx);
    const offered=ctx.deps.atlasEndgame.awakened(ctx.deps.game) || !!armed || ctx.deps.CRAFT_OMENS.keys.some(key=>(ctx.deps.game.currencies[key]||0)>0);
    const keys=offered?ctx.deps.CRAFT_OMENS.keys.filter(key=>ctx.deps.CRAFT_OMENS.effects[key].actions.includes(action)):[];
    if(!keys.length)return '';
    const value=armed?`${armed.key}:${armed.side}`:'';
    return `<label class="cl-study-omen">${(0, ctx.deps._t)('뿌리')} <select data-study-omen>${[['','뿌리 없이'],...workspaceOmenOptions(ctx, keys)].map(([key,label])=>`<option value="${key}" ${key===value?'selected':''}>${esc(ctx, label)}</option>`).join('')}</select></label>`;
}

/** The practice omen the study dialog shows ({ key, side, effect }), or null. */
export function workspaceStudyOmen(ctx) {
    const [key,side]=(ctx.state.studyDialog.querySelector('[data-study-omen]')?.value||'').split(':');
    return key?ctx.deps.equipmentCrafting.omenSpec(key,side):null;
}

/** One practice: a result, or with 성화의 뿌리 (where the live craft would use it) as many as it lets the player pick from. */
export function workspaceRehearse(ctx, context) {
    const {item,recipe,mode,omen}=context;
    const picks=omen&&omen.effect==='choice'&&ctx.deps.equipmentCrafting.omenFits(item,ctx.deps.equipmentCrafting.resolveAction(recipe.key,item.rarity),omen,mode)?ctx.deps.CRAFT_OMENS.choices:1;
    return Array.from({length:picks},()=>ctx.deps.craftingGoalOptions.rehearseStudy(context));
}

/** The measurement: hits out of count (picks: results to pick from in each practice), its 95% range and the mean cost. */
export function workspaceSampleHtml(ctx, hits, count, picks) {
    const p=hits/count,z=1.96,den=1+z*z/count,centre=(p+z*z/(2*count))/den;
    const delta=z*Math.sqrt(p*(1-p)/count+z*z/(4*count*count))/den;
    return `<strong>목표 달성 ${hits}/${count}회${picks>1?(0, ctx.deps._t)('({picks}개 가운데 하나라도)', { picks }):''}, <span class="cl-study-rate">${(p*100).toFixed(2)}%</span></strong><p>95% 추정 범위 ${(Math.max(0,centre-delta)*100).toFixed(2)}~${(Math.min(1,centre+delta)*100).toFixed(2)}%, ${hits>=5?(0, ctx.deps._t)('평균 약 {round}회 / 주 재화 {round2}개', { round: Math.round(1/p), round2: Math.round(1/p) }):(0, ctx.deps._t)('관측이 적어 평균 비용 추정 보류')}</p>`;
}

export async function workspaceSampleStudy(ctx, context, count) {
    if(!workspaceStudyActive(ctx, ctx.state.studyRun))return;
    const run=++ctx.state.studyRun, out=ctx.state.studyDialog.querySelector('[data-study-result]'), buttons=[...ctx.state.studyDialog.querySelectorAll('[data-study-sample]')];
    buttons.forEach(button=>button.disabled=true);
    let hits=0, results=[];
    try{
        for(let i=0;i<count;i++){
            if(!workspaceStudyActive(ctx, run))return;
            results=workspaceRehearse(ctx, context);
            if(results.some(result=>ctx.deps.equipmentLootPolicy.matches(result,{settings:{equipmentTargets:context.rules}})))hits++;
            if(i%50===49){out.textContent=(0, ctx.deps._t)('측정 중 {value}/{count}', { value: i+1, count });await new Promise(resolve=>(0, ctx.deps.setTimeout)(resolve,0));}
        }
        if(!workspaceStudyActive(ctx, run))return;
        if(count===1)out.innerHTML=workspacePracticeHtml(ctx, results,context.rules);
        else out.innerHTML=workspaceSampleHtml(ctx, hits,count,results.length);
    }catch(error){ctx.deps.console.error('Craft rehearsal failed',error);out.textContent=(0, ctx.deps._t)('시뮬레이션 실패: {message}', { message: error.message });}
    finally{if(run===ctx.state.studyRun)workspaceStudyButtons(ctx, context,ctx.deps.craftingGoalOptions.study(context).reason);}
}

export function studyTagHtml(ctx, tag) { return `<span class="cl-study-tag"${ctx.state.STUDY_TAG_TONES[tag]?` style="--tone:${(0, ctx.deps.getItemStatToneColor)(ctx.state.STUDY_TAG_TONES[tag])}"`:''}>${esc(ctx, ctx.deps.AFFIX_TAG_LABELS[tag])}</span>`; }

export function studyTierHtml(ctx, tier) { return `<span class="tier-badge ${(0, ctx.deps.getTierClassName)(tier)}">T${tier}</span>`; }

/** Whether a goal rule names this option: one of the stats it rolls (compound parts included), or a tag it carries. */
export function studyGoalRow(ctx, row, rules) { return rules.some(rule=>(rule.statId?row.statIds.includes(rule.statId):!!rule.tag&&row.tags.includes(rule.tag))); }

/** Whether a rolled line meets a goal rule as the goal check counts it: an option rule looks at the line and its compound extras
* (each at the line's tier), a tag rule at the whole line (js/loot.js ruleMet). */
export function studyGoalLine(ctx, stat, rules) { return rules.some(rule=>(rule.tag?[stat]:[stat,...(stat.extraStats||[]).map(extra=>({...extra,tier:stat.tier}))]).some(line=>ctx.deps.equipmentLootPolicy.lineMatchesRule(line,rule))); }

/** A practice line in the item tooltip's look: the stat's colour, its tier badge; a line that meets a goal is marked. */
export function workspaceStudyLineHtml(ctx, stat, rules) { return `<li${studyGoalLine(ctx, stat,rules)?' class="is-goal"':''}>${ctx.deps.statToneText.statLine(stat.id,`${stat.statName||(0, ctx.deps.getStatName)(stat.id)} +${(0, ctx.deps.formatValue)(stat.id,stat.val)}`)}${(0, ctx.deps.getItemAffixTierHtml)(stat)}</li>`; }

/** Whether this practice result meets the goal (shown only when a goal is set). */
export function workspaceStudyVerdict(ctx, result, rules) { return !rules.rules.length?'':ctx.deps.equipmentLootPolicy.matches(result,{settings:{equipmentTargets:rules}})?'<span class="cl-study-verdict is-hit">목표 달성</span>':'<span class="cl-study-verdict">목표 미달</span>'; }

/** One practice, or with 성화의 뿌리 each result numbered with its own verdict. */
export function workspacePracticeHtml(ctx, results, rules) {
    const many=results.length>1, lines=result=>`<ul>${result.stats.map(stat=>workspaceStudyLineHtml(ctx, stat,rules.rules)).join('')}</ul>`;
    return `<strong>시뮬레이션 결과${many?(0, ctx.deps._t)(', {length}개 가운데 고르기', { length: results.length }):''}</strong>${many?'':workspaceStudyVerdict(ctx, results[0],rules)}`
        +results.map((result,index)=>`${many?`<div class="cl-study-pick">${(0, ctx.deps._t)('{value}번 결과{result}', { value: index+1, result: workspaceStudyVerdict(ctx, result,rules) })}</div>`:''}${lines(result)}`).join('');
}

export function workspaceStudyActive(ctx, run) { return run===ctx.state.studyRun&&ctx.state.studyDialog.open&&ctx.deps.contentProgression.isUnlocked('craftSimulator'); }
