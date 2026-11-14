import { listenView, releaseViewEvents, releaseViewTarget } from './view-events.mjs';

// Recent damage below half of maximum life indicates attrition; show the whole fight in that case.
const DEATH_ATTRITION_SHARE = 0.5;
const DEATH_RESIST_STATS = Object.freeze({ fire: ['resF', '화염'], cold: ['resC', '냉기'], light: ['resL', '번개'], chaos: ['resChaos', '카오스'] });

/** Owns this view's transient state; saved rewards and death records remain in game state. */
export class DeathReportView {
    constructor(deps) {
        this.deps = deps;
        this.active = true;
        this.listeners = [];
        this.deathOverlayActive = false;
        this.activeDeathLog = null;
        this.deathLogView = "element";
        this.pending = null;
        this.owner = null;
        this.overlay = null;
        this.hints = [];
        this.onClick = event => this.handleClick(event);
        this.onCancel = event => { event.preventDefault(); this.closeDeathOverlay(); };
        this.onKeydown = event => event.stopPropagation();
        this.onChange = event => {
            if (this.owner !== this.deps.game) { this.closeDeathOverlay(); return; }
            if (event.target.id === 'chk-death-notice-inline') this.toggleDeathNoticeSetting(event.target.checked);
        };
    }

    attach(overlay) {
        if (this.overlay === overlay) return;
        this.detach();
        this.overlay = overlay;
        listenView(this, overlay, 'click', this.onClick);
        listenView(this, overlay, 'cancel', this.onCancel);
        listenView(this, overlay, 'keydown', this.onKeydown);
        listenView(this, overlay, 'change', this.onChange);
    }

    detach() {
        if (!this.overlay) return;
        releaseViewTarget(this, this.overlay);
        this.overlay = null;
    }

    handleClick(event) {
        if (this.owner !== this.deps.game) { this.closeDeathOverlay(); return; }
        const button = event.target.closest('button');
        if (!button || !this.overlay.contains(button)) return;
        if (button.hasAttribute('data-death-close')) this.closeDeathOverlay();
        else if (button.dataset.deathlogView) this.setDeathLogView(button.dataset.deathlogView);
        else if (button.hasAttribute('data-death-hint')) this.hints[Number(button.dataset.deathHint)]?.action?.run();
    }

    dispose() { this.hideReport(); releaseViewEvents(this); this.overlay = null; }

    isDeathOverlayOpen() {
        if (this.deathOverlayActive && this.owner !== this.deps.game) this.hideReport();
        let overlay = this.deps.document.getElementById('death-overlay');
        return this.deathOverlayActive && !!overlay && overlay.classList.contains('active');
    }

    toggleDeathNoticeSetting(checked) {
        this.deps.game.settings.showDeathNotice = !!checked;
        if (!checked) this.pending = null;
        let settingsCheckbox = this.deps.document.getElementById('chk-death-notice');
        let inlineCheckbox = this.deps.document.getElementById('chk-death-notice-inline');
        if (settingsCheckbox) settingsCheckbox.checked = !!checked;
        if (inlineCheckbox) inlineCheckbox.checked = !!checked;
    }

    closeDeathOverlay() {
        this.hideReport();
        this.deps.session.lastTime = Date.now();
    }

    hideReport() {
        let overlay = this.deps.document.getElementById('death-overlay');
        if (overlay) { overlay.close(); overlay.classList.remove('active'); }
        this.deathOverlayActive = false;
        this.activeDeathLog = null;
        this.owner = null;
        this.hints = [];
        this.pending = null;
    }

    escapeDeathLogText(value) {
        // 보스 이름의 장식 이모지(👿 …)는 도트 판에서 컬러 그림으로 튀어 뺀다.
        return this.deps.escapeHTML(this.deps.stripDecorativeEmoji(value));
    }

    renderDeathDamageRows(rows) {
        let safeRows = (rows || []).filter(entry => entry && entry.value > 0);
        let total = safeRows.reduce((sum, entry) => sum + Math.max(0, Math.floor(entry.value || 0)), 0);
        return safeRows.map(entry => {
            let value = Math.max(0, Math.floor(entry.value || 0));
            let ratio = total > 0 ? (value / total) * 100 : 0;
            let color = this.deps.getElementColor(entry.ele);
            let ratioText = ratio >= 10 ? `${Math.round(ratio)}%` : `${ratio.toFixed(1)}%`;
            return `<div class="deathlog-line"><div class="deathlog-line-top"><span>${this.deps.getDamageElementLabel(entry.ele)}</span>
                <strong class="deathlog-value">${this.deps.formatNumberKR(value)}<span class="deathlog-ratio">${ratioText}</span></strong></div>
                <div class="deathlog-bar"><div class="deathlog-bar-fill" style="width:${this.deps.clampNumber(ratio, 0, 100).toFixed(1)}%;background:linear-gradient(90deg,${color},${color}cc)"></div></div></div>`;
        }).join('');
    }

    renderDeathAilmentRows(log) {
        let rows = Array.isArray(log.activeAilments) ? log.activeAilments.filter(entry => entry && entry.type) : [];
        if (rows.length === 0) return '';
        return `<div class="deathlog-subtitle" style="margin-top:10px;">${this.deps._t('죽기 전 걸린 상태이상')}</div>` + rows.map(ail => {
            let hit = (ail.sourceHitDamage || 0) > 0 ? this.deps._t(', 원천 피해 {floor}', { floor: this.deps.formatNumberKR(Math.floor(ail.sourceHitDamage)) }) : '';
            let source = ail.sourceEnemyName ? `, ${this.escapeDeathLogText(ail.sourceEnemyName)}` : '';
            return `<div class="deathlog-line"><div class="deathlog-line-top"><span>${this.escapeDeathLogText(ail.label || this.deps.getAilmentDisplayLabel(ail.type))}</span>
                <strong class="deathlog-value">${this.deps._t('{ceil}초', { ceil: Math.ceil(Math.max(0, ail.time || 0)) })}<span class="deathlog-ratio">${this.deps._t('강도 {power}{hit}{source}', { power: (Number(ail.power || 0)).toFixed(2), hit, source })}</span></strong></div></div>`;
        }).join('');
    }

    renderDeathElementView(log) {
        let damageRows = this.renderDeathDamageRows(log.damageSummary);
        let html = damageRows || '<div class="deathlog-empty">최근 3초 동안 집계된 피해 기록이 없습니다.</div>';
        let ailments = this.renderDeathDamageRows(log.ailmentDamageSummary);
        if (ailments) html += `<div class="deathlog-subtitle" style="margin-top:10px;">${this.deps._t('상태이상 피해 요약')}</div>${ailments}`;
        return html + this.renderDeathAilmentRows(log);
    }

    renderDeathMonsterView(log) {
        let rows = (Array.isArray(log.monsterSummary) ? log.monsterSummary : []).filter(row => row && row.value > 0);
        if (rows.length === 0) return '<div class="deathlog-empty">최근 3초 동안 기록된 몬스터 피해가 없습니다.</div>';
        let total = rows.reduce((sum, row) => sum + Math.max(0, row.value || 0), 0);
        let html = rows.slice(0, 5).map(row => {
            let ratio = total > 0 ? Math.max(0, row.value || 0) / total * 100 : 0;
            let color = this.deps.getElementColor(row.primaryElement);
            return `<div class="deathlog-line"><div class="deathlog-line-top"><span>${this.escapeDeathLogText(row.name || '알 수 없는 몬스터')}</span>
                <strong class="deathlog-monster-value" style="color:${color}">[${this.deps.formatNumberKR(row.value)}]</strong></div>
                <div class="deathlog-bar"><div class="deathlog-bar-fill" style="width:${this.deps.clampNumber(ratio, 0, 100).toFixed(1)}%;background:linear-gradient(90deg,${color},${color}cc)"></div></div></div>`;
        }).join('');
        let hidden = rows.slice(5);
        if (hidden.length > 0) {
            let hiddenDamage = hidden.reduce((sum, row) => sum + Math.max(0, row.value || 0), 0);
            html += `<div class="deathlog-line deathlog-other">${this.deps._t('그 외 몬스터 {length}마리, 피해 {hiddenDamage}', { length: hidden.length, hiddenDamage: this.deps.formatNumberKR(hiddenDamage) })}</div>`;
        }
        return html;
    }

    setDeathLogView(view) {
        this.deathLogView = view === 'monster' ? 'monster' : 'element';
        this.deps.document.querySelectorAll('[data-deathlog-view]').forEach(tab => {
            let active = tab.dataset.deathlogView === this.deathLogView;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        let list = this.deps.document.getElementById('deathlog-damage-list');
        let scoped = this.activeDeathLog && this.getDeathLogScope(this.activeDeathLog);
        if (list && scoped) list.innerHTML = this.deathLogView === 'monster' ? this.renderDeathMonsterView(scoped) : this.renderDeathElementView(scoped);
    }

    sumDeathDamage(rows) {
        return (rows || []).reduce((sum, row) => sum + Math.max(0, row.value || 0), 0);
    }

    isDeathAttrition(log) {
        const recent = this.sumDeathDamage(log.damageSummary);
        return log.maxLife > 0 && !!log.fight && this.sumDeathDamage(log.fight.damageSummary) > recent && recent < log.maxLife * DEATH_ATTRITION_SHARE;
    }

    getDeathLogScope(log) {
        return this.isDeathAttrition(log) ? { ...log, ...log.fight } : log;
    }

    describeDeathAttrition(log) {
        if (!this.isDeathAttrition(log)) return '';
        const share = Math.round(this.sumDeathDamage(log.damageSummary) / log.maxLife * 100);
        return this.deps._t('{seconds}초 동안 조금씩 깎였습니다(마지막 3초 피해는 생명의 {share}%).', { seconds: log.fight.seconds, share });
    }

    getDeathHints() {
        const rewards = this.deps.getAvailableActRewardZoneIds(), fillable = this.deps.countFillableEmptySlots();
        return [
            rewards.length ? { text: this.deps._t('받지 않은 액트 보상 {length}개', { length: rewards.length }), action: { label: this.deps._t('받기'), run: () => { this.closeDeathOverlay(); this.deps.rewards.openActReward(rewards[0]); } } } : null,
            this.deps.game.passivePoints > 0 && this.deps.contentProgression.canOpen('tab-char') ? { text: this.deps._t('쓰지 않은 스킬트리 포인트 {passivePoints}점', { passivePoints: this.deps.game.passivePoints }), action: { label: this.deps._t('스킬트리'), run: () => { this.closeDeathOverlay(); this.deps.switchTab('tab-char'); } } } : null,
            this.deps.game.equipment['무기'] ? null : { text: this.deps._t('무기 칸이 비어 있습니다') },
            fillable ? { text: this.deps._t('가방에 바로 낄 수 있는 장비 {fillable}개', { fillable }), action: { label: this.deps._t('채우기'), run: () => { this.deps.fillEmptyEquipmentSlots(); this.renderDeathHints(); } } } : null,
            this.shopDeathHint(),
            this.lowResistanceDeathHint(this.activeDeathLog),
            this.strongerRuneDeathHint()
        ].filter(Boolean);
    }

    shopDeathHint() {
        const shops = Object.keys(this.deps.NPC_SHOPS).filter(id => this.deps.npcShop.ready(id) > 0).length;
        return shops ? { text: this.deps._t('지금 살 수 있는 물건이 있는 NPC 상점 {shops}곳', { shops }), action: { label: 'NPC', run: () => { this.closeDeathOverlay(); this.deps.marketUi.open('npc'); } } } : null;
    }

    isStrongerRuneCandidate(name, keep) {
        const skill = this.deps.SKILL_DB[name];
        return name !== keep && !!skill?.isGem && !(skill.tags || []).includes('summon') && !this.deps.isMobilityRuneName(name) && this.deps.canUseSkillWithCurrentEquipment(name);
    }

    strongerRuneDeathHint() {
        const keep = this.deps.game.activeSkill, before = this.deps.getPlayerStats(false).dps || 0;
        if (!(before > 0)) return null;
        const dpsOf = name => { this.deps.game.activeSkill = name; try { return this.deps.getPlayerStats(false).dps || 0; } finally { this.deps.game.activeSkill = keep; } };
        const top = (this.deps.game.skills || []).filter(name => this.isStrongerRuneCandidate(name, keep)).map(name => [name, dpsOf(name)]).sort((a, b) => b[1] - a[1])[0];
        return top && top[1] > before * 1.1 ? { text: this.deps._t('가진 룬 「{top}」의 DPS가 지금 룬의 {value}배입니다', { top: top[0], value: (top[1] / before).toFixed(1) }),
            action: { label: this.deps._t('장착'), run: () => { this.deps.changeSkill(top[0]); this.renderDeathHints(); } } } : null;
    }

    lowResistanceDeathHint(log) {
        const row = log ? DEATH_RESIST_STATS[this.deps.normalizeDamageElementKey(log.fatalElement || log.primaryElement)] : null;
        if (!row) return null;
        const value = Math.floor(Number(this.deps.getPlayerStats(false)[row[0]]) || 0);
        return value < 0 ? { text: this.deps._t('{row} 저항 {value}%(장비의 {row2} 저항 옵션으로 올리면 받는 피해가 줄어듭니다)', { row: row[1], value, row2: row[1] }),
            action: { label: this.deps._t('장비'), run: () => { this.closeDeathOverlay(); this.deps.switchTab('tab-items'); this.deps.switchItemSubtab('item-tab-equip'); } } } : null;
    }

    renderDeathHints() {
        const box = this.deps.document.getElementById('deathlog-hints');
        if (!box) return;
        const hints = this.hints = this.getDeathHints();
        box.hidden = hints.length === 0;
        box.innerHTML = hints.length === 0 ? '' : `<div class="deathlog-subtitle">${this.deps._t('할 수 있는 일')}</div>` + hints.map((hint, index) => `<div class="deathlog-hint">
            <span>${this.escapeDeathLogText(hint.text)}</span>${hint.action ? `<button type="button" class="deathlog-hint-action" data-death-hint="${index}">${this.deps._t(hint.action.label)}</button>` : ''}</div>`).join('');
    }

    describeDeathExpLoss(log) {
        return log.expLost > 0 ? this.deps._t('경험치를 {expLost} 잃었습니다.', { expLost: log.expLost }) : '';
    }

    describeDeathLootLoss(log) {
        if (!log.lostItems && !log.lostCurrencies) return '';
        const parts = [log.lostItems ? this.deps._t('아이템 {lostItems}개', { lostItems: log.lostItems }) : '', log.lostCurrencies ? this.deps._t('재화 {lostCurrencies}종', { lostCurrencies: log.lostCurrencies }) : ''].filter(Boolean);
        return this.deps._t('탐험 전리품({parts})을 잃고 지도를 처음부터 다시 밝힙니다.', { parts: parts.join(', ') });
    }

    openDeathOverlay(log) {
        if (!this.active || this.deps.game.isBackgroundCalculation) return;
        let overlay = this.deps.document.getElementById('death-overlay');
        if (!log || !overlay) return;
        this.attach(overlay);
        this.owner = this.deps.game;
        this.pending = null;
        this.activeDeathLog = log;
        let ailments = Array.isArray(log.activeAilments) ? log.activeAilments.filter(entry => entry && entry.type) : [];
        let ailmentText = ailments.length > 0
            ? ailments.slice(0, 4).map(ail => this.deps._t('{label} {ceil}초', { label: ail.label || this.deps.getAilmentDisplayLabel(ail.type), ceil: Math.ceil(Math.max(0, ail.time || 0)) })).join(', ')
            : '없음';
        const describeDamage = () => {
            const fatal = log.fatalElement ? this.deps.getDamageElementLabel(log.fatalElement) : '속성 미기록';
            const source = [this.deps.stripDecorativeEmoji(log.sourceName), fatal].filter(Boolean).join(', ');
            const recent = log.damageSummary?.length ? this.deps.getDamageElementLabel(log.primaryElement) : '기록 없음';
            return `마지막 피해: ${source}\n최근 주요 피해: ${recent}`;
        };
        this.deps.document.getElementById('deathlog-title').innerText = this.deps._t('전투에서 쓰러졌습니다.');
        this.deps.document.getElementById('deathlog-body').innerText = [describeDamage(), this.describeDeathAttrition(log), this.describeDeathExpLoss(log), this.describeDeathLootLoss(log),
            log.retreatZoneName ? this.deps._t('{retreatZoneName} 물러나 레벨을 {ACT_RETREAT_LEVELS} 올린 뒤 다시 도전합니다.', { retreatZoneName: this.deps.withDirectionParticle(log.retreatZoneName), ACT_RETREAT_LEVELS: this.deps.ACT_RETREAT_LEVELS }) : '', this.deps._t('죽기 전 상태이상: {ailmentText}', { ailmentText })].filter(Boolean).join('\n');
        this.deps.document.getElementById('deathlog-damage-title').innerText = this.isDeathAttrition(log) ? this.deps._t('전투 전체 피해 ({seconds}초)', { seconds: log.fight.seconds }) : this.deps._t('최근 3초 피해 요약');
        this.renderDeathHints();
        this.setDeathLogView('element');
        this.toggleDeathNoticeSetting(this.deps.game.settings.showDeathNotice !== false);
        overlay.classList.add('active');
        this.deathOverlayActive = true;
        overlay.showModal();
        // 확인 takes the focus (autofocus); on a short screen that scrolled the card to its end, past the title and the last hit.
        overlay.querySelector('.deathlog-card').scrollTop = 0;
        this.deps.session.lastTime = Date.now();
    }

    openLastDeathLog() {
        if (!this.deps.game.lastDeathLog) return this.deps.addLog(this.deps._t('아직 기록된 데스로그가 없습니다.'), 'attack-monster');
        this.openDeathOverlay(this.deps.game.lastDeathLog);
    }

    request(log) {
        // Keep only the latest pending report; a report already being read is never replaced.
        if (!this.active || this.deps.game.isBackgroundCalculation || this.isDeathOverlayOpen()) return;
        this.pending = { owner: this.deps.game, log };
        this.flushPending();
    }

    heldByView() {
        const body = this.deps.document.body.classList;
        if (body.contains('desktop-windowed-ui')) return body.contains('ui-management-mode');
        const battle = this.deps.document.getElementById('tab-battle');
        return !battle || !battle.classList.contains('active');
    }

    flushPending() {
        const pending = this.pending;
        if (!pending) return;
        if (pending.owner !== this.deps.game || pending.log !== this.deps.game.lastDeathLog || this.deps.game.settings.showDeathNotice === false) {
            this.pending = null;
            return;
        }
        if (this.deps.game.isBackgroundCalculation || this.deps.document.hidden || this.heldByView()) return;
        if (this.deps.document.querySelector('dialog[open], .tutorial-overlay.active, .selection-overlay, #background-combat-result-overlay, #startup-overlay.active, #loading-overlay.active')) return;
        this.openDeathOverlay(pending.log);
    }
}
