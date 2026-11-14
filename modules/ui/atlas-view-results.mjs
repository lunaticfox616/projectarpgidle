import { momentClass, ledger, nodeName } from './atlas-view-model.mjs';

export function itemFind(runtime, row) {
    const name = row.rarity === 'unique' ? `「${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.name))}」` : (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.name));
    return { rank: runtime.deps.lootMoments.rank(row.moment), html: `<span class="atlas-find rarity-${row.rarity}${momentClass(runtime, row.moment)}" data-tip="${(0, runtime.deps.escapeHTML)((0, runtime.deps.getItemSlotDisplayLabel)(null, row.slot))}">${row.fresh ? (0, runtime.deps._t)('<em>새</em>') : ''}${name}</span>` };
}

export function leafFind(runtime, [id, count]) {
    const leaf = runtime.deps.memoryLeaves.leaf(id);
    return { rank: runtime.state.LEAF_RANK, html: `<span class="atlas-find is-leaf">${(0, runtime.deps.renderPixelIcon)('leaf', 'atlas-find-leaf')}${(0, runtime.deps.escapeHTML)(leaf ? leaf.name : id)}${count > 1 ? ` <b>×${count}</b>` : ''}</span>` };
}

export function yarnFind(runtime, [id, count]) {
    return { rank: 1, html: `<span class="atlas-find">${(0, runtime.deps._t)('실타래 {name}', { name: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(runtime.deps.knitting.row(id).name)) })} <b>×${count}</b></span>` };
}

export function currencyFind(runtime, [key, count]) {
    const moment = runtime.deps.lootMoments.ofCurrency(key), src = runtime.deps.ORB_DB[key] && runtime.deps.ORB_DB[key].icon;
    const icon = src ? `<img class="atlas-find-icon" src="${src}" alt="" aria-hidden="true">` : '';
    return { rank: runtime.deps.lootMoments.rank(moment), html: `<span class="atlas-find${momentClass(runtime, moment)}">${icon}${runtime.deps.window.getStyledOrbName(key)} <b>×${count}</b></span>` };
}

export function findsHtml(runtime, receipt) {
    const currencies = Object.entries(receipt.currencies).filter(([key]) => runtime.deps.lootMoments.ofCurrency(key));
    const finds = [...receipt.items.map(runtime.handlers.itemFind), ...Object.entries(receipt.leaves).map(runtime.handlers.leafFind), ...Object.entries(receipt.yarns || {}).map(runtime.handlers.yarnFind), ...currencies.map(runtime.handlers.currencyFind)];
    return finds.sort((a, b) => b.rank - a.rank).slice(0, 8).map(find => find.html).join('');
}

export function resultNotes(runtime, result) {
    return [result.first && '첫 완료', result.bonus && '보너스 달성', result.drops && (0, runtime.deps._t)('지도석 {drops}개', { drops: result.drops }),
        result.fragments && (0, runtime.deps._t)('각인 {fragments}개', { fragments: result.fragments }), result.seed && (0, runtime.deps._t)('세계수 씨앗 +1 ({seeds}/{max})', { seeds: result.seeds, max: runtime.deps.ATLAS.seeds.max }),
        result.endgame?.awakened && '아틀라스 후반부 개방'].filter(Boolean).join(', ');
}

/** The atlas's own materials are outside the wallet receipt. Show the amounts actually kept at completion. */
export function resultMaterialsHtml(runtime, result) {
    const spoils = result.endgame;
    if (!spoils) return '';
    const items = [...spoils.items, ...(spoils.invite ? [['ringInvite', spoils.invite]] : [])];
    if (!items.length) return '';
    return `<div class="atlas-result-currencies"><small>${(0, runtime.deps._t)('후반부 재료')}</small>${items.map(([id, n]) =>
        `<span>${(0, runtime.deps.escapeHTML)(runtime.deps.atlasEndgame.itemName(id))} <b>+${n}</b></span>`).join('')}</div>`;
}

export function receiptHtml(runtime, receipt) {
    const none = '<span class="atlas-muted">기록된 재화 없음</span>';
    if (!receipt) return `<div class="atlas-result-currencies">${none}</div>`;
    const finds = findsHtml(runtime, receipt);
    const currencies = Object.entries(receipt.currencies).map(([key, n]) => `<span>${runtime.deps.window.getStyledOrbName(key)} <b>+${n}</b></span>`).join('');
    return `${finds ? `<div class="atlas-result-finds" aria-label="${(0, runtime.deps._t)('이번 판의 발견')}"><small>${(0, runtime.deps._t)('이번 판의 발견')}</small>${finds}</div>` : ''}
            <div class="atlas-result-currencies"><small>${(0, runtime.deps._t)('재화 {length}종, 장비 {equipmentCount}개', { length: Object.keys(receipt.currencies).length, equipmentCount: receipt.equipmentCount })}</small>${currencies || none}</div>`;
}

export function resultHtml(runtime) {
    const result = ledger(runtime).lastResult;
    if (!result) return '';
    const done = result.outcome === 'complete', recalled = result.memory?.foughtTier;
    return `<section class="atlas-result${done ? '' : ' is-failed'}" aria-label="${(0, runtime.deps._t)('지난 지도 결과')}"><h3>${(0, runtime.deps.escapeHTML)(nodeName(runtime, result.nodeId))}${recalled ? (0, runtime.deps._t)(' (기억 {recalled}단계)', { recalled }) : ''} ${result.tier}등급 ${done ? (0, runtime.deps._t)('완료') : (0, runtime.deps._t)('실패')}<span>${resultNotes(runtime, result)}</span></h3>
            ${done ? overflowHtml(runtime, result) : failureHtml(runtime, result)}${resultMemoryHtml(runtime, result)}${resultMaterialsHtml(runtime, result)}${receiptHtml(runtime, result.loot)}</section>`;
}

export function lostRewards(runtime, result) {
    return [result.lost && (0, runtime.deps._t)('지도석 {lost}개', { lost: result.lost }), result.lostFragments && (0, runtime.deps._t)('각인 {lostFragments}개', { lostFragments: result.lostFragments }),
        ...(result.lostMaterials || []).map(([id, count]) => (0, runtime.deps._t)('{itemName} {count}개', { itemName: runtime.deps.atlasEndgame.itemName(id), count }))].filter(Boolean);
}

export function overflowHtml(runtime, result) {
    const lost = lostRewards(runtime, result);
    if (!lost.length) return '';
    return `<div class="atlas-result-loss"><p>${(0, runtime.deps._t)('보관 한도 초과: {lost}는 보관하지 못했습니다.', { lost: (0, runtime.deps.escapeHTML)(lost.join(', ')) })}</p></div>`;
}

export function resultMemoryHtml(runtime, result) {
    const memory = result.memory;
    if (!memory) return '';
    const record = memory.newBest ? `<p>${(0, runtime.deps._t)('기억 최고 기록 갱신 ({foughtTier}단계)', { foughtTier: memory.foughtTier })}</p>` : '';
    const ticket = memory.ticket;
    if (!ticket) return record ? `<div class="atlas-result-memory">${record}</div>` : '';
    const name = runtime.deps.atlas.node(ticket.node).boss;
    return `<div class="atlas-result-memory">${record}<p>${(0, runtime.deps._t)('기억 획득: {name} {tier}단계 +1', { name: (0, runtime.deps.escapeHTML)(name), tier: ticket.tier })}</p>
            <button onclick="atlasUi.setView('memory');memoryDungeonUi.select('${ticket.node}',${ticket.tier})">${(0, runtime.deps._t)('기억 준비 보기')}</button></div>`;
}

export function failureHtml(runtime, result) {
    const lost = lostRewards(runtime, result);
    return `${lost.length ? `<div class="atlas-result-loss"><p>${(0, runtime.deps._t)('보류 보상 손실: {lost}', { lost: (0, runtime.deps.escapeHTML)(lost.join(', ')) })}</p></div>` : ''}
            ${!ledger(runtime).run && ledger(runtime).stash.length ? (0, runtime.deps._t)('<div class="atlas-actions"><button onclick="atlasUi.revealStash()">다음 지도석 고르기</button></div>') : ''}`;
}
