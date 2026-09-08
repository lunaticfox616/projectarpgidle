// Recipe definitions are static during a session. Preserve controls while refreshing live costs.
function updateSeaGiftMarkup(panel, html) {
    if (!panel.firstElementChild) { panel.innerHTML = html; panel.__seaGiftHtml = html; return; }
    if (panel.__seaGiftHtml === html) return;
    const template = document.createElement('template');
    template.innerHTML = html;
    const target = panel.querySelector('.ocean-craft-target');
    const nextTarget = template.content.querySelector('.ocean-craft-target');
    if (target.innerHTML !== nextTarget.innerHTML) target.innerHTML = nextTarget.innerHTML;
    target.className = nextTarget.className;
    template.content.querySelectorAll('[data-sea-recipe]').forEach(next => {
        const card = panel.querySelector(`[data-sea-recipe="${next.dataset.seaRecipe}"]`);
        const copy = card.querySelector('.ocean-recipe-copy');
        const nextCopy = next.querySelector('.ocean-recipe-copy');
        if (copy.innerHTML !== nextCopy.innerHTML) copy.innerHTML = nextCopy.innerHTML;
        if (card.className !== next.className) card.className = next.className;
        const button = card.querySelector('button');
        const nextButton = next.querySelector('button');
        if (button.disabled !== nextButton.disabled) button.disabled = nextButton.disabled;
        if (button.textContent !== nextButton.textContent) button.textContent = nextButton.textContent;
    });
    panel.__seaGiftHtml = html;
}

safeExposeGlobals({ updateSeaGiftMarkup });
