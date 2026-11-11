// Character sheet presentation is only refreshed while its window is rendered.
(function () {
    'use strict';
    function renderDamageSummary(pStats) {
        setTextById('ui-total-dps', formatSettingNumber(pStats.totalDps || ((pStats.dps || 0) + (pStats.summonDps || 0)), 'showCharacterComma'));
        setTextById('ui-dps', formatSettingNumber(pStats.directDps || pStats.dps || 0, 'showCharacterComma'));
        setTextById('ui-summon-dps', formatSettingNumber(pStats.summonDps || 0, 'showCharacterComma'));
    }

    function renderAttack(pStats) {
        let summonCap = getSummonEquipCapFromStats(pStats);
        let summonCapMaximum = typeof getSummonCapMaximum === 'function' ? getSummonCapMaximum() : 8;
        let summonCapRow = document.getElementById('row-summon-cap');
        if (summonCapRow) summonCapRow.style.display = summonCap > 1 || summonCapMaximum > 8 ? '' : 'none';
        setTextById('ui-summon-cap', _t('{n} / 최대 {max}', { n: summonCap, max: summonCapMaximum }));
        setTextById('ui-atk', formatSettingNumber(pStats.baseDmg, 'showCharacterComma'));
        setTextById('ui-aps', pStats.aspd.toFixed(2));
        setTextById('ui-crit', pStats.crit.toFixed(1));
        ['strength', 'dexterity', 'intelligence'].forEach(key => setTextById('ui-' + key, Math.floor(pStats[key] || 0)));
        setTextById('ui-accuracy', formatSettingNumber(Math.floor(pStats.accuracy || 0), 'showCharacterComma'));
        setTextById('ui-crit-dmg', Math.floor(pStats.critDmg));
        setTextById('ui-move-spd', Math.floor(pStats.moveSpeed));
        // 투사체 추가 발사, 주 스킬룬에 더해진 대상(2026-11-12 사용자): 출처는 툴팁(breakdowns.projectileShots, targets)
        setTextById('ui-projectile-shots', `+${Math.floor(pStats.projectileExtraShots || 0)}`);
        setTextById('ui-target-bonus', `+${Math.max(0, (Number(pStats.sSkill && pStats.sSkill.targets) || 1) - (Number(pStats.skillBaseTargets) || 1))}`);
    }

    function renderDefense(pStats) {
        setTextById('ui-dr', formatCappedResistanceValue(pStats.dr, pStats.rawDr));
        setTextById('ui-armor', formatSettingNumber(pStats.armor || 0, 'showCharacterComma'));
        setTextById('ui-evasion', formatSettingNumber(pStats.evasion || 0, 'showCharacterComma'));
        setTextById('ui-es', formatSettingNumber(pStats.energyShield || 0, 'showCharacterComma'));
        setTextById('ui-block-chance', Math.max(0, Number(pStats.blockChance || 0)).toFixed(1));
        setTextById('ui-deflect-chance', Math.max(0, Number(pStats.deflectChance || 0)).toFixed(1));
        setTextById('ui-phys-ignore', Math.floor(pStats.physIgnore || 0));
        setTextById('ui-res-pen', Math.floor(pStats.resPen || 0));
        setTextById('ui-res-fire', formatCappedResistanceValue(pStats.resF, pStats.rawResF));
        setTextById('ui-res-cold', formatCappedResistanceValue(pStats.resC, pStats.rawResC));
        setTextById('ui-res-light', formatCappedResistanceValue(pStats.resL, pStats.rawResL));
        setTextById('ui-res-chaos', formatCappedResistanceValue(pStats.resChaos, pStats.rawResChaos));
    }

    function renderConditions(pStats) {
        let formatInlinePct = (value) => {
            let n = Number(value || 0);
            if (!Number.isFinite(n)) n = 0;
            let rounded = Math.round(n * 10) / 10;
            return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
        };
        const fields = [
            ['ignite-chance', 'igniteChance'], ['chill-chance', 'chillChance'], ['freeze-chance', 'freezeChance'],
            ['shock-chance', 'shockChance'], ['poison-chance', 'poisonChance'], ['bleed-chance', 'bleedChance'],
            ['ail-res-ignite', 'ailmentResistIgniteChance'], ['ail-res-chill', 'ailmentResistChillChance'],
            ['ail-res-freeze', 'ailmentResistFreezeChance'], ['ail-res-shock', 'ailmentResistShockChance'],
            ['ail-res-poison', 'ailmentResistPoisonChance'], ['ail-res-bleed', 'ailmentResistBleedChance']
        ];
        fields.forEach(([id, key]) => setTextById('ui-' + id, formatInlinePct(pStats[key])));
    }

    function renderSecondary(pStats) {
        setTextById('ui-min-dmg-roll', Math.floor(pStats.minDmgRoll || 80));
        setTextById('ui-max-dmg-roll', Math.floor(pStats.maxDmgRoll || 100));
        setTextById('ui-loop-deaths', Math.max(0, Math.floor(game.loopDeaths || 0)));
        setTextById('ui-loop-kills', Math.max(0, Math.floor(game.loopKills || 0)));
        const rows = [['phys-ignore', 'physIgnore'], ['res-pen', 'resPen'], ['regen', 'regen'],
            ['regen-suppress', 'regenSuppress'], ['leech', 'leech'], ['spell-leech', 'spellLeech'], ['ds', 'ds'], ['gemlv', 'gemLv']];
        rows.forEach(([id, key]) => { document.getElementById('row-' + id).style.display = pStats[key] > 0 ? 'grid' : 'none'; });
        const values = [
            ['regen', 'regen', value => formatValue('regen', value)],
            ['regen-suppress', 'regenSuppress', value => formatValue('regenSuppress', value)],
            ['leech', 'leech', value => formatValue('leech', value)],
            ['spell-leech', 'spellLeech', value => formatValue('spellLeech', value)],
            ['ds', 'ds', value => formatSettingNumber(value, 'showCharacterComma')],
            ['gemlv', 'gemLv', value => '+' + value]
        ];
        values.forEach(([id, key, format]) => { if (pStats[key] > 0) setTextById('ui-' + id, format(pStats[key])); });
    }

    function getTalentNotes() {
        const notes = [];
        const heroDef = game.bloomedClassThisLoop === game.ascendClass ? HERO_SELECTION_DEFS[game.bloomedTalentThisLoop] : null;
        if (heroDef) notes.push(_t('{hero} 개화 재능: {talents}', { hero: _t(heroDef.label), talents: heroDef.talentsText }));
        const picked = game.ascendClass && Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
        const twins = (Array.isArray(game.cosmosTwinKeystones) ? game.cosmosTwinKeystones : []).filter(id => !picked.includes(id));
        const names = [...picked.map(id => _t(getAscendKeystoneName(id))), ...twins.map(id => _t('{name}(쌍둥이)', { name: _t(getAscendKeystoneName(id)) }))];
        if (names.length > 0) notes.push(_t('★ 키스톤: {names}', { names: names.join(' / ') }));
        return notes;
    }

    function renderSpecialSummary(pStats) {
        const notes = [], bonus = pStats.glovePairAspdBonus || 0;
        const min = pStats.minDmgRoll || 80, max = pStats.maxDmgRoll || 100;
        if (bonus > 0) notes.push(_t('동형 장갑 세트 보너스 활성화: 기본 공속 +{bonus}', { bonus: bonus.toFixed(2) }));
        notes.push(...getTalentNotes());
        if (min >= max) notes.push(_t('최소 피해 보정({min}%)이 최대 보정 이상이라 최대 피해 보정이 동일 값으로 조정됩니다.', { min: Math.floor(min) }));
        setTextById('ui-unique-special-summary', notes.join(', '));
    }

    function renderCharacterStats(pStats) {
        setTextById('ui-maxhp-stat', formatSettingNumber(pStats.maxHp, 'showCharacterComma'));
        renderDamageSummary(pStats);
        renderAttack(pStats);
        renderDefense(pStats);
        renderConditions(pStats);
        renderSecondary(pStats);
        renderSpecialSummary(pStats);
    }
    safeExposeGlobals({ renderCharacterStats });
}());
