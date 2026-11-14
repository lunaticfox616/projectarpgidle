import { CHAOS_REALM_BONUS_CHIPS } from '../data/realm-panel.mjs';

export class RealmPanelsView {
    constructor(deps) {
        this.deps = deps;
        this.active = true;
    }

    chaos() {
        if (!this.active) return;
        let panel = (0, this.deps.document).getElementById('ui-chaos-realm-panel');
        let list = (0, this.deps.document).getElementById('ui-chaos-realm-list');
        if (!panel || !list) return;
        let st = (0, this.deps.ensureChaosRealmState)();
        let best = Math.max(0, Number(st.woodsmanBestDamagePct || 0));
        (0, this.deps.writeHtmlIfChanged)(panel, st.unlocked ? this.entryHtml(this.deps.game, st) : this.lockedHtml(best));
        (0, this.deps.writeHtmlIfChanged)(list, st.unlocked ? this.detailHtml(st, best) : '');
        list.hidden = !st.unlocked;
    }

    lockedHtml(best) {
        return `<section class="underworld-entry-card"><div class="underworld-entry-copy"><span>${(0, this.deps._t)('혼돈계 봉인')}</span><strong>${(0, this.deps._t)('나무꾼 피해율 {best} / 10%', { best: best.toFixed(1) })}</strong>`
            + '<small class="underworld-lock">혼돈 밖 최종보스 나무꾼에게 최대 생명력 10% 이상의 피해를 준 전투가 끝나면 열립니다</small></div></section>';
    }

    entryHtml(owner, st) {
        let ready = (0, this.deps.canEnterChaosRealm)(), floor = Math.max(1, Math.floor(st.currentFloor || 1)), highest = Math.max(1, Math.floor(st.highestFloor || 1));
        let lock = ready ? '' : '<small class="underworld-lock">이번 루프에서 혼돈 20을 클리어해야 들어갑니다. 진행과 보너스는 남습니다</small>';
        return `<section class="underworld-entry-card ${owner.currentZoneId === (0, this.deps.CHAOS_REALM_ZONE_ID) ? 'current' : ''}"><div class="underworld-entry-copy">`
            + `<span>${(0, this.deps._t)('루프로 초기화되지 않는 층, 선택 {floor}층, 클리어 {length}층', { floor, length: st.clearedFloors.length })}</span><strong>${(0, this.deps._t)('최고 입장 {highest}층', { highest })}</strong>`
            + `<div>${(0, this.deps.buildMapPowerEstimateHtml)((0, this.deps.getZone)((0, this.deps.CHAOS_REALM_ZONE_ID)))}</div>${lock}</div><div class="underworld-entry-actions">`
            + `<button type="button" class="underworld-primary-action" data-exploration-departure onclick="enterChaosRealmPrompt()" ${ready ? '' : 'disabled'}>${(0, this.deps._t)('층 골라 입장')}</button></div></section>`;
    }

    detailHtml(st, best) {
        let floor = Math.max(1, Math.floor(st.currentFloor || 1)), zone = (0, this.deps.getZone)((0, this.deps.CHAOS_REALM_ZONE_ID)), bonus = st.permanentBonuses || {};
        let traits = (0, this.deps.getChaosRealmAffixes)(floor).map(affix => `<span class="is-affix"><b>${(0, this.deps._t)(affix.name)}</b> ${(0, this.deps._t)(affix.desc)}</span>`).join('');
        let bonuses = CHAOS_REALM_BONUS_CHIPS.map(([name, key, digits]) => `<span class="has-stat${bonus[key] ? '' : ' is-zero'}" style="--stat-tone:${(0, this.deps.getItemStatToneColor)(key)}">${name} <b>+${(Number(bonus[key]) || 0).toFixed(digits)}%</b></span>`).join('');
        return `<div class="chaos-realm-body"><section class="underworld-upgrade-card underworld-reward-card"><div><strong>${(0, this.deps._t)('{floor}층 특징', { floor })}</strong>`
            + `<span>${(0, this.deps._t)('난이도 혼돈 심화 {value}급', { value: zone ? zone.tier : (0, this.deps.getChaosRealmTier)(floor) })}</span></div><div class="underworld-ticket-strip">${traits}</div></section>`
            + `<section class="underworld-upgrade-card underworld-reward-card"><div><strong>${(0, this.deps._t)('영구 보너스')}</strong><span>${(0, this.deps._t)('층을 처음 깰 때 쌓이고, 루프가 지나도 남습니다.')}`
            + ` ${(0, this.deps._t)('나무꾼 최고 피해율 {best}%', { best: best.toFixed(1) })}</span></div><div class="underworld-ticket-strip">${bonuses}</div></section>${this.echoHtml(this.deps.game)}</div>`;
    }

    echoHtml(owner) {
        if (!(Array.isArray(owner.journalEntries) && owner.journalEntries.includes('woodsman_echo'))) return '';
        const echo = (0, this.deps.getRecordsView)(owner).echo;
        const recent = echo.last ? `<span>${(0, this.deps._t)('최근 DPS')} <b>${Math.floor(echo.last.dps).toLocaleString(this.deps.i18n.locale)}</b></span>` : '';
        const change = echo.changePct === null ? '' : `<span>${(0, this.deps._t)('이전 대비')} <b>${echo.changePct >= 0 ? '+' : ''}${echo.changePct.toFixed(1)}%</b></span>`;
        const best = Math.max(echo.bestDps, owner.woodsmanEchoRun.bestDps);
        return `<section class="underworld-upgrade-card"><div><strong>${(0, this.deps._t)('나무꾼의 잔상')}</strong><span>${(0, this.deps._t)('30초 피해 측정')}</span>`
            + `<div class="underworld-ticket-strip">${recent}${change}<span>${(0, this.deps._t)('최고 DPS')} <b>${Math.floor(best).toLocaleString(this.deps.i18n.locale)}</b></span></div></div>`
            + '<button type="button" data-exploration-departure onclick="enterWoodsmanEchoChallenge()">측정</button></section>';
    }

    sky() {
        if (!this.active) return;
        const panel = (0, this.deps.document).getElementById('ui-sky-tower-panel');
        const list = (0, this.deps.document).getElementById('ui-sky-tower-list');
        if (!panel || !list) return;
        const tower = (0, this.deps.ensureSkyTowerState)();
        (0, this.deps.sideEncounterUi).renderPanel(panel, (0, this.deps.sideEncounterUi).skyPanel(tower));
        (0, this.deps.sideEncounterUi).renderPanel(list, tower.unlocked ? (0, this.deps.sideEncounterUi).skyGrowth(tower) : '');
    }

    oxygen(owner) {
        if (!this.active) return;
        let box = (0, this.deps.document).getElementById('ui-ocean-oxygen-box');
        if (!box) return;
        let st = (typeof (0, this.deps.ensureOceanState) === 'function') ? (0, this.deps.ensureOceanState)() : null;
        let active = st && st.unlocked && st.diving && owner.currentZoneId === (0, this.deps.OCEAN_ZONE_ID);
        if (!active) { if (box.style.display !== 'none') box.style.display = 'none'; return; }
        box.style.display = '';
        this.paintOxygen(st);
    }

    paintOxygen(st) {
        let max = Math.max(1, st.oxygenMax || 100);
        let cur = Math.max(0, Math.min(max, st.oxygenCur || 0));
        let pct = (cur / max) * 100;
        let bar = (0, this.deps.document).getElementById('ui-ocean-oxygen-bar');
        let text = (0, this.deps.document).getElementById('ui-ocean-oxygen-text');
        if (bar) {
            bar.style.width = pct + '%';
            // 산소가 20% 이하로 떨어지면 경고색(붉은 그라데이션)으로 전환합니다.
            bar.style.background = pct <= 20 ? 'linear-gradient(90deg,#d63031,#ff7675)' : 'linear-gradient(90deg,#1f9bd6,#4fd1ff)';
        }
        if (text) text.textContent = `${Math.ceil(cur)} / ${max}`;
    }

    dispose() { this.active = false; }
}
