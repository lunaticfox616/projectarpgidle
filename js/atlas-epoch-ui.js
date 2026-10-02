/** 시대 재생 보기 (js/atlas-epoch.js): 재생 조건 · 받을 세계수 정수 · 영구 특전. 재생은 확인 대화 뒤에만 한다. */
const atlasEpochUi = (() => {
    const labels = ATLAS_PASSIVES.labels;
    function perkText(perk) {
        if (perk.effect) return Object.entries(perk.effect).map(([key, value]) => `${labels[key][0]} +${value}${labels[key][1]}`).join(' · ') + ' / 단계';
        if (perk.points) return `아틀라스 포인트 +${perk.points} / 단계`;
        return `루프 시작 때 ${perk.supply.map(([key, amount]) => `${ORB_DB[key].name} ${amount}`).join(' · ')} / 단계`;
    }
    async function rebirth() {
        const why = atlasEpoch.reason(game);
        if (why) return addLog(why, 'attack-monster');
        const gained = atlasEpoch.essenceFor(game);
        const accepted = await requestGameConfirmation(`아틀라스 완료, 보너스, 패시브, 씨앗, 후반부 진행(깨어남과 재료)과 이번 루프의 지도석, 각인이 사라지고, 세계수 정수 ${gained}개를 받습니다. 특전, 해금, 자동 지도 설정은 남습니다.`,
            { title: '시대 재생', tone: 'danger', confirmLabel: '재생', cancelLabel: '그만두기' });
        if (!accepted) return;
        const reason = atlasEpoch.rebirth(game);
        if (reason) return addLog(reason, 'attack-monster');
        addLog(`🌳 시대 재생 ${game.atlas.epoch.count}회 · 세계수 정수 +${gained}`, 'loot-unique');
        queueImportantSave(100);
        atlasUi.refresh();
    }
    function buy(id) {
        const reason = atlasEpoch.buy(game, id);
        if (reason) return addLog(reason, 'attack-monster');
        addLog(`🌳 ${atlasEpoch.perks.get(id).name} ${atlasEpoch.rank(game, id)}단계`, 'season-up');
        queueImportantSave(200);
        atlasUi.refresh();
    }
    function perkHtml(perk) {
        const level = atlasEpoch.rank(game, perk.id), full = level >= perk.max, reason = atlasEpoch.buyReason(game, perk.id);
        return `<div class="atlas-perk${level ? ' is-taken' : ''}"><div><strong>${escapeHTML(perk.name)} <span>${level}/${perk.max}</span></strong><small>${escapeHTML(perkText(perk))}</small></div>
            <button onclick="atlasEpochUi.buy('${perk.id}')" ${reason ? 'disabled' : ''} title="${escapeHTML(reason || '')}">${full ? '최대' : `정수 ${atlasEpoch.cost(game, perk.id)}`}</button></div>`;
    }
    function html() {
        const epoch = game.atlas.epoch, why = atlasEpoch.reason(game);
        return `<div class="atlas-epoch"><section class="atlas-epoch-head"><div><h3>시대 재생 <span>${epoch.count}회</span></h3>
            <p class="atlas-muted">세계수 씨앗 ${game.atlas.seeds}/${ATLAS.seeds.max} · 지금 재생하면 세계수 정수 ${atlasEpoch.essenceFor(game)}개 (기본 ${ATLAS.epoch.essence.base} + 완료 · 보너스 · 씨앗)</p>
            <p class="atlas-muted">되돌리는 것: 완료, 보너스, 패시브, 씨앗, 후반부 진행, 이번 루프의 지도석과 각인. 남는 것: 특전, 해금, 자동 지도, 각인 홈 설정.</p></div>
            <div class="atlas-epoch-action"><strong>세계수 정수 ${epoch.essence}</strong>${why ? `<p class="atlas-lock">${why}</p>` : ''}
            <button class="atlas-primary" onclick="atlasEpochUi.rebirth()" ${why ? 'disabled' : ''}>시대 재생</button></div></section>
            <div class="atlas-perks">${ATLAS.epoch.perks.map(perkHtml).join('')}</div></div>`;
    }
    return Object.freeze({ html, rebirth, buy });
})();
safeExposeGlobals({ atlasEpochUi });
