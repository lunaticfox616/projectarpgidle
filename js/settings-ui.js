/* Settings controls share one read/write table. Existing save fields remain the
 * source of truth; only the control the player changed may write to them. */
{
    const checks = {
        'chk-ui-sounds': ['uiSounds'],
        'chk-camera-shake': ['cameraShake'],
        'chk-death-notice': ['showDeathNotice'],
        'chk-mobile-battle-pip': ['showMobileBattlePip'],
        'chk-pause-overlay': ['pauseGameOnOverlay'],
        'chk-auto-equip-empty': ['autoEquipEmptySlots'],
        'chk-loop-disable-item-automation': ['disableItemAutomationAfterLoop'],
        'chk-tab-noti': ['tabNotiEnabled'],
        'chk-social-chat-noti': ['socialChatNotifications'],
        'chk-log-combat': ['showCombatLog'],
        'chk-log-damage-detail': ['showDetailedDamageLog'],
        'chk-log-compact': ['combatLogAggregate', 'combatLogRateLimit'],
        'chk-log-spawn': ['showSpawnLog'],
        'chk-log-story': ['showStoryLog'],
        'chk-log-exp': ['showExpLog'],
        'chk-log-loot': ['showLootLog'],
        'chk-number-commas': ['showExpComma', 'showHpComma', 'showEnemyHpComma', 'showCharacterComma'],
        'chk-high-contrast': ['highContrast']
    };
    const selects = {
        'sel-hit-emphasis': 'hitEmphasis',
        'sel-chat-message-size': 'chatMessageSize',
        'sel-damage-number-format': 'damageNumberFormat',
        'sel-map-complete-action': 'mapCompleteAction',
        'sel-town-return-action': 'townReturnAction',
        'sel-loop-map-complete-action': 'postLoopMapCompleteAction'
    };
    const offByDefault = new Set(['showDetailedDamageLog', 'highContrast']);
    const root = document.getElementById('tab-settings');

    function syncCheck(id, keys) {
        const control = document.getElementById(id);
        if (!control) return;
        const values = keys.map(key => offByDefault.has(key) ? game.settings[key] === true : game.settings[key] !== false);
        control.checked = values.every(Boolean);
        control.indeterminate = values.some(Boolean) && !control.checked;
        const hint = document.getElementById(id + '-mixed');
        if (hint) hint.hidden = !control.indeterminate;
    }

    function sync() {
        if (!root) return;
        Object.entries(checks).forEach(([id, keys]) => syncCheck(id, keys));
        Object.entries(selects).forEach(([id, key]) => {
            const control = document.getElementById(id);
            if (control) control.value = game.settings[key];
        });
        document.getElementById('chk-act-journal').checked = game.settings.showActJournal !== false;
        applyChatMessageSize(game.settings.chatMessageSize);
        playUiFeedbackSound.syncSettings();
        renderHeroSelectionControls();
        select(root.dataset.settingsCategory);
    }

    function select(category) {
        if (!root) return;
        const buttons = [...root.querySelectorAll('[data-settings-section]')];
        if (!buttons.some(button => button.dataset.settingsSection === category)) return;
        root.dataset.settingsCategory = category;
        buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.settingsSection === category)));
        root.querySelectorAll('[data-settings-group]').forEach(section => {
            section.hidden = section.dataset.settingsGroup !== category;
        });
        if (category === 'layout') renderTabOrderSettings();
        if (category === 'items') equipmentLootUi.renderSettings();
    }

    function applyEffects(key) {
        if (key === 'uiSounds') playUiFeedbackSound.syncSettings();
        if (key === 'highContrast') applyHighContrast(game.settings.highContrast);
        if (key === 'chatMessageSize') applyChatMessageSize(game.settings.chatMessageSize);
        if (key === 'showDeathNotice') toggleDeathNoticeSetting(game.settings.showDeathNotice);
        if (key === 'mapCompleteAction') syncMapCompleteActionQuickControl();
        if (key === 'socialChatNotifications') {
            if (!game.settings.socialChatNotifications && game.noti) game.noti.social = false;
            syncSocialChatNotificationSetting();
        }
    }

    function writeControl(control) {
        if (control.disabled) return null;
        const keys = checks[control.id];
        if (keys) {
            keys.forEach(key => { game.settings[key] = control.checked; });
            syncCheck(control.id, keys);
            return keys[0];
        }
        const key = selects[control.id];
        if (!key || ![...control.options].some(option => option.value === control.value)) return null;
        game.settings[key] = control.value;
        return key;
    }

    root?.addEventListener('change', event => {
        const key = writeControl(event.target);
        if (!key) return;
        applyEffects(key);
        updateStaticUI();
        queueImportantSave(180);
    });

    // Classic-script bootstrap and the category buttons' inline handlers share
    // this single UI owner. It never runs from the domain/save layer.
    safeExposeGlobals({ settingsUi: { sync, select } });
}
