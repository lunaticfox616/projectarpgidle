import { underworldRuneState } from '../state/underworld-runes.mjs';
import { underworldRuneCountMap, validUnderworldRuneSlot } from '../domain/underworld-crafting.mjs';
import { listenView, releaseViewEvents, releaseViewTarget } from './view-events.mjs';

/** Inventory commands and one disposable picker. Prices and mutations belong to crafting. */
export class UnderworldRuneInventory {
    constructor(deps, crafting, details) {
        this.deps = deps;
        this.crafting = crafting;
        this.details = details;
        this.active = true;
        this.listeners = [];
        this.overlay = null;
        this.context = null;
        this.closePicker = null;
    }

    current() {
        if (!this.active) return false;
        const context = this.context, owner = this.deps.game;
        return !context || (context.owner === owner && context.state === owner.underworldRunes
            && context.loop === owner.loopCount && context.season === owner.season);
    }

    closeStale() { if (!this.current()) this.closeOverlay(); }

    editable() {
        if (!this.current()) { this.closeOverlay(); return false; }
        return this.deps.assertBuildEditable();
    }

    finish(close) {
        if (close) this.closeOverlay();
        this.deps.updateStaticUI();
        this.deps.queueImportantSave(200);
    }

    equip(index, no) {
        if (!this.editable()) return;
        if (this.crafting.equipRune(this.deps.game,index,no).ok) this.finish(true);
    }

    unequip(index) {
        if (!this.editable()) return;
        if (this.crafting.unequipRune(this.deps.game,index).ok) this.finish(true);
    }

    craft() {
        if (!this.editable()) return;
        const result = this.crafting.craftRune(this.deps.game), { _t } = this.deps;
        if (!result.ok) {
            const text = result.reason === 'unlock' ? _t('먼저 지하계 10층 단위 보상으로 지하석 번호를 해금하세요.')
                : _t('지하석 조각이 부족합니다. (필요: {need})',{need:result.cost.runeShard});
            return this.deps.addLog(text,'attack-monster');
        }
        const def = this.deps.getUnderworldRuneDef(result.no);
        this.deps.addLog(_t('🧿 지하석 가공 성공: {name} 획득 ({detail})',{
            name:def ? _t(def.name) : _t('지하석{n}',{n:result.no}),detail:this.baseEffectText(def)}),'loot-unique');
        this.finish(false);
    }

    upgrade(fromNo) {
        if (!this.editable()) return;
        if (fromNo == null) return this.openUpgrade();
        const result = this.crafting.upgradeRune(this.deps.game,fromNo), { _t } = this.deps;
        if (!result.ok) return this.upgradeFailure(result);
        this.closeOverlay();
        const def = this.deps.getUnderworldRuneDef(result.no);
        this.deps.addLog(_t('🧿 지하석 승급 성공: {from}×3 + 지하석 조각 {shards} → {to} ({detail})',{
            from:_t('지하석{n}',{n:result.from}),shards:result.cost.runeShard,
            to:def ? _t(def.name) : _t('지하석{n}',{n:result.no}),detail:this.baseEffectText(def)}),'loot-unique');
        this.finish(false);
    }

    baseEffectText(def) { return def ? `${this.deps.getStatName(def.stat)} +${this.deps.formatValue(def.stat,def.val)}` : ''; }

    upgradeFailure(result) {
        const { _t } = this.deps;
        let text = _t('동일 번호 지하석 3개가 필요합니다. (지하석30은 승급 불가)');
        if (result.reason === 'cost') text = _t('지하석 조각이 부족합니다. (필요: {shardNeed})',{shardNeed:result.cost.runeShard});
        if (result.reason === 'unlock') text = _t('현재는 {stone} 승급할 수 없습니다. (해금된 최대 번호: {max})',{
            stone:this.deps.withObjectParticle(_t('지하석{n}',{n:result.from})),max:result.max});
        this.deps.addLog(text,'attack-monster');
    }

    slotOptionsHtml(counts) {
        const keys = Object.keys(counts).map(Number).sort((a,b) => a-b), { _t } = this.deps;
        if (!keys.length) return `<div class="underworld-rune-empty">${_t('보관 중인 지하석이 없습니다.')}</div>`;
        return keys.map(no => {
            const def = this.deps.getUnderworldRuneDef(no), title = def ? _t(def.name) : _t('지하석{no}',{no});
            return `<button type="button" class="underworld-rune-option" data-info-tooltip-anchor="1" data-rune-command="equip" data-rune-number="${no}">${this.details.iconHtml(no)}<strong>${title}</strong><span>${_t('보유 {runeCountMap}개, {no}',{runeCountMap:counts[no],no:this.details.effectHtml(no)})}</span></button>`;
        }).join('');
    }

    upgradeOptionHtml(no, count, max) {
        const shardNeed = Math.max(5,no), canPay = (this.deps.game.currencies.runeShard || 0) >= shardNeed;
        const canUpgrade = no < max && canPay, target = no+1, { _t } = this.deps;
        const def = this.deps.getUnderworldRuneDef(no), toDef = this.deps.getUnderworldRuneDef(target);
        const status = canUpgrade ? `${this.deps.withDirectionParticle(_t('지하석{target}',{target}))} ${_t('승급')}, ${_t('지하석 조각')} ${shardNeed}`
            : (no >= max ? _t('지하석{target} 해금 필요',{target}) : _t('지하석 조각 부족 ({shardNeed})',{shardNeed}));
        const title = def ? _t('{name} 지하석{no}',{name:def.name,no}) : _t('지하석{no}',{no});
        const targetName = toDef ? _t('{name} 지하석{target}',{name:toDef.name,target}) : _t('지하석{target}',{target});
        return `<button type="button" class="underworld-rune-option" data-info-tooltip-anchor="1" data-rune-command="upgrade" data-rune-number="${no}" ${canUpgrade ? '' : 'disabled'}>${this.details.iconHtml(no)}<strong>${title} ×${count}</strong><span>${this.details.effectHtml(no)}</span><span>→ ${targetName}, ${status}</span></button>`;
    }

    openSlot(index) {
        this.closeOverlay();
        if (!this.active) return;
        const owner = this.deps.game, state = underworldRuneState(owner), { _t } = this.deps;
        if (!validUnderworldRuneSlot(state,index)) return;
        const current = state.equippedRunes[index] ? this.details.tooltipHtml(state.equippedRunes[index]) : `<div class="tooltip-line">${_t('현재 비어있음')}</div>`;
        const body = `<div class="underworld-rune-current">${current}</div><div class="underworld-rune-option-grid">${this.slotOptionsHtml(underworldRuneCountMap(state.obtainedRunes))}</div><div class="underworld-rune-overlay-actions"><button type="button" data-rune-command="unequip" ${state.equippedRunes[index] ? '' : 'disabled'}>${_t('이 슬롯 해제')}</button></div>`;
        this.openPicker(owner,{mode:'slot',index},[
            _t('지하석 슬롯 {value} 선택',{value:index+1}),_t('보유한 룬을 클릭해 장착하거나 현재 슬롯을 비울 수 있습니다.'),body
        ],`.underworld-rune-slot:nth-child(${index+1})`);
    }

    openUpgrade() {
        this.closeOverlay();
        if (!this.active) return;
        const owner = this.deps.game, state = underworldRuneState(owner), { _t } = this.deps;
        const counts = underworldRuneCountMap(state.obtainedRunes);
        const max = Math.max(1,Math.min(30,Math.floor(state.unlockedRunesMaxNumber || 1)));
        const rows = Object.keys(counts).map(Number).sort((a,b) => a-b).filter(no => counts[no] >= 3 && no < 30);
        if (!rows.length) return this.upgradeFailure({reason:'copies'});
        const options = rows.map(no => this.upgradeOptionHtml(no,counts[no],max)).join('');
        this.openPicker(owner,{mode:'upgrade'},[
            _t('지하석 승급 대상 선택'),_t('동일 번호 룬 3개와 룬조각을 사용해 어떤 룬을 다음 번호로 승급할지 선택하세요.'),
            `<div class="underworld-rune-option-grid">${options}</div>`
        ],'.underworld-action-grid button[data-underworld-command="upgrade"]');
    }

    openPicker(owner, selection, content, returnSelector) {
        const [title,description,body] = content, overlay = this.deps.document.createElement('div');
        overlay.id = 'underworld-rune-overlay';
        overlay.className = 'underworld-rune-overlay';
        overlay.innerHTML = `<div class="underworld-rune-overlay-panel"><div class="underworld-rune-overlay-head"><div><div class="underworld-rune-overlay-title" id="underworld-rune-title">${title}</div><div class="underworld-rune-overlay-desc">${description}</div></div><button type="button">${this.deps._t('닫기')}</button></div>${body}</div>`;
        this.context = {owner,state:owner.underworldRunes,loop:owner.loopCount,season:owner.season,...selection};
        this.overlay = overlay;
        this.deps.document.body.appendChild(overlay);
        listenView(this,overlay,'click',event => this.onClick(event,overlay));
        listenView(this,overlay,'mouseover',event => this.onTooltip(event,overlay));
        listenView(this,overlay,'mousemove',event => this.onTooltip(event,overlay));
        listenView(this,overlay,'mouseout',event => this.onTooltipOut(event));
        this.closePicker = this.deps.bindGamePicker(overlay,{titleId:'underworld-rune-title',
            closeSelector:'.underworld-rune-overlay-head button',returnSelector,onClose:() => this.overlayClosed(overlay)});
    }

    onClick(event, overlay) {
        if (this.overlay !== overlay) return;
        if (!this.current()) { this.closeOverlay(); return; }
        const button = event.target.closest('[data-rune-command]');
        if (!button || !overlay.contains(button) || button.disabled) return;
        this.selectCommand(button.dataset.runeCommand,Number(button.dataset.runeNumber));
    }

    selectCommand(command, no) {
        const {mode,index} = this.context;
        if (mode === 'upgrade') {
            if (command === 'upgrade') this.upgrade(no);
            return;
        }
        if (command === 'equip') this.equip(index,no);
        if (command === 'unequip') this.unequip(index);
    }

    onTooltip(event, overlay) {
        if (this.overlay !== overlay) return;
        if (!this.current()) { this.closeOverlay(); return; }
        const button = event.target.closest('[data-rune-number]');
        if (button && overlay.contains(button)) this.details.showTooltip(event,Number(button.dataset.runeNumber));
    }

    onTooltipOut(event) {
        const button = event.target.closest('[data-rune-number]');
        if (button && !button.contains(event.relatedTarget)) this.deps.hideInfoTooltip();
    }

    overlayClosed(overlay) {
        releaseViewTarget(this,overlay);
        if (this.overlay !== overlay) return;
        this.overlay = null;
        this.context = null;
        this.closePicker = null;
        this.deps.hideInfoTooltip();
    }

    closeOverlay() {
        const close = this.closePicker;
        if (close) close();
    }

    dispose() {
        this.closeOverlay();
        releaseViewEvents(this);
    }
}
