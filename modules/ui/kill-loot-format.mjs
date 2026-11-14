const beeLabels = { pollen: '꽃가루', venomStinger: '독벌침', enchantedHoney: '마력 깃든 벌꿀', beeswax: '밀랍' };
const beeEvents = {
    queen: env => [env.deps._t('👑 여왕벌 이벤트! 꽃가루 +{pollen}, 벌꿀 +1, 밀랍 +2', { pollen: 25 }), 'loot-unique'],
    sting: env => [env.deps._t('🐝 독침벌 무리 이벤트! 독벌침 +1'), 'loot-rare'],
    bumble: env => [env.deps._t('🐝 호박벌 이벤트! 꽃가루 +15, 밀랍 +1'), 'loot-rare'],
    worker: env => [env.deps._t('🐝 벌 이벤트! 꽃가루 +8'), 'loot-magic']
};
const formats = {
    equipmentLog: (env, { item }) => [env.deps._t("🛡️ <span class='loot-{rarity}'>[{name}]</span> 획득!", { rarity: item.rarity, name: env.deps._t(item.name) }), '', { item }],
    echo: env => [env.deps._t('🌌 각성 잔향 +1'), 'loot-unique'],
    currencyLog: currencyLine,
    beeLoot: (env, note) => [`🐝 ${beeLabels[note.key]} +${note.amount}`, 'loot-normal'],
    beeEvent: (env, note) => beeEvents[note.kind](env),
    hiveKey: env => [env.deps._t('🗝️ 벌집 입장권 열쇠를 발견했습니다.'), 'loot-rare'],
    trace: env => [env.deps._t('🧭 군락지 흔적을 발견했습니다.'), 'loot-magic', { noToast: true }],
    fossil: env => [env.deps._t('🌌 희귀 화석 [심연 화석]을 발견했습니다!'), 'loot-unique']
};

function currencyLine(env, note) {
    const name = typeof env.deps.getStyledOrbName === 'function' ? env.deps.getStyledOrbName(note.key)
        : ((env.deps.ORB_DB[note.key] && env.deps._t(env.deps.ORB_DB[note.key].name)) || note.key);
    return [`🪙 ${name} +${note.amount}`, note.key === 'goldenRule' || note.key === 'sapBud' ? 'loot-unique' : 'loot-magic'];
}

/** Only formats a completed operation; it never grants loot or changes the owner. */
export function lootLogArguments(env, note) {
    const format = formats[note.action];
    return format ? format(env, note) : null;
}

export function lootJewelColor(jewel) {
    return jewel.rarity === 'unique' ? '#dca6ff' : '#78cfff';
}
