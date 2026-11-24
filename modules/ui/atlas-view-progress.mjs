// 천문도 아래 띠의 셋째 카드(아틀라스 개편 D1): 진행. 머리의 두 쪽(진행, 지난 결과)을 오간다. 진행 쪽은 지도 첫 완료 막대(50곳), 보스 칸(10곳),
// 세계수 씨앗, 자동 지도. 지난 결과 쪽은 마지막 지도의 결과(장비 상자, 지침, 발견). 새 결과가 생기면 처음 볼 때 그 쪽이 열린다.
import { ledger, nodeName, tierLabel } from './atlas-view-model.mjs';
import { givenHtml, boxesHtml, receiptHtml, overflowHtml, failureHtml, resultMemoryHtml, resultMaterialsHtml, resultNotes } from './atlas-view-results.mjs';
import { esc } from './atlas-view-pick.mjs';

/** 보이는 쪽: 고른 쪽, 고른 적이 없거나 새 결과가 생겼으면(처음 볼 때) 지난 결과. 결과가 없으면 진행. */
export function progressFace(runtime) {
    const result = ledger(runtime).lastResult;
    if (!result) return 'progress';
    if (runtime.state.resultSeen !== result) Object.assign(runtime.state, { resultSeen: result, progressFace: 'result' });
    return runtime.state.progressFace;
}

export function pipsHtml(count, total, cls) { return `<span class="as-pips ${cls}" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<i class="${i < count ? 'is-on' : ''}"></i>`).join('')}</span>`; }

/** 진행 쪽: 지도 첫 완료(패시브 포인트를 세는 그 수), 보스 자리 완료, 씨앗, 자동 지도와 그 설정. */
export function progressBodyHtml(runtime) {
    const game = runtime.deps.game, st = ledger(runtime), maps = runtime.deps.ATLAS.starChart.maps.length, cleared = runtime.deps.atlasPassives.firstClears(game);
    const gates = runtime.deps.atlas.nodes.filter(node => node.kind === 'gate'), beaten = gates.filter(node => st.completed.includes(node.id)).length, seeds = runtime.deps.ATLAS.seeds.max;
    return `<div class="as-meter" style="--fill:${Math.round(cleared / maps * 100)}%"><b>${esc(runtime, runtime.deps._t('지도 첫 완료'))}</b><span>${cleared}/${maps}</span></div>
            <p class="as-line as-count-row"><small>${esc(runtime, runtime.deps._t('보스'))}</small>${pipsHtml(beaten, gates.length, 'is-boss')}<b>${beaten}/${gates.length}</b></p>
            <p class="as-line as-count-row"><small>${esc(runtime, runtime.deps._t('씨앗'))}</small>${pipsHtml(st.seeds, seeds, 'is-seed')}<b>${st.seeds}/${seeds}</b></p>${autoHtml(runtime)}`;
}

/** 자동 지도: 정점을 정복하기 전에는 꺼진 칸과 그 조건 판. 켜면 수호자 지도 포함과 완료 후 멈춤 안내. */
export function autoHtml(runtime) {
    const st = ledger(runtime), open = runtime.deps.atlas.autoUnlocked(runtime.deps.game), stop = runtime.deps.game.settings.mapCompleteAction === 'stop';
    const guard = st.autoMap ? `<label class="as-check"><input type="checkbox" ${st.autoGuardians ? 'checked' : ''} onchange="atlasUi.toggleAutoGuardians(this.checked)"><span>${esc(runtime, runtime.deps._t('수호자 지도 포함'))}</span></label>` : '';
    const waiting = st.autoMap && stop ? `<button type="button" class="as-mini" onclick="openMapCompleteActionPicker(event)">${esc(runtime, runtime.deps._t('완료 후 행동 변경'))}</button>` : '';
    return `<div class="as-auto-row"><label class="as-check"><input type="checkbox" ${open ? '' : 'disabled'} ${st.autoMap && open ? 'checked' : ''} onchange="atlasUi.toggleAuto(this.checked)"><span>${esc(runtime, runtime.deps._t('자동 지도'))}</span></label>
            ${open ? '' : `<span class="as-plate is-locked">${esc(runtime, runtime.deps._t('정점 정복 후'))}</span>`}${guard}${waiting}</div>`;
}

/** 지난 결과의 등급(지도 자리의 결과만): 지침으로 연 천문도 지도는 T 등급, 나이테 원정 판과 기억 싸움은 그 싸움의 등급. */
function resultTierHtml(runtime, result, node) {
    if (node?.kind !== 'map') return '';
    return ` ${(0, runtime.deps.escapeHTML)(tierLabel(runtime, result.tier, !result.board && !result.memory?.foughtTier))}`;
}

/** 지난 결과 쪽: 머리 줄(지도와 등급, 완료나 실패, 첫 완료 같은 표시), 받은 지침, 장비 상자, 기억, 후반 재료, 이번 판의 발견과 재화. */
export function resultBodyHtml(runtime) {
    const result = ledger(runtime).lastResult, done = result.outcome === 'complete', node = runtime.deps.atlas.node(result.nodeId);
    const tier = resultTierHtml(runtime, result, node), notes = resultNotes(runtime, result);
    return `<div class="as-result${done ? '' : ' is-failed'}"><p class="as-result-head"><strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(nodeName(runtime, result.nodeId)))}${tier}</strong>
            <span class="as-plate is-${done ? 'complete' : 'failed'}">${esc(runtime, runtime.deps._t(done ? '완료' : '실패'))}</span>${notes ? `<small>${(0, runtime.deps.escapeHTML)(notes)}</small>` : ''}</p>
            ${done ? overflowHtml(runtime, result) : failureHtml(runtime, result)}${givenHtml(runtime, result)}${boxesHtml(runtime, result.boxes)}${resultMemoryHtml(runtime, result)}${resultMaterialsHtml(runtime, result)}${receiptHtml(runtime, result.loot)}</div>`;
}

export function progressCardHtml(runtime) {
    const face = progressFace(runtime), has = !!ledger(runtime).lastResult;
    const tab = (id, label) => `<button type="button" class="as-tab" aria-pressed="${face === id}" onclick="atlasUi.showProgress('${id}')" ${id === 'result' && !has ? 'disabled' : ''}>${esc(runtime, runtime.deps._t(label))}</button>`;
    return `<section class="as-card as-progress" aria-label="${esc(runtime, runtime.deps._t('진행'))}"><header class="as-card-head"><nav class="as-tabs">${tab('progress', '진행')}${tab('result', '지난 결과')}</nav></header>
            <div class="as-card-body">${face === 'result' && has ? resultBodyHtml(runtime) : progressBodyHtml(runtime)}</div></section>`;
}
