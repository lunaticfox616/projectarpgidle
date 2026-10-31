/** 시대 재생 보기 (js/atlas-epoch.js): 재생 조건 · 받을 세계수 정수 · 영구 특전. 재생은 확인 대화 뒤에만 한다. */
const atlasEpochUi = (() => {
    const labels = ATLAS_PASSIVES.labels;
    let lastRebirth = null;
    function perkText(perk) {
        if (perk.effect) return Object.entries(perk.effect).map(([key, value]) => `${labels[key][0]} +${value}${labels[key][1]}`).join(', ') + ' / 단계';
        if (perk.points) return `아틀라스 포인트 +${perk.points} / 단계`;
        if (perk.offline) return `방치 효율 +${Math.round(perk.offline * 100)}%p / 단계`;
        return `루프 시작 때 ${perk.supply.map(([key, amount]) => `${ORB_DB[key].name} ${amount}`).join(', ')} / 단계`;
    }
    async function rebirth() {
        const owner = game, target = owner.atlas, why = atlasEpoch.reason(owner);
        if (why) return addLog(why, 'attack-monster');
        // The confirmation covers the progress being erased, including altar materials held in the wallet.
        const reviewed = rebirthReview(owner), gained = atlasEpoch.essenceFor(owner), before = target.epoch.essence;
        const accepted = await requestGameConfirmation(`아틀라스 완료, 보너스, 패시브, 씨앗, 후반부 진행(깨어남과 재료)과 이번 루프의 지도석, 각인이 사라지고, 세계수 정수 ${gained}개를 받습니다. 특전, 해금, 자동 지도 설정은 남습니다.`,
            { title: '시대 재생', tone: 'danger', confirmLabel: '재생', cancelLabel: '그만두기' });
        if (!accepted) return;
        if (game !== owner || game.atlas !== target || rebirthReview(owner) !== reviewed) {
            return addLog('확인 중 저장이나 아틀라스 진행이 바뀌어 시대 재생을 취소했습니다. 현재 상태를 다시 확인하세요.', 'attack-monster');
        }
        const reason = atlasEpoch.rebirth(owner);
        if (reason) return addLog(reason, 'attack-monster');
        atlas.sync(owner);
        lastRebirth = { owner, target, season: owner.season, epoch: target.epoch.count, gained: target.epoch.essence - before, maps: target.stash.length };
        addLog(`🌳 시대 재생 ${target.epoch.count}회, 세계수 정수 +${lastRebirth.gained}, 새 지도석 ${lastRebirth.maps}개`, 'loot-unique');
        queueImportantSave(100);
        atlasUi.refresh();
        document.querySelector('#ui-atlas .atlas-epoch-restart')?.scrollIntoView({ block: 'start' });
    }
    // 재생이 지우거나 정수를 셈하는 칸만 본다: 확인 창 사이 변이 보스 처치(atlas.memory)나 기록은 재생을 취소하지 않는다
    const rebirthReview = owner => {
        const { completed, bonus, passives, seeds, stash, fragments, run, endgame, epoch } = owner.atlas;
        return JSON.stringify([owner.season, { completed, bonus, passives, seeds, stash, fragments, run, endgame, epoch },
            hasCurrentLoopChaos20Clear(owner), atlasEndgame.loopKeptCurrencies(owner)]);
    };
    function chooseMap() {
        const busy = atlas.runOpenReason(game);
        if (busy) return addLog(busy, 'attack-monster');
        atlasUi.setView('maps');
        const map = game.atlas.stash[0];
        if (map) atlasUi.selectMap(map.uid, true);
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
            <button onclick="atlasEpochUi.buy('${perk.id}')" ${reason ? 'disabled' : ''} data-tip="${escapeHTML(reason || '')}">${full ? '최대' : `정수 ${atlasEpoch.cost(game, perk.id)}`}</button></div>`;
    }
    function rebirthReceipt() {
        if (!lastRebirth || lastRebirth.owner !== game || lastRebirth.target !== game.atlas
            || lastRebirth.season !== game.season || lastRebirth.epoch !== game.atlas.epoch.count) return null;
        return lastRebirth;
    }
    function restartState() {
        const st = game.atlas;
        if (!st.epoch.count || st.seeds || st.completed.length) return null;
        const reason = atlas.runOpenReason(game) || (!st.stash.length ? '지도석이 없습니다. 이번 루프의 혼돈 20을 클리어하거나 혼돈 20 이상 보스를 처치하세요.' : '');
        return { receipt: rebirthReceipt(), reason };
    }
    function restartHtml() {
        const next = restartState();
        if (!next) return '';
        const { receipt, reason } = next;
        const received = receipt ? `<p>세계수 정수 <b>+${receipt.gained}</b>, 새 지도석 <b>${receipt.maps}개</b>를 받았습니다.</p>` : '';
        return `<section class="atlas-epoch-restart" aria-label="시대 재생 후 성장"><h3>${receipt ? '시대 재생 완료' : '새 시대의 시작'}</h3>${received}
            <p>보유 정수 <b>${game.atlas.epoch.essence}개</b></p>
            <div><button type="button" onclick="atlasEpochUi.chooseMap()" ${reason ? 'disabled' : ''}>새 지도 고르기</button><span>보관함 ${game.atlas.stash.length}개</span></div>
            ${reason ? `<p class="atlas-muted">${reason}</p>` : ''}</section>`;
    }
    function html() {
        const epoch = game.atlas.epoch, why = atlasEpoch.reason(game), restart = restartHtml();
        const head = `<section class="atlas-epoch-head"><div><h3>시대 재생 <span>${epoch.count}회</span></h3>
            <p class="atlas-muted">세계수 씨앗 ${game.atlas.seeds}/${ATLAS.seeds.max}, 현재 진행 기준 예상 정수 ${atlasEpoch.essenceFor(game)}개 (기본 ${ATLAS.epoch.essence.base}, 지도 노드 완료 ${ATLAS.epoch.essence.perCompleted}개마다 1, 보너스 ${ATLAS.epoch.essence.perBonus}개마다 1, 씨앗마다 ${ATLAS.epoch.essence.perSeed})</p>
            <p class="atlas-muted">초기화: 완료, 보너스, 패시브, 씨앗, 후반부 진행, 이번 루프의 지도석과 각인. 유지: 특전, 해금, 자동 지도, 각인 홈 설정.</p></div>
            <div class="atlas-epoch-action"><strong>세계수 정수 ${epoch.essence}</strong>${why ? `<p class="atlas-lock">${why}</p>` : ''}
            <button class="atlas-primary" onclick="atlasEpochUi.rebirth()" ${why ? 'disabled' : ''}>시대 재생</button></div></section>`;
        const perks = `<div class="atlas-perks">${ATLAS.epoch.perks.map(perkHtml).join('')}</div>`;
        return `<div class="atlas-epoch">${restart ? `${restart}${perks}${head}` : `${head}${perks}`}</div>`;
    }
    return Object.freeze({ html, rebirth, buy, chooseMap });
})();
safeExposeGlobals({ atlasEpochUi });
