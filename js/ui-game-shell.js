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

    function labelCombatFeed() {
        const sub = document.querySelector('.combat-feed-sub');
        if (sub && !sub.textContent.trim()) sub.textContent = 'LIVE';
    }

    function initializeGameShell() {
        document.body.classList.add('ui-game-overhaul');
        addStartupMotes();
        labelCombatFeed();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeGameShell);
    else initializeGameShell();
}());
