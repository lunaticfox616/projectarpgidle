// Presentation owns the chosen workspace; costs and crafting remain in passives.js.
const jewelCraftUi = (() => {
    let mode = 'orbs';
    let amplified = false;
    const effects = {
        magicBud: '일반을 매직으로 진화 · 매직 옵션 추가',
        sapBud: '희귀로 진화 · 옵션 1개 추가 (최대 4개)',
        formlessDew: '희귀로 진화 또는 희귀 옵션 전체 재설정',
        goldenRule: '옵션 종류를 유지하고 수치 재설정',
        pruningShears: '옵션 1개 무작위 제거'
    };

    function renderOrbs(target) {
        if (!target) return '<h3>옵션 제작</h3><p>장착 · 보관에서 제작대상 주얼을 선택하세요.</p><button type="button" onclick="document.getElementById(\'ui-jewel-library-tab\').click();document.getElementById(\'ui-jewel-library\').scrollIntoView({block:\'start\'})">주얼 선택하기</button>';
        const stats = getJewelStats(target).map(stat => {
            const tier = Number.isFinite(Number(stat.tier)) && !isJewelPetiteStat(stat) ? ` ${getTierBadgeHtml(stat.tier, 'T')}` : '';
            return `${isJewelPetiteStat(stat) ? '쁘띠 ' : ''}${escapeHTML(getStatName(stat.id))} +${formatJewelStatValue(stat.id, stat.val)}${tier}`;
        }).join('<br>');
        const cards = JEWEL_CRAFT_ORB_KEYS.map(key => {
            const state = getJewelCurrencyUseState(key, target);
            const count = game.currencies[key] || 0;
            const reason = !state.enabled ? state.reason : count > 0 ? '1개 소모' : '보유 재화 없음';
            return `<div class="jewel-craft-currency"><button type="button" onclick="useCurrencyOnJewel('${key}')" ${state.enabled && count > 0 ? '' : 'disabled'}>${escapeHTML(ORB_DB[key].name)} (${count})</button><span>${effects[key]}</span><small>${reason}</small></div>`;
        }).join('');
        return `<h3>선택 주얼: ${escapeHTML(target.name || '주얼')}</h3><div class="item-stats">${stats || '옵션 없음'}</div><div class="jewel-craft-currencies">${cards}</div>`;
    }

    function renderFusion() {
        const shards = game.currencies.jewelShard || 0;
        return `<h3>주얼 가공 · 융합</h3><p>일반 융합: 1줄 주얼 2개 + 주얼 결정 6개 → 2줄 주얼</p>
            <label class="jewel-amplified-choice"><input type="checkbox" id="chk-jewel-amplified-fusion" ${amplified ? 'checked' : ''}>증폭합성 사용 · 결정 8 추가 소모<br>랜덤 패널티 + 랜덤 추가옵션</label>
            <div class="jewel-craft-actions"><button onclick="craftJewelFusion()" ${shards < (amplified ? 14 : 6) ? 'disabled' : ''}>선택한 주얼 융합 (${getSelectedJewelFusionIndices().length}/2) · 결정 ${amplified ? 14 : 6}</button><button onclick="drawJewelRefine()" ${shards < 12 || game.jewelInventory.length >= getJewelInventoryLimit() ? 'disabled' : ''}>주얼 가공 · 결정 12</button></div>`;
    }

    function renderSlots(count) {
        const buttons = Array.from({length: count}, (_, index) => {
            const level = game.jewelSlotAmplify[index] || 0;
            return `<button onclick="tryAmplifyJewelSlot(${index})">슬롯${index + 1} 증폭 (${level}/20)<small>결정 ${getJewelAmplifyCost(level)} · 성공 ${Math.floor(getJewelAmplifySuccessChance(level) * 100)}%</small></button>`;
        }).join('');
        return `<h3>슬롯 증폭</h3><p>강화 단계당 주얼 수치 +3% · 최대 20강 · 실패 가능</p><div class="jewel-craft-actions">${buttons}</div>`;
    }

    function renderVoid() {
        const available = (game.currencies.voidChisel || 0) > 0 && getVoidJewelCraftMaterialIndices().length >= 2;
        return `<h3>공허 주얼</h3><p>최대 4줄까지 지원</p><div class="jewel-craft-actions"><button onclick="openVoidJewelCraftOverlay()" ${available ? '' : 'disabled'}>공허 주얼 제작 · 끌 1 + 주얼 2</button><button onclick="openVoidJewelFusionOverlay()">선택 공허융합</button></div>`;
    }

    function render(target, slots) {
        const root = document.getElementById('ui-jewel-core-craft');
        const mobile = uiDisplay.matches('(max-width: 1080px)');
        const selector = document.getElementById('jewel-craft-mode');
        selector.parentElement.hidden = !mobile;
        selector.value = mode;
        const renderers = { orbs: () => renderOrbs(target), fusion: renderFusion, slots: () => renderSlots(slots), void: renderVoid };
        const modes = mobile ? [mode] : ['fusion', 'slots', 'void', 'orbs'];
        const html = `<p class="jewel-craft-balance">주얼 결정 ${game.currencies.jewelShard || 0}</p>` + modes.map(key => `<section class="jewel-craft-section">${renderers[key]()}</section>`).join('');
        if (root.__craftHtml !== html) { root.innerHTML = html; root.__craftHtml = html; }
    }

    function show(next) {
        mode = next;
        updateStaticUI();
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('jewel-craft-mode').addEventListener('change', event => show(event.target.value));
        document.getElementById('ui-jewel-core-craft').addEventListener('change', event => {
            if (event.target.id === 'chk-jewel-amplified-fusion') {
                amplified = event.target.checked;
                updateStaticUI();
            }
        });
    }, {once: true});
    return { render, show };
})();
safeExposeGlobals({ jewelCraftUi });
