import { mapName } from './atlas-view-model.mjs';

function wheelHubHtml(runtime) {
    const { atlas, game, _t, escapeHTML } = runtime.deps;
    const stones = game.atlas.stash.map(stone => {
        // 갈 곳이 닫힌 지도석(예전 수호자의 것)은 고를 수 없다.
        const node = atlas.mapDestination(game, stone);
        return node && atlas.reachable(game, node.id) ? `<option value="${stone.uid}">${escapeHTML(_t(node.name))} · ${escapeHTML(mapName(runtime, stone))}</option>` : '';
    }).join('');
    return `<section class="atlas-wheel-hub"><div><h3>${_t('차륜 거점')}</h3>
        ${stones ? `<select id="atlas-hub-stone" aria-label="${_t('사용할 지침')}">${stones}</select>` : `<p>${_t('보관함에 지침이 없습니다.')}</p>`}
        <button type="button" onclick="atlasUi.leaveHub()">${_t('사냥터로 돌아가기')}</button></div>
        <button class="atlas-hub-wheel" type="button" aria-label="${_t('차륜으로 입장')}" ${stones?'':'disabled'} onclick="atlasUi.enterHub()"></button>
        <span class="atlas-wheel-label" aria-hidden="true">${_t('차륜으로 입장')}</span></section>`;
}

export function showWheelHub(runtime, host) {
    const { game } = runtime.deps;
    const stage = runtime.deps.document.getElementById('atlas-wheel-refuge');
    const active = game.atlas.wheelHub && game.combatHalted;
    stage.hidden = !active;
    if (!active) return false;
    host.hidden = true;
    const key = `hub-${game.atlas.nextUid}-${game.atlas.stash.length}`;
    if (key !== runtime.state.hudSignature) {
        stage.innerHTML = wheelHubHtml(runtime);
        runtime.state.hudSignature = key;
    }
    return true;
}

export function enterHub(runtime) {
    const owner = runtime.deps.game;
    if (!owner.atlas.wheelHub || !owner.combatHalted) return;
    const uid = Number(runtime.deps.document.getElementById('atlas-hub-stone')?.value);
    const reason = runtime.deps.atlasRun.open(uid);
    if (reason) runtime.deps.addLog(reason, 'attack-monster');
    runtime.handlers.refresh();
}

export function leaveHub(runtime) {
    const owner = runtime.deps.game;
    if (!owner.atlas.wheelHub || !owner.combatHalted) return;
    runtime.deps.startMoving(false);
    runtime.deps.queueImportantSave(180);
    runtime.handlers.refresh();
}
