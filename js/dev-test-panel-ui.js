/** 로컬 테스트 패널. 127.0.0.1/localhost 에서 주소 끝에 ?dev=1 을 붙여 열 때만 나타난다(배포판·앱에서는 없음).
 * 직업·스킬 젬·캐릭터 스프라이트·이펙트 스타일·소환수 외형·무적·배속·레벨·액트를 바로 바꿔
 * 새 캐릭터와 스킬 이펙트, 스토리 장면을 확인한다. 저장 데이터를 바꾸므로 테스트용 세이브에서 쓴다.
 */
const devTestPanel = (() => {
    const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
    const SPEEDS = [1, 2, 4, 8];
    const SUMMON_STYLES = [['glow', '코어키퍼식'], ['dark', '다크 판타지'], ['simple', '단순 색감'], ['cute', '기본 · 귀여운']];
    let root = null, godTimer = null, speed = 1;

    function isEnabled() {
        if (typeof location === 'undefined' || !LOCAL_HOSTS.has(location.hostname)) return false;
        return new URLSearchParams(location.search).get('dev') === '1';
    }
    function el(tag, props = {}, children = []) {
        const { dataset, ...rest } = props;
        const node = document.createElement(tag);
        Object.assign(node, rest);
        if (dataset) Object.assign(node.dataset, dataset);
        children.forEach(child => node.append(child));
        return node;
    }
    function button(label, onClick, extra = {}) {
        return el('button', { type: 'button', textContent: label, onclick: onClick, ...extra });
    }
    function section(title, rows) { return el('section', {}, [el('h4', { textContent: title }), ...rows]); }
    function row(children) { return el('div', { className: 'dtp-row' }, children); }
    function note(text) { log(text); status(); }
    function log(text) { if (typeof addLog === 'function') addLog(`🧪 ${text}`, 'season-up'); }
    function refresh() { if (typeof updateStaticUI === 'function') updateStaticUI(); }

    // ------------------------------------------------------------------ actions
    function chooseClass(classId) {
        applyHeroSelection(classId, { alignTalent: true });
        if (typeof hanaActors === 'object') hanaActors.preload(classId);
        refresh();
        note(`직업: ${PLAYER_CLASS_DEFS[classId].label}`);
    }
    function equipGem(name) {
        if (!SKILL_DB[name]) return;
        game.skills = Array.isArray(game.skills) ? game.skills : [];
        if (!game.skills.includes(name)) game.skills.push(name);
        changeSkill(name);
        note(`젬 장착: ${name}`);
    }
    function setSetting(key, value, label) {
        game.settings[key] = value;
        note(label);
    }
    function toggleGodMode(on) {
        clearInterval(godTimer);
        godTimer = on ? setInterval(() => {
            if (game.playerHp > 0) game.playerHp = getPlayerHpCap(getUiPlayerStats());
        }, 200) : null;
        note(on ? '무적 켬' : '무적 끔');
    }
    function setSpeed(value) {
        speed = setTestCombatSpeed(value);
        root.querySelectorAll('[data-speed]').forEach(node => node.classList.toggle('on', Number(node.dataset.speed) === speed));
        note(`배속 ×${speed}`);
    }
    function addLevels(count) {
        for (let i = 0; i < count && game.level < MAX_PLAYER_LEVEL; i++) { game.level++; game.passivePoints++; }
        game.exp = 0;
        game.playerHp = getPlayerHpCap(getUiPlayerStats());
        checkUnlocks();
        refresh();
        note(`레벨 ${game.level}`);
    }
    function travelToAct(order) {
        const zoneId = order - 1;
        game.maxZoneId = Math.max(game.maxZoneId || 0, zoneId);
        changeZone(zoneId);
        refresh();
        note(`액트 ${order}(으)로 이동`);
    }

    // ------------------------------------------------------------------ markup
    function gemLabel(name) {
        const id = SKILL_FX_ATLAS[name]?.id;
        return id ? `${String(id).padStart(2, '0')} ${name}` : name;
    }
    function gemGroup(name) {
        const tags = SKILL_DB[name].tags || [];
        if (tags.includes('summon_attack')) return '소환';
        if (SKILL_DB[name].nativeCastId) return '전용 시전(44~53)';
        return tags.includes('spell') ? '주문' : '공격';
    }
    function gemSelect() {
        const select = el('select', { id: 'dtp-gem' });
        const groups = new Map();
        Object.keys(SKILL_DB).filter(name => SKILL_DB[name].isGem).forEach(name => {
            const group = gemGroup(name);
            if (!groups.has(group)) groups.set(group, el('optgroup', { label: group }));
            groups.get(group).append(el('option', { value: name, textContent: gemLabel(name) }));
        });
        groups.forEach(group => select.append(group));
        select.value = SKILL_DB[game.activeSkill]?.isGem ? game.activeSkill : '연속 베기';
        return select;
    }
    function classRow() {
        return row(Object.keys(PLAYER_CLASS_DEFS).map(id => button(PLAYER_CLASS_DEFS[id].label, () => chooseClass(id))));
    }
    function characterSection() {
        return section('캐릭터', [classRow(), row([
            button('Hana 스프라이트', () => setSetting('heroSpriteSet', 'hana', '캐릭터: Hana +6')),
            button('기존 스프라이트', () => setSetting('heroSpriteSet', 'legacy', '캐릭터: 기존'))
        ])]);
    }
    function gemSection() {
        const select = gemSelect();
        const styles = el('select', { id: 'dtp-summon' }, SUMMON_STYLES.map(([value, label]) => el('option', { value, textContent: label })));
        styles.value = game.settings.summonArtStyle || 'glow';
        styles.onchange = () => setSetting('summonArtStyle', styles.value, `소환수 외형: ${styles.selectedOptions[0].textContent}`);
        return section('스킬 이펙트', [
            row([select, button('장착', () => equipGem(select.value))]),
            row([button('리메이크(16도트)', () => setSetting('skillFxStyle', 'remake', '이펙트: 리메이크')),
                button('원본 v3.38', () => setSetting('skillFxStyle', 'original', '이펙트: 원본'))]),
            row([el('label', { textContent: '소환수' }), styles])
        ]);
    }
    function combatSection() {
        const god = el('input', { type: 'checkbox', id: 'dtp-god', onchange: () => toggleGodMode(god.checked) });
        return section('전투', [
            row([el('label', { htmlFor: 'dtp-god' }, [god, ' 무적(생명력 유지)'])]),
            row(SPEEDS.map(value => button(`×${value}`, () => setSpeed(value), { dataset: { speed: String(value) } })))
        ]);
    }
    function progressSection() {
        const acts = el('select', { id: 'dtp-act' }, STORY_ACTS.map(act => el('option', { value: String(act.order), textContent: `액트 ${act.displayAct} · ${act.title}` })));
        return section('진행', [
            row([button('레벨 +1', () => addLevels(1)), button('레벨 +5', () => addLevels(5)), button('레벨 +20', () => addLevels(20))]),
            row([acts, button('이동', () => travelToAct(Number(acts.value)))])
        ]);
    }
    function status() {
        const line = root && root.querySelector('.dtp-status');
        if (!line) return;
        const sprite = game.settings.heroSpriteSet === 'legacy' ? '기존' : 'Hana';
        const fx = game.settings.skillFxStyle === 'original' ? '원본' : '리메이크';
        line.textContent = `${PLAYER_CLASS_DEFS[game.selectedClassId]?.label || '-'} · ${game.activeSkill} · Lv.${game.level} · ${sprite} · 이펙트 ${fx} · ×${speed}`;
    }

    function mount() {
        const panel = el('div', { className: 'dtp-panel', hidden: true }, [
            el('header', {}, [el('strong', { textContent: '🧪 테스트 패널' }), button('닫기', () => { panel.hidden = true; })]),
            el('p', { className: 'dtp-status' }),
            characterSection(), gemSection(), combatSection(), progressSection(),
            el('p', { className: 'dtp-hint', textContent: '로컬 테스트 전용 · 이 세이브에 바로 반영됩니다. 새 게임은 런처 2번(임시 세이브)으로.' })
        ]);
        const toggle = button('🧪 테스트', () => { panel.hidden = !panel.hidden; status(); }, { className: 'dtp-toggle' });
        root = el('div', { id: 'dev-test-panel' }, [el('style', { textContent: STYLE }), toggle, panel]);
        document.body.append(root);
        setSpeed(1);
        status();
    }
    const STYLE = `#dev-test-panel{position:fixed;left:10px;bottom:10px;z-index:30000;font:13px/1.45 'Malgun Gothic',sans-serif;color:#efe6cf}
#dev-test-panel button{background:#231d15;color:#f3dfae;border:1px solid #6b5431;border-radius:6px;padding:4px 8px;cursor:pointer}
#dev-test-panel button:hover,#dev-test-panel button.on{background:#4a3a1f;border-color:#d7b36f}
#dev-test-panel select{background:#15120e;color:#efe6cf;border:1px solid #6b5431;border-radius:6px;padding:3px;max-width:190px}
.dtp-toggle{font-weight:700;box-shadow:0 2px 10px rgba(0,0,0,.5)}
.dtp-panel{position:absolute;left:0;bottom:40px;width:330px;max-height:72vh;overflow:auto;padding:10px 12px;background:rgba(13,11,9,.95);border:1px solid #b58a48;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.6)}
.dtp-panel header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.dtp-panel h4{margin:10px 0 4px;color:#d7b36f;font-size:12px;letter-spacing:.04em}
.dtp-row{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin:4px 0}
.dtp-status{margin:0;color:#b9d7c4;font-size:12px}.dtp-hint{margin:10px 0 0;color:#9c927c;font-size:11px}`;

    function init() { if (isEnabled() && !root) mount(); }
    return Object.freeze({ init, isEnabled, status });
})();
safeExposeGlobals({ devTestPanel });
document.addEventListener('DOMContentLoaded', () => devTestPanel.init(), { once: true });
