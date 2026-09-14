// Preserve controls and native disclosures in stable, position-based panel layouts.
// Callers own markup. Reorderable inventory/list views must use their own keyed renderer.
const updateGamePanelMarkup = (() => {
    function syncNode(current, next) {
        if (current.nodeType !== next.nodeType || current.nodeName !== next.nodeName) {
            current.replaceWith(next.cloneNode(true)); return [];
        }
        if (current.nodeType === Node.TEXT_NODE) {
            if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
            return [];
        }
        if (current.nodeType !== Node.ELEMENT_NODE) return [];
        syncAttributes(current, next);
        const children = [...next.childNodes], pending = [];
        children.forEach((child, index) => {
            if (current.childNodes[index]) pending.push([current.childNodes[index], child]);
            else current.appendChild(child.cloneNode(true));
        });
        while (current.childNodes.length > children.length) current.lastChild.remove();
        return pending;
    }

    function syncAttributes(current, next) {
        // Native disclosure state belongs to the reader, not the latest render string.
        const preserve = name => current.tagName === 'DETAILS' && name === 'open';
        [...current.attributes].forEach(attribute => {
            if (!preserve(attribute.name) && !next.hasAttribute(attribute.name)) current.removeAttribute(attribute.name);
        });
        [...next.attributes].forEach(attribute => {
            if (!preserve(attribute.name) && current.getAttribute(attribute.name) !== attribute.value) {
                current.setAttribute(attribute.name, attribute.value);
            }
        });
    }

    function updateGamePanelMarkup(panel, html) {
        if (panel.__gamePanelHtml === html) return;
        const template = document.createElement('template'); template.innerHTML = html;
        const next = panel.cloneNode(false); next.append(template.content);
        const pending = [[panel, next]];
        while (pending.length) pending.push(...syncNode(...pending.pop()));
        panel.__gamePanelHtml = html;
    }
    return updateGamePanelMarkup;
})();
safeExposeGlobals({ updateGamePanelMarkup });
