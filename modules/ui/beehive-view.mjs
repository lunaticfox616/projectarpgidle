export class BeehiveView {
    constructor(deps, choices) {
        this.deps = deps;
        this.choices = choices;
        this.active = true;
        this.dismissed = new WeakSet();
        this.selection = null;
        this.revision = 0;
        this.overlay = null;
    }

    close(owner = this.deps.game, dismiss = false) {
        if (dismiss && this.overlay?.owner === owner && this.overlay.choice === owner.beehive.pendingChoice) {
            this.dismissed.add(this.overlay.choice);
        }
        let el = (0, this.deps.document).getElementById('beehive-choice-overlay');
        if (el) el.remove();
        this.overlay = null;
    }

    matches(owner, choice) {
        const saved = this.selection;
        return !!saved && saved.owner === owner && saved.choice === choice
            && saved.season === owner.season && saved.loop === owner.loopCount;
    }

    choiceRevision(owner, choice) {
        if (!this.matches(owner, choice)) {
            this.selection = { owner, choice, season:owner.season, loop:owner.loopCount, revision:++this.revision };
        }
        return this.selection.revision;
    }

    accepts(owner, revision) {
        // Calls from combat/legacy consumers have no DOM revision. Buttons always carry one.
        if (revision === undefined) return true;
        return this.matches(owner, owner.beehive?.pendingChoice) && revision === this.selection.revision;
    }

    runStatusHtml(owner, b, alive) {
        if (!b.inRun) return '';
        if (b.pendingChoice && !b.awaitingClear && alive <= 0) {
            this.open(owner);
            return `<div class="map-hive-choices"><strong>${this.deps._t('갈림길 선택 ({min}/10), 선택하면 전투가 시작됩니다.', { min: Math.min(10, (b.branchStep || 0) + 1) })}</strong>${this.buttonsHtml(owner, b.pendingChoice)}</div>`;
        }
        if (!b.awaitingClear) return '';
        return `<div style="margin-top:8px; color:#f3d28a;">${b.queenActive ? this.deps._t('여왕벌 전투 진행 중') : this.deps._t('벌떼 웨이브 진행 중 ({max}/10)', { max: Math.max(0, Math.floor(b.branchStep || 0)) })}, 남은 적 <strong>${alive}</strong>${this.deps._t('마리를 모두 처치해야 진행할 수 있습니다.')}</div>`;
    }

    buttonsHtml(owner, c) {
        if (!c) return '';
        const revision = this.choiceRevision(owner, c);
        if (c.a && c.b && c.c) {
            return ['a', 'b', 'c'].map(key => this.choiceButton(owner, c, key, revision)).join('');
        }
        return `<button onclick="resolveBeehiveChoice('legacy_now',undefined,${revision})">${(0, this.deps.escapeHTML)(c.nowText || '즉시 보상')}</button><button onclick="resolveBeehiveChoice('legacy_later',undefined,${revision})">${(0, this.deps.escapeHTML)(c.laterText || '지연 보상')}</button>`;
    }

    choiceButton(owner, c, key, revision) {
                const pick = this.choices.selectable(owner, c, key);
                const cost = this.choices.penaltyCost(pick.penalty);
                const disabled = !this.choices.canPay(owner, pick.penalty);
                const reward = String(pick.text || '').split(' / 대가:')[0].replace(/^\[[^\]]*\]\s*/, '');
                const price = this.priceText(cost, pick.penalty);
                const stock = cost ? (0, this.deps._t)('보유 {currencies}개{value}', { currencies: owner.currencies[cost.key] || 0, value: disabled ? (0, this.deps._t)(', 재료 부족') : '' }) : '';
                const changed = pick !== c[key] ? '재료 부족으로 대가 변경' : '';
                return `<button class="hive-choice" onclick="resolveBeehiveChoice('${key}',${(0, this.deps.escapeHTML)(JSON.stringify(pick.penalty.key))},${revision})" ${disabled ? 'disabled' : ''}>
                    <span class="hive-choice-timing">${this.choices.timingLabel(pick.timing)}</span><strong>${(0, this.deps.escapeHTML)(reward)}</strong>
                    <span class="hive-choice-price">${(0, this.deps._t)('대가, {price}', { price: (0, this.deps.escapeHTML)(price) })}</span><small>${(0, this.deps.escapeHTML)(stock || changed)}</small></button>`;
    }

    priceText(cost, penalty) {
        if (!cost) return penalty.text;
        return `${cost.name} ${cost.amount}개${cost.chance < 1 ? this.deps._t(' 소모 확률 {value}%', { value: cost.chance * 100 }) : this.deps._t(' 소모')}`;
    }

    open(owner, reasonText) {
        if (!this.active) return;
        // The visible map panel already offers the same choices and run controls.
        if ((0, this.deps.document).querySelector('#tab-map.active:not(.ui-window-minimized) #map-tab-zones.active #map-explore-beehive.active')) {
            this.close(owner);
            return;
        }
        let b = owner.beehive;
        if (!this.pending(owner)) { this.close(owner); return; }
        this.choiceRevision(owner, b.pendingChoice);
        if (this.overlay && this.overlay !== this.selection) this.close(owner);
        if (this.dismissed.has(b.pendingChoice)) return;
        let alive = (0, this.deps.countBeehiveWaveAlive)();
        if (alive > 0 || (0, this.deps.document).getElementById('beehive-choice-overlay')) return;
        this.appendOverlay(owner, b, reasonText);
    }

    pending(owner) {
        const b = owner.beehive;
        return !!b?.inRun && !!b.pendingChoice && !b.awaitingClear;
    }

    appendOverlay(owner, b, reasonText) {
        let next = Math.min(10, Math.max(1, Math.floor(b.branchStep + 1)));
        let html = `<div id="beehive-choice-overlay" class="beehive-choice-overlay" role="dialog" aria-modal="true" aria-label="${(0, this.deps._t)('벌집 갈림길')}">
            <div class="beehive-choice-card">
                <div class="beehive-choice-heading"><strong>${(0, this.deps._t)('벌집 갈림길 {next}/10', { next })}</strong><button onclick="closeBeehiveChoiceOverlay(true)">${(0, this.deps._t)('닫기')}</button></div>
                <p>${(0, this.deps.escapeHTML)(reasonText || '다음 갈림길을 선택하세요.')}, 선택하면 전투가 시작됩니다.</p>
                ${(0, this.deps.sideEncounterUi).hiveSummary(b)}
                <div class="beehive-choice-actions">${this.buttonsHtml(owner, b.pendingChoice)}</div>
                <p>${(0, this.deps._t)('닫아도 벌집 패널에서 다시 선택할 수 있습니다.')}</p>
            </div>
        </div>`;
        (0, this.deps.document).body.insertAdjacentHTML('beforeend', html);
        this.overlay = this.selection;
    }

    dispose() { this.active = false; this.close(); this.selection = null; this.dismissed = new WeakSet(); }
}
