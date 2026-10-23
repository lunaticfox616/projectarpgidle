/** 아틀라스 최종 보기 (js/atlas-endgame.js, docs/atlas-pinnacles-20261002.md 2-1, 3절): 최종 보스 다섯과 리그 우두머리에게 도전하고,
 * 바칠 재료와 마름을 본다. 깨어나기 전에는 무엇이 열리는지만 보인다. 깨어남과 후반부 보상은 기록에도 남긴다.
 */
const atlasEndgameUi = (() => {
    const E = ATLAS_ENDGAME;
    let filter = 'all';
    const regionName = id => (ATLAS.regions.find(region => region.id === id) || {}).name || id;
    const ready = (fight, block) => !(fight.reason || block);
    function setFilter(value) {
        if (!['all', 'ready', 'undefeated'].includes(value)) return;
        filter = value;
        atlasUi.refresh();
        document.querySelector(`[data-atlas-fight-filter="${filter}"]`)?.focus();
    }
    /** Links select an existing destination; they never spend an offering or enter a fight. */
    function showSource(item) {
        if (!Object.hasOwn(E.items, item)) return;
        const guardian = Object.entries(E.guardianShears).find(([, material]) => material === item);
        atlasUi.setView('maps');
        if (guardian) atlasUi.selectNode(`${guardian[0]}_g`, true);
        else atlasUi.revealStash();
    }
    function preparePinnacle() {
        atlasUi.setView('maps');
        atlasUi.selectNode('pinnacle', true);
    }
    function showFight(id) {
        if (!atlasEndgame.def(id)) return;
        filter = 'all';
        atlasUi.refresh();
        const card = document.querySelector(`[data-atlas-fight="${id}"]`);
        card?.scrollIntoView({ block: 'start' });
        card?.focus({ preventScroll: true });
    }
    function challenge(id) {
        const reason = atlasRun.openEndgame(id);
        if (reason) return addLog(reason, 'attack-monster');
        if (E.stories[id]) addLog(escapeHTML(E.stories[id].entry), 'season-up');
        queueImportantSave(200);
        atlasUi.refresh();
        switchTab('tab-battle');
    }
    function entryHtml(entry) {
        return entry.map(row => `<span class="${row.have >= row.need ? 'is-on' : ''}">${escapeHTML(row.name)} ${row.have}/${row.need}</span>`).join('');
    }
    function sourcesHtml(fight) {
        const missing = fight.entry.filter(row => row.have < row.need);
        if (!missing.length) return '';
        const rows = missing.map(row => {
            const apostle = E.apostles.find(entry => entry.item === row.item);
            const regions = apostle ? `, ${apostle.regions.map(regionName).join(', ')}의 마름 지도` : '';
            const guardian = Object.values(E.guardianShears).includes(row.item);
            return `<li><b>${escapeHTML(row.name)} ${row.need - row.have}개 부족</b><span>${escapeHTML(E.items[row.item].from + regions)}</span>
                <button type="button" onclick="atlasEndgameUi.showSource('${row.item}')">${guardian ? '수호자 지도 보기' : '지도 보관함 보기'}</button></li>`;
        }).join('');
        return `<details class="atlas-material-sources"><summary>부족한 재료 획득처</summary><ul>${rows}</ul></details>`;
    }
    /** [who, where]: a league names its boss and its room, an apex its first stage and its domain. */
    const titleOf = row => (row.kind === 'league' ? [row.boss, row.name] : [row.stages[0].name, row.domain]);
    /** 권장 전투력: the map device's estimate for this fight's arena at its tier and boss rules (2026-10-18: the hardest fights showed none). */
    const powerHtml = (row, tier) => buildMapPowerEstimateHtml(atlas.preview(game, atlasMaps.create(row.id, tier, 'normal', () => 0)));
    /** One fight: who and where, the offering (have/need) and where it comes from (and the influenced gear that content gives), its unique,
     * the unlock condition and the challenge.
     * block: why nothing can depart now (an open map, another content's run), said once above the cards. */
    function fightHtml(fight, block) {
        const row = fight.row, tier = atlas.effectiveTier(game, atlas.node(row.id)), why = fight.reason || block, [who, where] = titleOf(row);
        const lockId = `atlas-late-lock-${row.id}`;
        return `<div class="atlas-late-card${why ? '' : ' is-ready'}${fight.unlocked ? '' : ' is-locked'}" data-atlas-fight="${row.id}" tabindex="-1">
            <strong>${escapeHTML(who)}</strong><small>${escapeHTML(where)}, ${tier}등급, ${row.stages.length}단계${fight.kills ? `, 처치 ${fight.kills}회` : ''}</small>${storyHtml(row)}
            ${powerHtml(row, tier)}<div class="atlas-late-entry">${entryHtml(fight.entry)}</div><p class="atlas-muted">${escapeHTML(row.how)}</p>${itemInfluencesUi.fightSourceHtml(row.id)}
            ${sourcesHtml(fight)}${uniqueHtml(row, fight.kills)}${arenaHtml(row)}${fight.lock ? `<p class="atlas-lock" id="${lockId}">${escapeHTML(fight.lock)}</p>` : ''}
            <button class="atlas-primary" data-exploration-departure onclick="atlasEndgameUi.challenge('${row.id}')" aria-label="${escapeHTML(who)} 도전"
                ${fight.lock ? `aria-describedby="${lockId}"` : ''} ${why ? `disabled title="${escapeHTML(why)}"` : ''}>도전</button></div>`;
    }
    /** The fight's unique and what it does, from its definition (data/items.js), so the card cannot promise another effect. A final
     * boss also names its craft omen, one each kill (data/items.js CRAFT_OMENS), with the catalog's line for it. */
    function uniqueHtml(row, kills) {
        const effect = (UNIQUE_DB.find(entry => entry.name === row.unique) || {}).uniqueEffect;
        const omen = CRAFT_OMENS.keys.find(key => CRAFT_OMENS.effects[key].boss === row.id);
        const chance = kills ? `재처치 시 ${Math.round(E.uniqueChance[row.kind] * 100)}%` : '첫 처치 확정';
        return `<p class="atlas-late-unique">고유 장비 (${chance})<br>${escapeHTML(row.unique)}${effect ? `: ${escapeHTML(effect)}` : ''}</p>`
            + (omen ? `<p class="atlas-late-unique">${escapeHTML(ORB_DB[omen].name)}: ${craftingCatalogUi.description(omen, true)}</p>` : '');
    }
    /** A final boss arena: how its fight goes, and the warning and rest times of its combos (data/atlas-endgame.js combo). */
    function arenaHtml(row) {
        const arena = E.arenas[row.id], combo = E.combo, sec = ms => ms / 1000;
        return arena ? `<details><summary>전투 준비</summary><p>${escapeHTML(arena.hint)}</p><p>큰 공격은 ${sec(combo.warningMs)}~${sec(combo.finisherWarningMs)}초 먼저 예고합니다.
            마무리 뒤 ${sec(combo.finisherRecoveryMs)}초 동안 새 공격이 없습니다.
            자동전투는 큰 공격의 예고 칸을 걸어서 벗어나고, 장판은 돌아갈 길이 있을 때만 피합니다.</p></details>` : '';
    }
    /** The boss's story and the line it says as the fight opens. No picture: the boss is first seen in its arena (2026-10-18 사용자:
     * "보스 도전 창에서 보스 몬스터의 외형을 미리 보여주지 않게"). */
    function storyHtml(row) {
        const story = E.stories[row.id];
        return story ? `<details><summary>이야기</summary><p class="atlas-muted">${escapeHTML(story.story)}</p>
            <blockquote>${escapeHTML(story.entry)}</blockquote></details>` : '';
    }
    /** Why no late fight can depart right now (said once): the atlas's own lock, an open map, or another content's run. */
    function departBlock() {
        return atlas.runOpenReason(game) || atlas.lockReason(game) || atlasRun.blockReason();
    }
    function headHtml(view, block) {
        if (!view.awakened) return `<section class="atlas-late-head"><h3>잠든 아틀라스</h3>
            <p class="atlas-muted">세계수의 그림자(정점)를 처음 쓰러뜨리면 깨어나 아래 싸움이 열립니다.</p>
            <button type="button" onclick="atlasEndgameUi.preparePinnacle()">정점 준비 보기</button></section>`;
        const fights = [...view.apexes, ...view.leagues];
        const filters = [['all', '전체', fights.length], ['ready', '도전 가능', fights.filter(fight => ready(fight, block)).length],
            ['undefeated', '미처치', fights.filter(fight => !fight.kills).length]];
        return `<section class="atlas-late-head"><h3>깨어난 아틀라스</h3>
            <p class="atlas-muted">최종 보스 ${view.apexes.filter(fight => fight.kills > 0).length}/${view.apexes.length}종 격파</p>
            <p class="atlas-muted">나이테가 목격한 처치 ${view.witness}회, ${atlasEndgame.count(game, 'ringInvite') >= E.itemCap
                ? `초대장이 보관 한도(${E.itemCap}개)라 더 받지 못합니다` : `다음 초대장까지 ${view.witness % view.witnessPer}/${view.witnessPer}`}</p>
            ${block ? `<p class="atlas-lock">${escapeHTML(block)}</p>` : ''}
            <nav class="atlas-fight-filters" aria-label="보스 목록">${filters.map(([id, label, count]) => `<button type="button" data-atlas-fight-filter="${id}"
                aria-pressed="${filter === id}" onclick="atlasEndgameUi.setFilter('${id}')">${label} ${count}</button>`).join('')}</nav></section>`;
    }
    /** 마름: only once the gardener has fallen (it spreads from then on; a fallen apostle lifts its region's). */
    function blightHtml(view) {
        if (!view.gardenerDown) return '';
        // 지역마다 그 사도가 주는 조각을 함께 적는다(밑거름의 장로는 네 조각을 다 모아야 하는데 이름으로는 지역을 알 수 없었다).
        const shard = region => { const apostle = E.apostles.find(row => row.regions.includes(region.id)); return apostle ? E.items[apostle.item].name : ''; };
        const chips = view.blight.map(({ region, level }) => `<span style="--tint:${region.tint}"><i></i>${region.name} ${level}/${E.blight.max}`
            + `${shard(region) ? `, ${shard(region)}` : ''}</span>`).join('');
        return `<section class="atlas-late-group"><h3>마름</h3><p class="atlas-muted">지도를 마칠 때마다 그 지역에 번지고, 짙을수록 사도가 자주 나옵니다. 사도를 쓰러뜨리면 그 지역의 마름이 걷힙니다.</p>
            <div class="atlas-late-blight">${chips}</div></section>`;
    }
    function groupHtml(title, fights, block, awakened) {
        const shown = fights.filter(fight => !awakened || filter === 'all' || (filter === 'ready' ? ready(fight, block) : !fight.kills));
        if (!shown.length) return '';
        shown.sort((a, b) => Number(!ready(a, block)) - Number(!ready(b, block)) || Number(a.kills > 0) - Number(b.kills > 0));
        return `<section class="atlas-late-group"><h3>${title}</h3><div class="atlas-late-cards">${shown.map(fight => fightHtml(fight, block)).join('')}</div></section>`;
    }
    function html() {
        const view = atlasEndgame.overview(game), block = view.awakened ? departBlock() : '';
        const groups = groupHtml('최종 보스', view.apexes, block, view.awakened) + groupHtml('리그 우두머리', view.leagues, block, view.awakened);
        return `<div class="atlas-late">${headHtml(view, block)}${followupHtml(view)}
            ${groups || '<div class="atlas-fight-empty"><p class="atlas-muted">조건에 맞는 보스가 없습니다.</p><button onclick="atlasEndgameUi.setFilter(\'all\')">전체 목록 보기</button></div>'}
            ${blightHtml(view)}</div>`;
    }
    /** A boss kill can open another preparation goal even when the player's ready-only filter is now empty. */
    function followupHtml(view) {
        const result = game.atlas.lastResult;
        if (!result || result.outcome !== 'complete' || result.memory?.foughtTier) return '';
        const next = view.apexes.find(fight => fight.unlocked && !fight.kills && fight.row.unlock?.kill === result.nodeId);
        if (!next) return '';
        return `<section class="atlas-fight-followup"><h3>새 목표: ${escapeHTML(next.row.name)}</h3>
            <p>${escapeHTML(next.row.how)}</p>
            <button onclick="atlasEndgameUi.showFight('${next.row.id}')">준비할 재료 보기</button></section>`;
    }

    // ---------------------------------------------------------------- notices and log lines (js/atlas-run.js 'complete' carries result.endgame)
    /** The awakening card follows the state (once, by seenTutorials): an awakening in background replay or an old save still gets it.
     * Called from atlasUi.render on every static refresh; the card opens the atlas's late view. */
    function noticeAwakened() {
        if (!atlasEndgame.awakened(game)) return;
        queueTutorialNotice('atlas_awakened', '깨어난 아틀라스', '아틀라스의 최종 보기에서 최종 보스와 리그 우두머리에게 도전할 수 있습니다.', 'tab-map',
            { subtabId: 'map-explore-worldtree', atlasView: 'late' });
    }
    function spoilsText(spoils) {
        const parts = [...spoils.rewards.map(([key, amount]) => `${ORB_DB[key].name} ${amount}`),
            ...spoils.items.map(([id, amount]) => `${atlasEndgame.itemName(id)} ${amount}`)];
        if (spoils.invite) parts.push(`${atlasEndgame.itemName('ringInvite')} ${spoils.invite}`);
        return parts.join(', ');
    }
    function announce(detail) {
        const spoils = detail.kind === 'complete' ? detail.endgame : null;
        if (!spoils) return;
        const story = E.stories[detail.nodeId];
        if (story) addLog(escapeHTML(story.fall), 'season-up');
        if (spoils.awakened) addLog('🌳 세계수의 그림자가 쓰러져 아틀라스가 깨어났습니다.', 'loot-unique');
        noticeAwakened();
        const text = spoilsText(spoils);
        if (text) addLog(`🌳 후반부 보상: ${text}`, 'season-up');
        if (spoils.unique) addLog(`👑 고유 장비 <span class='loot-unique'>[${escapeHTML(spoils.unique)}]</span>`, 'loot-unique');
        if (spoils.blight && spoils.blight.cleansed) addLog(`🌿 사도가 쓰러져 ${escapeHTML(regionName(spoils.blight.region))}의 마름이 걷혔습니다.`, 'season-up');
    }
    window.addEventListener('project-idle:atlas-map', event => announce(event.detail));
    return Object.freeze({ html, challenge, noticeAwakened, setFilter, showSource, preparePinnacle, showFight });
})();
safeExposeGlobals({ atlasEndgameUi });
