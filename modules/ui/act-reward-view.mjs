import { listenView, releaseViewEvents, releaseViewTarget } from './view-events.mjs';

// Wait for the boss death animation before prompting. Away players keep playing after three idle minutes.
// Guide holds do not consume the one-minute retry budget; rewards stay claimable when the window closes.
const ACT_REWARD_PROMPT = Object.freeze({ awayMs: 180000, retryMs: 500, tries: 120, awayCheckMs: 5000, afterKillMs: 1500 });
const ACT_REWARD_STAT_ICONS = Object.freeze({ resF: 'fire', resC: 'cold', resL: 'lightning', resAll: 'elemental', resChaos: 'chaos', pctHp: 'life', aspd: 'precision',
    move: 'mobility', dr: 'armor', regen: 'cycle', meleePctDmg: 'blade', projectilePctDmg: 'projectile', elementalPctDmg: 'elemental', crit: 'precision',
    critDmg: 'critical', leech: 'bleed', physIgnore: 'strength', resPen: 'void', gemLevel: 'arcane', suppCap: 'mystique' });


/** Owns this view's transient state; saved rewards and death records remain in game state. */
export class ActRewardView {
    constructor(deps) {
        this.deps = deps;
        this.active = true;
        this.listeners = [];
        this.activeRewardZoneId = null;
        this.actRewardPromptTimer = null;
        this.actRewardAwayTimer = null;
        this.actRewardPromptDelay = null;
        this.promptRequest = null;
        this.displayOwner = null;
        this.overlay = null;
        this.onClick = event => this.handleClick(event);
        this.looks = Object.freeze({
            support: choice => {
                const cell = this.deps.getSupportRuneArtCell(choice.gem);
                return { tone: `tone-${this.deps.getSupportRuneTone(choice.gem)}`, art: cell ? `<span class="support-rune-art" style="--col:${cell.col};--row:${cell.row}"></span>` : this.actRewardTreeArt('mystique') };
            },
            currency: choice => {
                const coin = this.deps.ORB_DB[choice.currency]?.icon;
                return { tone: 'tone-phys', art: coin ? `<img class="reward-choice-art" src="${coin}" alt="">` : this.actRewardTreeArt('constellation') };
            },
            stat: choice => ({ tone: `tone-${this.deps.STAT_TONES[choice.stat] || 'neutral'}`, art: this.actRewardTreeArt(ACT_REWARD_STAT_ICONS[choice.stat]) })
        });
    }

    isRewardOpen() {
        if (this.displayOwner && this.displayOwner !== this.deps.game) this.hideReward();
        let overlay = this.deps.document.getElementById('reward-overlay');
        return this.activeRewardZoneId !== null && !!overlay && overlay.classList.contains('active');
    }

    closeRewardOverlay() {
        this.hideReward();
        this.deps.session.lastTime = Date.now();
        if (typeof this.deps.tutorialActionUi === 'object') this.deps.tutorialActionUi.waitBetweenNotices();
    }

    clearPrompt() {
        this.deps.clearInterval(this.actRewardPromptTimer);
        this.deps.clearTimeout(this.actRewardPromptDelay);
        this.actRewardPromptTimer = this.actRewardPromptDelay = null;
        this.promptRequest = null;
    }

    hideReward() {
        this.clearPrompt();
        this.deps.clearInterval(this.actRewardAwayTimer);
        this.actRewardAwayTimer = null;
        this.deps.document.getElementById('reward-overlay')?.classList.remove('active');
        this.activeRewardZoneId = null;
        this.displayOwner = null;
    }

    attach(overlay) {
        if (this.overlay === overlay) return;
        this.detach();
        this.overlay = overlay;
        listenView(this, overlay, 'click', this.onClick);
    }

    detach() {
        releaseViewTarget(this, this.overlay);
        this.overlay = null;
    }

    handleClick(event) {
        if (this.displayOwner !== this.deps.game) { this.closeRewardOverlay(); return; }
        const button = event.target.closest('button');
        if (!button || !this.overlay.contains(button)) return;
        if (button.hasAttribute('data-reward-dismiss')) { this.closeRewardOverlay(); return; }
        if (!button.hasAttribute('data-choice-index')) return;
        const index = Number(button.dataset.choiceIndex);
        if (!Number.isInteger(index) || index < 0 || this.activeRewardZoneId === null) return;
        // Keep the encoded display key: the domain rejects a choice changed since this render.
        this.deps.claimActRewardChoice(this.activeRewardZoneId, index, button.dataset.choiceKey);
    }

    dispose() { this.hideReward(); releaseViewEvents(this); this.overlay = null; }

    dismissForLoop() {
        this.clearPrompt();
        if (this.isRewardOpen()) this.closeRewardOverlay();
    }

    actRewardPromptPending() {
        if (this.promptRequest && this.promptRequest.owner !== this.deps.game) this.clearPrompt();
        return this.actRewardPromptDelay !== null || this.actRewardPromptTimer !== null;
    }

    actRewardWaitsForGuide() {
        return typeof this.deps.tutorialActionUi === 'object'
            && (this.deps.tutorialActionUi.holdsQueue() || Date.now() < this.deps.tutorialActionUi.quietUntil);
    }

    promptActReward(zoneId) {
        this.clearPrompt();
        if (!this.active || this.deps.game.isBackgroundCalculation) return;   // 방치 정산에서는 띄우지 않는다(보상은 지도와 목표 서랍에 남는다)
        const request = this.promptRequest = { owner: this.deps.game, zoneId };
        this.actRewardPromptDelay = this.deps.setTimeout(() => this.startActRewardPrompt(request), ACT_REWARD_PROMPT.afterKillMs);
    }

    canResumePrompt(request) {
        if (request !== this.promptRequest) return false;
        if (request.owner === this.deps.game) return true;
        this.clearPrompt();
        return false;
    }

    startActRewardPrompt(request) {
        if (!this.canResumePrompt(request)) return;
        this.actRewardPromptDelay = null;
        if (this.tryOpenPromptedActReward(request.zoneId)) { this.clearPrompt(); return; }
        let triesLeft = ACT_REWARD_PROMPT.tries;
        this.actRewardPromptTimer = this.deps.setInterval(() => {
            if (!this.canResumePrompt(request)) return;
            if (!this.tryOpenPromptedActReward(request.zoneId) && (this.actRewardWaitsForGuide() || --triesLeft > 0)) return;
            this.clearPrompt();
        }, ACT_REWARD_PROMPT.retryMs);
    }

    watchActRewardAway() {
        this.deps.clearInterval(this.actRewardAwayTimer);
        const owner = this.deps.game;
        this.actRewardAwayTimer = this.deps.setInterval(() => {
            if (owner !== this.deps.game) { this.hideReward(); return; }
            if (this.activeRewardZoneId !== null && this.deps.uiDisplay.inputIdleMs <= ACT_REWARD_PROMPT.awayMs) return;
            if (this.activeRewardZoneId !== null) this.closeRewardOverlay();
            this.deps.clearInterval(this.actRewardAwayTimer);
            this.actRewardAwayTimer = null;
        }, ACT_REWARD_PROMPT.awayCheckMs);
    }

    tryOpenPromptedActReward(zoneId) {
        if (!this.canPromptActReward(zoneId)) return true;
        if (this.isActRewardPromptBlocked()) return false;
        this.openActReward(zoneId);
        return true;
    }

    canPromptActReward(zoneId) {
        if (this.deps.game.isBackgroundCalculation || !this.deps.document.getElementById('reward-overlay') || this.isRewardOpen()) return false;
        return this.deps.uiDisplay.inputIdleMs <= ACT_REWARD_PROMPT.awayMs && this.deps.getAvailableActRewardZoneIds().includes(zoneId);
    }

    isActRewardPromptBlocked() {
        if (this.deps.game.pendingLoopHeroSelection || this.deps.game.pendingLoopReady || this.deps.game.pendingLoopDecision) return true;
        if (this.deps.activeTutorial || this.actRewardWaitsForGuide() || this.deps.backgroundCombatRuntime.processing) return true;
        return !!this.deps.document.querySelector('.tutorial-overlay.active, dialog:modal, .selection-overlay, .background-combat-progress-overlay, #background-combat-result-overlay');
    }

    scrollActRewardCardToTop() {
        const card = this.deps.document.querySelector('#reward-overlay .tutorial-card');
        if (card) card.scrollTo(0, 0);
    }

    openActReward(zoneId) {
        if (!this.active) return;
        if (!(this.deps.game.claimableActRewards || []).includes(zoneId)) return;
        let config = this.deps.getActRewardConfig(zoneId);
        if (!config) return;
        if (!this.deps.getAvailableActRewardZoneIds().includes(zoneId)) return;
        this.clearPrompt();
        this.attach(this.deps.document.getElementById('reward-overlay'));
        this.displayOwner = this.deps.game;
        this.activeRewardZoneId = zoneId;
        this.renderHeading(zoneId, config);
        this.deps.document.getElementById('reward-grid').innerHTML = this.deps.getActRewardChoices(zoneId)
            .map((choice, index) => this.deps.isActRewardChoiceAvailable(choice) ? this.renderActRewardChoice(zoneId, choice, index) : '').join('');
        this.deps.document.getElementById('reward-overlay').classList.add('active');
        this.scrollActRewardCardToTop();
        this.deps.session.lastTime = Date.now();
        this.watchActRewardAway();
    }

    renderHeading(zoneId, config) {
        let storyAct = this.deps.getStoryActByZoneId(zoneId);
        // 머리글이 "액트 N 클리어 보상", 제목은 지역 이름만(예전에는 둘 다 '클리어 보상'을 되풀이했다).
        this.deps.document.getElementById('reward-kicker').innerText = storyAct ? this.deps._t('{storyAct} 클리어 보상', { storyAct: this.deps.formatStoryActLabel(storyAct) }) : this.deps._t('액트 클리어 보상');
        this.deps.document.getElementById('reward-title').innerText = this.deps._t(storyAct ? storyAct.title : config.title);
        const nextAct = zoneId < 9 ? this.deps.getStoryActByZoneId(zoneId + 1) : null;
        // 지역 이야기 줄은 흐린 글로 먼저, 다음 액트는 아래 나중에 단추 옆으로(2026-11-04 사용자: 간소화)
        this.deps.document.getElementById('reward-body').innerHTML = (storyAct ? `<span class="reward-story">${this.deps.escapeHTML(this.deps._t(storyAct.subtitle))}</span>\n` : '') + this.deps.escapeHTML(this.deps._t(config.body));
        this.deps.document.getElementById('reward-next').textContent = nextAct ? this.deps._t('다음: {act} 「{title}」', { act: this.deps.formatStoryActLabel(nextAct), title: this.deps._t(nextAct.title) }) : '';
    }

    actRewardChoiceLook(choice, item) {
        if (item) return { tone: `rarity-${choice.rarity || 'magic'}`, art: `<img class="reward-choice-art${item.slot === '무기' ? ' is-weapon' : ''}" src="${this.deps.getEquipmentGridVisualAsset(item)}" alt="">` };
        const look = this.looks[choice.kind];
        return look ? look(choice) : { tone: 'tone-arcane', art: this.actRewardTreeArt(choice.kind === 'points' ? 'constellation' : 'arcane') };
    }

    actRewardTreeArt(name) {
        const cell = this.deps.iconAtlasCell[name] || this.deps.iconAtlasCell.arcane;
        return `<span class="reward-choice-tree" style="--col:${cell[0]};--row:${cell[1]}"></span>`;
    }

    renderActRewardChoice(zoneId, choice, index) {
        const item = choice.kind === 'item' ? this.deps.buildActRewardPreviewItem(zoneId, choice) : null;
        const look = this.actRewardChoiceLook(choice, item);
        const detail = item ? this.actRewardItemPreview(choice, item) : this.formatActRewardDps(this.measureActRewardDps(zoneId, choice));
        return `
            <button type="button" class="reward-choice is-${look.tone}" data-choice-key="${encodeURIComponent(choice.claimKey)}" data-choice-index="${index}">
                <span class="reward-choice-icon" aria-hidden="true">${look.art}</span><strong>${this.deps._t(choice.label)}</strong>
                ${choice.desc ? `<span class="reward-choice-desc">${this.deps._t(choice.desc)}</span>` : ''}
                ${detail}
            </button>
        `;
    }

    actRewardItemPreview(choice, item) {
        const rarity = this.deps._t(this.deps.ITEM_RARITY_LABELS[choice.rarity] || '');
        const slot = this.deps.getEquipCandidateSlots(item).find(name => Object.hasOwn(this.deps.game.equipment, name) && !this.deps.game.equipment[name]);
        const equips = this.deps.game.settings.autoEquipEmptySlots !== false && slot && this.deps.combatEquipmentStats.inspect(item, slot).ok;
        const chip = (stat, className) => `<i${className ? ` class="${className}"` : ''}>${this.deps.escapeHTML(`${this.deps._t(stat.statName || this.deps.getStatName(stat.id))} ${this.deps.formatSignedValue(stat.id, stat.val)}`)}</i>`;
        const extra = choice.fixedStarter ? item.stats.map(stat => chip(stat, 'is-extra')).join('') : `<i class="is-unknown">${this.deps._t('추가 옵션 ?')}</i>`;
        return `<span class="reward-choice-tags">${rarity ? `<em>${this.deps._t('{rarity} 등급', { rarity })}</em>` : ''}<em>${equips ? this.deps._t('바로 장착') : this.deps._t('가방으로')}</em></span>
            <span class="reward-item-options"><b>${this.deps.escapeHTML(this.deps._t(item.baseName))}</b>${item.baseStats.map(stat => chip(stat)).join('')}${extra}</span>`;
    }

    measureActRewardDps(zoneId, choice) {
        if (choice.kind !== 'stat') return null;
        return this.deps.previewBuildStats(copy => {
            copy.actRewardBonuses = [...(copy.actRewardBonuses || []), { actId: zoneId, stat: choice.stat, value: choice.value }];
        });
    }

    formatActRewardDps(change) {
        const parts = change ? this.deps.buildStatPreviewParts(change) : '';
        return parts ? `<b class="reward-choice-dps">${parts}</b>` : '';
    }
}
