/** 재능 개화 창(2026-10-09 사용자 "게임 전체에서 부족한 화면", 1순위). 글 상자뿐이던 화면을 카드 판으로 바꿨다.
 * 위 줄: 모은 카드, 장착, 개화 점수 막대와 ? 창(점수 내역, 레벨 문턱).
 * 가운데: 개화 시련 카드(지금 개화하면 얻는 카드와 레벨, 조건 표시, 도전 단추)와 장착 슬롯 여섯(빈 칸, 잠긴 칸, 다음 칸 막대).
 * 아래: 직업 여섯의 카드 판(재능 그림, 모은 수, 전직 셋 줄과 레벨 눈금). 줄이나 슬롯을 누르면 카드 창(효과, 점수, 장착)이 열리고,
 * PC에서는 가리키면 효과가 툴팁으로 보인다. 휴대폰도 같은 화면을 좁게 쌓는다(예전 휴대폰 전용 검색과 쪽 넘김은 카드 18장에 맞지 않았다).
 * 카드, 슬롯, 점수 규칙은 js/talent-cards.js, 개화 시련 입장은 js/ui.js enterTalentBloomTrial. */
const talentUi = (() => {
    const CARD_DIALOG = 'talent-card-dialog', SCORE_DIALOG = 'talent-score-dialog';
    const SCORE_PARTS = Object.freeze([
        ['deepChaos', '혼돈 심화 최고 층'], ['labyrinth', '고대 미궁 최고 층'], ['chaosFloor', '혼돈계 최고 층'],
        ['underFloor', '지하계 최고 층'], ['cosmos', '우주계 격파'], ['dpsTerm', '나무꾼의 잔상 DPS (2배마다 +1)']
    ]);
    let dialogKey = null, lastHtml = '', lastSheet = '', bound = false;

    const esc = value => escapeTalentHtml(String(value ?? ''));
    const owned = () => (game.talentCards && typeof game.talentCards === 'object' ? game.talentCards : {});
    const levelOf = card => Math.max(1, Math.floor(Number(card && card.level) || 1));
    const scoreLevel = () => getTalentCardLevel(getTalentBloomScore());
    const toneOf = ascendId => getItemStatToneColor(CLASS_TEMPLATES[ascendId].m1);
    const portraitOf = heroId => (HERO_SELECTION_DEFS[heroId] || {}).portrait || '';
    const fill = (have, need) => Math.max(0, Math.min(100, need > 0 ? (have / need) * 100 : 100));
    const bar = (have, need) => `<i class="talent-bar"><i style="width:${fill(have, need).toFixed(1)}%"></i></i>`;
    const hintAttrs = key => `data-info-tooltip-anchor="1" onpointerenter="talentUi.hint(event,'${key}')" onpointermove="talentUi.hint(event,'${key}')" onpointerleave="hideInfoTooltip()"`;

    /** One card's facts from its ascendancy (key is null when the card has no definition). */
    function cardInfo(ascendId) {
        const key = getTalentBloomCardKeyForAscendancy(ascendId), heroId = getTalentBloomHeroIdForAscendancy(ascendId);
        return { ascendId, key, heroId, card: key ? owned()[key] : null, names: getTalentCardName(heroId, ascendId), tone: toneOf(ascendId),
            current: game.ascendClass === ascendId, equipped: !!key && getTalentCardSlotIndex(key) >= 0 };
    }

    function pipsHtml(level) {
        const pips = Array.from({ length: TALENT_CARD_MAX_LEVEL }, (unused, index) => `<i${index < level ? ' class="is-on"' : ''}></i>`).join('');
        return `<span class="talent-pips" aria-hidden="true">${pips}</span>`;
    }

    // ── 위 줄: 모은 카드, 장착, 개화 점수 ─────────────────────────────
    function scoreStatHtml() {
        const score = getTalentBloomScore(), level = getTalentCardLevel(score);
        const from = TALENT_CARD_LEVEL_THRESHOLDS[level - 1], next = TALENT_CARD_LEVEL_THRESHOLDS[level];
        const note = next === undefined ? '최대 레벨' : `Lv.${level + 1}까지 ${next - score}`;
        return `<div class="talent-stat is-score"><span>개화 점수</span><b>${score}<small>Lv.${level}</small></b>`
            + `${next === undefined ? bar(1, 1) : bar(score - from, next - from)}<em>${note}</em></div>`;
    }
    function headHtml() {
        const count = Object.keys(owned()).length, unlocked = getUnlockedTalentSlotCount();
        const worn = ensureTalentCardLoadout().slice(0, unlocked).filter(Boolean).length;
        return `<div class="talent-head">
            <div class="talent-stat"><span>모은 카드</span><b>${count}<small>/${TALENT_BLOOM_TOTAL_CARDS}</small></b>${bar(count, TALENT_BLOOM_TOTAL_CARDS)}</div>
            <div class="talent-stat"><span>장착</span><b>${worn}<small>/${unlocked}</small></b>${bar(worn, Math.max(1, unlocked))}</div>
            ${scoreStatHtml()}
            <button type="button" class="talent-help" data-talent-action="score" aria-label="개화 점수 내역">?</button></div>`;
    }

    // ── 개화 시련 카드 ─────────────────────────────────────────────
    function trialNeeds(ascend) {
        const keys = id => Math.floor(Number(game.currencies[id]) || 0);
        return [
            { ok: !!ascend, text: ascend ? `전직 ${CLASS_TEMPLATES[ascend].name}` : '전직 선택' },
            { ok: isWoodsmanEchoUnlocked(), text: '나무꾼의 잔상' },
            { ok: keys('chaosKey') >= 1, text: `카오스 키 ${keys('chaosKey')}/1` },
            { ok: keys('coreKey') >= 1, text: `코어 키 ${keys('coreKey')}/1` }
        ];
    }
    /** The card this clear would give: a new card at the score's level, or an owned one rising (or holding) its level. */
    function trialCardHtml(info) {
        const now = getTalentCardLevel(Math.max(getTalentBloomScore(), info.card ? Number(info.card.score) || 0 : 0));
        const have = info.card ? levelOf(info.card) : 0;
        const level = !info.card ? `Lv.${now}` : (now > have ? `Lv.${have} → Lv.${now}` : `Lv.${have} 유지`);
        return `<div class="talent-trial-main"><small>지금 개화하면</small><strong>${esc(info.names.bloomName)}</strong>`
            + `<b>${level}</b><span>${esc(info.names.heroLabel)} 재능, 전직 ${esc(info.names.classLabel)}</span></div>`;
    }
    /** The trial card's picture and title: the current ascendancy's card, or a prompt to pick an ascendancy first. */
    function trialTopHtml(info) {
        if (!info || !info.key) return '<span class="talent-trial-art is-empty"></span><div class="talent-trial-main"><small>개화 시련</small><strong>전직을 고르면 카드가 정해집니다</strong></div>';
        return `<img class="talent-trial-art" src="${portraitOf(info.heroId)}" alt="">${trialCardHtml(info)}`;
    }
    function trialHtml() {
        const ascend = game.ascendClass && CLASS_TEMPLATES[game.ascendClass] ? game.ascendClass : null;
        const needs = trialNeeds(ascend), ready = needs.every(need => need.ok), info = ascend ? cardInfo(ascend) : null;
        const list = needs.map(need => `<li class="${need.ok ? 'is-on' : 'is-off'}"><i></i>${esc(need.text)}</li>`).join('');
        return `<section class="talent-trial${ready ? ' is-ready' : ''}"${info ? ` style="--tone:${info.tone}"` : ''}>${trialTopHtml(info)}`
            + `<ul class="talent-needs">${list}</ul>`
            + `<button type="button" class="talent-trial-go" data-talent-action="trial"${ready ? '' : ' disabled'}>개화 시련 도전</button></section>`;
    }

    // ── 장착 슬롯 ──────────────────────────────────────────────────
    function slotCellHtml(key, index, open) {
        if (!open) return `<div class="talent-slot is-locked"><span class="talent-lock" aria-hidden="true"></span><small>카드 ${TALENT_CARD_SLOT_UNLOCKS[index]}장</small></div>`;
        const card = key ? owned()[key] : null;
        if (!card) return '<div class="talent-slot is-empty"><span class="talent-plus" aria-hidden="true">+</span><small>빈 슬롯</small></div>';
        const { heroId, classKey } = parseTalentComboKey(key);
        return `<button type="button" class="talent-slot is-filled" style="--tone:${toneOf(classKey)}" data-talent-card="${key}" ${hintAttrs(key)}>`
            + `<img src="${portraitOf(heroId)}" alt=""><strong>${esc(getTalentCardName(heroId, classKey).bloomName)}</strong><small>Lv.${levelOf(card)}</small></button>`;
    }
    function slotsHtml() {
        const unlocked = getUnlockedTalentSlotCount(), count = Object.keys(owned()).length, need = TALENT_CARD_SLOT_UNLOCKS[unlocked];
        const cells = ensureTalentCardLoadout().map((key, index) => slotCellHtml(key, index, index < unlocked)).join('');
        const next = need === undefined ? '<p class="talent-next is-done">슬롯 6칸 모두 열림</p>'
            : `<p class="talent-next"><span>다음 슬롯</span>${bar(count, need)}<b>카드 ${count}/${need}</b></p>`;
        return `<section class="talent-slots"><h3>장착 슬롯</h3><div class="talent-slot-row">${cells}</div>${next}</section>`;
    }

    // ── 직업 여섯의 카드 판 ────────────────────────────────────────
    function rowHtml(info) {
        const level = info.card ? levelOf(info.card) : 0;
        const state = info.card ? `<span class="talent-row-level">Lv.${level}</span>${pipsHtml(level)}` : '<span class="talent-row-level is-off">미개화</span>';
        const flags = (info.current ? '<em class="is-current">현재 전직</em>' : '') + (info.equipped ? '<em class="is-worn">장착</em>' : '');
        const glyph = renderPixelIcon(ascendancyTreeUi.icon(CLASS_TEMPLATES[info.ascendId].m1), 'talent-glyph');
        return `<li><button type="button" class="talent-row${info.card ? ' is-owned' : ''}" style="--tone:${info.tone}" data-talent-card="${info.key}" ${hintAttrs(info.key)}>`
            + `${glyph}<span class="talent-row-name"><strong>${esc(info.names.bloomName)}</strong><small>${esc(info.names.classLabel)}</small></span>`
            + `<span class="talent-row-state">${flags ? `<span class="talent-row-flags">${flags}</span>` : ''}${state}</span></button></li>`;
    }
    function classBlockHtml(classId) {
        const infos = ASCENDANCIES_BY_PLAYER_CLASS[classId].map(cardInfo).filter(info => info.key);
        const have = infos.filter(info => info.card).length, current = infos.some(info => info.current);
        const portrait = portraitOf(PLAYER_CLASS_DEFS[classId].recommendedTalentHeroId);
        return `<article class="talent-class${current ? ' is-current' : ''}${have ? '' : ' is-new'}">`
            + `<header><img src="${portrait}" alt=""><strong>${esc(PLAYER_CLASS_DEFS[classId].label)}</strong><b>${have}/${infos.length}</b>${bar(have, infos.length)}</header>`
            + `<ul>${infos.map(rowHtml).join('')}</ul></article>`;
    }
    function boardHtml() {
        return `<section class="talent-board">${Object.keys(ASCENDANCIES_BY_PLAYER_CLASS).map(classBlockHtml).join('')}</section>`;
    }

    // ── 카드 창 ────────────────────────────────────────────────────
    function effectsHtml(heroId, classKey, level) {
        const parts = getTalentCardEffectParts(heroId, classKey, level);
        if (!parts) return '';
        const line = part => (part.stat ? statToneText.statLine(part.stat, part.text) : statToneText.html(part.text));
        const rows = [
            parts.surface ? ['표면', statToneText.html(parts.surface)] : null,
            parts.applied.length ? [`Lv.${parts.level} 수치`, parts.applied.map(line).join('<br>')] : null,
            parts.hidden.length ? ['이면', parts.hidden.map(line).join('<br>')] : null
        ].filter(Boolean);
        return `<dl class="talent-effects">${rows.map(([label, body]) => `<dt>${label}</dt><dd>${body}</dd>`).join('')}</dl>`;
    }
    function sheetProgressHtml(card) {
        const level = levelOf(card), score = Math.floor(Number(card.score) || 0), next = TALENT_CARD_LEVEL_THRESHOLDS[level];
        const count = `개화 ${Math.max(0, Math.floor(Number(card.count) || 0))}회`;
        if (next === undefined) return `<p class="talent-sheet-note">최대 레벨, ${count}</p>`;
        const from = TALENT_CARD_LEVEL_THRESHOLDS[level - 1];
        return `<p class="talent-sheet-progress"><span>점수 ${score}</span>${bar(score - from, next - from)}<span>Lv.${level + 1}: ${next}</span></p>`
            + `<p class="talent-sheet-note">${count}. 더 높은 점수로 다시 개화하면 레벨이 오릅니다.</p>`;
    }
    function sheetPreviewHtml(classKey, level) {
        const where = game.ascendClass === classKey ? '개화 시련을 클리어하면 얻습니다' : `${CLASS_TEMPLATES[classKey].name} 전직으로 개화 시련을 클리어하면 얻습니다`;
        return `<p class="talent-sheet-note">${esc(where)} (지금 점수로 Lv.${level})</p>`;
    }
    function sheetButtonHtml(key) {
        const worn = getTalentCardSlotIndex(key) >= 0, unlocked = getUnlockedTalentSlotCount();
        const full = !worn && ensureTalentCardLoadout().slice(0, unlocked).every(Boolean);
        const label = worn ? '장착 해제' : (full ? '장착 (마지막 슬롯과 교체)' : '장착');
        return `<button type="button" class="talent-sheet-equip${worn ? ' is-worn' : ''}" data-talent-equip="${key}">${label}</button>`;
    }
    function sheetHtml(key) {
        const { heroId, classKey } = parseTalentComboKey(key), card = owned()[key], names = getTalentCardName(heroId, classKey);
        const level = card ? levelOf(card) : scoreLevel();
        return `<div class="talent-sheet" style="--tone:${toneOf(classKey)}"><div class="talent-sheet-head"><img src="${portraitOf(heroId)}" alt="">`
            + `<div><strong>${esc(names.bloomName)}</strong><span>${esc(names.heroLabel)} 재능, 전직 ${esc(names.classLabel)}</span>`
            + `<span class="talent-sheet-level"><b>${card ? `Lv.${level}` : '미개화'}</b>${pipsHtml(card ? level : 0)}</span></div></div>`
            + `${card ? sheetProgressHtml(card) : sheetPreviewHtml(classKey, level)}${effectsHtml(heroId, classKey, level)}${card ? sheetButtonHtml(key) : ''}</div>`;
    }
    /** Opens the card window, or redraws it when refresh is set and its text changed (a render after equipping). */
    function openCard(key, refresh) {
        if (!key || !TALENT_BLOOM_CARD_DEFS[key]) return;
        const body = sheetHtml(key);
        if (refresh && body === lastSheet) return;
        dialogKey = key;
        lastSheet = body;
        if (typeof hideInfoTooltip === 'function') hideInfoTooltip();
        const panel = selectionDialog.show({ id: CARD_DIALOG, title: '재능 카드', panelClass: 'talent-sheet-panel', body });
        const overlay = panel && panel.parentElement;
        if (overlay && !overlay.dataset.talentBound) {
            overlay.dataset.talentBound = '1';
            overlay.addEventListener('click', onSheetClick);
        }
    }
    function onSheetClick(event) {
        const button = event.target.closest('[data-talent-equip]');
        if (!button) return;
        equipTalentCard(button.dataset.talentEquip);
        openCard(button.dataset.talentEquip, true);
    }

    // ── 개화 점수 창 ───────────────────────────────────────────────
    function scoreHtml() {
        const parts = getTalentBloomScoreBreakdown(), score = getTalentBloomScore(), level = getTalentCardLevel(score);
        const rows = SCORE_PARTS.map(([id, label]) => `<li><span>${label}</span><b>${parts[id]}</b></li>`).join('');
        const steps = TALENT_CARD_LEVEL_THRESHOLDS.map((need, index) => {
            const cls = (index < level ? 'is-on' : '') + (index === level - 1 ? ' is-now' : '');
            return `<li${cls ? ` class="${cls.trim()}"` : ''}><b>Lv.${index + 1}</b><small>${need}</small></li>`;
        }).join('');
        return `<div class="talent-score"><p class="talent-score-total"><span>개화 점수</span><b>${score}</b></p><ul class="talent-score-parts">${rows}</ul>`
            + `<ol class="talent-score-steps">${steps}</ol><p class="selection-overlay-help">개화할 때의 점수가 카드 레벨이 됩니다.</p></div>`;
    }
    function openScore() {
        if (typeof hideInfoTooltip === 'function') hideInfoTooltip();
        selectionDialog.show({ id: SCORE_DIALOG, title: '개화 점수', panelClass: 'talent-score-panel', body: scoreHtml() });
    }

    // ── 그리기와 입력 ──────────────────────────────────────────────
    function onClick(event) {
        const action = event.target.closest('[data-talent-action]'), card = event.target.closest('[data-talent-card]');
        if (action && action.dataset.talentAction === 'score') return openScore();
        if (action && action.dataset.talentAction === 'trial' && !action.disabled) return enterTalentBloomTrial();
        if (card) openCard(card.dataset.talentCard);
    }
    function render() {
        const root = document.getElementById('ui-talent-root');
        if (!root) return;
        if (!bound) { bound = true; root.addEventListener('click', onClick); }
        const html = headHtml() + `<div class="talent-top">${trialHtml()}${slotsHtml()}</div>` + boardHtml();
        if (html !== lastHtml) { root.innerHTML = html; lastHtml = html; }
        if (dialogKey && selectionDialog.isOpen(CARD_DIALOG)) openCard(dialogKey, true);
    }
    /** PC hover: the card's name, level (or the level it would bloom at) and effects. Touch opens the card window instead. */
    function hint(event, key) {
        if (!event || event.pointerType === 'touch' || typeof showInfoTooltipHtml !== 'function' || !TALENT_BLOOM_CARD_DEFS[key]) return;
        const { heroId, classKey } = parseTalentComboKey(key), card = owned()[key], level = card ? levelOf(card) : scoreLevel();
        const html = `<div class="tooltip-title" style="color:${toneOf(classKey)};">${esc(getTalentCardName(heroId, classKey).bloomName)}</div>`
            + `<div class="tooltip-line">${card ? `Lv.${level}` : `미개화, 지금 점수로 Lv.${level}`}</div>${effectsHtml(heroId, classKey, level)}`;
        showInfoTooltipHtml(event.clientX, event.clientY, html, toneOf(classKey), `talent:${key}`);
    }
    return Object.freeze({ render, hint });
})();

safeExposeGlobals({ talentUi });
