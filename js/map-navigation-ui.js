// Shared compact navigation projects existing buttons, which own access and routing.
(function () {
    'use strict';
    function collectDestinations(selector) {
        return Array.from(document.querySelectorAll(selector))
            .filter(button => button.style.display !== 'none' && !button.hidden && !['btn-map-tab-zones','btn-map-explore-atlas'].includes(button.id))
            .map(button => ({
                id: button.id,
                label: button.textContent.trim().replace(/^[^가-힣a-zA-Z0-9]+/, ''),
                disabled: button.disabled,
                condition: button.dataset.entryCondition || ''
            }));
    }

    function changeDestination(event) {
        const button = document.getElementById(event.target.value);
        if (button.id.startsWith('btn-map-explore-')) switchMapSubtab('map-tab-zones');
        button.click();
        updateStaticUI();
    }

    function renderMobileMapNavigation() {
        const root = document.getElementById('mobile-map-navigation');
        let select = root.querySelector('select');
        if (!select) {
            select = document.createElement('select');
            select.id = 'mobile-map-destination';
            select.setAttribute('aria-label', '목적지 선택');
            select.addEventListener('change', changeDestination);
            root.appendChild(select);
        }
        const groups = [
            ['탐험', collectDestinations('#map-tab-zones .vertical-tab-sidebar > button')],
            ['별도 지역', collectDestinations('#tab-map .map-primary-tabs > button')]
        ];
        const signature = JSON.stringify(groups);
        if (select.dataset.optionsSignature !== signature) {
            select.replaceChildren(...groups.filter(([, rows]) => rows.length).map(([label, rows]) => {
                const group = document.createElement('optgroup');
                group.label = label;
                rows.forEach(row => {
                    const option = document.createElement('option');
                    option.value = row.id;
                    option.textContent = row.label + (row.condition ? ' · ' + row.condition : '');
                    option.disabled = row.disabled;
                    group.appendChild(option);
                });
                return group;
            }));
            select.dataset.optionsSignature = signature;
        }
        select.value = 'btn-' + (game.mapSubtab === 'map-tab-zones' ? game.mapExploreSubtab : game.mapSubtab);
    }
    safeExposeGlobals({ renderMobileMapNavigation });
}());
