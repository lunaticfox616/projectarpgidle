(function () {
    'use strict';

    function addStartupMotes() {
        const overlay = document.getElementById('startup-overlay');
        if (!overlay || overlay.querySelector('.game-mote-field')) return;
        const field = document.createElement('div');
        field.className = 'game-mote-field';
        for (let index = 0; index < 22; index += 1) {
            const mote = document.createElement('i');
            mote.style.setProperty('--mote-x', `${(index * 37) % 101}%`);
            mote.style.setProperty('--mote-delay', `${-((index * 0.73) % 8)}s`);
            mote.style.setProperty('--mote-speed', `${7 + (index % 6) * 1.4}s`);
            mote.style.setProperty('--mote-size', `${1 + (index % 3)}px`);
            field.appendChild(mote);
        }
        overlay.prepend(field);
    }

    function addCombatBrand() {
        const panel = document.querySelector('.combat-panel');
        if (!panel || panel.querySelector('.game-combat-brand')) return;
        const brand = document.createElement('div');
        brand.className = 'game-combat-brand';
        brand.innerHTML = '<span class="game-combat-sigil">◇</span><span><strong>PROJECT IDLE</strong><small>ROOTBOUND EXPEDITION</small></span>';
        panel.prepend(brand);
    }

    function labelCombatFeed() {
        const sub = document.querySelector('.combat-feed-sub');
        if (sub && !sub.textContent.trim()) sub.textContent = 'LIVE';
    }

    function initializeGameShell() {
        document.body.classList.add('ui-game-overhaul');
        addStartupMotes();
        addCombatBrand();
        labelCombatFeed();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeGameShell);
    else initializeGameShell();
}());
