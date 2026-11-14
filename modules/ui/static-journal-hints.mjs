import { journalHintById } from './static-ui-data.mjs';

export function getJournalHint(runtime, id, def) {
    if (def && def.hint) return def.hint;
    let actMatch = /^act_(\d+)$/.exec(id);
    if (actMatch) return (0, runtime.deps._t)('액트 {actMatch} 보스 처치', { actMatch: actMatch[1] });
    return journalHintById[id] || '관련 콘텐츠 탐험';
}
