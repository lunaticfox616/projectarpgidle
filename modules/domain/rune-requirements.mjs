// Requirement tables are inputs; presentation receives the active translator.
export const getRuneLevelReq = (name, support, tables) => (support ? tables.supports : tables.skills)[name] || 0;
export function getRuneLevelNote(name, support, state, tables, translate) {
    const need = getRuneLevelReq(name, support, tables);
    return need > (state.level || 1) ? translate('Lv.{need} 필요', { need }) : '';
}
