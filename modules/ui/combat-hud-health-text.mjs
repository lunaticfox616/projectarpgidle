import { formatSettingNumber, setElementText, setTextById } from './combat-hud-values.mjs';

const compactFormats = new Map();

function compactHp(runtime, value) {
    const locale = runtime.deps.i18n.locale;
    if (!compactFormats.has(locale)) {
        compactFormats.set(locale, new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }));
    }
    return compactFormats.get(locale).format(Math.floor(value));
}

export function paintPlayerHpText(runtime, hp, maxHp) {
    const current = formatSettingNumber(runtime, hp, 'showHpComma');
    const maximum = formatSettingNumber(runtime, maxHp, 'showHpComma');
    const mobile = runtime.deps.document.body.classList.contains('mobile-battle-tab');
    setTextById(runtime, 'ui-hp', mobile ? compactHp(runtime, hp) : current);
    setTextById(runtime, 'ui-maxhp', mobile ? compactHp(runtime, maxHp) : maximum);
    if (mobile) setTextById(runtime, 'player-life-exact', current + ' / ' + maximum);
}

function remainingPercent(hp, maxHp) {
    if (hp >= maxHp) return '100%';
    const percent = Math.floor(100 * (hp / maxHp));
    return hp > 0 && percent < 1 ? '<1%' : percent + '%';
}

function shieldPrefix(runtime, enemy) {
    if (!(enemy.energyShield > 0)) return '';
    return runtime.deps._t('보호막 {energyShield}, ', {
        energyShield: formatSettingNumber(runtime, enemy.energyShield, 'showEnemyHpComma')
    });
}

export function paintEnemyHpText(runtime, label, enemy, zone, tier) {
    if (!label) return;
    // The echo measures damage dealt and conceals its life total in every view.
    const echo = zone?.type === 'woodsmanEcho';
    const hp = Math.max(0, enemy.hp);
    const value = echo ? Math.max(0, (enemy.echoStartHp || enemy.maxHp) - hp) : hp;
    const current = formatSettingNumber(runtime, value, 'showEnemyHpComma');
    const maximum = echo ? '?' : formatSettingNumber(runtime, enemy.maxHp, 'showEnemyHpComma');
    const shield = shieldPrefix(runtime, enemy);
    if (tier === 'boss' && runtime.deps.document.body.classList.contains('mobile-battle-tab')) {
        setTextById(runtime, 'boss-life-exact', shield + current + ' / ' + maximum);
        setElementText(runtime, label, echo ? compactHp(runtime, value) + ' / ?' : remainingPercent(hp, enemy.maxHp));
        return;
    }
    setElementText(runtime, label, shield + current + (echo ? ' / ' : '/') + maximum);
}
