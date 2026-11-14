export class SideEncounterMarkup {
    constructor(deps) {
        this.deps = deps;
    }

    // Keep the action row connected while combat estimates and countdowns change.
    renderPanel(panel, html) {
        if (panel.__lastHtml === html) return;
        if (!html) { panel.replaceChildren(); panel.__lastHtml = html; return; }
        const template = this.deps.document.createElement('template');
        template.innerHTML = html;
        const intro = template.content.firstElementChild;
        const actions = intro.querySelector('.map-expedition-actions');
        actions.remove();
        const bodyHtml = intro.innerHTML;
        let body = panel.querySelector('.map-expedition-content');
        if (!body) {
            intro.innerHTML = '<div class="map-expedition-content"></div>';
            intro.append(actions);
            panel.replaceChildren(intro);
            body = intro.firstElementChild;
        }
        if (body.innerHTML !== bodyHtml) {
            (0, this.deps.captureUiDisclosureState)(body);
            body.innerHTML = bodyHtml;
            (0, this.deps.restoreUiDisclosureState)(body);
        }
        this.refreshActions(panel.querySelector('.map-expedition-actions'), actions);
        panel.__lastHtml = html;
    }

    refreshActions(current, next) {
        const signature = row => [...row.children].map(el => `${el.tagName}:${el.getAttribute('onclick')}`).join('|');
        if (signature(current) !== signature(next)) { current.replaceChildren(...next.children); return; }
        [...next.children].forEach((child, index) => {
            const target = current.children[index];
            if (target.textContent !== child.textContent) target.textContent = child.textContent;
            if (child.tagName === 'BUTTON') {
                target.disabled = child.disabled;
                if (child.hasAttribute('aria-pressed')) target.setAttribute('aria-pressed', child.getAttribute('aria-pressed'));
            }
        });
    }

    rows(values, empty) {
        const counts = new Map();
        values.filter(Boolean).forEach(value => counts.set(String(value), (counts.get(String(value)) || 0) + 1));
        if (!counts.size) return `<li class="expedition-empty">${empty}</li>`;
        return [...counts].map(([text,count]) => `<li>${(0, this.deps.escapeHTML)(text)}${count > 1 ? ` <small>×${count}</small>` : ''}</li>`).join('');
    }
}
