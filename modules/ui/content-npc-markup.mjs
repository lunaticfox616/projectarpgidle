export function view_personal(runtime, text) { return String(text || '').split(/[\s,]+/).pop(); }

export function view_npcHeardKey(runtime, npc, topic) { return `${npc.id}:${topic}`; }

export function npcNews(runtime, npc) {
    if (!runtime.deps.game.contentProgression) return '';
    return npcTopics(runtime, npc).open.some(row => !npcHeard(runtime, npc, row.topic)) ? 'talk' : '';
}

export function npcModeBody(runtime, view) {
    if (view.mode === 'shop') return runtime.deps.npcShopUi.body(view.npc);
    return view.mode === 'exchange' ? runtime.deps.orgaExchangeUi.body() : npcTalkBody(runtime, view);
}

export function npcTalkBody(runtime, view) {
    const npc = view.npc, { open } = npcTopics(runtime, npc), topic = open.find(row => row.topic === view.topic) || null;
    const keys = open.map(row => {
        const heard = npcHeard(runtime, npc, row.topic);
        return `<li><button type="button" class="${heard ? 'is-heard' : 'is-new'}" data-npc-topic="${(0, runtime.deps.escapeHTML)(row.topic)}" aria-pressed="${row === topic}">
                <span>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.topic))}</span>${heard ? '' : (0, runtime.deps._t)('<em>새 이야기</em>')}</button></li>`;
    }).join('');
    return `<section class="npc-dialog-speech" aria-live="polite">${topic ? `<h3>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(topic.topic))}</h3>` : ''}
            <p>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(topic ? topic.line : npcGreeting(runtime, npc)))}</p></section>
            <nav class="npc-dialog-talk" aria-label="${(0, runtime.deps._t)('이야깃거리')}"><h4>${(0, runtime.deps._t)('이야기')}</h4><ul class="npc-dialog-topics">${keys}</ul></nav>
            ${npcFoot(runtime, view)}`;
}

export function npcFoot(runtime, view) {
    if (!runtime.deps.contentProgression.opening.canOpen(runtime.deps.game, 'tab-trade')) return '';
    const doors = runtime.deps.npcShopUi.door(view.npc) + runtime.deps.orgaExchangeUi.door(view.npc);
    return doors ? `<footer class="npc-dialog-foot">${doors}</footer>` : '';
}

export function npcTopics(runtime, npc) {
    const rows = (runtime.deps.STORY_NPCS[npc.id] || {}).dialogues || [], act = npcReachedAct(runtime), loop = runtime.deps.game.season || 1;
    return { open: rows.filter(row => (!row.reqAct || act >= row.reqAct) && (!row.reqLoop || loop >= row.reqLoop)) };
}

export function npcReachedAct(runtime) {
    if ((runtime.deps.game.season || 1) > 1) return runtime.deps.STORY_ACTS.length;
    const zone = Math.max(Number(runtime.deps.game.maxZoneId) || 0, Number.isInteger(runtime.deps.game.currentZoneId) ? runtime.deps.game.currentZoneId : 0);
    return runtime.deps.STORY_ACTS.filter((act, index) => index <= zone).reduce((top, act) => Math.max(top, act.order), 1);
}

export function npcGreeting(runtime, npc) {
    if (npc.line) return npc.line;
    const me = view_personal(runtime, npc.name), act = npcReachedAct(runtime);
    const met = runtime.deps.STORY_ACTS.filter(row => row.order <= act).map(row => (runtime.deps.STORY_ACT_ENCOUNTERS[row.order] || {}).npc)
        .filter(said => said && view_personal(runtime, said.name) === me).pop();
    return met ? met.bark : npc.title;
}

export function npcHeard(runtime, npc, topic) {
    return runtime.deps.game.npcHeard.includes(view_npcHeardKey(runtime, npc, topic));
}
