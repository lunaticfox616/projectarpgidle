/** 시대 재생 보기 (js/atlas-epoch.js): 재생 조건 · 받을 세계수 정수 · 영구 특전. 재생은 확인 대화 뒤에만 한다. */
const atlasEpochUi = (() => {
    const labels = ATLAS_PASSIVES.labels;
    let lastRebirth = null;
    function perkText(perk) {
        if (perk.effect) return Object.entries(perk.effect).map(([key, value]) => `${labels[key][0]} +${value}${labels[key][1]}`).join(', ') + ' / 단계';
        if (perk.points) return _t('아틀라스 포인트 +{points} / 단계', { points: perk.points });
        if (perk.offline) return _t('방치 효율 +{round}%p / 단계', { round: Math.round(perk.offline * 100) });
        return `루프 시작 때 ${perk.supply.map(([key, amount]) => `${_t(ORB_DB[key].name)} ${amount}`).join(', ')} / 단계`;
    }
    async function rebirth() {
        const owner = game, target = owner.atlas, why = atlasEpoch.reason(owner);
        if (why) return addLog(why, 'attack-monster');
        // The confirmation covers the progress being erased, including altar materials held in the wallet.
        const reviewed = rebirthReview(owner), gained = atlasEpoch.essenceFor(owner), before = target.epoch.essence;
        const accepted = await requestGameConfirmation(_t('아틀라스 완료, 보너스, 패시브, 씨앗, 후반부 진행(깨어남과 재료)과 이번 루프의 지도석, 각인이 사라지고, 세계수 정수 {gained}개를 받습니다. 특전, 해금, 자동 지도 설정은 남습니다.', { gained }),
            { title: _t('시대 재생'), tone: 'danger', confirmLabel: _t('재생'), cancelLabel: _t('그만두기') });
        if (!accepted) return;
        if (game !== owner || game.atlas !== target || rebirthReview(owner) !== reviewed) {
            return addLog(_t('확인 중 저장이나 아틀라스 진행이 바뀌어 시대 재생을 취소했습니다. 현재 상태를 다시 확인하세요.'), 'attack-monster');
        }
        const reason = atlasEpoch.rebirth(owner);
        if (reason) return addLog(reason, 'attack-monster');
        atlas.sync(owner);
        lastRebirth = { owner, target, season: owner.season, epoch: target.epoch.count, gained: target.epoch.essence - before, maps: target.stash.length };
        addLog(_t('🌳 시대 재생 {count}회, 세계수 정수 +{gained}, 새 지도석 {maps}개', { count: target.epoch.count, gained: lastRebirth.gained, maps: lastRebirth.maps }), 'loot-unique');
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
        addLog(_t('🌳 {name} {rank}단계', { name: atlasEpoch.perks.get(id).name, rank: atlasEpoch.rank(game, id) }), 'season-up');
        queueImportantSave(200);
        atlasUi.refresh();
    }
    function perkHtml(perk) {
        const level = atlasEpoch.rank(game, perk.id), full = level >= perk.max, reason = atlasEpoch.buyReason(game, perk.id);
        return `<div class="atlas-perk${level ? ' is-taken' : ''}"><div><strong>${escapeHTML(_t(perk.name))} <span>${level}/${perk.max}</span></strong><small>${escapeHTML(perkText(perk))}</small></div>
            <button onclick="atlasEpochUi.buy('${perk.id}')" ${reason ? 'disabled' : ''} data-tip="${escapeHTML(reason || '')}">${full ? _t('최대') : _t('정수 {cost}', { cost: atlasEpoch.cost(game, perk.id) })}</button></div>`;
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
        const received = receipt ? `<p>${_t('세계수 정수')} <b>+${receipt.gained}</b>${_t(', 새 지도석')} <b>${_t('{maps}개', { maps: receipt.maps })}</b>${_t('를 받았습니다.')}</p>` : '';
        return `<section class="atlas-epoch-restart" aria-label="${_t('시대 재생 후 성장')}"><h3>${receipt ? _t('시대 재생 완료') : _t('새 시대의 시작')}</h3>${received}
            <p>${_t('보유 정수')} <b>${_t('{essence}개', { essence: game.atlas.epoch.essence })}</b></p>
            <div><button type="button" onclick="atlasEpochUi.chooseMap()" ${reason ? 'disabled' : ''}>${_t('새 지도 고르기')}</button><span>${_t('보관함 {length}개', { length: game.atlas.stash.length })}</span></div>
            ${reason ? `<p class="atlas-muted">${reason}</p>` : ''}</section>`;
    }
    function html() {
        const epoch = game.atlas.epoch, why = atlasEpoch.reason(game), restart = restartHtml();
        const head = `<section class="atlas-epoch-head"><div><h3>${_t('시대 재생')} <span>${_t('{count}회', { count: epoch.count })}</span></h3>
            <p class="atlas-muted">${_t('세계수 씨앗 {seeds}/{max}, 현재 진행 기준 예상 정수 {essenceFor}개 (기본 {base}, 지도 노드 완료 {perCompleted}개마다 1, 보너스 {perBonus}개마다 1, 씨앗마다 {perSeed})', { seeds: game.atlas.seeds, max: ATLAS.seeds.max, essenceFor: atlasEpoch.essenceFor(game), base: ATLAS.epoch.essence.base, perCompleted: ATLAS.epoch.essence.perCompleted, perBonus: ATLAS.epoch.essence.perBonus, perSeed: ATLAS.epoch.essence.perSeed })}</p>
            <p class="atlas-muted">${_t('초기화: 완료, 보너스, 패시브, 씨앗, 후반부 진행, 이번 루프의 지도석과 각인. 유지: 특전, 해금, 자동 지도, 각인 홈 설정.')}</p></div>
            <div class="atlas-epoch-action"><strong>${_t('세계수 정수 {essence}', { essence: epoch.essence })}</strong>${why ? `<p class="atlas-lock">${why}</p>` : ''}
            <button class="atlas-primary" onclick="atlasEpochUi.rebirth()" ${why ? 'disabled' : ''}>${_t('시대 재생')}</button></div></section>`;
        const perks = `<div class="atlas-perks">${ATLAS.epoch.perks.map(perkHtml).join('')}</div>`;
        return `<div class="atlas-epoch">${restart ? `${restart}${perks}${head}` : `${head}${perks}`}</div>`;
    }
    return Object.freeze({ html, rebirth, buy, chooseMap });
})();
safeExposeGlobals({ atlasEpochUi });
