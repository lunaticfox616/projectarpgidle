export function filter(runtime, category = runtime.category, conditions = runtime.includeConditions) {
    runtime.category = category;
    runtime.includeConditions = conditions;
    refreshArchiveFilter(runtime);
}

export function refreshArchiveFilter(runtime, changed = true) {
    if (!changed && runtime.archiveOwner === runtime.deps.game) return;
    const host = runtime.deps.document.getElementById('ui-journal-list');
    if (!host) return;
    runtime.archiveOwner = runtime.deps.game;
    filterArchiveCards(runtime, host);
    const sections = [...host.querySelectorAll('[data-journal-category]')];
    const visible = sections.filter(section => section.querySelector('.journal-card:not([hidden])'));
    if (!visible.some(section => section.dataset.journalCategory === runtime.category)) runtime.category = '전체';
    for (const section of sections) section.hidden = !visible.includes(section) || (runtime.category !== '전체' && section.dataset.journalCategory !== runtime.category);
    refreshArchiveControls(runtime, host, visible);
}

function filterArchiveCards(runtime, host) {
    for (const card of host.querySelectorAll('.journal-card')) {
        card.hidden = !card.classList.contains('is-unlocked') && !(runtime.includeConditions && card.classList.contains('is-available'));
    }
}

function refreshArchiveControls(runtime, host, visible) {
    for (const button of host.querySelectorAll('[data-journal-filter]')) {
        button.hidden = button.dataset.journalFilter !== '전체' && !visible.some(section => section.dataset.journalCategory === button.dataset.journalFilter);
        button.setAttribute('aria-pressed', String(button.dataset.journalFilter === runtime.category));
    }
    host.querySelector('[data-journal-conditions]').checked = runtime.includeConditions;
    const target = host.querySelector('.journal-next-target');
    if (target) target.hidden = !runtime.includeConditions;
    host.querySelector('.journal-empty').hidden = visible.length > 0;
}
