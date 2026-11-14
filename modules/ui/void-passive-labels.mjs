export class VoidPassiveLabels {
    constructor(deps) { this.deps = deps; }

    formatVoidPassiveStatLine(line) {
        if (!line || !this.deps.isVoidPassiveLineStat(line.id)) return '';
        const isPct = this.deps.P_STATS[line.id] ? this.deps.P_STATS[line.id].isPct : /\(%\)/.test(this.deps.STAT_DISPLAY_NAMES[line.id]);
        const shown = value => `+${this.deps.formatValue(line.id, value)}${isPct ? '%' : ''}`, final = shown(line.val);
        // 효율이 곱해진 줄(투영의 문양, 공허의 별자리 등)은 최종 수치 뒤에 굴린 원본을 적는다(2026-11-02 사용자).
        const original = line.baseVal === undefined || shown(line.baseVal) === final ? '' : this.deps._t(' (원본 {baseVal})', { baseVal: shown(line.baseVal) });
        return `${String(this.deps.getStatName(line.id)).replace(/\s*\((\+%p|%)\)\s*/g, '').trim()} ${final}${original}`;
    }

    getTranscendentVoidEffectLabel(nodeId, tr) {
        const def = this.deps.TRANSCENDENT_VOID_PASSIVE_DB.find(row => row.id === tr.id), scale = this.deps.getVoidLinkScale(nodeId);
        if (!def || scale === 1 || !this.deps.TRANSCENDENT_VOID_STAT_LINES[tr.id] || ['paleBlueDot', 'resonantStar'].includes(tr.id)) return this.formatTranscendentVoidPassive(tr);
        const round = value => Math.round(value * 100) / 100;
        const value2 = tr.id === 'innateTalent' ? 1 + (tr.value2 - 1) * scale : tr.value2 * scale;
        const scaled = { ...tr, value: round(tr.value * scale), value2: round(value2) }, after = def.desc(scaled.value, scaled.value2).split(' ');
        const original = new Set(def.desc(tr.value, tr.value2).split(' ').filter((word, index) => word !== after[index]));
        return `${this.formatTranscendentVoidPassive(scaled)}${original.size ? ` (원본 ${[...original].join(', ')})` : ''}`;
    }

    getVoidPassiveEffectLabel(nodeId) {
        let entry = this.deps.getVoidPassiveCraft(nodeId);
        if (entry.transcendent) {
            return this.getTranscendentVoidEffectLabel(nodeId, entry.transcendent);
        }
        if (!entry.stats.length) return '공허 옵션 없음';
        return this.deps.passiveRouting.voidStats(entry, this.deps.game, this.deps.getVoidLinkScale(nodeId)).map(line => this.formatVoidPassiveStatLine(line)).filter(Boolean).join(' / ');
    }

    formatTranscendentVoidPassive(entry) {
        let def = this.deps.TRANSCENDENT_VOID_PASSIVE_DB.find(row => row.id === (entry && entry.id));
        if (!def) return '공허 옵션 없음';
        return `<span style="color:#d8b4ff;">${this.deps._t('{name} (초월)', { name: def.name })}</span>: ${def.desc(entry.value, entry.value2)}`;
    }
}
