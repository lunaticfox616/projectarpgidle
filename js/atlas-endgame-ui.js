/** 아틀라스 최종 보기 (js/atlas-endgame.js, docs/atlas-pinnacles-20261002.md 2-1, 3절): 최종 보스 다섯과 리그 우두머리에게 도전하고,
 * 바칠 재료와 마름을 본다. 깨어나기 전에는 무엇이 열리는지만 보인다. 깨어남과 후반부 보상은 기록에도 남긴다.
 */
const atlasEndgameUi = (() => {
    const E = ATLAS_ENDGAME;
    function challenge(id) {
        const reason = atlasRun.openEndgame(id);
        if (reason) return addLog(reason, 'attack-monster');
        queueImportantSave(200);
        atlasUi.refresh();
        switchTab('tab-battle');
    }
    function entryHtml(entry) {
        return entry.map(row => `<span class="${row.have >= row.need ? 'is-on' : ''}">${escapeHTML(row.name)} ${row.have}/${row.need}</span>`).join('');
    }
    /** [who, where]: a league names its boss and its room, an apex its first stage and its domain. */
    const titleOf = row => (row.kind === 'league' ? [row.boss, row.name] : [row.stages[0].name, row.domain]);
    /** One fight: who and where, the offering (have/need) and where it comes from, its unique, the unlock condition and the challenge.
     * block: why nothing can depart now (an open map, another content's run), said once above the cards. */
    function fightHtml(fight, block) {
        const row = fight.row, tier = atlas.effectiveTier(game, atlas.node(row.id)), why = fight.reason || block, [who, where] = titleOf(row);
        const lockId = `atlas-late-lock-${row.id}`;
        return `<div class="atlas-late-card${why ? '' : ' is-ready'}${fight.unlocked ? '' : ' is-locked'}">
            <strong>${escapeHTML(who)}</strong><small>${escapeHTML(where)}, ${tier}등급, ${row.stages.length}단계${fight.kills ? `, 처치 ${fight.kills}회` : ''}</small>
            <div class="atlas-late-entry">${entryHtml(fight.entry)}</div><p class="atlas-muted">${escapeHTML(row.how)}</p>
            <p class="atlas-late-unique">고유 장비 ${escapeHTML(row.unique)}</p>${fight.lock ? `<p class="atlas-lock" id="${lockId}">${escapeHTML(fight.lock)}</p>` : ''}
            <button class="atlas-primary" data-exploration-departure onclick="atlasEndgameUi.challenge('${row.id}')" aria-label="${escapeHTML(who)} 도전"
                ${fight.lock ? `aria-describedby="${lockId}"` : ''} ${why ? `disabled title="${escapeHTML(why)}"` : ''}>도전</button></div>`;
    }
    /** Why no late fight can depart right now (said once): the atlas's own lock, an open map, or another content's run. */
    function departBlock() {
        if (game.atlas.run) return '열린 지도를 마치거나 닫으면 도전할 수 있습니다.';
        return atlas.lockReason(game) || atlasRun.blockReason();
    }
    function headHtml(view, block) {
        if (!view.awakened) return `<section class="atlas-late-head"><h3>잠든 아틀라스</h3>
            <p class="atlas-muted">세계수의 그림자(정점)를 처음 쓰러뜨리면 깨어나 아래 싸움이 열립니다.</p></section>`;
        return `<section class="atlas-late-head"><h3>깨어난 아틀라스</h3>
            <p class="atlas-muted">나이테가 목격한 처치 ${view.witness}회, 다음 초대장까지 ${view.witness % view.witnessPer}/${view.witnessPer}</p>
            ${block ? `<p class="atlas-lock">${escapeHTML(block)}</p>` : ''}</section>`;
    }
    /** 마름: only once the gardener has fallen (it spreads from then on). */
    function blightHtml(view) {
        if (!view.gardenerDown) return '';
        const chips = view.blight.map(({ region, level }) => `<span style="--tint:${region.tint}"><i></i>${region.name} ${level}/${E.blight.max}</span>`).join('');
        return `<section class="atlas-late-group"><h3>마름</h3><p class="atlas-muted">지도를 마칠 때마다 그 지역에 번지고, 짙을수록 사도가 자주 나옵니다.</p>
            <div class="atlas-late-blight">${chips}</div></section>`;
    }
    function html() {
        const view = atlasEndgame.overview(game), block = view.awakened ? departBlock() : '', cards = list => list.map(fight => fightHtml(fight, block)).join('');
        return `<div class="atlas-late">${headHtml(view, block)}
            <section class="atlas-late-group"><h3>최종 보스</h3><div class="atlas-late-cards">${cards(view.apexes)}</div></section>
            <section class="atlas-late-group"><h3>리그 우두머리</h3><div class="atlas-late-cards">${cards(view.leagues)}</div></section>
            ${blightHtml(view)}</div>`;
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
        if (spoils.awakened) addLog('🌳 세계수의 그림자가 쓰러져 아틀라스가 깨어났습니다.', 'loot-unique');
        noticeAwakened();
        const text = spoilsText(spoils);
        if (text) addLog(`🌳 후반부 보상: ${text}`, 'season-up');
        if (spoils.unique) addLog(`👑 고유 장비 <span class='loot-unique'>[${escapeHTML(spoils.unique)}]</span>`, 'loot-unique');
    }
    window.addEventListener('project-idle:atlas-map', event => announce(event.detail));
    return Object.freeze({ html, challenge, noticeAwakened });
})();
safeExposeGlobals({ atlasEndgameUi });
