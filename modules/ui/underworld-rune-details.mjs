import { underworldRuneState } from '../state/underworld-runes.mjs';

/** One presentation of rune icons and effects shared by the panel and picker. */
export class UnderworldRuneDetails {
    constructor(deps) { this.deps = deps; }

    iconHtml(no) {
        const value = Number(no), def = Number.isInteger(value) && value > 0 ? this.deps.getUnderworldRuneDef(value) : null;
        return def ? `<img class="underworld-stone-icon" src="assets/items/underworld-stones/uw_rune_${def.no}.png" alt="" draggable="false" decoding="async">` : '';
    }

    effectHtml(no) {
        const def = this.deps.getUnderworldRuneDef(no), { _t } = this.deps;
        if (!def) return `<span style="color:var(--copy-muted);">${_t('지하석 정보 없음')}</span>`;
        const tone = this.deps.getItemStatToneColor(def.stat);
        const level = Math.max(0,Number(this.deps.game.underworldRunes?.enhanceLvByNo?.[no]) || 0);
        return `<span style="color:${tone};">${this.deps.getStatName(def.stat)} +${this.deps.formatValue(def.stat,def.val*(1+level*0.01))}${this.deps.P_STATS[def.stat]?.isPct ? '%' : ''}${level ? `, +${level}` : ''}</span>`;
    }

    tooltipHtml(no) {
        const def = this.deps.getUnderworldRuneDef(no), { _t } = this.deps;
        if (!def) return `<div class="tooltip-title">${_t('알 수 없는 지하석')}</div><div class="tooltip-line">${_t('지하석 효과 정보가 없습니다.')}</div>`;
        const state = underworldRuneState(this.deps.game), lv = Math.max(0,Math.floor(state.enhanceLvByNo[def.no] || 0));
        const boosted = Number(def.val || 0)*(1+lv*0.01);
        const main = `${this.deps.getStatName(def.stat)} +${this.deps.formatValue(def.stat,boosted)}${this.deps.P_STATS[def.stat]?.isPct ? '%' : ''}${lv > 0 ? ` <span style="color:var(--copy-bright);">${_t('(+{lv} 강화)',{lv})}</span>` : ''}`;
        const bonus = (state.bonusLinesByNo[def.no] || []).map(line => this.bonusHtml(line)).join('');
        return `<div class="tooltip-title">${this.deps.escapeHTML(_t(def.name))} <span style="color:var(--copy-bright);">${_t('지하석{no}',{no:def.no})}</span></div><div class="tooltip-line" style="color:${this.deps.getItemStatToneColor(def.stat)};">${main}</div>${bonus || _t('<div class="tooltip-line" style="color:var(--copy-muted);">강화 보너스 옵션 없음</div>')}`;
    }

    bonusHtml(line) {
        const text = this.deps._t('보너스, {stat} +{stat2}{value}',{stat:this.deps.getStatName(line.stat),
            stat2:this.deps.formatValue(line.stat,line.val),value:this.deps.P_STATS[line.stat]?.isPct ? '%' : ''});
        return `<div class="tooltip-line" style="color:${this.deps.getItemStatToneColor(line.stat)};">${text}</div>`;
    }

    showTooltip(event, no) {
        if (event.type !== 'click' && !this.deps.window.matchMedia('(hover: hover)').matches) return;
        this.deps.showInfoTooltipHtml(event.clientX,event.clientY,this.tooltipHtml(no),'#9b7cff');
    }
}
