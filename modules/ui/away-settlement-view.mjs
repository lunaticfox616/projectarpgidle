import { awayProgressLimits } from '../domain/away-progress.mjs';

/** Presentation only; the application commits replay results before showing this view. */
export class AwaySettlementView {
    constructor(deps) {
        this.deps=deps;
        for(const name of ["formatBackgroundMasteryLine","formatBackgroundDuration","getBackgroundProgressOverlay","renderBackgroundSpeedControls","updateBackgroundProgressOverlay","backgroundProgressPhaseText","hideBackgroundProgressOverlay","updateBackgroundSkippedTime","formatBackgroundProjection","formatBackgroundSkippedReward","formatBackgroundRealLimits","showBackgroundCombatResult","renderBackgroundResultHeader","formatBackgroundResultTime","renderBackgroundResultTiles","renderBackgroundResultTile","renderBackgroundResultLoot","renderBackgroundResultAtlas","renderBackgroundResultCurrencies","renderBackgroundResultCoin","backgroundResultCurrencyIcon","renderBackgroundResultGrowth","renderBackgroundResultNotes","backgroundNoExpReason","renderBackgroundStoryLine","restoreBattlefieldBeforeBackgroundReplay"]) this[name]=this[name].bind(this);
    }

    limits(state) { return awayProgressLimits(this.deps.getOfflineProgressConfig,state || this.deps.game); }

    formatBackgroundMasteryLine(gains) {
        return typeof this.deps.weaponMasteryUi === 'object' ? this.deps.weaponMasteryUi.settlementLine(gains) : '';
    }
    formatBackgroundDuration(ms) {
        let totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
        let hours = Math.floor(totalSeconds / 3600);
        let minutes = Math.floor((totalSeconds % 3600) / 60);
        let seconds = totalSeconds % 60;
        if (hours > 0) return minutes > 0 ? this.deps._t('{hours}시간 {minutes}분', { hours, minutes }) : this.deps._t('{hours}시간', { hours });
        if (minutes > 0) return seconds > 0 ? this.deps._t('{minutes}분 {seconds}초', { minutes, seconds }) : this.deps._t('{minutes}분', { minutes });
        return this.deps._t('{seconds}초', { seconds });
    }
    getBackgroundProgressOverlay() {
        if (typeof this.deps.document === 'undefined' || !this.deps.document.body) return null;
        let overlay = this.deps.document.getElementById('background-combat-progress-overlay');
        if (overlay) return overlay;
        overlay = this.deps.document.createElement('div');
        overlay.id = 'background-combat-progress-overlay';
        overlay.className = 'background-combat-progress-overlay';
        overlay.innerHTML = '<div class="background-combat-progress-card" role="dialog" aria-modal="true" aria-label="방치 정산"><h2>방치 정산</h2><div id="background-combat-progress-percent" aria-live="polite">계산 진행 0%</div><div class="background-combat-progress-track" role="progressbar" aria-label="방치 정산 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="background-combat-progress-bar-fill"></div></div><div id="background-combat-progress-duration"></div><div class="background-combat-speed-guide"></div><p id="background-combat-sacrifice">가속할 때마다 남은 전투 시간의 절반과 그 보상 기회를 포기합니다. 이미 계산한 보상은 유지됩니다.</p><p id="background-combat-skipped" aria-live="polite"></p><div class="background-combat-actions"><button type="button" id="background-combat-fast-button" onclick="requestFasterBackgroundCombat()">2배 가속, 남은 시간 ½</button><button type="button" id="background-combat-finish-button" onclick="requestFasterBackgroundCombat(true)">즉시 종료, 남은 시간 포기</button></div></div>';
        this.deps.document.body.appendChild(overlay);
        return overlay;
    }
    renderBackgroundSpeedControls(finish) {
        let button = typeof this.deps.document !== 'undefined' ? this.deps.document.getElementById('background-combat-fast-button') : null;
        if (!button) return;
        button.disabled = finish || this.deps.backgroundCombatRuntime.accelerationTier >= 4;
        button.textContent = finish ? this.deps._t('계산한 보상 저장 중…') : this.deps.backgroundCombatRuntime.accelerationTier >= 4
            ? '16배 가속 적용됨' : this.deps._t('{value}배 가속, 남은 시간 ½', { value: 2 ** (this.deps.backgroundCombatRuntime.accelerationTier + 1) });
        const stop = this.deps.document.getElementById('background-combat-finish-button');
        if (stop) stop.disabled = finish;
    }
    updateBackgroundProgressOverlay(doneMs, totalMs, actualElapsedMs, skippedMs = 0, phase) {
        let overlay = this.getBackgroundProgressOverlay();
        if (!overlay) return;
        let pct = totalMs > 0 ? Math.max(0, Math.min(100, Math.floor(doneMs / totalMs * 1000) / 10)) : 100;
        const signature = `${pct}:${skippedMs}:${phase}`;
        if (overlay.dataset.progressPercent === signature) return;
        overlay.dataset.progressPercent = signature;
        this.updateBackgroundSkippedTime(skippedMs);
        let percent = this.deps.document.getElementById('background-combat-progress-percent');
        let progressBar = this.deps.document.querySelector('.background-combat-progress-track');
        let progressFill = this.deps.document.getElementById('background-combat-progress-bar-fill');
        let duration = this.deps.document.getElementById('background-combat-progress-duration');
        let guide = this.deps.document.querySelector('.background-combat-speed-guide');
        if (percent) percent.textContent = this.deps._t('계산 진행 {pct}%{phase}', { pct, phase: this.backgroundProgressPhaseText(phase) });
        if (progressBar) progressBar.setAttribute('aria-valuenow', String(pct));
        if (progressFill) progressFill.style.width = `${pct}%`;
        if (duration) duration.textContent = this.deps._t('자리 비움 {actualElapsedMs}, 계산 {max}', { actualElapsedMs: this.formatBackgroundDuration(actualElapsedMs), max: this.formatBackgroundDuration(Math.max(0, doneMs - skippedMs)) });
        if (guide) {
            let limits = this.limits(this.deps.game);
            guide.textContent = this.deps._t('진행 한도 {recognitionHours}시간, 효율 {round}%', { recognitionHours: limits.recognitionHours, round: Math.round(limits.efficiencyRate * 100) });
        }
    }
    backgroundProgressPhaseText(phase) {
        return phase === 'measure' ? ' (전투 속도 재는 중)' : '';
    }
    hideBackgroundProgressOverlay() {
        let overlay = typeof this.deps.document !== 'undefined' ? this.deps.document.getElementById('background-combat-progress-overlay') : null;
        if (overlay) overlay.remove();
    }
    updateBackgroundSkippedTime(skippedMs) {
        const skipped = this.deps.document.getElementById('background-combat-skipped');
        if (skipped) skipped.textContent = this.formatBackgroundSkippedReward(skippedMs);
    }
    formatBackgroundProjection(result) {
        if (!(result.projectedMs > 0)) return '';
        return this.deps._t('빠른 계산: 실제 전투 {realMs}의 속도로 나머지 {projectedMs}도 계산했습니다.', { realMs: this.formatBackgroundDuration(result.realMs), projectedMs: this.formatBackgroundDuration(result.projectedMs) });
    }
    formatBackgroundSkippedReward(skippedMs) {
        return skippedMs > 0 ? this.deps._t('포기한 전투 시간 {skippedMs}, 해당 시간 보상 미지급', { skippedMs: this.formatBackgroundDuration(skippedMs) }) : '';
    }
    formatBackgroundRealLimits(result) {
        const minutes = ms => Math.round(ms / 60000);
        return [
            ['info', result.heldZone ? this.deps._t('실제 전투가 {realHoldMs}분을 넘어 그 뒤로는 지금 지역을 반복했습니다.', { realHoldMs: minutes(this.deps.OFFLINE_PROJECTION.realHoldMs) }) : ''],
            ['bad', result.cutMs > 0 ? this.deps._t('빠른 계산을 못 하는 곳이라 실제 전투 {realCapMs}분까지만 계산했고, 남은 {cutMs}의 보상은 없습니다.', { realCapMs: minutes(this.deps.OFFLINE_PROJECTION.realCapMs), cutMs: this.formatBackgroundDuration(result.cutMs) }) : '']
        ];
    }
    showBackgroundCombatResult(result) {
        if (typeof this.deps.document === 'undefined' || !this.deps.document.body) return;
        if (typeof this.deps.yieldTutorialCardToResult === 'function') this.deps.yieldTutorialCardToResult();
        this.deps.document.getElementById('background-combat-result-overlay')?.remove();
        const overlay = this.deps.document.createElement('div');
        overlay.id = 'background-combat-result-overlay';
        overlay.className = 'background-combat-result-overlay';
        const summary = result.summary || {};
        const limits = result.limits || this.limits(this.deps.game);
        const body = this.renderBackgroundStoryLine() + this.renderBackgroundResultTiles(summary) + this.renderBackgroundResultLoot(summary) + this.renderBackgroundResultAtlas(summary.atlas) + this.deps.knittingUi.offlineHtml(summary.knitting)
            + this.renderBackgroundResultCurrencies(summary.currencies) + this.renderBackgroundResultGrowth(summary) + this.renderBackgroundResultNotes(result, summary, limits);
        const close = "hideItemTooltip();document.getElementById('background-combat-result-overlay').remove()";
        overlay.innerHTML = `<div class="background-combat-result-card" role="dialog" aria-modal="true" aria-labelledby="background-result-title">${this.renderBackgroundResultHeader(result, limits)}`
            + `<div class="background-result-body">${body}</div><footer><button type="button" onclick="${close};switchTab('tab-items', {keepWindowOpen:true})">${this.deps._t('장비 확인')}</button>`
            + `<button type="button" class="background-result-continue" onclick="${close}">${this.deps._t('계속하기')}</button></footer></div>`;
        this.deps.document.body.appendChild(overlay);
    }
    renderBackgroundResultHeader(result, limits) {
        const away = this.formatBackgroundResultTime(result.actualElapsedMs);
        const fought = this.formatBackgroundResultTime(result.effectiveProgressMs);
        return `<header><h2 id="background-result-title">${this.deps._t('정산 결과')}</h2><p class="background-result-times"><span>${this.deps._t('자리 비움')} <strong>${away}</strong></span>`
            + `<span class="background-result-arrow" aria-hidden="true">→</span><span class="fought">${this.deps._t('전투 진행')} <strong>${fought}</strong></span></p>`
            + `<p class="background-result-formula">${this.deps._t('효율 {round}%, 한도 {recognitionHours}시간.', { round: Math.round(limits.efficiencyRate * 100), recognitionHours: limits.recognitionHours })}</p></header>`;
    }
    formatBackgroundResultTime(ms) {
        const value = Math.max(0, Number(ms) || 0);
        return this.formatBackgroundDuration(value >= 60000 ? value - value % 60000 : value);
    }
    renderBackgroundResultTiles(summary) {
        const deaths = Math.max(0, Number(summary.deaths) || 0);
        const lost = Math.max(0, Number(summary.expLost) || 0);
        const best = ['unique', 'rare', 'magic'].find(rarity => (summary.rarityGains || {})[rarity] > 0);
        const tiles = [
            { label: this.deps._t('처치'), value: this.deps.formatNumberKR(summary.kills) },
            { label: this.deps._t('경험치'), value: `+${this.deps.formatNumberKR(summary.exp)}`, tone: 'exp', note: lost > 0 ? this.deps._t('-{lost} 잃음', { lost: this.deps.formatNumberKR(lost) }) : '' },
            { label: this.deps._t('장비'), value: `+${this.deps.formatNumberKR(summary.items)}`, color: best ? this.deps.getRarityColor(best) : '' },
            { label: this.deps._t('사망'), value: String(deaths), tone: deaths > 0 ? 'bad' : 'quiet' }
        ];
        return `<div class="background-result-tiles">${tiles.map(this.renderBackgroundResultTile).join('')}</div>`;
    }
    renderBackgroundResultTile(tile) {
        const style = tile.color ? ` style="--tile-tone:${tile.color}"` : '';
        const size = tile.value.length > 9 ? ' long' : '';
        return `<div class="background-result-tile ${tile.tone || ''}${size}"${style}><span>${this.deps._t(tile.label)}</span><strong>${tile.value}</strong>${tile.note ? `<small>${this.deps._t(tile.note)}</small>` : ''}</div>`;
    }
    renderBackgroundResultLoot(summary) {
        const gains = summary.rarityGains || {};
        const chips = ['unique', 'rare', 'magic', 'normal'].filter(rarity => gains[rarity] > 0)
            .map(rarity => `<span class="background-result-chip" style="--chip-tone:${this.deps.getRarityColor(rarity)}">${this.deps._t(this.deps.ITEM_RARITY_LABELS[rarity])} <b>${gains[rarity]}</b></span>`);
        const salvaged = Math.max(0, Number(summary.overflowSalvaged) || 0);
        if (salvaged > 0) chips.push(`<span class="background-result-chip quiet" data-tip="가방이 차서 해체했습니다. 해체 보상은 재화에 들어 있습니다.">자동해체 <b>${salvaged}</b></span>`);
        const row = chips.length ? `<div class="background-result-chips">${chips.join('')}</div>` : '';
        return row + this.deps.equipmentLootUi.renderHighlights(summary.highlights);
    }
    renderBackgroundResultAtlas(atlas) {
        if (!atlas) return '';
        const chips = [];
        if (atlas.maps) chips.push(`<span class="background-result-chip">지도 <b>${this.deps.formatNumberKR(atlas.maps)}판</b></span>`);
        if (atlas.treasure) chips.push(`<span class="background-result-chip major">보물 무리 <b>${this.deps.formatNumberKR(atlas.treasure)}</b></span>`);
        if (atlas.golden) chips.push(`<span class="background-result-chip jackpot">황금 보물 <b>${this.deps.formatNumberKR(atlas.golden)}</b></span>`);
        if (atlas.leaves) chips.push(`<span class="background-result-chip leaf">${this.deps.renderPixelIcon('leaf', 'background-result-leaf')}기억의 잎 <b>+${this.deps.formatNumberKR(atlas.leaves)}</b></span>`);
        (atlas.newLeaves || []).forEach(name => chips.push(`<span class="background-result-chip leaf new"><em>새 잎</em>${this.deps.escapeHTML(name)}</span>`));
        return `<section class="background-result-section"><h3>${this.deps._t('아틀라스')}</h3><div class="background-result-chips">${chips.join('')}</div></section>`;
    }
    renderBackgroundResultCurrencies(currencies) {
        const rows = (Array.isArray(currencies) ? currencies : []).filter(entry => entry && entry.gain > 0);
        if (!rows.length) return '';
        const rank = entry => this.deps.lootMoments.rank(this.deps.lootMoments.ofCurrency(entry.key));
        const coins = rows.slice().sort((a, b) => rank(b) - rank(a)).map(this.renderBackgroundResultCoin);
        return `<section class="background-result-section"><h3>${this.deps._t('재화')}</h3><div class="background-result-wallet">${coins.join('')}</div></section>`;
    }
    renderBackgroundResultCoin(entry) {
        const moment = this.deps.lootMoments.ofCurrency(entry.key);
        return `<span class="background-result-coin${moment ? ` is-${moment}` : ''}" style="--coin-tone:${this.deps.getCurrencyTone(entry.key)}">${this.backgroundResultCurrencyIcon(entry.key)}`
            + `<span class="background-result-coin-name">${this.deps.escapeHTML(this.deps._t(entry.name))}</span><b>+${this.deps.formatNumberKR(entry.gain)}</b></span>`;
    }
    backgroundResultCurrencyIcon(key) {
        const icon = this.deps.ORB_DB[key] && this.deps.ORB_DB[key].icon;
        return icon ? `<img class="background-result-icon" src="${icon}" alt="" aria-hidden="true">` : '<i class="background-result-coin-mark" aria-hidden="true"></i>';
    }
    renderBackgroundResultGrowth(summary) {
        const mastery = this.formatBackgroundMasteryLine(summary.masteryGains);
        return mastery ? `<p class="background-result-growth">${mastery}</p>` : '';
    }
    renderBackgroundResultNotes(result, summary, limits) {
        const notes = [
            ['bad', this.formatBackgroundSkippedReward(result.skippedMs - (result.cutMs || 0))],
            ...this.formatBackgroundRealLimits(result),
            ['warn', this.backgroundNoExpReason(summary)],
            ['warn', result.stopped ? '사냥이 멈추거나 선택 창이 열려 여기까지만 진행했습니다.' : ''],
            ['warn', result.capped ? this.deps._t('방치 한도 {recognitionHours}시간을 다 채웠습니다.', { recognitionHours: limits.recognitionHours }) : ''],
            ['info', this.formatBackgroundProjection(result)]
        ].filter(([, text]) => text);
        return notes.length ? `<ul class="background-result-notes">${notes.map(([tone, text]) => `<li class="${tone}">${text}</li>`).join('')}</ul>` : '';
    }
    backgroundNoExpReason(summary) {
        if (!((Number(summary.kills) || 0) > 0)) return '';
        const zone = this.deps.getZone(this.deps.game.currentZoneId);
        const rate = this.deps.levelProgression.rewardMultiplier(zone, { level: this.deps.levelProgression.areaLevel(zone) }, this.deps.game.level, 'experience');
        if (rate >= 0.5) return '';
        const pct = Math.round(rate * 100);
        return `레벨 차이로 이 지역 경험치가 ${pct > 0 ? this.deps._t('{pct}%로 줄었습니다', { pct }) : this.deps._t('거의 없습니다')}.`;
    }
    renderBackgroundStoryLine() {
        const scenes = typeof this.deps.storyJournalUi === 'object' ? this.deps.storyJournalUi.foldPassedScenes() : [];
        if (!scenes.length) return '';
        return `<p class="background-result-story"><span>${this.deps._t('지난 이야기 {length}편이 기록에 실렸습니다.', { length: scenes.length })}</span>
            <button type="button" onclick="hideItemTooltip();document.getElementById('background-combat-result-overlay').remove();switchTab('tab-journal')">${this.deps._t('기록에서 읽기')}</button></p>`;
    }
    restoreBattlefieldBeforeBackgroundReplay(refreshUi = true) {
        if (typeof this.deps.syncBattleTabLayout === 'function') this.deps.syncBattleTabLayout(false);
        if (typeof this.deps.scheduleStableResize === 'function') this.deps.scheduleStableResize();
        else if (typeof this.deps.resizeCanvas === 'function') this.deps.resizeCanvas();
        if (refreshUi && typeof this.deps.updateStaticUI === 'function') this.deps.updateStaticUI();
        if (typeof this.deps.renderBattlefield === 'function') this.deps.renderBattlefield(true);
    }

    failure(error) {
        const overlay=this.getBackgroundProgressOverlay();
        if(!overlay)return;
        overlay.innerHTML=`<div class="background-combat-progress-card" role="alert"><strong>${this.deps._t('방치 정산을 완료하지 못했습니다')}</strong><p>${this.deps.escapeHTML(error.message)}</p><p>${this.deps._t('이전 저장과 방치 시간은 보존됩니다. 다시 계산하거나 새로고침해 주세요.')}</p><button type="button" onclick="startBackgroundCombatReturn(Date.now())">${this.deps._t('다시 계산')}</button></div>`;
    }

    complete() { this.deps.document.getElementById('background-combat-progress-percent').textContent=this.deps._t('정산 완료'); }

    dispose() { this.hideBackgroundProgressOverlay(); this.deps.document.getElementById('background-combat-result-overlay')?.remove(); }
}
