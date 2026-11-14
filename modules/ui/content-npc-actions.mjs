import { npcHeard, view_npcHeardKey, npcTopics, npcModeBody } from './content-npc-markup.mjs';
import { listenView, releaseViewTarget } from './view-events.mjs';

export function hearNpcTopic(runtime, npc, topic) {
    if (!npcHeard(runtime, npc, topic)) runtime.deps.game.npcHeard.push(view_npcHeardKey(runtime, npc, topic));
}

export function npcClick(runtime, dialog, view, event) {
    if (view.owner !== runtime.deps.game) { closeNpcView(runtime); return; }
    const control = event.target.closest('button');
    if (!control) return;
    if (control.dataset.npcClose !== undefined) { dialog.close(); return; }
    if (control.dataset.npcTopic) { npcPickTopic(runtime, view, control.dataset.npcTopic); renderNpc(runtime, dialog, view); }
}

export function npcPickTopic(runtime, view, topic) {
    if (view.owner && view.owner !== runtime.deps.game) return;
    if (topic === 'shop' || topic === 'exchange') {
        if (topic === 'exchange' && view.npc.id !== runtime.deps.NPC_CURRENCY_EXCHANGE.npc) return;
        if (runtime.deps.contentProgression.opening.canOpen(runtime.deps.game, 'tab-trade')) view.mode = topic;
        return;
    }
    const known = npcTopics(runtime, view.npc).open.some(row => row.topic === topic);
    Object.assign(view, { mode: 'talk', topic: known ? topic : null });
    if (known) hearNpcTopic(runtime, view.npc, topic);
}

export function openNpc(runtime, npc, mode = 'talk') {
    syncNpcOwner(runtime);
    const old = runtime.deps.document.getElementById('npc-dialog');
    if (!npc || (old && old.open)) return false;
    if (!runtime.deps.contentProgression.opening.canOpen(runtime.deps.game, 'tab-trade') || (mode === 'exchange' && npc.id !== runtime.deps.NPC_CURRENCY_EXCHANGE.npc)) mode = 'talk';
    if (old) old.remove(); // closed a moment ago, its close event (which removes it) not yet run
    closeNpcView(runtime);
    const view = { npc, mode, topic: null, owner: runtime.deps.game };
    const dialog = runtime.deps.document.createElement('dialog');
    dialog.id = 'npc-dialog';
    dialog.className = 'npc-dialog';
    dialog.dataset.npcId = npc.id;
    dialog.dataset.tone = npc.tone || 'gold';
    dialog.setAttribute('aria-labelledby', 'npc-dialog-name');
    runtime.state.npcView = view;
    runtime.state.npcDialog = dialog;
    listenView(runtime, dialog, 'click', event => npcClick(runtime, dialog, view, event));
    listenView(runtime, dialog, 'close', () => closeNpcView(runtime, dialog), { once: true });
    runtime.deps.document.body.appendChild(dialog);
    renderNpc(runtime, dialog, view);
    dialog.showModal();
    runtime.deps.systemTutorialUi.visit('npc-shop');
    return true;
}

export function closeNpcView(runtime, dialog = runtime.state.npcDialog) {
    if (!dialog) return;
    releaseViewTarget(runtime, dialog);
    if (dialog.open) dialog.close();
    dialog.remove();
    if (runtime.state.npcDialog !== dialog) return;
    runtime.state.npcDialog = runtime.state.npcView = null;
}

function syncNpcOwner(runtime) {
    if (runtime.state.npcView && runtime.state.npcView.owner !== runtime.deps.game) closeNpcView(runtime);
}

export function renderNpc(runtime, dialog, view) {
    const npc = view.npc;
    dialog.classList.toggle('is-shop', view.mode !== 'talk');
    dialog.innerHTML = `<figure class="npc-dialog-figure"><img class="npc-dialog-portrait" src="${runtime.deps.STAGE_NPC_ART.path}${npc.id}-portrait.webp" alt=""></figure>
            <div class="npc-dialog-main"><header class="npc-dialog-head"><div class="npc-dialog-who">
            <h2 id="npc-dialog-name">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(npc.name))}</h2><p class="npc-dialog-title">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(npc.title || ''))}</p></div>
            <button type="button" class="npc-dialog-close" data-npc-close>${(0, runtime.deps._t)('닫기')}</button></header>
            ${npcModeBody(runtime, view)}</div>`;
}
