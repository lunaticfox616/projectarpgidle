/** Startup ornament lifetime; authored CSS still owns animation and reduced effects. */
class GameShell {
    constructor({ window, document }) {
        this.window = window; this.document = document;
        this.fields = []; this.started = false; this.disposed = false; this.installed = false;
        this.initializeGameShell = this.initializeGameShell.bind(this);
    }
    start() {
        if (this.started || this.disposed) return;
        this.started = true;
        if (this.document.readyState === 'loading') this.document.addEventListener('DOMContentLoaded', this.initializeGameShell, { once: true });
        else this.initializeGameShell();
    }
    addStartupMotes() {
        const overlay = this.document.getElementById('startup-overlay');
        if (!overlay || overlay.querySelector('.game-mote-field')) return;
        const field = this.document.createElement('div');
        field.className = 'game-mote-field';
        for (let index = 0; index < 22; index += 1) {
            const mote = this.document.createElement('i');
            mote.style.setProperty('--mote-x', `${(index * 37) % 101}%`);
            mote.style.setProperty('--mote-delay', `${-((index * 0.73) % 8)}s`);
            mote.style.setProperty('--mote-speed', `${7 + (index % 6) * 1.4}s`);
            mote.style.setProperty('--mote-size', `${1 + (index % 3)}px`);
            field.appendChild(mote);
        }
        overlay.prepend(field);
        this.fields.push(field);
    }

    /** 로그인 화면의 금빛 나뭇잎(2026-11-05 사용자 "로그인화면에 금빛 나뭇잎이 흩날리게 해줄 수 있어?"). 움직임은 css/startup.css .title-leaf,
     * 그림은 assets/ui/title-leaves.png(scripts/build-title-leaves.cjs). 자리, 빠르기, 크기는 번호로 정해 열 때마다 같다.
     * 도트 하나는 기기 화소의 정수배로 잡는다(가까운 잎은 3배쯤, 먼 잎은 2배쯤): 도트 그림이 고르게 보이게. */

    /** 도트 하나의 CSS 크기(px): scale배쯤이면서 기기 화소의 정수배. */
    deviceDot(scale) { const ratio = this.window.devicePixelRatio || 1; return Math.max(1, Math.round(scale * ratio)) / ratio; }
    titleLeafLook(index, scale) {
        const near = index % 3 !== 2;
        return {
            '--leaf-x': `${8 + ((index * 41) % 88)}%`,
            '--leaf-fall': `${(near ? 11 : 16) + (index % 5) * 1.3}s`,
            '--leaf-delay': `${-((index * 2.9) % 17).toFixed(1)}s`,
            '--leaf-sway': `${2.2 + (index % 4) * 0.5}s`,
            '--leaf-swing': `${(near ? 26 + (index % 3) * 8 : 14) * scale}px`,
            '--leaf-turn': `${1.4 + (index % 4) * 0.35}s`,
            '--leaf-drift': `${-14 + ((index * 7) % 20)}vw`,
            '--leaf-dot': `${this.deviceDot((near ? 3 : 2) * scale)}px`,
            '--leaf-row': String(index % 2),
            '--leaf-mirror': index % 4 < 2 ? '1' : '-1',
            '--leaf-alpha': near ? '0.92' : '0.6'
        };
    }
    addStartupLeaves() {
        const overlay = this.document.getElementById('startup-overlay');
        if (!overlay || overlay.querySelector('.title-leaf-field')) return;
        const field = this.document.createElement('div');
        field.className = 'title-leaf-field';
        field.setAttribute('aria-hidden', 'true');
        const scale = Math.min(this.window.innerWidth, this.window.innerHeight) < 600 ? 0.67 : 1;   // 휴대폰에서는 잎을 작게
        for (let index = 0; index < 14; index += 1) {
            const leaf = this.document.createElement('span'), sway = this.document.createElement('span'), sprite = this.document.createElement('span');
            leaf.className = 'title-leaf';
            sway.className = 'title-leaf-sway';
            sprite.className = 'title-leaf-sprite';
            Object.entries(this.titleLeafLook(index, scale)).forEach(([name, value]) => leaf.style.setProperty(name, value));
            sway.appendChild(sprite);
            leaf.appendChild(sway);
            field.appendChild(leaf);
        }
        overlay.prepend(field);
        this.fields.push(field);
    }
    /** 로고와 로그인 판을 합친 판의 로고 크기(css/startup.css --startup-logo-size): 120도트 로고를 도트 하나가 1.6px쯤이면서 기기 화소의
     * 정수배가 되게(125% 화면 192px, 100% 화면 240px). */
    sizeStartupLogo() {
        const overlay = this.document.getElementById('startup-overlay');
        if (!overlay) return;
        this.overlay = overlay;
        this.logoSize = overlay.style.getPropertyValue('--startup-logo-size');
        this.logoPriority = overlay.style.getPropertyPriority('--startup-logo-size');
        overlay.style.setProperty('--startup-logo-size', `${120 * this.deviceDot(1.6)}px`);
    }

    initializeGameShell() {
        if (this.installed || this.disposed) return;
        this.installed = true;
        this.hadBodyClass = this.document.body.classList.contains('ui-game-overhaul');
        this.document.body.classList.add('ui-game-overhaul');
        this.addStartupMotes();
        this.addStartupLeaves();
        this.sizeStartupLogo();
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.document.removeEventListener('DOMContentLoaded', this.initializeGameShell);
        this.fields.forEach(field => field.remove());
        this.fields.length = 0;
        if (this.installed && !this.hadBodyClass) this.document.body.classList.remove('ui-game-overhaul');
        if (this.overlay) {
            if (this.logoSize) this.overlay.style.setProperty('--startup-logo-size', this.logoSize, this.logoPriority);
            else this.overlay.style.removeProperty('--startup-logo-size');
        }
        this.overlay = null;
    }
}
export function createGameShell(env) {
    const shell = new GameShell(env);
    return Object.freeze({ start: () => shell.start(), dispose: () => shell.dispose() });
}
