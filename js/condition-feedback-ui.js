// Visible-only feedback. Reads cast-loop results; never evaluates conditions or searches escape paths.
(function () {
    'use strict';
    let nextAt = 0, signature = null, ruleNodes = [], gemNodes = [];
    const reasons = {
        waiting: '다음 전투 판정을 기다리고 있습니다.',
        unmatched: '최근 판정에서 발동 조건을 충족하지 않았습니다.',
        priority: '앞선 규칙이 실행되어 다음 판정을 기다리고 있습니다.',
        missing: '사용할 컨디션 젬을 선택해야 합니다.',
        immobilized: '동결·기절·속박 중에는 회피할 수 없습니다.',
        'no-route': '회피 거리 안에 이동할 안전한 칸이 없습니다.',
        'no-target': '저주를 적용할 수 있는 살아 있는 적이 없습니다.',
        casting: '다른 젬을 시전 중입니다.',
        disabled: '사용이 꺼져 있습니다.',
        locked: '컨디션 젬이 해금되지 않았습니다.',
        equipment: '현재 장비 효과로 컨디션 젬을 사용할 수 없습니다.',
        cast: '조건을 충족하여 발동했습니다.'
    };

    function markup(index) {
        return `<details class="condition-rule-live" data-condition-rule="${index}"><summary aria-label="규칙 상태 확인"><span class="condition-live-dot"></span><span class="condition-live-label">대기</span></summary><div class="condition-live-reason">다음 전투 판정을 기다리고 있습니다.</div></details>`;
    }

    function stateCode(rule, now) {
        if (!rule.enabled) return 'disabled';
        if (!game.conditionGemUnlocked) return 'locked';
        if (!(game.conditionGemPool || []).includes(rule.skillName)) return 'missing';
        if (game.lastCombatStats?.uniqueClosedEyes) return 'equipment';
        if (cooldownRemaining(rule.skillName, now)) return 'cooldown';
        if ((game.playerCastDelayUntil || 0) > now) return 'casting';
        return conditionGemFeedback.status(rule);
    }

    function updateText(node, text) { if (node.textContent !== text) node.textContent = text; }

    function cooldownRemaining(name, now) {
        return Math.max(0, Math.ceil(((game.conditionGemCooldowns?.[name] || 0) - now) / 1000));
    }

    function recentRuleCast(rule, now) {
        const at = conditionGemFeedback.castAt(rule);
        if (at > 0 && at <= now && now - at < 1100) return true;
        const last = game.lastConditionGemCast;
        return Boolean(rule.id && last?.ruleId === rule.id && last.expiresAt > now);
    }

    function refreshRule(node, now) {
        const rule = game.skillAutoRules[Number(node.dataset.conditionRule)];
        if (!rule) return;
        const code = stateCode(rule, now);
        const remaining = cooldownRemaining(rule.skillName, now);
        const recent = recentRuleCast(rule, now);
        const label = recent ? '발동' : code === 'cooldown' ? `${remaining}초` : code === 'disabled' ? '중지' : '대기';
        updateText(node.querySelector('.condition-live-label'), label);
        if (node.dataset.state !== code) node.dataset.state = code;
        node.closest('.condition-pattern-rule').classList.toggle('condition-just-cast', recent);
        const reason = code === 'cooldown' ? `재사용까지 ${remaining}초 남았습니다.` : reasons[code];
        updateText(node.querySelector('.condition-live-reason'), reason);
    }

    function refreshGem(node, now) {
        const name = node.dataset.conditionGem;
        const last = game.lastConditionGemCast;
        const recent = last?.name === name && last.expiresAt > now;
        node.classList.toggle('condition-just-cast', Boolean(recent));
        const remaining = cooldownRemaining(name, now);
        const badge = node.querySelector('.condition-gem-cooldown');
        updateText(badge, remaining ? `${remaining}초` : '');
        if (badge.hidden !== !remaining) badge.hidden = !remaining;
    }

    function refresh() {
        const panel = document.getElementById('skill-tab-condition');
        const visible = !document.hidden && panel?.classList.contains('active') && panel.getClientRects().length > 0;
        conditionGemFeedback.observe(visible ? game : null);
        if (!visible) { signature = null; return; }
        const wall = performance.now();
        if (wall < nextAt) return;
        nextAt = wall + 250;
        const root = document.getElementById('ui-skill-rules-panel');
        if (signature !== root.__lastHtml) {
            signature = root.__lastHtml;
            ruleNodes = Array.from(root.querySelectorAll('[data-condition-rule]'));
            gemNodes = Array.from(root.querySelectorAll('[data-condition-gem]'));
        }
        const now = getCombatTime();
        ruleNodes.forEach(node => refreshRule(node, now));
        gemNodes.forEach(node => refreshGem(node, now));
    }

    safeExposeGlobals({ conditionFeedbackUi: Object.freeze({ markup, refresh }) });
})();
