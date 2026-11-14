export function renderColonyWardView(runtime, targetId) {
    const panel = runtime.deps.document.getElementById(targetId);
    if (!panel) return;
    const html = runtime.deps.colonyWardsUi.colonyPanelHtml();
    if (panel.__wardHtml === html) return;
    panel.innerHTML = html;
    panel.__wardHtml = html;
}
