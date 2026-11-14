import { listenView, releaseViewEvents, releaseViewTarget } from './view-events.mjs';
/** Native view owner. Existing markup and domain actions are preserved. */
export class TalentView {
    constructor(deps) {
        this.deps=deps; this.active=true; this.listeners=[]; this.root=null; this.sheet=null; this.dialogGame=null;
        for(const name of ["esc","owned","levelOf","scoreLevel","toneOf","portraitOf","fill","bar","hintAttrs","cardInfo","pipsHtml","scoreStatHtml","headHtml","trialNeeds","trialCardHtml","trialTopHtml","trialHtml","slotCellHtml","slotsHtml","rowHtml","classBlockHtml","boardHtml","effectsHtml","sheetProgressHtml","sheetPreviewHtml","sheetButtonHtml","sheetHtml","openCard","onSheetClick","scoreHtml","openScore","onClick","render","hint"]) this[name]=this[name].bind(this);
        this.CARD_DIALOG='talent-card-dialog';
        this.SCORE_DIALOG='talent-score-dialog';
        this.SCORE_PARTS=Object.freeze([
        ['deepChaos', '혼돈 심화 최고 층'], ['labyrinth', '고대 미궁 최고 층'], ['chaosFloor', '혼돈계 최고 층'],
        ['underFloor', '지하계 최고 층'], ['cosmos', '우주계 격파'], ['dpsTerm', '나무꾼의 잔상 DPS (2배마다 +1)']
    ]);
        this.dialogKey=null;
        this.lastHtml='';
        this.lastSheet='';
        listenView(this, deps.window, 'project-idle:talent-tab-refresh-requested', () => {
            const tab = deps.document.getElementById('tab-talent');
            if (tab?.classList.contains('active')) this.render();
        });
    }

    esc(value) { return this.deps.escapeHTML(value); }

    owned() { return this.deps.game.talentCards && typeof this.deps.game.talentCards === 'object' ? this.deps.game.talentCards : {}; }

    levelOf(card) { return Math.max(1, Math.floor(Number(card && card.level) || 1)); }

    scoreLevel() { return this.deps.getTalentCardLevel(this.deps.getTalentBloomScore()); }

    toneOf(ascendId) { return this.deps.getItemStatToneColor(this.deps.CLASS_TEMPLATES[ascendId].m1); }

    /** 재능의 직업 그림(assets/portraits/classes). 예전 영웅 그림(HERO_SELECTION_DEFS)은 2026-10-31에 직업 그림이 들어오며 이 창에만 남아 있었다. */
    portraitOf(heroId) { return (Object.values(this.deps.PLAYER_CLASS_DEFS).find(def => def.recommendedTalentHeroId === heroId) || this.deps.HERO_SELECTION_DEFS[heroId] || {}).portrait || ''; }

    fill(have, need) { return Math.max(0, Math.min(100, need > 0 ? (have / need) * 100 : 100)); }

    bar(have, need) { return `<i class="talent-bar"><i style="width:${this.fill(have, need).toFixed(1)}%"></i></i>`; }

    hintAttrs(key) { return `data-info-tooltip-anchor="1" onpointerenter="talentUi.hint(event,'${key}')" onpointermove="talentUi.hint(event,'${key}')" onpointerleave="hideInfoTooltip()"`; }

    /** One card's facts from its ascendancy (key is null when the card has no definition). */
    cardInfo(ascendId) {
        const key = this.deps.getTalentBloomCardKeyForAscendancy(ascendId), heroId = this.deps.getTalentBloomHeroIdForAscendancy(ascendId);
        return { ascendId, key, heroId, card: key ? this.owned()[key] : null, names: this.deps.getTalentCardName(heroId, ascendId), tone: this.toneOf(ascendId),
            current: this.deps.game.ascendClass === ascendId, equipped: !!key && this.deps.getTalentCardSlotIndex(key) >= 0 };
    }

    pipsHtml(level) {
        const pips = Array.from({ length: this.deps.TALENT_CARD_MAX_LEVEL }, (unused, index) => `<i${index < level ? ' class="is-on"' : ''}></i>`).join('');
        return `<span class="talent-pips" aria-hidden="true">${pips}</span>`;
    }

    // ── 위 줄: 모은 카드, 장착, 개화 점수 ─────────────────────────────
    scoreStatHtml() {
        const score = this.deps.getTalentBloomScore(), level = this.deps.getTalentCardLevel(score);
        const from = this.deps.TALENT_CARD_LEVEL_THRESHOLDS[level - 1], next = this.deps.TALENT_CARD_LEVEL_THRESHOLDS[level];
        const note = next === undefined ? '최대 레벨' : this.deps._t('Lv.{value}까지 {value2}', { value: level + 1, value2: next - score });
        return `<div class="talent-stat is-score"><span>${this.deps._t('개화 점수')}</span><b>${score}<small>Lv.${level}</small></b>`
            + `${next === undefined ? this.bar(1, 1) : this.bar(score - from, next - from)}<em>${note}</em></div>`;
    }

    headHtml() {
        const count = Object.keys(this.owned()).length, unlocked = this.deps.getUnlockedTalentSlotCount();
        const worn = this.deps.ensureTalentCardLoadout().slice(0, unlocked).filter(Boolean).length;
        return `<div class="talent-head">
            <div class="talent-stat"><span>${this.deps._t('모은 카드')}</span><b>${count}<small>/${this.deps.TALENT_BLOOM_TOTAL_CARDS}</small></b>${this.bar(count, this.deps.TALENT_BLOOM_TOTAL_CARDS)}</div>
            <div class="talent-stat"><span>${this.deps._t('장착')}</span><b>${worn}<small>/${unlocked}</small></b>${this.bar(worn, Math.max(1, unlocked))}</div>
            ${this.scoreStatHtml()}
            <button type="button" class="talent-help" data-talent-action="score" aria-label="${this.deps._t('개화 점수 내역')}"><span class="px-center">?</span></button></div>`;
    }

    // ── 개화 시련 카드 ─────────────────────────────────────────────
    trialNeeds(ascend) {
        const keys = id => Math.floor(Number(this.deps.game.currencies[id]) || 0);
        return [
            { ok: !!ascend, text: ascend ? this.deps._t('전직 {name}', { name: this.deps.CLASS_TEMPLATES[ascend].name }) : '전직 선택' },
            { ok: this.deps.isWoodsmanEchoUnlocked(), text: this.deps._t('나무꾼의 잔상') },
            { ok: keys('chaosKey') >= 1, text: this.deps._t('카오스 키 {value}/1', { value: keys('chaosKey') }) },
            { ok: keys('coreKey') >= 1, text: this.deps._t('코어 키 {value}/1', { value: keys('coreKey') }) }
        ];
    }

    /** The card this clear would give: a new card at the score's level, or an owned one rising (or holding) its level. */
    trialCardHtml(info) {
        const now = this.deps.getTalentCardLevel(Math.max(this.deps.getTalentBloomScore(), info.card ? Number(info.card.score) || 0 : 0));
        const have = info.card ? this.levelOf(info.card) : 0;
        const level = !info.card ? `Lv.${now}` : (now > have ? `Lv.${have} → Lv.${now}` : this.deps._t('Lv.{have} 유지', { have }));
        return `<div class="talent-trial-main"><small>${this.deps._t('지금 개화하면')}</small><strong>${this.esc(info.names.bloomName)}</strong>`
            + `<b>${level}</b><span>${this.deps._t('{heroLabel} 재능, 전직 {classLabel}', { heroLabel: this.esc(info.names.heroLabel), classLabel: this.esc(info.names.classLabel) })}</span></div>`;
    }

    /** The trial card's picture and title: the current ascendancy's card, or a prompt to pick an ascendancy first. */
    trialTopHtml(info) {
        if (!info || !info.key) return '<span class="talent-trial-art is-empty"></span><div class="talent-trial-main"><small>개화 시련</small><strong>전직을 고르면 카드가 정해집니다</strong></div>';
        return `<img class="talent-trial-art" src="${this.portraitOf(info.heroId)}" alt="">${this.trialCardHtml(info)}`;
    }

    trialHtml() {
        const ascend = this.deps.game.ascendClass && this.deps.CLASS_TEMPLATES[this.deps.game.ascendClass] ? this.deps.game.ascendClass : null;
        const needs = this.trialNeeds(ascend), ready = needs.every(need => need.ok), info = ascend ? this.cardInfo(ascend) : null;
        const list = needs.map(need => `<li class="${need.ok ? 'is-on' : 'is-off'}"><i></i>${this.esc(need.text)}</li>`).join('');
        return `<section class="talent-trial${ready ? ' is-ready' : ''}"${info ? ` style="--tone:${info.tone}"` : ''}>${this.trialTopHtml(info)}`
            + `<ul class="talent-needs">${list}</ul>`
            + `<button type="button" class="talent-trial-go" data-talent-action="trial"${ready ? '' : ' disabled'}><span class="px-center">${this.deps._t('개화 시련 도전')}</span></button></section>`;
    }

    // ── 장착 슬롯 ──────────────────────────────────────────────────
    slotCellHtml(key, index, open) {
        if (!open) return `<div class="talent-slot is-locked"><span class="talent-lock" aria-hidden="true"></span><small>${this.deps._t('카드 {TALENT_CARD_SLOT_UNLOCKS}장', { TALENT_CARD_SLOT_UNLOCKS: this.deps.TALENT_CARD_SLOT_UNLOCKS[index] })}</small></div>`;
        const card = key ? this.owned()[key] : null;
        if (!card) return '<div class="talent-slot is-empty"><span class="talent-plus" aria-hidden="true">+</span><small>빈 슬롯</small></div>';
        const { heroId, classKey } = this.deps.parseTalentComboKey(key);
        return `<button type="button" class="talent-slot is-filled" style="--tone:${this.toneOf(classKey)}" data-talent-card="${key}" ${this.hintAttrs(key)}>`
            + `<img src="${this.portraitOf(heroId)}" alt=""><strong>${this.esc(this.deps.getTalentCardName(heroId, classKey).bloomName)}</strong><small>Lv.${this.levelOf(card)}</small></button>`;
    }

    slotsHtml() {
        const unlocked = this.deps.getUnlockedTalentSlotCount(), count = Object.keys(this.owned()).length, need = this.deps.TALENT_CARD_SLOT_UNLOCKS[unlocked];
        const cells = this.deps.ensureTalentCardLoadout().map((key, index) => this.slotCellHtml(key, index, index < unlocked)).join('');
        const next = need === undefined ? '<p class="talent-next is-done">슬롯 6칸 모두 열림</p>'
            : `<p class="talent-next"><span>${this.deps._t('다음 슬롯')}</span>${this.bar(count, need)}<b>${this.deps._t('카드 {count}/{need}', { count, need })}</b></p>`;
        return `<section class="talent-slots"><h3>${this.deps._t('장착 슬롯')}</h3><div class="talent-slot-row">${cells}</div>${next}</section>`;
    }

    // ── 직업 여섯의 카드 판 ────────────────────────────────────────
    rowHtml(info) {
        const level = info.card ? this.levelOf(info.card) : 0;
        const state = info.card ? `<span class="talent-row-level">Lv.${level}</span>${this.pipsHtml(level)}` : '<span class="talent-row-level is-off">미개화</span>';
        const flags = (info.current ? '<em class="is-current">현재 전직</em>' : '') + (info.equipped ? '<em class="is-worn">장착</em>' : '');
        const glyph = this.deps.renderPixelIcon(this.deps.ascendancyTreeUi.icon(this.deps.CLASS_TEMPLATES[info.ascendId].m1), 'talent-glyph');
        return `<li><button type="button" class="talent-row${info.card ? ' is-owned' : ''}" style="--tone:${info.tone}" data-talent-card="${info.key}" ${this.hintAttrs(info.key)}>`
            + `${glyph}<span class="talent-row-name"><strong>${this.esc(info.names.bloomName)}</strong><small>${this.esc(info.names.classLabel)}</small></span>`
            + `<span class="talent-row-state">${flags ? `<span class="talent-row-flags">${flags}</span>` : ''}${state}</span></button></li>`;
    }

    classBlockHtml(classId) {
        const infos = this.deps.ASCENDANCIES_BY_PLAYER_CLASS[classId].map(this.cardInfo).filter(info => info.key);
        const have = infos.filter(info => info.card).length, current = infos.some(info => info.current);
        const portrait = this.portraitOf(this.deps.PLAYER_CLASS_DEFS[classId].recommendedTalentHeroId);
        return `<article class="talent-class${current ? ' is-current' : ''}${have ? '' : ' is-new'}">`
            + `<header><img src="${portrait}" alt=""><strong>${this.esc(this.deps.PLAYER_CLASS_DEFS[classId].label)}</strong><b>${have}/${infos.length}</b>${this.bar(have, infos.length)}</header>`
            + `<ul>${infos.map(this.rowHtml).join('')}</ul></article>`;
    }

    boardHtml() {
        return `<section class="talent-board">${Object.keys(this.deps.ASCENDANCIES_BY_PLAYER_CLASS).map(this.classBlockHtml).join('')}</section>`;
    }

    // ── 카드 창 ────────────────────────────────────────────────────
    effectsHtml(heroId, classKey, level) {
        const parts = this.deps.getTalentCardEffectParts(heroId, classKey, level);
        if (!parts) return '';
        const line = part => (part.stat ? this.deps.statToneText.statLine(part.stat, part.text) : this.deps.statToneText.html(this.deps._t(part.text)));
        const rows = [
            parts.surface ? ['표면', this.deps.statToneText.html(parts.surface)] : null,
            parts.applied.length ? [this.deps._t('Lv.{level} 수치', { level: parts.level }), parts.applied.map(line).join('<br>')] : null,
            parts.hidden.length ? ['이면', parts.hidden.map(line).join('<br>')] : null
        ].filter(Boolean);
        return `<dl class="talent-effects">${rows.map(([label, body]) => `<dt>${label}</dt><dd>${body}</dd>`).join('')}</dl>`;
    }

    sheetProgressHtml(card) {
        const level = this.levelOf(card), score = Math.floor(Number(card.score) || 0), next = this.deps.TALENT_CARD_LEVEL_THRESHOLDS[level];
        const count = this.deps._t('개화 {max}회', { max: Math.max(0, Math.floor(Number(card.count) || 0)) });
        if (next === undefined) return `<p class="talent-sheet-note">${this.deps._t('최대 레벨, {count}', { count })}</p>`;
        const from = this.deps.TALENT_CARD_LEVEL_THRESHOLDS[level - 1];
        return `<p class="talent-sheet-progress"><span>${this.deps._t('점수 {score}', { score })}</span>${this.bar(score - from, next - from)}<span>Lv.${level + 1}: ${next}</span></p>`
            + `<p class="talent-sheet-note">${this.deps._t('{count}. 더 높은 점수로 다시 개화하면 레벨이 오릅니다.', { count })}</p>`;
    }

    sheetPreviewHtml(classKey, level) {
        const where = this.deps.game.ascendClass === classKey ? '개화 시련을 클리어하면 얻습니다' : this.deps._t('{name} 전직으로 개화 시련을 클리어하면 얻습니다', { name: this.deps.CLASS_TEMPLATES[classKey].name });
        return `<p class="talent-sheet-note">${this.deps._t('{where} (지금 점수로 Lv.{level})', { where: this.esc(where), level })}</p>`;
    }

    sheetButtonHtml(key) {
        const worn = this.deps.getTalentCardSlotIndex(key) >= 0, unlocked = this.deps.getUnlockedTalentSlotCount();
        const full = !worn && this.deps.ensureTalentCardLoadout().slice(0, unlocked).every(Boolean);
        const label = worn ? '장착 해제' : (full ? '장착 (마지막 슬롯과 교체)' : '장착');
        return `<button type="button" class="talent-sheet-equip${worn ? ' is-worn' : ''}" data-talent-equip="${key}">${label}</button>`;
    }

    sheetHtml(key) {
        const { heroId, classKey } = this.deps.parseTalentComboKey(key), card = this.owned()[key], names = this.deps.getTalentCardName(heroId, classKey);
        const level = card ? this.levelOf(card) : this.scoreLevel();
        return `<div class="talent-sheet" style="--tone:${this.toneOf(classKey)}"><div class="talent-sheet-head"><img src="${this.portraitOf(heroId)}" alt="">`
            + `<div><strong>${this.esc(names.bloomName)}</strong><span>${this.deps._t('{heroLabel} 재능, 전직 {classLabel}', { heroLabel: this.esc(names.heroLabel), classLabel: this.esc(names.classLabel) })}</span>`
            + `<span class="talent-sheet-level"><b>${card ? `Lv.${level}` : this.deps._t('미개화')}</b>${this.pipsHtml(card ? level : 0)}</span></div></div>`
            + `${card ? this.sheetProgressHtml(card) : this.sheetPreviewHtml(classKey, level)}${this.effectsHtml(heroId, classKey, level)}${card ? this.sheetButtonHtml(key) : ''}</div>`;
    }

    /** Opens the card window, or redraws it when refresh is set and its text changed (a render after equipping). */
    openCard(key, refresh) {
        if (!this.active || !key || !this.deps.TALENT_BLOOM_CARD_DEFS[key]) return;
        if (refresh && this.dialogGame !== this.deps.game) { this.closeDialogs(); return; }
        const body = this.sheetHtml(key);
        if (refresh && body === this.lastSheet) return;
        this.dialogKey = key;
        this.dialogGame = this.deps.game;
        this.lastSheet = body;
        if (typeof this.deps.hideInfoTooltip === 'function') this.deps.hideInfoTooltip();
        const panel = this.deps.selectionDialog.show({ id: this.CARD_DIALOG, title: this.deps._t('재능 카드'), panelClass: 'talent-sheet-panel', body });
        this.bindSheet(panel && panel.parentElement);
    }

    bindSheet(overlay) {
        if (!overlay || overlay === this.sheet) return;
        if (this.sheet) releaseViewTarget(this, this.sheet);
        this.sheet = overlay;
        listenView(this, overlay, 'click', this.onSheetClick);
    }

    onSheetClick(event) {
        if (!this.active) return;
        if (this.dialogGame !== this.deps.game) { this.closeDialogs(); return; }
        const button = event.target.closest('[data-talent-equip]');
        if (!button) return;
        this.deps.equipTalentCard(button.dataset.talentEquip);
        this.openCard(button.dataset.talentEquip, true);
    }

    // ── 개화 점수 창 ───────────────────────────────────────────────
    scoreHtml() {
        const parts = this.deps.getTalentBloomScoreBreakdown(), score = this.deps.getTalentBloomScore(), level = this.deps.getTalentCardLevel(score);
        const rows = this.SCORE_PARTS.map(([id, label]) => `<li><span>${label}</span><b>${parts[id]}</b></li>`).join('');
        const steps = this.deps.TALENT_CARD_LEVEL_THRESHOLDS.map((need, index) => {
            const cls = (index < level ? 'is-on' : '') + (index === level - 1 ? ' is-now' : '');
            return `<li${cls ? ` class="${cls.trim()}"` : ''}><b>Lv.${index + 1}</b><small>${need}</small></li>`;
        }).join('');
        return `<div class="talent-score"><p class="talent-score-total"><span>${this.deps._t('개화 점수')}</span><b>${score}</b></p><ul class="talent-score-parts">${rows}</ul>`
            + `<ol class="talent-score-steps">${steps}</ol><p class="selection-overlay-help">${this.deps._t('개화할 때의 점수가 카드 레벨이 됩니다.')}</p></div>`;
    }

    openScore() {
        if (!this.active) return;
        if (typeof this.deps.hideInfoTooltip === 'function') this.deps.hideInfoTooltip();
        this.deps.selectionDialog.show({ id: this.SCORE_DIALOG, title: this.deps._t('개화 점수'), panelClass: 'talent-score-panel', body: this.scoreHtml() });
    }

    // ── 그리기와 입력 ──────────────────────────────────────────────
    onClick(event) {
        if (!this.active) return;
        const action = event.target.closest('[data-talent-action]'), card = event.target.closest('[data-talent-card]');
        if (action && action.dataset.talentAction === 'score') return this.openScore();
        if (action && action.dataset.talentAction === 'trial' && !action.disabled) return this.deps.enterTalentBloomTrial();
        if (card) this.openCard(card.dataset.talentCard);
    }

    render() {
        if (!this.active) return;
        const root = this.deps.document.getElementById('ui-talent-root');
        if (!root) return;
        if (this.dialogGame && this.dialogGame !== this.deps.game) this.closeDialogs();
        if (this.root !== root) {
            if (this.root) releaseViewTarget(this, this.root);
            this.root = root; this.lastHtml = '';
            listenView(this, root, 'click', this.onClick);
        }
        const html = this.headHtml() + `<div class="talent-top">${this.trialHtml()}${this.slotsHtml()}</div>` + this.boardHtml();
        if (html !== this.lastHtml) { root.innerHTML = html; this.lastHtml = html; }
        if (this.dialogKey && this.deps.selectionDialog.isOpen(this.CARD_DIALOG)) this.openCard(this.dialogKey, true);
    }

    /** PC hover: the card's name, level (or the level it would bloom at) and effects. Touch opens the card window instead. */
    hint(event, key) {
        if (!this.active || !event || event.pointerType === 'touch' || typeof this.deps.showInfoTooltipHtml !== 'function' || !this.deps.TALENT_BLOOM_CARD_DEFS[key]) return;
        const { heroId, classKey } = this.deps.parseTalentComboKey(key), card = this.owned()[key], level = card ? this.levelOf(card) : this.scoreLevel();
        const html = `<div class="tooltip-title" style="color:${this.toneOf(classKey)};">${this.esc(this.deps.getTalentCardName(heroId, classKey).bloomName)}</div>`
            + `<div class="tooltip-line">${card ? `Lv.${level}` : this.deps._t('미개화, 지금 점수로 Lv.{level}', { level })}</div>${this.effectsHtml(heroId, classKey, level)}`;
        this.deps.showInfoTooltipHtml(event.clientX, event.clientY, html, this.toneOf(classKey), `talent:${key}`);
    }

    closeDialogs() {
        if (this.sheet) releaseViewTarget(this, this.sheet);
        this.deps.selectionDialog.close(this.CARD_DIALOG);
        this.deps.selectionDialog.close(this.SCORE_DIALOG);
        this.sheet = null; this.dialogGame = null; this.dialogKey = null; this.lastSheet = '';
    }

    dispose() {
        if (!this.active) return;
        this.closeDialogs();
        releaseViewEvents(this);
        this.root = null; this.lastHtml = '';
    }
}
