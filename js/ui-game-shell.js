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

    /** 로그인 화면의 금빛 나뭇잎(2026-11-05 사용자 "로그인화면에 금빛 나뭇잎이 흩날리게 해줄 수 있어?"). 움직임은 css/startup.css .title-leaf,
     * 그림은 assets/ui/title-leaves.png(scripts/build-title-leaves.cjs). 자리, 빠르기, 크기는 번호로 정해 열 때마다 같다.
     * 도트 하나는 기기 화소의 정수배로 잡는다(가까운 잎은 3배쯤, 먼 잎은 2배쯤): 도트 그림이 고르게 보이게. */
    const TITLE_LEAVES = 14;
    /** 도트 하나의 CSS 크기(px): scale배쯤이면서 기기 화소의 정수배. */
    const deviceDot = scale => { const ratio = window.devicePixelRatio || 1; return Math.max(1, Math.round(scale * ratio)) / ratio; };
    function titleLeafLook(index, scale) {
        const near = index % 3 !== 2;
        return {
            '--leaf-x': `${8 + ((index * 41) % 88)}%`,
            '--leaf-fall': `${(near ? 11 : 16) + (index % 5) * 1.3}s`,
            '--leaf-delay': `${-((index * 2.9) % 17).toFixed(1)}s`,
            '--leaf-sway': `${2.2 + (index % 4) * 0.5}s`,
            '--leaf-swing': `${(near ? 26 + (index % 3) * 8 : 14) * scale}px`,
            '--leaf-turn': `${1.4 + (index % 4) * 0.35}s`,
            '--leaf-drift': `${-14 + ((index * 7) % 20)}vw`,
            '--leaf-dot': `${deviceDot((near ? 3 : 2) * scale)}px`,
            '--leaf-row': String(index % 2),
            '--leaf-mirror': index % 4 < 2 ? '1' : '-1',
            '--leaf-alpha': near ? '0.92' : '0.6'
        };
    }
    function addStartupLeaves() {
        const overlay = document.getElementById('startup-overlay');
        if (!overlay || overlay.querySelector('.title-leaf-field')) return;
        const field = document.createElement('div');
        field.className = 'title-leaf-field';
        field.setAttribute('aria-hidden', 'true');
        const scale = Math.min(window.innerWidth, window.innerHeight) < 600 ? 0.67 : 1;   // 휴대폰에서는 잎을 작게
        for (let index = 0; index < TITLE_LEAVES; index += 1) {
            const leaf = document.createElement('span'), sway = document.createElement('span'), sprite = document.createElement('span');
            leaf.className = 'title-leaf';
            sway.className = 'title-leaf-sway';
            sprite.className = 'title-leaf-sprite';
            Object.entries(titleLeafLook(index, scale)).forEach(([name, value]) => leaf.style.setProperty(name, value));
            sway.appendChild(sprite);
            leaf.appendChild(sway);
            field.appendChild(leaf);
        }
        overlay.prepend(field);
    }
    /** 로고와 로그인 판을 합친 판의 로고 크기(css/startup.css --startup-logo-size): 120도트 로고를 도트 하나가 1.6px쯤이면서 기기 화소의
     * 정수배가 되게(125% 화면 192px, 100% 화면 240px). */
    function sizeStartupLogo() {
        const overlay = document.getElementById('startup-overlay');
        if (overlay) overlay.style.setProperty('--startup-logo-size', `${120 * deviceDot(1.6)}px`);
    }

    function initializeGameShell() {
        document.body.classList.add('ui-game-overhaul');
        addStartupMotes();
        addStartupLeaves();
        sizeStartupLogo();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeGameShell);
    else initializeGameShell();
}());
