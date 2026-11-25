export function updateCombatCurrencyHud(runtime) {
    const root = runtime.deps.document.getElementById('ui-combat-currencies');
    if (!root) return;
    runtime.state.keys = runtime.state.keys || Object.keys(runtime.deps.ORB_DB).filter(key => runtime.deps.craftingWorkspaceState.group(key) === 'basic' && runtime.deps.ORB_DB[key].icon);
    const held = runtime.state.keys.map(key => [key, Math.floor(Number(runtime.deps.game.currencies[key]) || 0)]).filter(([, count]) => count > 0);
    const sign = `${runtime.deps.i18n.locale}:${held.join('|')}`;
    if (root === runtime.state.root && sign === runtime.state.drawn) return;
    runtime.state.root = root;
    runtime.state.drawn = sign;
    root.hidden = !held.length;
    // 마우스를 올리면 재화 보관함 칸과 같은 카드(이름의 색, 테마 빛 테, 효과 낱말 색)가 뜬다(craftingStashUi.card, 2026-11-26 사용자).
    // 터치는 지금처럼 길게 누르면 이름만(data-touch-tip, modules/browser/plain-tip.mjs).
    root.innerHTML = held.map(([key, count]) => {
        const name = (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(runtime.deps.ORB_DB[key].name));
        return `<span data-theme="${runtime.deps.craftingWorkspaceState.group(key)}" data-touch-tip="${name}" data-info-tooltip-anchor="1" onmouseenter="craftingStashUi.card(event,'${key}')" onmouseleave="hideInfoTooltip()"
            aria-label="${(0, runtime.deps._t)('{name} {count}개', { name, count })}"><img src="${runtime.deps.ORB_DB[key].icon}" alt="">${count.toLocaleString(runtime.deps.i18n.locale)}</span>`;
    }).join('');
}
