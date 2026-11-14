export function render(runtime) {
    const host = runtime.deps.document.getElementById('ui-equipment-aux');
    if (!host || host.hidden) return;
    host.innerHTML = '';
    host.hidden = true;
}
