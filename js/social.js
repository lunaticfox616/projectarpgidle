// ============================================================================
// 소셜 기능: 채팅 + 접속자 목록 + 다른 플레이어 프로필(장비/주얼/부적/스탯)
// ----------------------------------------------------------------------------
// 백엔드는 Supabase(player_profiles / chat_messages). 스키마는 db/social.sql.
// ui.js 이후 로드되며 cloudState / cloudJsonRequest / getPlayerStats / getJewelStats
// / getItemStatToneColor / getTierBadgeHtml 등 전역을 재사용.
// 보안: 사용자/상대가 보낸 모든 문자열은 socialEscape 로 이스케이프한다.
// ============================================================================

const SOCIAL_NICK_KEY = 'arpg_social_nickname';
const SOCIAL_LAST_SEEN_CHAT_KEY = 'arpg_social_last_seen_chat_id';
const SOCIAL_CHAT_LIMIT = 50;
const SOCIAL_CHAT_POLL_MS = 4000;
const SOCIAL_ONLINE_POLL_MS = 30000;
// 새 채팅이 들어올 때 접속 인원을 다시 읽는 가장 짧은 간격(socialOnlineChat.refresh). 채팅이 몰려도 이 간격에 한 번만 읽는다.
const SOCIAL_ONLINE_CHAT_REFRESH_MS = 10000;
const SOCIAL_CHAT_FULL_SYNC_MS = 5 * 60 * 1000;
// 채팅이 실시간으로 오는 동안(syncLiveChat) 채팅 조회와 새 채팅 알림 조회가 도는 간격: 실시간이 놓친 틈을 메우는 안전 조회다.
const SOCIAL_CHAT_LIVE_POLL_MS = 60000;
// 페이지를 가리거나, 채팅이 화면에 없고 새 채팅 알림도 끈 뒤 실시간 연결을 놓기까지: 방치형이라 가린 탭이 오래 열려 있고, 무료 요금제는
// 동시 연결 수와 실시간 메시지 수에 한도가 있다. 그사이 다시 쓰면 그대로 둔다(releaseIdleLiveChat).
const SOCIAL_CHAT_LIVE_HIDDEN_MS = 60000;
// 안전 조회가 실시간으로 오지 않은 남의 채팅을 이만큼 찾으면 이 세션은 예전 주기로 돌아간다. 연결 직후 이 시간 안의 조회는 세지 않는다.
const SOCIAL_CHAT_LIVE_MISSES = 2;
const SOCIAL_CHAT_LIVE_SETTLE_MS = 10000;
// 커뮤니티 탭이 비활성일 때 새 채팅 여부만 가볍게 확인하는 주기(활성 탭 폴링보다 훨씬 느리게).
const SOCIAL_BG_NOTI_POLL_MS = 15000;
// 새 채팅 토스트가 떠 있는 시간과 다음 채팅 토스트까지의 간격: 한 번에 하나만 떠서, 채팅이 몰려도 알림 칸(넷)의 전리품 알림을 밀어내지 않는다.
const SOCIAL_CHAT_TOAST_MS = 3600;
const SOCIAL_CHAT_TOAST_GAP_MS = 4000;
const SOCIAL_MSG_MAX = 300;
const SOCIAL_NICK_MIN = 2;
const SOCIAL_NICK_MAX = 16;
const SOCIAL_SEND_MIN_INTERVAL_MS = 1500;
const SOCIAL_SEND_MAX_PER_MIN = 12;
const SOCIAL_MAX_ITEMS_PER_MSG = 3;
const SOCIAL_PROFILE_SYNC_DELAY_MS = 700;
const SOCIAL_HEARTBEAT_MS = 30000;
const SOCIAL_ONLINE_WINDOW_S = 300;
const SOCIAL_RECENT_WINDOW_S = 1800;
const SOCIAL_CHAT_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;
const SOCIAL_ITEM_TOKEN_RE = /⟦(\d+)⟧/g;
const SOCIAL_NICK_RE = /^[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ_\-]+$/;
const SOCIAL_EQUIP_SLOTS = ['무기', '투구', '목걸이', '장갑1', '갑옷', '방패', '반지1', '허리띠', '반지2', '신발', '장갑2'];
const SOCIAL_BLOCKED_KEY = 'arpg_social_blocked_users';

let socialState = {
    nickname: '',
    nicknameUserId: null,
    identityCheckedUserId: null,
    identityCheckPromise: null,
    chatPollTimer: null,
    onlinePollTimer: null,
    heartbeatTimer: null,
    bgNotificationTimer: null,
    chatLoading: false,
    chatSending: false,
    chatInitialized: false,
    chatMessages: [],
    lastChatFullSyncAt: 0,
    lastChatPollAt: 0,
    lastChatNoticeAt: 0,
    chatChannel: null,
    chatChannelUserId: null,
    chatRealtime: null,
    chatLive: false,
    chatLiveMisses: 0,
    chatLiveSince: 0,
    chatLiveHiddenTimer: null,
    onlineLoading: false,
    lastOnlineLoadAt: 0,
    onlineChatTimer: null,
    lastChatRenderKey: '',
    lastOnlineRenderKey: '',
    profileUploadPromise: null,
    profileUploadUserId: null,
    profileSyncTimer: null,
    profileBootSyncUserId: null,
    /** The last profile write this session: account, nickname and snapshot without its clock (an identical one is not sent again),
     * and the account and nickname whose row it wrote (a chat line needs that row, not a fresh 27 KB profile before every line). */
    profileSentKey: '',
    profileRowFor: '',
    onlineSupported: true,
    pendingChatItems: [],
    sendTimestamps: [],
    lastSentBody: '',
    scrollChatToLatestOnNextRender: true,
    lastNotifiedChatId: null,
    lastChatToastAt: 0,
    // 채팅 칸을 그린 계정(restoreChatDraft): 칸을 다시 그릴 때 쓰던 글은 같은 계정일 때만 되살린다.
    chatDraftUserId: null,
    chatTips: {},
    profileTips: {},
    pickTips: {},
    currentProfile: null,
    currentProfileUserId: null,
    profileTab: 'equipment',
    bgNotiLoading: false
};

// --- 공통 유틸 -------------------------------------------------------------
function socialLoggedInUserId() {
    return (typeof cloudState !== 'undefined' && cloudState && cloudState.user && cloudState.user.id) ? cloudState.user.id : null;
}
function socialCloudReady() {
    return !!socialLoggedInUserId() && typeof cloudJsonRequest === 'function';
}
function socialEscape(text) {
    if (typeof escapeHTML === 'function') return escapeHTML(String(text == null ? '' : text));
    return String(text == null ? '' : text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function socialComma(n) { return (Math.floor(Number(n) || 0)).toLocaleString('en-US'); }
function getSocialNicknameStorageKey(userId) {
    return userId ? `${SOCIAL_NICK_KEY}:${userId}` : '';
}
function syncSocialIdentityUser() {
    let userId = socialLoggedInUserId();
    if (socialState.nicknameUserId === userId) return userId;
    socialState.nickname = '';
    socialState.nicknameUserId = userId || null;
    socialState.identityCheckedUserId = null;
    socialState.identityCheckPromise = null;
    socialState.profileBootSyncUserId = null;
    // 첨부해 둔 아이템은 그 계정의 것이다: 다른 계정이 들어오면 비운다(쓰던 글은 renderSocialTab이 계정을 보고 버린다).
    socialState.pendingChatItems = [];
    try {
        if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') localStorage.removeItem(SOCIAL_NICK_KEY);
    } catch (error) {
        console.warn('이전 소셜 닉네임 캐시 정리 실패:', error);
    }
    return userId;
}
function getMyNickname() {
    let userId = syncSocialIdentityUser();
    if (!userId) return '';
    if (socialState.nickname) return socialState.nickname;
    try {
        let key = getSocialNicknameStorageKey(userId);
        let stored = key && localStorage.getItem(key);
        if (stored) socialState.nickname = stored;
    } catch (error) {
        console.warn('소셜 닉네임 캐시 읽기 실패:', error);
    }
    return socialState.nickname || '';
}
function setMyNicknameLocal(name) {
    let userId = syncSocialIdentityUser();
    socialState.nickname = userId ? (name || '') : '';
    if (!userId) return;
    try {
        let key = getSocialNicknameStorageKey(userId);
        if (socialState.nickname) localStorage.setItem(key, socialState.nickname);
        else if (typeof localStorage.removeItem === 'function') localStorage.removeItem(key);
    } catch (error) {
        console.warn('소셜 닉네임 캐시 저장 실패:', error);
    }
}
function socialClassLabel(ascendClass) {
    if (ascendClass && typeof CLASS_TEMPLATES !== 'undefined' && CLASS_TEMPLATES[ascendClass]) return CLASS_TEMPLATES[ascendClass].name;
    return '미전직';
}
// 색상값이 안전한 hex/rgb 인지 확인(스타일 속성 주입 방지). 아니면 기본색.
function socialSafeColor(c, fallback) {
    fallback = fallback || '#cfe0f5';
    return (typeof c === 'string' && /^(#[0-9a-fA-F]{3,8}|rgba?\([0-9.,\s]+\))$/.test(c)) ? c : fallback;
}
function socialRarityColor(rarity) {
    return socialSafeColor(typeof getRarityColor === 'function' ? getRarityColor(rarity) : null, '#cfe0f5');
}

// ============================================================================
// 스냅샷 빌드(장비/주얼/부적) — 옵션에 티어·롤범위 포함
// ============================================================================
function snapStat(st) {
    let o = { id: st.id || st.stat, val: st.val, statName: st.statName, tier: st.tier,
        valMin: st.valMin, valMax: st.valMax, baseRollMin: st.baseRollMin, baseRollMax: st.baseRollMax };
    return Object.assign(o, snapStatMarks(st));
}
/** 줄 옆 표시(게임 툴팁과 같다): 특출 베이스 ✦, 고정 옵션 [T0], 제작 출처(홀씨, 화석, 이식), 벌꿀 고정. 주얼은 쁘띠와 밀랍. */
function snapStatMarks(st) {
    let marks = {
        exceptional: !!st.exceptional, honey: !!st.lockedByHoney, wax: !!st.waxBonus, petite: !!st.petite && !st.waxBonus, ember: st.emberScale,
        fixed: typeof isFixedEquipmentAffix === 'function' && isFixedEquipmentAffix(st),
        source: typeof equipmentCrafting === 'object' ? equipmentCrafting.getLabel(st) : ''
    };
    return Object.fromEntries(Object.entries(marks).filter(([, value]) => value));
}
/** 추가 옵션 한 줄의 종류(접두, 접미; 2026-10-07)를 프로필 머리말 "접두 2/3, 접미 3/3"에 쓰려고 남긴다. 그 밖의 줄은 남기지 않는다. */
function snapAffixKind(item, st) {
    const kind = typeof equipmentCrafting === 'object' ? equipmentCrafting.storedAffixKind(item, st) : 'special';
    return kind === 'prefix' || kind === 'suffix' ? { kind } : {};
}
/** A weapon's category (대검, 한손검 ...) for its title tag, as item text shows it in the game (js/weapon-categories.js). It reads
 * the item's own slot: a weapon worn in the shield slot (쌍수 훈련) was tagged [방패]. */
function profileItemCategory(item) {
    return item.slot === '무기' && typeof getWeaponCategoryName === 'function' ? getWeaponCategoryName(item) || undefined : undefined;
}
/** The tag before an item's name: a weapon's category, otherwise its slot without the 1, 2, 3 of paired slots. */
function profileItemTag(item) {
    return weaponCategorySlotLabel(item, item.category || String(item.slot || '').replace(/[123]$/, ''));
}
function buildItemSnapshot(item, slotOverride) {
    if (!item) return null;
    let slot = slotOverride || item.slot || '';
    let snap = {
        slot,
        category: profileItemCategory(item),
        name: item.name || '',
        rarity: item.rarity || 'normal',
        baseName: item.baseName || '',
        uniqueEffect: item.uniqueEffect || '',
        // 베이스 수치를 키우는 고유(implicitAmp)의 방어도와 회피(itemTooltipRules.defenseView)가 절반으로 나오지 않게.
        uniqueEffectKey: item.uniqueEffectKey,
        uniqueEffectParams: item.uniqueEffectParams,
        corrupted: !!item.corrupted,
        baseStats: (item.baseStats || []).slice(0, 8).map(snapStat),
        // 고유 융합 유물은 고유 줄과 희귀 줄을 합쳐 12줄까지 된다(8에서 자르면 줄이 빠졌다).
        stats: (item.stats || []).slice(0, 12).map(st => {
            let o = snapStat(st);
            if (Array.isArray(st.extraStats)) o.extraStats = st.extraStats.slice(0, 4).map(snapStat);
            return Object.assign(o, snapAffixKind(item, st));
        })
    };
    if (item.hallReplica) {
        snap.hallReplica = true;
        snap.hallCuratorName = item.hallCuratorName || '';
        snap.hallAppraisalScore = Math.max(0, Math.floor(Number(item.hallAppraisalScore) || 0));
    }
    if (item.hallRelistBlocked) snap.hallRelistBlocked = true;
    // 특수 상태: 봉인(나무꾼의 손길), 고유 융합 유물, 혼돈 주입, 잠식 — 실제 툴팁과 동일하게 노출.
    if (item.loopSealed) snap.loopSealed = true;
    if (item.fusedRelic) {
        snap.fusedRelic = true;
        snap.fusionGrade = item.fusionGrade || '';
        snap.fusedRareName = item.fusedRareName || '';
    }
    if (item.chaosInfusion) snap.chaosInfusion = Object.assign(snapStat(item.chaosInfusion), snapAffixKind(item, item.chaosInfusion));
    if (item.encroached) {
        snap.encroached = {
            liberated: !!item.encroached.liberated,
            chosen: (item.encroached.liberated && item.encroached.chosen) ? snapStat(item.encroached.chosen) : null
        };
    }
    return Object.assign(snap, buildItemMetaSnapshot(item));
}

/** What the game's item tooltip shows above the options (js/ui.js showItemTooltip): base step, item level and grade,
 * requirements and sockets. Read on the owner's device, so a viewer sees the owner's numbers. */
function buildItemMetaSnapshot(item) {
    let chain = typeof getItemBaseChainInfo === 'function' ? getItemBaseChainInfo(item) : null;
    return {
        baseId: item.baseId, // 인형 배치의 장비 그림(profileItemArt)
        wardSlots: typeof colonyWards === 'object' ? colonyWards.beltRoll(item) : undefined, // 허리띠의 액막이 칸 수(profileWardSlotsHtml)
        baseStep: chain && chain.total > 1 ? [chain.step, chain.total] : undefined,
        itemLevel: profileItemLevel(item),
        grade: typeof getItemCraftTier === 'function' ? getItemCraftTier(item) : undefined,
        requirements: buildRequirementSnapshot(item),
        sockets: buildSocketSnapshots(item),
        ember: item.burned ? (item.emberLines || []).slice(0, 2).map(snapStat) : undefined,
        anoint: profileAnointSnapshot(item)
    };
}

/** 아이템 레벨(게임 툴팁과 같은 값): 저장된 레벨이 없으면 등급에서 계산한다. */
function profileItemLevel(item) {
    if (item.itemLevel) return Math.floor(Number(item.itemLevel)) || undefined;
    if (typeof levelProgression !== 'object') return undefined;
    return Math.floor(Number(levelProgression.tierLevel(item.hiddenTier || item.itemTier)) || 0) || undefined;
}

function buildRequirementSnapshot(item) {
    if (typeof levelProgression !== 'object' || typeof levelProgression.requirements !== 'function') return undefined;
    let required = levelProgression.requirements(item);
    return { level: required.level, attributes: required.attributes, exempt: !!item.inheritedLevelExempt };
}

/** Sockets with the jewel in each, as the game's item tooltip lists them once jewels are open. */
function buildSocketSnapshots(item) {
    let unlocked = typeof contentProgression === 'object' && contentProgression.isUnlocked('jewel');
    let rows = unlocked && typeof equipmentSockets === 'object' ? equipmentSockets.list(item) : [];
    if (!rows.length) return undefined;
    return rows.map(row => ({ label: equipmentSockets.label(row), jewel: buildJewelSnapshot(row.jewel) }));
}

/** 우주계 쌍둥이 주얼의 배정 키스톤(게임 툴팁 getCosmosKeystoneTooltipLine과 같은 정보). */
function buildJewelKeystoneSnapshot(jewel) {
    if (!jewel.cosmosKeystoneJewel || !jewel.cosmosKeystone) return undefined;
    let id = jewel.cosmosKeystone;
    let owner = typeof getAscendKeystoneOwnerClass === 'function' ? getAscendKeystoneOwnerClass(id) : null;
    let ascend = owner && typeof CLASS_TEMPLATES !== 'undefined' && CLASS_TEMPLATES[owner] ? CLASS_TEMPLATES[owner].name : '';
    let active = (Array.isArray(game.cosmosTwinKeystones) ? game.cosmosTwinKeystones : []).includes(id);
    return { name: typeof getAscendKeystoneName === 'function' ? getAscendKeystoneName(id) : String(id), ascend, active };
}

function buildJewelSnapshot(jewel) {
    if (!jewel) return null;
    let stats = [];
    try {
        if (typeof getJewelStats === 'function') getJewelStats(jewel).forEach(st => stats.push(snapStat(st)));
    } catch (e) { /* 무시 */ }
    return { kind: 'jewel', name: jewel.name || '주얼', rarity: jewel.rarity || 'normal', stats: stats.slice(0, 8),
        uniqueEffect: getJewelUniqueEffectText(jewel) || undefined, keystone: buildJewelKeystoneSnapshot(jewel) };
}
/** 부적(게임 그루터기 함의 부적 설명과 같은 구성): 줄은 게임과 같은 문장, 고유 효과, 순간 부적의 보스 처형, 판 위 상태. */
function buildTalismanSnapshot(t) {
    if (!t || !Array.isArray(t.lines)) return null;
    let lines = t.lines.map(line => ({ text: talismans.describeLine(line), condition: line.kind === 'condition' }));
    if (t.special === 'moment') lines.push({ text: `보스에게 주는 최종 피해 +${t.moment}%, 생명력 5% 이하 보스 처형`, condition: true });
    return { kind: 'talisman', name: t.name || '부적', rarity: t.rarity || 'magic', uniqueEffect: t.uniqueEffect || undefined, lines, state: talismanStateFor(t) };
}

/** 부적의 지금 상태(게임 부적 설명 stateLine과 같은 갈래): 보관, 잠듦, 척력에 막힘, 척력으로 강화, 깨어남. */
function talismanStateFor(item) {
    if (game.stumpBox.board.indexOf(item.id) < 0) return 'stored';
    if (!stumpBox.isMature(item)) return 'asleep';
    let summary = talismanEffects.summarize();
    if (summary.suppressed.has(item.id)) return 'suppressed';
    return summary.amplified.has(item.id) ? 'amplified' : 'awake';
}

// 프로필 능력치(2026-10-03): 게임의 비교 표(COMPARE_STAT_META, js/utils.js)와 같은 이름과 형식이다. 소환 DPS는 소환수가 있을 때만.
// 아이콘(2026-10-11 사용자: "이모티콘 없애고 게임에서 원래 쓰는 아이콘으로"): 캐릭터 창이 그 능력치에 쓰는 전투 기록 아이콘(log: attack, phys,
// fire, cold, light, chaos, css/layout.css .combat-log-icon)을 쓰고, 캐릭터 창에 아이콘이 없는 능력치는 패시브 트리가 그 능력치에 쓰는
// 아이콘(tree: js/passives.js PASSIVE_ICON_ATLAS_CELL)을 쓴다.
const PROFILE_STAT_KEYS = Object.freeze([
    ['dps', 'log:attack'], ['summonDps', 'log:attack'], ['baseDmg', 'log:attack'], ['aspd', 'tree:precision'], ['crit', 'tree:precision'],
    ['critDmg', 'log:attack'], ['maxHp', 'tree:life'], ['energyShield', 'tree:arcane'], ['armor', 'log:phys'], ['evasion', 'tree:wind'],
    ['deflectChance', 'tree:shield'], ['blockChance', 'tree:shield'], ['dr', 'log:phys'], ['regen', 'tree:life'],
    ['resF', 'log:fire'], ['resC', 'log:cold'], ['resL', 'log:light'], ['resChaos', 'log:chaos']
]);
const PROFILE_STAT_ICONS = new Map(PROFILE_STAT_KEYS);

/** 능력치 줄의 아이콘. 예전 프로필(키 없는 줄)은 자리만 비워 줄을 맞춘다. */
function profileStatIconHtml(key) {
    let [sheet, name] = String(PROFILE_STAT_ICONS.get(key) || '').split(':');
    if (sheet === 'log') return `<span class="combat-log-icon combat-log-icon--${name}" aria-hidden="true"></span>`;
    let cell = sheet === 'tree' && typeof PASSIVE_ICON_ATLAS_CELL === 'object' ? PASSIVE_ICON_ATLAS_CELL[name] : null;
    if (!cell) return '<span class="social-stat-icon is-none" aria-hidden="true"></span>';
    // 그림판 한 칸을 22px로 그리고 가운데 16px만 보인다(칸 가장자리의 빈 여백을 잘라 작은 크기에서도 그림이 보이게).
    return `<span class="social-stat-icon" style="background-position:${-(cell[0] * 22 + 3)}px ${-(cell[1] * 22 + 3)}px;" aria-hidden="true"></span>`;
}
/** 능력치 이름. 2026-10-11 전에 올린 프로필은 이름 앞에 이모티콘이 붙어 있어("⚔️ DPS") 떼고 쓴다. */
function profileStatName(label) {
    return String(label || '').replace(/^[^\p{L}\p{N}]+/u, '');
}
// 능력치 묶음(2026-10-11 고급 테마, 사용자: "더 고급화할 수 있나?"): 공격, 방어, 저항. 저항은 한 줄에 둘씩.
const PROFILE_STAT_GROUPS = Object.freeze([
    ['공격', ['dps', 'summonDps', 'baseDmg', 'aspd', 'crit', 'critDmg']],
    ['방어', ['maxHp', 'energyShield', 'armor', 'evasion', 'deflectChance', 'blockChance', 'dr', 'regen']],
    ['저항', ['resF', 'resC', 'resL', 'resChaos']]
]);
/** 큰 정수에는 자릿수 쉼표(프로필 값은 "1914607"처럼 올라온다). */
function profileStatValue(value) {
    let text = String(value == null ? '' : value);
    return /^-?\d{4,}$/.test(text) ? Number(text).toLocaleString('en-US') : text;
}
function profileStatRowHtml(s) {
    let tone = PROFILE_STAT_TONES[s.key];
    return `<div class="social-stat-item"><span class="social-stat-label">${profileStatIconHtml(s.key)}${socialEscape(profileStatName(s.label))}</span>`
        + `<span class="social-stat-value"${tone ? ` style="color:${tone};"` : ''}>${socialEscape(profileStatValue(s.value))}</span></div>`;
}
/** 능력치 판: 키가 있는 프로필은 공격, 방어, 저항 묶음으로(묶음에 없는 키는 기타), 키가 없는 예전 프로필은 올라온 순서 그대로. */
function profileStatsHtml(stats) {
    let rows = stats.filter(s => s && s.label != null);
    if (!rows.length) return '<div class="social-profile-empty">스탯 정보 없음</div>';
    let grouped = new Set(PROFILE_STAT_GROUPS.flatMap(([, keys]) => keys));
    let groups = PROFILE_STAT_GROUPS.map(([title, keys]) => [title, keys.map(key => rows.find(s => s.key === key)).filter(Boolean)])
        .concat([['기타', rows.filter(s => !grouped.has(s.key))]]).filter(([, list]) => list.length);
    if (groups.length === 1) return `<div class="social-stat-grid">${rows.map(profileStatRowHtml).join('')}</div>`;
    return groups.map(([title, list]) => `<div class="social-stat-group"><h4>${title}</h4>`
        + `<div class="social-stat-grid${title === '저항' ? ' is-pair' : ''}">${list.map(profileStatRowHtml).join('')}</div></div>`).join('');
}
/** 머리 줄 오른쪽의 큰 총 DPS(예전 프로필은 전투력). */
function profilePowerHtml(p) {
    if (!p.power) return '';
    return `<div class="social-profile-power"><span>${p.version >= 8 ? '총 DPS' : '전투력'}</span><b>${socialComma(p.power)}</b></div>`;
}
// 능력치 값의 색(2026-10-11 사용자: "프로필 보기에서 폰트에 색깔이 다 사라졌어"): 장비창 요약(js/equipment-window-ui.js)과 같은 색.
const PROFILE_STAT_TONES = Object.freeze({ dps: '#ffcf6e', summonDps: '#ffcf6e', baseDmg: '#ffcf9f', aspd: '#fff3a8', crit: '#ffd6f2', critDmg: '#ffd6f2',
    maxHp: '#ff6b6b', regen: '#ff9c9c', energyShield: '#7fd3ff', armor: '#d2b98c', dr: '#d2b98c', evasion: '#8fe08f', deflectChance: '#8fe08f',
    blockChance: '#b8c4cc', resF: '#ff8a50', resC: '#6cb8ff', resL: '#ffd54f', resChaos: '#c39bff' });

function buildProfileStats() {
    let s = typeof getPlayerStats === 'function' ? getPlayerStats() : null;
    if (!s) return { stats: [], power: 0 };
    let rows = PROFILE_STAT_KEYS.filter(([key]) => key !== 'summonDps' || Number(s.summonDps) > 0)
        // dps는 직접 DPS다(캐릭터 창과 같은 이름). 머리 띠의 큰 수가 총 DPS라, 'DPS'로 두면 둘이 다른 수로 보였다.
        .map(([key]) => ({ key, label: key === 'dps' ? '직접 DPS' : COMPARE_STAT_META[key].label, value: COMPARE_STAT_META[key].format(Number(s[key]) || 0) }));
    // 총 DPS(직접 + 소환)는 게임의 권장 전투력 비교와 같은 값이다(js/combat-ehp.js getMapPowerReadiness).
    let power = Math.floor(Number(s.totalDps) || (Number(s.dps) || 0) + (Number(s.summonDps) || 0));
    return { stats: rows, power };
}

/** The gems a build fights with: main skill and its supports, the movement skill, summons with their counts. */
function buildSkillSnapshot(state) {
    let gem = name => ({ name, level: Math.max(1, Math.floor(Number(state.gemData?.[name]?.level) || 1)), quality: Math.max(0, Math.floor(Number(state.gemData?.[name]?.quality) || 0)) });
    let support = name => ({ name, level: Math.max(1, Math.floor(Number(state.supportGemData?.[name]?.level) || 1)) });
    let summon = name => ({ ...gem(name), count: Math.max(1, Math.floor(Number(state.summonSkillCounts?.[name]) || 1)) });
    return {
        active: state.activeSkill ? gem(state.activeSkill) : null,
        supports: (state.equippedSupports || []).filter(Boolean).slice(0, 8).map(support),
        mobility: state.mobilitySkill ? gem(state.mobilitySkill) : null,
        summons: (state.equippedSummonSkills || []).filter(Boolean).slice(0, 6).map(summon)
    };
}

/** 직업(6종, 2026-09)과 전직. 전직 전이면 전직 칸은 미전직이다(HUD getUiPlayerHudIdentity와 같다). */
function buildProfileIdentity(state) {
    let classDef = typeof PLAYER_CLASS_DEFS !== 'undefined' ? PLAYER_CLASS_DEFS[state.selectedClassId] : null;
    return { classId: state.selectedClassId || '', heroClassName: classDef ? classDef.label : '', ascendClass: state.ascendClass || '', className: socialClassLabel(state.ascendClass) };
}

/** 장착 구성: 장비(주얼은 소켓 줄에), 코어 칸, 그루터기 함 판(부적은 판 칸에). 예전 프로필의 jewels와 talismans 목록은 그리기만 한다. */
function buildProfileGear(state) {
    let equipment = [];
    let eq = state.equipment || {};
    Object.keys(eq).filter(slot => !bagItems.isSpecial(eq[slot])).forEach(slot => { let snap = buildItemSnapshot(eq[slot], slot); if (snap) equipment.push(snap); });
    return { equipment: equipment.slice(0, 16), core: buildCoreSnapshot(state), stump: buildStumpSnapshot(state) };
}

/** 장비창 왼쪽 위 코어 칸: 코어를 열고 하나를 끼고 있을 때만. 게임 코어 툴팁과 같은 이름과 줄. */
function buildCoreSnapshot(state) {
    let core = (state.equipment || {})['코어'];
    if (!core || typeof coreItems !== 'object' || !contentProgression.isUnlocked('cube', state)) return undefined;
    return { kind: 'core', name: core.name, lines: core.lines.map(line => coreItems.describe(line)) };
}

/** 그루터기 함 판(2026-10-03): 함을 얻고 판에 하나라도 놓았을 때만. 칸마다 열림, 접붙이기 단계, 놓인 것과 그 성장. */
function buildStumpSnapshot(state) {
    let box = state.stumpBox;
    if (!box || !box.acquired || typeof stumpBox !== 'object' || box.board.every(id => id === null)) return undefined;
    let result = stumpBox.evaluate(state);
    return { cells: box.board.map((id, cell) => buildStumpCellSnapshot(state, result, id, cell)) };
}

/** 닫힌 칸은 null. 열린 칸은 접붙이기 단계와 놓인 것(게임 판과 같은 그림 단계와 성장, 카드 내용). */
function buildStumpCellSnapshot(state, result, id, cell) {
    if (!stumpBox.isOpen(state, cell)) return null;
    let rank = stumpBox.graftRank(state.stumpBox, cell);
    let row = rank ? { graft: rank, graftPct: rank * STUMP_BOX_GRAFT.pctPerRank } : {};
    let item = id === null ? null : stumpBox.itemById(state, id);
    if (!item) return row;
    let card = item.family === 'talisman' ? buildTalismanSnapshot(item) : buildStumpItemSnapshot(item, result);
    row.item = Object.assign(card, { stage: stumpBox.stageOf(item), ripe: stumpBox.isMature(item), xp: Math.floor(item.xp), need: stumpBox.need(item) });
    return row;
}

/** 씨앗과 수액(게임 그루터기 함의 아이템 설명과 같은 내용): 이름(색과 단계), 품질, 효과, 추가 줄, 황금, 비활성화와 공명.
 * 불씨의 흉터도 이 카드다(흡수한 줄이 추가 줄 자리에). */
function buildStumpItemSnapshot(item, result) {
    let gain = stumpBox.yieldOf(item), suppressed = result.suppressed.has(item.id);
    let value = result.values[item.id] ?? (gain ? gain.value * stumpBox.qualityOf(item) * stumpBox.goldenMul(item) : 0);
    return { kind: 'stump', family: item.family, color: item.color, name: stumpBox.label(item), quality: Math.round(item.roll * 100),
        yieldText: gain ? gain.text.replace('{v}', String(Math.round(value * 10) / 10)) : '', suppressed,
        resonant: !suppressed && stumpBox.isMature(item) && result.resonant.has(item.color), note: stumpItemNote(item, result),
        extra: stumpBox.extraLinesOf(item, result).map(line => ({ id: line.stat, text: stumpBox.lineText(line.stat, line.value) })),
        golden: stumpBox.goldenMul(item) > 1 };
}

/** 게임 그루터기 함의 상태 줄(js/stump-box-ui.js stumpStatus)과 같은 문장. 비활성화되었거나 공명할 때만. */
function stumpItemNote(item, result) {
    if (result.suppressed.has(item.id)) return `비활성화: ${STUMP_BOX_COLORS[STUMP_BOX_OPPOSITES[item.color]].label} 인접`;
    if (!stumpBox.isMature(item) || !result.resonant.has(item.color)) return '';
    return `공명 +${STUMP_BOX_RESONANCE.bonusPct}%`;
}

function buildProfileSnapshot() {
    let state = typeof game !== 'undefined' && game ? game : {};
    let numbers = { stats: [], power: 0 };
    try { numbers = buildProfileStats(); } catch (e) { console.warn('프로필 스탯 계산 실패:', e); }
    return {
        version: 8,
        nickname: getMyNickname(),
        level: state.level || 1,
        ...buildProfileIdentity(state),
        loop: typeof getSaveLoopNumber === 'function' ? getSaveLoopNumber(state) : 0,
        ...numbers,
        ...buildProfileGear(state),
        skills: buildSkillSnapshot(state),
        updatedAt: Date.now()
    };
}

function getProfileUploadError(error) {
    let message = String(error && error.message || error);
    let translated = error instanceof Error ? error : new Error(message);
    if (/NICK_COOLDOWN/.test(message)) {
        translated = new Error('닉네임은 하루에 한 번만 변경할 수 있습니다.');
        translated.socialCode = 'nickname_cooldown';
    }
    if (/NICK_INVALID/.test(message)) {
        translated = new Error(`닉네임은 ${SOCIAL_NICK_MIN}~${SOCIAL_NICK_MAX}자의 한글, 영문, 숫자, _ - 만 쓸 수 있습니다.`);
        translated.socialCode = 'nickname_invalid';
    }
    if (/NICK_PROFANITY/.test(message)) {
        translated = new Error('닉네임에 비속어를 쓸 수 없습니다.');
        translated.socialCode = 'nickname_invalid';
    }
    if (/PROFILE_TOO_LARGE/.test(message)) translated = new Error('공개 프로필이 너무 커서 서버가 받지 않았습니다.');
    if (translated === error && /duplicate|unique|nickname/i.test(message)) {   // 앞에서 옮긴 문구는 다시 바꾸지 않는다
        translated = new Error('이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.');
        translated.socialCode = 'nickname_conflict';
    }
    return translated;
}
/** 공개 프로필에는 이 계정의 캐릭터로 플레이하는 동안만 그림을 올린다. 부팅 때 읽은 저장은 클라우드 저장을 고르기 전이라 새 브라우저의
 * 레벨 1이거나 이 기기에 남은 다른 계정의 캐릭터일 수 있었고, 그것이 그 계정의 공개 프로필을 덮었다(2026-10-22 점검). */
function profileSnapshotIsOwn() {
    // js/state.js의 값만 읽는다(gameplayStarted, startupOverlayActive, 저장의 클라우드 주인): social.js는 ui.js의 함수를 부르지 않는다
    if (!gameplayStarted || startupOverlayActive) return false;
    let owner = game.saveMeta ? game.saveMeta.cloudUserId : null;
    return !!owner && owner === socialLoggedInUserId();
}
/** 프로필 쓰기 하나: 조용한 갱신(클라우드 저장 뒤, 세션 첫 갱신)은 그림(profile_data)만 고친다(PATCH). 닉네임을 쓰지 않아야 다른 기기에서
 * 바꾼 닉네임을 이 탭의 옛 닉네임으로 되돌리지 않는다. 닉네임은 줄의 nickname 칸이 가지고, 공개 프로필은 그림에 닉네임이 없으면 그 칸을
 * 쓴다(showFetchedProfile). 닉네임 줄이 필요한 쓰기(채팅, 닉네임 변경, 동기화 단추)는 줄 전체(POST, profileRowWrite)다. 보낼 그림이 없는
 * 조용한 갱신은 null. */
function profileWriteFor(options, userId, nickname) {
    // 내 캐릭터가 아니면 채팅과 대전이 찾는 닉네임 줄만 맞춘다(있던 profile_data는 그대로 남는다).
    let snapshot = profileSnapshotIsOwn() ? buildProfileSnapshot() : null;
    if (!options.silent || options.required || options.fromNicknameChange) return profileRowWrite(userId, nickname, snapshot);
    if (!snapshot) return null;
    let data = { ...snapshot, nickname: undefined };
    return { key: `${userId}\n\n${JSON.stringify({ ...data, updatedAt: 0 })}`, row: false,
        path: `/rest/v1/player_profiles?user_id=eq.${encodeURIComponent(userId)}`,
        request: { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { profile_data: data } } };
}
function profileRowWrite(userId, nickname, snapshot) {
    return { key: `${userId}\n${nickname}\n${snapshot ? JSON.stringify({ ...snapshot, updatedAt: 0 }) : ''}`, row: true, path: '/rest/v1/player_profiles',
        request: { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            // last_seen / nickname_updated_at 은 DB 기본값·트리거·하트비트가 관리한다.
            body: snapshot ? { user_id: userId, nickname, profile_data: snapshot } : { user_id: userId, nickname } } };
}
async function performPlayerProfileUpload(options, userId, nickname) {
    try {
        let write = profileWriteFor(options, userId, nickname);
        if (!write) return false;
        if (write.key === socialState.profileSentKey) return true;
        await cloudJsonRequest(write.path, write.request);
        socialState.profileSentKey = write.key;
        if (write.row) socialState.profileRowFor = `${userId}\n${nickname}`;
        return true;
    } catch (error) {
        let translated = getProfileUploadError(error);
        if (options.fromNicknameChange || options.required) throw translated;
        if (!options.silent) console.warn('프로필 업로드 실패:', error);
        return false;
    }
}
async function uploadPlayerProfile(options = {}) {
    if (!socialCloudReady()) {
        if (options.required) throw new Error('클라우드 로그인 상태를 확인할 수 없습니다.');
        return false;
    }
    let userId = syncSocialIdentityUser();
    let nickname = getMyNickname();
    if (!nickname) {
        if (options.required) throw new Error('먼저 닉네임을 설정해주세요.');
        return false;
    }
    let inFlight = socialState.profileUploadPromise;
    if (inFlight && socialState.profileUploadUserId === userId) {
        // 조용한 갱신은 진행 중인 쓰기에 묻어 간다. 닉네임 줄이 필요한 쓰기는 그 쓰기가 끝난 뒤 따로 나간다(조용한 갱신은 닉네임을 쓰지 않는다).
        if (options.silent) return inFlight;
        try { await inFlight; } catch (error) { console.warn('이전 프로필 갱신 실패:', error); }
    }
    let task = performPlayerProfileUpload(options, userId, nickname);
    socialState.profileUploadPromise = task;
    socialState.profileUploadUserId = userId;
    try {
        return await task;
    } finally {
        if (socialState.profileUploadPromise === task) {
            socialState.profileUploadPromise = null;
            socialState.profileUploadUserId = null;
        }
    }
}
async function flushPlayerProfileQuiet() {
    socialState.profileSyncTimer = null;
    if (!socialCloudReady() || !getMyNickname() || !profileSnapshotIsOwn()) return false;
    let inFlight = socialState.profileUploadPromise;
    if (inFlight) {
        try { await inFlight; } catch (error) { console.warn('이전 공개 프로필 갱신 실패:', error); }
    }
    if (!socialCloudReady() || !getMyNickname()) return false;
    return uploadPlayerProfile({ silent: true });
}
function syncPlayerProfileQuiet() {
    if (!socialCloudReady() || !getMyNickname()) return false;
    if (socialState.profileSyncTimer && typeof clearTimeout === 'function') clearTimeout(socialState.profileSyncTimer);
    if (typeof setTimeout !== 'function') {
        Promise.resolve(flushPlayerProfileQuiet()).catch(error => console.warn('공개 프로필 자동 갱신 실패:', error));
        return true;
    }
    socialState.profileSyncTimer = setTimeout(() => {
        Promise.resolve(flushPlayerProfileQuiet()).catch(error => console.warn('공개 프로필 자동 갱신 실패:', error));
    }, SOCIAL_PROFILE_SYNC_DELAY_MS);
    return true;
}
/** 세션의 첫 갱신: 로그인 정리 때와 전장에 들어설 때(js/ui.js enterGameWorld) 부르고, 내 캐릭터로 플레이할 때 한 번만 나간다. */
function syncInitialPlayerProfile() {
    let userId = socialLoggedInUserId();
    if (!userId || !getMyNickname() || socialState.profileBootSyncUserId === userId || !profileSnapshotIsOwn()) return;
    socialState.profileBootSyncUserId = userId;
    syncPlayerProfileQuiet();
}
async function syncPlayerProfile() {
    if (!socialCloudReady()) return showGameToast('먼저 클라우드 로그인이 필요합니다.', 'warning');
    // 닉네임 줄을 쓰기 전에 서버의 닉네임을 다시 읽는다: 다른 기기에서 바꾼 닉네임을 옛 닉네임으로 되돌리지 않는다.
    await restoreNicknameFromServer(true);
    if (!getMyNickname()) await promptAndSetNickname();
    if (!getMyNickname()) return;
    try {
        await uploadPlayerProfile({ required: true });
        showGameToast('공개 프로필을 최신 상태로 갱신했습니다.', 'success');
    } catch (error) {
        if (error && error.socialCode === 'nickname_conflict') setMyNicknameLocal('');
        showGameToast('프로필 갱신 실패: ' + String(error && error.message || error), 'danger');
        renderSocialTab();
    }
}

// ============================================================================
// 닉네임 (하루 1회 변경 + 과거 채팅 닉네임 일괄 갱신)
// ============================================================================
async function updatePastChatNicknames(name) {
    try {
        await cloudJsonRequest(`/rest/v1/chat_messages?user_id=eq.${encodeURIComponent(socialLoggedInUserId())}`, {
            method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { nickname: name }
        });
    } catch (e) { console.warn('과거 채팅 닉네임 갱신 실패:', e); }
}

async function promptAndSetNickname() {
    if (!socialCloudReady()) { showGameToast('채팅/프로필 기능을 쓰려면 먼저 클라우드 로그인이 필요합니다. (설정 탭)', 'warning'); return; }
    let current = getMyNickname();
    let input = await requestGameText({
        title: '닉네임 설정',
        message: `사용할 닉네임을 입력하세요. (${SOCIAL_NICK_MIN}~${SOCIAL_NICK_MAX}자, 한글/영문/숫자/-/_)\n닉네임은 하루에 한 번만 변경할 수 있습니다.`,
        value: current || '',
        maxLength: SOCIAL_NICK_MAX,
        placeholder: '닉네임',
        confirmLabel: '닉네임 적용'
    });
    if (input == null) return;
    let name = String(input).trim();
    if (name === current) return;
    if (name.length < SOCIAL_NICK_MIN || name.length > SOCIAL_NICK_MAX) { showGameToast(`닉네임은 ${SOCIAL_NICK_MIN}~${SOCIAL_NICK_MAX}자여야 합니다.`, 'warning'); return; }
    if (!SOCIAL_NICK_RE.test(name)) { showGameToast('닉네임에는 한글, 영문, 숫자, - , _ 만 사용할 수 있습니다.', 'warning'); return; }

    let prev = getMyNickname();
    setMyNicknameLocal(name);
    try {
        await uploadPlayerProfile({ fromNicknameChange: true });
        await updatePastChatNicknames(name);     // 과거 채팅도 새 닉네임으로
        if (typeof addLog === 'function') addLog(`🪪 닉네임이 ${withDirectionParticle(`"${name}"`)} 설정되었습니다.`, 'season-up');
        socialState.chatInitialized = false;
        socialState.chatMessages = [];
        socialState.lastChatRenderKey = '';
        renderSocialTab();
        refreshChatSettings();
        refreshChatPanel(false);
    } catch (e) {
        setMyNicknameLocal(prev);
        showGameToast(String(e && e.message || e), 'danger');
        renderSocialTab();
    }
}
/** 서버의 닉네임을 읽어 이 탭이 따른다(세션에 한 번, force면 다시). 서버에 그 닉네임의 줄이 있으면 채팅 한 줄은 프로필을 다시 올리지 않고
 * 그 줄로 나간다(profileRowFor). */
async function restoreNicknameFromServer(force = false) {
    if (!socialCloudReady()) return '';
    let userId = syncSocialIdentityUser();
    if (!force && socialState.identityCheckedUserId === userId) return getMyNickname();
    if (socialState.identityCheckPromise) return socialState.identityCheckPromise;
    let task = (async () => {
        try {
            let rows = await cloudJsonRequest(`/rest/v1/player_profiles?user_id=eq.${encodeURIComponent(userId)}&select=nickname`, {});
            let serverNickname = Array.isArray(rows) && rows[0] ? String(rows[0].nickname || '') : '';
            if (socialLoggedInUserId() !== userId) return '';
            if (serverNickname) {
                setMyNicknameLocal(serverNickname);
                socialState.profileRowFor = `${userId}\n${serverNickname}`;
            }
            socialState.identityCheckedUserId = userId;
            return getMyNickname();
        } catch (error) {
            console.warn('서버 닉네임 복원 실패:', error);
            return getMyNickname();
        }
    })();
    socialState.identityCheckPromise = task;
    try {
        return await task;
    } finally {
        if (socialState.identityCheckPromise === task) socialState.identityCheckPromise = null;
    }
}

// ============================================================================
// 접속자(프레즌스)
// ============================================================================
async function sendPresenceHeartbeat() {
    if (!socialCloudReady() || !getMyNickname() || !socialState.onlineSupported) return;
    try {
        await cloudJsonRequest(`/rest/v1/player_profiles?user_id=eq.${encodeURIComponent(socialLoggedInUserId())}`, {
            method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { last_seen: new Date().toISOString() }
        });
    } catch (e) { if (/last_seen/i.test(String(e && e.message || e))) socialState.onlineSupported = false; }
}
function ensureHeartbeat() {
    if (!socialCloudReady() || !getMyNickname()) return;
    if (socialState.heartbeatTimer) return;
    socialState.heartbeatTimer = setInterval(() => { if (socialCloudReady() && getMyNickname() && !isSocialPageHidden()) sendPresenceHeartbeat(); }, SOCIAL_HEARTBEAT_MS);
    sendPresenceHeartbeat();
}
function stopHeartbeat() {
    if (!socialState.heartbeatTimer) return;
    clearInterval(socialState.heartbeatTimer);
    socialState.heartbeatTimer = null;
}
/** 접속자 조회. 목록이 닫혀 있고 배지만 필요하면(countsOnly) 80줄 대신 인원 수만 묻는다(get_online_counts, 2026-10-27: 배지 하나에
 * 30초마다 약 9KB를 받았다). 서버에 그 함수가 없으면 이 세션은 예전처럼 줄을 받는다. */
async function loadOnlineUsers(countsOnly) {
    if (!socialCloudReady() || !socialState.onlineSupported) return [];
    let countsPath = !!countsOnly && socialState.onlineCountsSupported !== false;
    let result;
    try {
        result = await cloudJsonRequest(...onlineUsersQuery(countsPath));
    } catch (e) {
        if (!noteOnlineLoadError(String(e && e.message || e), countsPath)) return [];
        countsPath = false;   // 인원 수 함수가 서버에 없다: 이번부터 줄을 받는다
        try { result = await cloudJsonRequest(...onlineUsersQuery(false)); } catch { return []; }
    }
    return shapeOnlineUsers(result, countsPath);
}
function onlineUsersQuery(countsPath) {
    if (countsPath) return ['/rest/v1/rpc/get_online_counts', { method: 'POST', body: {} }];
    let cutoff = new Date(Date.now() - SOCIAL_RECENT_WINDOW_S * 1000).toISOString();
    return [`/rest/v1/player_profiles?select=user_id,nickname,last_seen&last_seen=gte.${encodeURIComponent(cutoff)}&order=last_seen.desc&limit=80`, {}];
}
function shapeOnlineUsers(result, countsPath) {
    if (countsPath) return { counts: result && typeof result === 'object' ? result : {} };
    return Array.isArray(result) ? result : [];
}
/** 조회 오류를 상태에 남긴다. 인원 수 함수가 서버에 없을 때만 true(줄 조회로 다시 간다). */
function noteOnlineLoadError(text, countsPath) {
    if (/last_seen/i.test(text)) socialState.onlineSupported = false;
    if (!countsPath || !/schema cache|could not find|does not exist/i.test(text)) return false;
    socialState.onlineCountsSupported = false;
    return true;
}
function getSocialPresenceState(lastSeen, now = Date.now()) {
    let seenAt = new Date(lastSeen).getTime();
    if (!Number.isFinite(seenAt)) return '';
    let ageSeconds = Math.max(0, now - seenAt) / 1000;
    if (ageSeconds <= SOCIAL_ONLINE_WINDOW_S) return 'active';
    return ageSeconds <= SOCIAL_RECENT_WINDOW_S ? 'recent' : '';
}
/** 채팅 창 오른쪽 위의 작은 접속 인원(2026-10-11 사용자: "채팅창에 기본적으로 작게 몇명 온라인인지"): 5분 안에 신호가 온 사람 수.
 * 접속자 목록과 같은 조회 결과를 쓴다(30초 주기, 새 채팅이 뜨면 socialOnlineChat.refresh가 한 번 더 읽는다). 아직 모르거나 0명이면 숨긴다. */
function renderChatOnlineCount(active, recent) {
    let badge = document.getElementById('social-chat-online');
    if (!badge) return;
    badge.hidden = !socialState.onlineSupported || active <= 0;
    let text = `접속 ${active}명`;
    if (badge.dataset.text !== text) {
        badge.dataset.text = text;
        badge.innerHTML = `<i class="social-presence-dot active" aria-hidden="true"></i>${text}`;
    }
    badge.title = `지금 접속 ${active}명, 30분 안에 다녀간 사람 ${recent}명`;
}
/** 인원 수만 받았을 때(loadOnlineUsers의 { counts }): 배지만 그린다. */
function renderOnlineCounts(counts) {
    renderChatOnlineCount(Math.max(0, Math.floor(Number(counts.active) || 0)), Math.max(0, Math.floor(Number(counts.recent) || 0)));
}
function renderOnlineUsers(users, now = Date.now()) {
    let visible = (users || []).map(user => ({ user, state: getSocialPresenceState(user.last_seen, now) })).filter(row => row.state);
    renderChatOnlineCount(visible.filter(row => row.state === 'active').length, visible.filter(row => row.state !== 'active').length);
    let host = document.getElementById('social-online');
    if (!host) return;
    if (!socialState.onlineSupported) { host.style.display = 'none'; return; }
    host.style.display = 'block';
    let myId = socialLoggedInUserId();
    let key = visible.length
        ? visible.map(row => `${row.user.user_id}:${row.user.nickname || ''}:${row.state}`).join(',')
        : 'empty';
    if (key === socialState.lastOnlineRenderKey) return;
    socialState.lastOnlineRenderKey = key;
    let activeCount = visible.filter(row => row.state === 'active').length;
    let recentCount = visible.length - activeCount;
    let chips = visible.length
        ? visible.map(row => {
            let u = row.user;
            let me = u.user_id === myId;
            return `<button type="button" class="social-online-chip ${row.state}${me ? ' me' : ''}" onclick="openPlayerProfile('${socialEscape(u.user_id)}')">`
                + `<span class="social-presence-dot ${row.state}" aria-hidden="true"></span>`
                + `<span>${socialEscape(u.nickname || '익명')}</span>${me ? '<em>나</em>' : ''}</button>`;
        }).join('')
        : `<span class="social-online-empty">지금은 조용합니다.</span>`;
    host.innerHTML = `<div class="social-online-title"><span>접속 상태</span><span class="social-presence-summary">`
        + `<span><i class="social-presence-dot active"></i>${activeCount}</span>`
        + `<span><i class="social-presence-dot recent"></i>${recentCount}</span></span></div>`
        + `<div class="social-online-list">${chips}</div>`;
}
async function refreshOnlineUsers() {
    if (!socialState.onlineSupported) return;
    // 인원 수만 묻는 조회가 도는 사이에 설정 창을 열었으면(목록이 필요해졌으면) 그 조회가 끝난 뒤 한 번 더 읽는다.
    if (socialState.onlineLoading) { socialState.onlineRefreshAgain = !!document.getElementById('social-online'); return; }
    socialState.onlineLoading = true;
    socialState.lastOnlineLoadAt = Date.now();
    // 접속자 목록(채팅 설정 창)이 열려 있을 때만 줄을 받고, 그 밖에는 배지의 인원 수만 묻는다.
    let listOpen = !!document.getElementById('social-online');
    try {
        let result = await loadOnlineUsers(!listOpen);
        if (result && result.counts) renderOnlineCounts(result.counts); else renderOnlineUsers(result);
    } catch { /* 무시 */ } finally { socialState.onlineLoading = false; }
    if (socialState.onlineRefreshAgain) { socialState.onlineRefreshAgain = false; socialOnlineChat.refresh(true); }
}
/** 새 채팅이 뜬 순간 접속 인원도 다시 읽는다(2026-10-11 사용자: "내가 채팅 쳤을때 혹은 다른 사람이 새로운 채팅을 쳤을 때 접속자 수 갱신이
 * 필요해"). 남의 채팅은 SOCIAL_ONLINE_CHAT_REFRESH_MS에 한 번만 읽고 그 사이에 온 채팅은 간격 끝에 한 번 읽는다. 내가 보낸 뒤(force)에는
 * 기다리지 않는다(보내기 자체가 1.5초에 한 번, 1분에 12번으로 막혀 있다). 30초 주기 조회는 그대로 돈다. */
const socialOnlineChat = Object.freeze({
    refresh(force) {
        if (socialState.onlineChatTimer && !force) return;
        clearTimeout(socialState.onlineChatTimer);
        let wait = force ? 0 : Math.max(0, socialState.lastOnlineLoadAt + SOCIAL_ONLINE_CHAT_REFRESH_MS - Date.now());
        socialState.onlineChatTimer = setTimeout(() => {
            socialState.onlineChatTimer = null;
            refreshOnlineUsers();
        }, wait);
    }
});

// ============================================================================
// 채팅
// ============================================================================
// --- 새 채팅 알림(커뮤니티 탭 빨간 점) --------------------------------------
// 마지막으로 확인한 채팅 id(bigint 증가형)를 기기별로 기억해, 그보다 큰 id의
// 남이 보낸 메시지가 있으면 game.noti.social 을 켠다. 탭을 열어 채팅이 렌더되면 갱신된다.
function getLastSeenChatId() {
    try {
        let v = localStorage.getItem(SOCIAL_LAST_SEEN_CHAT_KEY);
        if (v == null || v === '') return null;
        let n = Number(v);
        return Number.isFinite(n) ? n : null;
    } catch (e) { return null; }
}
function setLastSeenChatId(id) {
    let n = Number(id);
    if (!Number.isFinite(n)) return;
    let cur = getLastSeenChatId();
    if (cur != null && n <= cur) return;
    try { localStorage.setItem(SOCIAL_LAST_SEEN_CHAT_KEY, String(n)); } catch (e) { /* 무시 */ }
}
/** Chat on screen: the chat tab of a PC message frame (js/message-frames-ui.js), or the phone chat tab. */
function isSocialTabActive() {
    if (typeof messageFrames === 'object' && messageFrames.isActive()) return messageFrames.isTabVisible('chat');
    let tabEl = document.getElementById('tab-social');
    return !!(tabEl && tabEl.classList.contains('active'));
}
function isSocialChatNotificationEnabled() {
    return !(typeof game !== 'undefined' && game && game.settings && game.settings.socialChatNotifications === false);
}
function refreshSocialNotificationDots() {
    if (typeof updateTabNotificationDots === 'function') updateTabNotificationDots();
}
function getSocialChatNotificationPreview(row) {
    let body = String(row && row.body || '').replace(new RegExp(SOCIAL_ITEM_TOKEN_RE.source, 'g'), '[아이템]').replace(/\s+/g, ' ').trim();
    if (!body) body = row && row.payload ? '아이템을 공유했습니다.' : '새 메시지가 도착했습니다.';
    return body.length > 54 ? `${body.slice(0, 54)}…` : body;
}
/** Chats newer than the last one seen on this device while the chat is off screen (rows newest first): the community dot and a toast
 * for the newest from someone else, one toast at a time (showChatToast). The poll below and the live feed (receiveLiveChat) both land here. */
function noteIncomingChats(rows) {
    let latest = rows.reduce((max, row) => Math.max(max, Number(row && row.id) || 0), 0);
    if (!Number.isFinite(latest) || latest <= 0) return;
    // 첫 확인(이 기기에서 채팅을 한 번도 안 봄)에는 과거 메시지로 알림하지 않고 기준점만 잡는다.
    if (getLastSeenChatId() == null) { setLastSeenChatId(latest); return; }
    if (!isSocialChatNotificationEnabled()) {
        setLastSeenChatId(latest);
        game.noti.social = false;
        refreshSocialNotificationDots();
        return;
    }
    let incoming = rows.find(row => row && row.user_id !== socialLoggedInUserId() && !isUserBlocked(row.user_id));
    if (!incoming) {
        setLastSeenChatId(latest);
        return;
    }
    game.noti.social = true;
    refreshSocialNotificationDots();
    let incomingId = Number(incoming.id);
    // 채팅 메시지 id는 로컬 저장소에 남기지 않고 세션 메모리에서만 중복 토스트를 막는다.
    if (socialState.lastNotifiedChatId === incomingId) return;
    socialState.lastNotifiedChatId = incomingId;
    showChatToast(incoming);
}
/** 새 채팅 토스트는 한 번에 하나다: 앞의 것이 떠 있는 동안 온 채팅은 빨간 점만 켠다. 채팅이 몰려도 알림 칸(넷)을 채워 전리품 알림을
 * 밀어내지 않는다. */
function showChatToast(row) {
    let now = Date.now();
    if (typeof showGameToast !== 'function' || now - socialState.lastChatToastAt < SOCIAL_CHAT_TOAST_GAP_MS) return;
    socialState.lastChatToastAt = now;
    showGameToast(`새 채팅, ${String(row.nickname || '플레이어')}: ${getSocialChatNotificationPreview(row)}`, { tone: 'info', duration: SOCIAL_CHAT_TOAST_MS });
}
/** 닫힌 채팅의 새 채팅 확인: 점과 토스트 하나에는 남이 보낸 가장 새 줄 하나면 된다(첨부 그림은 받지 않는다). 이미 알린 채팅 뒤만 묻는다:
 * 확인하지 않은 채팅이 쌓여도 같은 줄을 매번 다시 받지 않는다. 이 기기의 첫 확인은 기준점만 잡는다(noteIncomingChats). */
function socialChatNoticeQuery(seen) {
    let cutoff = encodeURIComponent(new Date(Date.now() - SOCIAL_CHAT_RETENTION_MS).toISOString());
    let base = `/rest/v1/chat_messages?select=id,user_id,nickname,body&created_at=gte.${cutoff}&order=id.desc&limit=1`;
    if (seen == null) return base;
    let after = Math.max(seen, Number(socialState.lastNotifiedChatId) || 0);
    return `${base}&id=gt.${after}&user_id=neq.${encodeURIComponent(socialLoggedInUserId())}`;
}
async function checkSocialChatNotification() {
    if (!socialCloudReady() || socialState.bgNotiLoading) return;
    // 탭을 보고 있으면 활성 폴링이 채팅을 렌더하며 확인 처리하므로 알림이 필요 없다.
    if (isSocialTabActive()) return;
    if (typeof game === 'undefined' || !game || !game.noti) return;
    socialState.bgNotiLoading = true;
    socialState.lastChatNoticeAt = Date.now();
    try {
        let rows = await cloudJsonRequest(socialChatNoticeQuery(getLastSeenChatId()), {});
        rows = Array.isArray(rows) ? rows : [];
        if (rows.length) noteIncomingChats(rows);
    } catch (e) { /* 무시: 네트워크 실패 시 다음 주기에 재시도 */ } finally {
        socialState.bgNotiLoading = false;
    }
}

function syncSocialChatNotificationSetting() {
    if (typeof game !== 'undefined' && game && game.noti && !isSocialChatNotificationEnabled()) {
        game.noti.social = false;
        refreshSocialNotificationDots();
    }
    // 알림을 켜면 실시간 연결을 붙이고, 끄면(채팅이 화면에 없을 때) 잠시 뒤 놓는다.
    syncLiveChat();
    Promise.resolve(checkSocialChatNotification()).catch(error => console.warn('social notification setting sync failed:', error));
}

/** Polls rest while the page is hidden: nobody sees the chat dot or the online list there, and each poll is a server request. */
function isSocialPageHidden() {
    return typeof document !== 'undefined' && document.hidden === true;
}

/** A chat poll is due on its own clock, or once a minute (SOCIAL_CHAT_LIVE_POLL_MS) while chats arrive live. */
function socialChatPollDue(lastAt) {
    return !socialState.chatLive || Date.now() - lastAt >= SOCIAL_CHAT_LIVE_POLL_MS;
}

/** 새 채팅 알림을 끈 동안은 실시간 연결이 없어도 1분에 한 번만 묻는다(점은 켜지 않고 기준점만 옮긴다). */
function pollSocialChatNotification() {
    let due = isSocialChatNotificationEnabled() ? socialChatPollDue(socialState.lastChatNoticeAt)
        : Date.now() - socialState.lastChatNoticeAt >= SOCIAL_CHAT_LIVE_POLL_MS;
    if (!isSocialPageHidden() && due) return checkSocialChatNotification();
}

function ensureSocialNotificationPolling() {
    if (!socialCloudReady() || socialState.bgNotificationTimer) return;
    socialState.bgNotificationTimer = setInterval(pollSocialChatNotification, SOCIAL_BG_NOTI_POLL_MS);
    Promise.resolve(checkSocialChatNotification()).catch(error => console.warn('social notification refresh failed:', error));
}

function stopSocialNotificationPolling() {
    if (!socialState.bgNotificationTimer) return;
    clearInterval(socialState.bgNotificationTimer);
    socialState.bgNotificationTimer = null;
}

function syncSocialBackgroundTasks() {
    syncLiveChat();
    if (!socialCloudReady()) {
        stopHeartbeat();
        stopSocialNotificationPolling();
        stopChatPolling();
        return;
    }
    ensureSocialNotificationPolling();
    if (getMyNickname()) {
        ensureHeartbeat();
        syncInitialPlayerProfile();
    }
    else stopHeartbeat();
    if (socialState.identityCheckedUserId !== socialLoggedInUserId()) {
        Promise.resolve(restoreNicknameFromServer()).then(nickname => {
            if (nickname && socialCloudReady()) {
                ensureHeartbeat();
                syncInitialPlayerProfile();
            }
        }).catch(error => console.warn('소셜 계정 정보 동기화 실패:', error));
    }
}

// --- 실시간 수신(Supabase Realtime) ---------------------------------------
// 2026-10-21 사용자: "채팅을 Supabase Realtime으로 바꿔줘". 새 채팅은 chat_messages 표의 INSERT 알림(postgres_changes)으로 바로 받는다.
// 서버는 db/social.sql이 표를 supabase_realtime 발행에 넣어야 보내고, 읽기가 로그인한 사용자만이라 연결은 게임의 로그인 토큰으로 붙는다.
// 연결된 동안 채팅 조회와 알림 조회는 1분에 한 번만 돌며 빠진 틈과 닉네임 변경(5분 전체 동기화)을 메운다. 그 조회가 실시간으로 오지
// 않은 남의 채팅을 SOCIAL_CHAT_LIVE_MISSES번 찾으면 이 세션은 예전 주기로 돌아간다(발행을 켜지 않은 서버라면 연결은 되어도 알림이
// 오지 않는다). 연결이 끊긴 동안도 예전 주기로 묻고, 다시 붙으면 다음 조회가 바로 돌아 그 사이를 메운다.
function socialAccessToken() {
    return (typeof cloudState !== 'undefined' && cloudState && cloudState.session && cloudState.session.access_token) || '';
}
/** A Supabase client for chat alone, on the address and key of the one js/ui.js made (window.supabaseClient). Its realtime token is the
 * game's own session, read again at every heartbeat (the accessToken option): the shared client would take its auth session's token or
 * fall back to the anon key, and the game signs in and renews tokens with its own requests (js/ui.js applyCloudSession). */
function socialChatRealtime() {
    if (socialState.chatRealtime) return socialState.chatRealtime;
    let base = typeof window !== 'undefined' ? window.supabaseClient : null;
    if (!base || !base.supabaseUrl || !base.supabaseKey || !window.supabase || typeof window.supabase.createClient !== 'function') return null;
    socialState.chatRealtime = window.supabase.createClient(base.supabaseUrl, base.supabaseKey, {
        accessToken: async () => socialAccessToken() || null,
        realtime: { disconnectOnEmptyChannelsAfterMs: 0 }   // 채널을 놓으면 소켓도 바로 닫는다(동시 연결 수)
    });
    return socialState.chatRealtime;
}
/** A chat row the server sent: on screen it joins the list, elsewhere it lights the chat dot as the poll does. */
function receiveLiveChat(row) {
    if (!row || !Number.isFinite(Number(row.id)) || !isSocialChatMessageCurrent(row)) return;
    socialState.chatLiveMisses = 0;
    socialState.chatLive = true;
    if (socialState.chatInitialized) socialState.chatMessages = mergeSocialChatMessages(socialState.chatMessages, [row]);
    showLiveChat(row);
}
/** On screen the row joins the list (someone else's chat also refreshes the online count); elsewhere it lights the chat dot. */
function showLiveChat(row) {
    if (!isSocialTabActive()) {
        if (typeof game !== 'undefined' && game && game.noti) noteIncomingChats([row]);
        return;
    }
    if (socialState.chatInitialized) renderChatMessages(socialState.chatMessages, false);
    if (row.user_id !== socialLoggedInUserId()) socialOnlineChat.refresh(false);
}
function onLiveChatStatus(status) {
    if (status === 'SUBSCRIBED') {
        socialState.chatLive = socialState.chatLiveMisses < SOCIAL_CHAT_LIVE_MISSES;
        socialState.chatLiveSince = Date.now();
        // 연결되기 전과 끊긴 사이에 온 채팅: 채팅 조회와 알림 조회가 다음 차례에 바로 읽어 메운다.
        socialState.lastChatPollAt = 0;
        socialState.lastChatNoticeAt = 0;
        return;
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') socialState.chatLive = false;
}
function openLiveChat() {
    if (socialState.chatChannel || !socialAccessToken()) return;
    let client = socialChatRealtime();
    if (!client) return;
    socialState.chatChannelUserId = socialLoggedInUserId();
    // 남이 보낸 줄이 어떤 모양이든 받기는 멈추지 않는다: 한 줄을 다루다 난 오류는 남기고 다음 줄을 받는다.
    let channel = client.channel('social-chat')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, change => {
            try { receiveLiveChat(change && change.new); } catch (error) { console.warn('실시간 채팅 한 줄을 처리하지 못했습니다:', error); }
        });
    socialState.chatChannel = channel;
    // 토큰을 먼저 건다: 구독 요청이 이 토큰을 싣고 나가야 처음부터 로그인한 사용자로 읽는다(라이브러리는 토큰을 한 박자 늦게 넣는다).
    Promise.resolve(client.realtime.setAuth(socialAccessToken())).then(() => {
        if (socialState.chatChannel === channel) channel.subscribe(status => { if (socialState.chatChannel === channel) onLiveChatStatus(status); });
    }).catch(error => console.warn('채팅 실시간 연결 준비 실패:', error));
}
function closeLiveChat() {
    clearTimeout(socialState.chatLiveHiddenTimer);
    socialState.chatLiveHiddenTimer = null;
    socialState.chatLive = false;
    let channel = socialState.chatChannel, client = socialState.chatRealtime;
    if (!channel) return;
    socialState.chatChannel = null;
    socialState.chatChannelUserId = null;
    if (client) {
        Promise.resolve(client.removeChannel(channel)).catch(error => console.warn('채팅 실시간 연결 해제 실패:', error));
    }
}
/** Connected while a signed-in player has the page in view and uses the live rows (wantsLiveChat); another account gets its own
 * connection. A hidden page, or chat off screen with 새 채팅 알림 off, lets it go after SOCIAL_CHAT_LIVE_HIDDEN_MS (back in use sooner
 * keeps it), and coming back joins and fills the gap. */
function syncLiveChat() {
    if (!socialCloudReady() || (socialState.chatChannel && socialState.chatChannelUserId !== socialLoggedInUserId())) closeLiveChat();
    if (!socialCloudReady()) return;
    if (isSocialPageHidden() || !wantsLiveChat()) {
        if (socialState.chatChannel && !socialState.chatLiveHiddenTimer) socialState.chatLiveHiddenTimer = setTimeout(releaseIdleLiveChat, SOCIAL_CHAT_LIVE_HIDDEN_MS);
        return;
    }
    clearTimeout(socialState.chatLiveHiddenTimer);
    socialState.chatLiveHiddenTimer = null;
    openLiveChat();
}
/** 실시간 줄을 쓰는 동안: 채팅이 화면에 있거나, 새 채팅 알림을 켰을 때(빨간 점과 토스트). */
function wantsLiveChat() {
    return isSocialTabActive() || isSocialChatNotificationEnabled();
}
/** 기다리는 사이 다시 쓰게 되었으면(보이는 페이지에서 화면의 채팅이나 켠 알림) 놓지 않는다. */
function releaseIdleLiveChat() {
    socialState.chatLiveHiddenTimer = null;
    if (isSocialPageHidden() || !wantsLiveChat()) closeLiveChat();
}
/** New rows of a chat poll that is not the first look: someone else's chat among them, past the first seconds after joining and not
 * already in the list (it may have come live while the poll was on its way), is one the connection never brought (see above). */
function noteLiveChatGap(rows, fullSync, wasReady) {
    if (fullSync || !wasReady || !socialState.chatLive || Date.now() - socialState.chatLiveSince < SOCIAL_CHAT_LIVE_SETTLE_MS) return;
    let listed = new Set(socialState.chatMessages.map(row => String(row.id)));
    if (!rows.some(row => row.user_id !== socialLoggedInUserId() && !listed.has(String(row.id)))) return;
    if (++socialState.chatLiveMisses < SOCIAL_CHAT_LIVE_MISSES) return;
    socialState.chatLive = false;
    console.warn('채팅 실시간 수신이 새 채팅을 놓쳐 이 세션은 예전 조회 주기로 돌아갑니다(db/social.sql의 supabase_realtime 발행 확인).');
}

async function loadChatMessages(afterId = null, now = Date.now()) {
    if (!socialCloudReady()) return [];
    let cutoff = new Date(now - SOCIAL_CHAT_RETENTION_MS).toISOString();
    let incremental = afterId != null && Number.isFinite(Number(afterId));
    let cursor = incremental ? `&id=gt.${encodeURIComponent(String(afterId))}` : '';
    let order = incremental ? 'id.asc' : 'created_at.desc';
    let rows = await cloudJsonRequest(`/rest/v1/chat_messages?select=id,user_id,nickname,body,payload,created_at&created_at=gte.${encodeURIComponent(cutoff)}${cursor}&order=${order}&limit=${SOCIAL_CHAT_LIMIT}`, {});
    let current = Array.isArray(rows) ? rows.filter(row => isSocialChatMessageCurrent(row, now)) : [];
    return incremental ? current : current.reverse();
}
function isSocialChatMessageCurrent(row, now = Date.now()) {
    let createdAt = new Date(row && row.created_at).getTime();
    return Number.isFinite(createdAt) && createdAt > now - SOCIAL_CHAT_RETENTION_MS;
}
function mergeSocialChatMessages(current, incoming, now = Date.now()) {
    let byId = new Map();
    (current || []).concat(incoming || []).forEach(row => {
        if (row && Number.isFinite(Number(row.id)) && isSocialChatMessageCurrent(row, now)) byId.set(String(row.id), row);
    });
    return Array.from(byId.values()).sort((a, b) => Number(a.id) - Number(b.id)).slice(-SOCIAL_CHAT_LIMIT);
}
function checkSendRateLimit() {
    let now = Date.now();
    socialState.sendTimestamps = socialState.sendTimestamps.filter(t => now - t < 60000);
    let last = socialState.sendTimestamps[socialState.sendTimestamps.length - 1] || 0;
    if (now - last < SOCIAL_SEND_MIN_INTERVAL_MS) return '메시지를 너무 빠르게 보냈습니다. 잠시 후 다시 시도해주세요.';
    if (socialState.sendTimestamps.length >= SOCIAL_SEND_MAX_PER_MIN) return `1분에 최대 ${SOCIAL_SEND_MAX_PER_MIN}개까지 보낼 수 있습니다. 잠시 후 다시 시도해주세요.`;
    return true;
}
// 차단(2026-10-27): 이 기기에서만 그 사람의 채팅을 숨긴다(기기마다 따로, 서버에는 남기지 않는다). 신고는 서버(report_player_chat)로 간다.
/** 차단 목록: [{ id, name }]. 예전 저장(id 문자열 배열)도 읽는다. 이름은 채팅 설정 창의 풀기 줄에 쓴다(숨긴 사람의 채팅은 눌러 열 수 없으니). */
function getBlockedUsers() {
    try {
        let list = JSON.parse(localStorage.getItem(SOCIAL_BLOCKED_KEY) || '[]');
        return Array.isArray(list) ? list.map(entry => entry && typeof entry === 'object' ? { id: String(entry.id || ''), name: String(entry.name || '') } : { id: String(entry || ''), name: '' }).filter(entry => entry.id && entry.id !== 'null') : [];
    } catch { return []; }
}
function getBlockedUserIds() { return getBlockedUsers().map(entry => entry.id); }
function isUserBlocked(userId) { return !!userId && getBlockedUserIds().includes(String(userId)); }
function setUserBlocked(userId, blocked, name) {
    let list = getBlockedUsers().filter(entry => entry.id !== String(userId));
    if (blocked) list.push({ id: String(userId), name: String(name || '').slice(0, 16) });
    try { localStorage.setItem(SOCIAL_BLOCKED_KEY, JSON.stringify(list.slice(-200))); } catch { /* 무시 */ }
}
/** 채팅 설정 창의 풀기 단추(renderBlockedUsersRow). */
function unblockUser(userId) {
    setUserBlocked(userId, false);
    socialState.lastChatRenderKey = '';
    renderChatMessages(socialState.chatMessages || [], false);
    refreshChatSettings();
    showGameToast('차단을 풀었습니다.', 'info');
}
/** 서버가 채팅을 거절한 까닭(db/social.sql chat_messages_rate_limit의 오류 코드)을 플레이어 문구로. 첫 줄부터 맞는 것 하나. */
const SOCIAL_CHAT_ERROR_TEXTS = [
    [/SPAM_TOO_FAST/, '메시지를 너무 빠르게 보냈습니다.'],
    [/SPAM_RATE_LIMIT/, '너무 많이 보냈습니다. 잠시 후 다시 시도해주세요.'],
    [/SPAM_DUPLICATE/, '같은 메시지를 연속으로 보낼 수 없습니다.'],
    [/SPAM_REPEAT/, '같은 메시지를 5분 안에 세 번 보낼 수 없습니다.'],
    [/SPAM_FLOOD/, '같은 글자를 너무 많이 반복했습니다.'],
    [/CHAT_ACCOUNT_HELD/, '운영 검토 중인 계정이라 채팅을 보낼 수 없습니다.'],   // 관리자 보류(db/anti-cheat.sql 5절)
    [/CHAT_MUTED/, msg => msg.replace(/^[\s\S]*?CHAT_MUTED:\s*/, '')],   // 서버 문구에 남은 시간이 있다: "채팅이 금지된 상태입니다. N분 뒤 풀립니다."
    [/CHAT_PROFANITY/, '비속어가 들어 있어 보낼 수 없습니다.'],
    [/CHAT_LINK/, '링크는 보낼 수 없습니다.'],
    [/CHAT_PAYLOAD_INVALID/, `아이템 링크는 메시지마다 ${SOCIAL_MAX_ITEMS_PER_MSG}개까지입니다.`],
    [/CHAT_NICKNAME_MISMATCH|CHAT_UPDATE_FORBIDDEN/, '채팅 닉네임은 프로필 닉네임과 같아야 합니다.'],
    [/char_length|_body_check|violates check/, `메시지는 1~${SOCIAL_MSG_MAX}자여야 합니다.`],
    [/row-level security/i, '닉네임 확인에 실패했습니다. 잠시 후 다시 보내 주세요.']
];
function translateSpamError(msg) {
    let hit = SOCIAL_CHAT_ERROR_TEXTS.find(([pattern]) => pattern.test(msg));
    if (!hit) return msg;
    return typeof hit[1] === 'function' ? hit[1](msg) : hit[1];
}
async function prepareChatSender(senderId) {
    await restoreNicknameFromServer();
    if (socialLoggedInUserId() !== senderId) throw new Error('전송 중 계정이 변경되었습니다.');
    if (!getMyNickname()) await promptAndSetNickname();
    if (socialLoggedInUserId() !== senderId) throw new Error('전송 중 계정이 변경되었습니다.');
    if (!getMyNickname()) return false;
    // 이 세션에 닉네임 줄을 아직 맞추지 않았으면 서버의 닉네임부터 다시 읽는다: 줄이 있으면 그 닉네임을 따르고(다른 기기에서 바꾼
    // 닉네임을 되돌리지 않는다), 줄이 없을 때만 새로 쓴다.
    if (!chatRowReady(senderId)) await restoreNicknameFromServer(true);
    if (!chatRowReady(senderId)) await uploadPlayerProfile({ required: true });
    if (socialLoggedInUserId() !== senderId) throw new Error('전송 중 계정이 변경되었습니다.');
    return true;
}
/** 이 계정과 지금 닉네임의 프로필 줄이 서버에 있다고 안다: 채팅 한 줄이 그 줄의 닉네임 검사를 지난다. */
function chatRowReady(userId) {
    return socialState.profileRowFor === `${userId}\n${getMyNickname()}`;
}
/** 닉네임이 서버와 어긋나 막힌 오류: 하루 한 번 제한, 이미 쓰는 닉네임(프로필 줄), 채팅 줄의 닉네임 검사(행 보안 정책). */
function isStaleNicknameError(error) {
    let code = error && error.socialCode;
    return code === 'nickname_cooldown' || code === 'nickname_conflict' || /row-level security/i.test(String(error && error.message || error));
}
/** 서버의 닉네임을 다시 읽어 따른다. 다른 기기에서 바꾼 닉네임이었으면 true(그 닉네임으로 다시 보낸다). */
async function adoptServerNickname(userId) {
    let before = getMyNickname();
    let after = await restoreNicknameFromServer(true);
    if (socialLoggedInUserId() !== userId || !after || after === before) return false;
    refreshChatSettings();
    return true;
}
/** 채팅 한 줄 보내기(sendOnce)가 닉네임 때문에 막히면(isStaleNicknameError) 서버의 닉네임을 따른 뒤 한 번 더 보낸다. 옛 닉네임을 다시
 * 써서 다른 기기의 변경과 다투지 않는다. */
async function withStaleNicknameRetry(userId, sendOnce) {
    try {
        return await sendOnce();
    } catch (error) {
        if (!isStaleNicknameError(error) || !await adoptServerNickname(userId)) throw error;
        return sendOnce();
    }
}

function clearSubmittedChatDraft(inputEl, draft, items) {
    // 보내는 사이 칸을 다시 그렸으면(renderSocialTab이 쓰던 글을 새 칸에 옮긴다) 지금 칸을 비운다.
    let input = document.getElementById('social-chat-input') || inputEl;
    if (input.value !== draft || socialState.pendingChatItems.length !== items.length) return;
    if (!items.every((item, index) => socialState.pendingChatItems[index] === item)) return;
    input.value = '';
    socialState.pendingChatItems = [];
    renderPendingChatItems();
    updateChatCounter();
}

function reportChatSendFailure(error, senderId) {
    if (error?.socialCode === 'nickname_conflict' && socialLoggedInUserId() === senderId) setMyNicknameLocal('');
    showGameToast('메시지 전송 실패: ' + translateSpamError(String(error && error.message || error)), 'danger');
}

function updateChatSendButton() {
    const button = document.getElementById('social-chat-send');
    if (!button) return;
    button.disabled = socialState.chatSending || !socialCloudReady() || !getMyNickname();
    button.textContent = socialState.chatSending ? '전송 중' : '전송';
    button.setAttribute('aria-busy', String(socialState.chatSending));
}

async function sendChatMessage() {
    if (!socialCloudReady()) { showGameToast('먼저 클라우드 로그인이 필요합니다.', 'warning'); return; }
    if (socialState.chatSending) return;
    let inputEl = document.getElementById('social-chat-input');
    if (!inputEl) return;
    let draft = inputEl.value;
    let pending = socialState.pendingChatItems.slice(0, SOCIAL_MAX_ITEMS_PER_MSG);
    let { body, items } = toChatBody(draft.trim(), pending);
    if (!body && !items.length) return;
    if (body.length > SOCIAL_MSG_MAX) { showGameToast(`메시지는 최대 ${SOCIAL_MSG_MAX}자까지 입력할 수 있습니다.`, 'warning'); return; }
    if (body && body === socialState.lastSentBody && !items.length) { showGameToast('같은 메시지를 연속으로 보낼 수 없습니다.', 'warning'); return; }
    let rate = checkSendRateLimit();
    if (rate !== true) { showGameToast(rate, 'warning'); return; }

    let payload = items.length ? { items } : null;
    let senderId = socialLoggedInUserId();
    socialState.chatSending = true;
    try {
        updateChatSendButton();
        let sent = await withStaleNicknameRetry(senderId, async () => {
            if (!await prepareChatSender(senderId)) return false;
            // 접속 신호를 채팅과 함께 보낸다: 창을 오래 가려 뒀다가 돌아와 바로 쳐도 접속 인원에 내가 들어간다.
            await Promise.all([cloudJsonRequest('/rest/v1/chat_messages', {
                method: 'POST', headers: { Prefer: 'return=minimal' },
                body: { user_id: senderId, nickname: getMyNickname(), body: body || '🔗', payload }
            }), sendPresenceHeartbeat()]);
            return true;
        });
        if (!sent || socialLoggedInUserId() !== senderId) return;
        clearSubmittedChatDraft(inputEl, draft, pending);
        socialState.sendTimestamps.push(Date.now());
        socialState.lastSentBody = body;
        await refreshChatPanel(true);
        socialOnlineChat.refresh(true);
    } catch (e) {
        reportChatSendFailure(e, senderId);
    } finally {
        socialState.chatSending = false;
        updateChatSendButton();
    }
}

// --- 아이템 링크 첨부 ------------------------------------------------------
function getChatAttachSnapshot(source, key) {
    let state = typeof game !== 'undefined' && game ? game : {};
    if (source === 'equip') return buildItemSnapshot((state.equipment || {})[key], key);
    if (source === 'inv') return buildItemSnapshot((state.inventory || [])[Number(key)]);
    if (source === 'jewel') return buildJewelSnapshot(bagItems.jewels(state)[Number(key)]);
    if (source === 'talisman') return buildTalismanSnapshot(state.stumpBox ? stumpBox.itemById(state, Number(key)) : null);
    return null;
}
/** 입력 칸에서 첨부 아이템이 보이는 글: [이름](2026-10-22 사용자 "창과 채팅에 나오는 표기 개선": 예전에는 ⟦0⟧이 보였다). */
function chatItemLabel(snap) {
    return `[${String(snap && snap.name || '아이템')}]`;
}
/** 입력 칸의 글을 보낼 글과 아이템으로 바꾼다: 첨부한 차례대로 그 [이름]을 ⟦번호⟧로 바꾸고(채팅 줄의 형식은 그대로다, renderChatBody),
 * 글에서 지운 첨부는 뺀다. */
function toChatBody(text, pending) {
    let body = String(text || ''), items = [];
    pending.forEach(snap => {
        let label = chatItemLabel(snap), at = body.indexOf(label);
        if (at < 0) return;
        body = body.slice(0, at) + `⟦${items.length}⟧` + body.slice(at + label.length);
        items.push(snap);
    });
    return { body, items };
}
/** 글을 쓰던 자리에 [이름]을 넣는다(칸을 누른 적이 없으면 끝에). */
function insertChatItemLabel(inputEl, label) {
    let value = String(inputEl.value || ''), start = inputEl.selectionStart ?? value.length, end = inputEl.selectionEnd ?? start;
    let before = value.slice(0, start), gap = before && !/\s$/.test(before) ? ' ' : '';
    inputEl.value = `${before}${gap}${label} ${value.slice(end)}`;
    let caret = before.length + gap.length + label.length + 1;
    inputEl.focus();
    inputEl.setSelectionRange(caret, caret);
}
/** Puts one item card in the message being written; false when the message already holds the most it can. */
function attachChatSnapshot(snap) {
    if (socialState.pendingChatItems.length >= SOCIAL_MAX_ITEMS_PER_MSG) { showGameToast(`메시지당 최대 ${SOCIAL_MAX_ITEMS_PER_MSG}개의 아이템만 첨부할 수 있습니다.`, 'warning'); return false; }
    socialState.pendingChatItems.push(snap);
    let inputEl = document.getElementById('social-chat-input');
    if (inputEl) insertChatItemLabel(inputEl, chatItemLabel(snap));
    renderPendingChatItems();
    updateChatCounter();
    return true;
}
function attachChatItem(source, idx) {
    let snap = getChatAttachSnapshot(source, idx);
    if (snap) attachChatSnapshot(snap);
}
/** 들고 있던 장비를 채팅 입력 줄에 놓았다(js/equipment-inventory-grid-ui.js, 2026-10-22 사용자 "아이템을 직접 채팅창에 끌어다가 놓아도
 * 가능하게"). 주얼은 주얼 카드로 붙는다. 코어와 액막이는 채팅 카드가 아직 그리지 못해 붙이지 않는다. */
function attachChatItemOf(item, slot) {
    if (!getMyNickname()) return showGameToast('닉네임을 정하면 아이템을 채팅에 붙일 수 있습니다.', 'warning');
    let snap = !item ? null : bagItems.isJewel(item) ? buildJewelSnapshot(item) : bagItems.isSpecial(item) ? null : buildItemSnapshot(item, slot);
    if (!snap) return showGameToast('이 아이템은 채팅에 붙일 수 없습니다.', 'warning');
    attachChatSnapshot(snap);
}
function removePendingChatItem(idx) {
    let [snap] = socialState.pendingChatItems.splice(idx, 1);
    let inputEl = document.getElementById('social-chat-input');
    if (inputEl && snap) inputEl.value = String(inputEl.value || '').replace(chatItemLabel(snap), '').replace(/ {2,}/g, ' ').trim();
    renderPendingChatItems();
    updateChatCounter();
}
function renderPendingChatItems() {
    let host = document.getElementById('social-pending-items');
    if (!host) return;
    if (!socialState.pendingChatItems.length) { host.innerHTML = ''; host.style.display = 'none'; return; }
    host.style.display = 'flex';
    host.innerHTML = socialState.pendingChatItems.map((it, i) => {
        let color = socialRarityColor(it.rarity);
        return `<span class="social-pending-chip" style="border-color:${color};color:${color};">${socialEscape(chatItemLabel(it))}<button onclick="removePendingChatItem(${i})" title="첨부 취소">✕</button></span>`;
    }).join('');
}
function updateChatCounter() {
    let inputEl = document.getElementById('social-chat-input');
    let counterEl = document.getElementById('social-chat-counter');
    if (!inputEl || !counterEl) return;
    let len = toChatBody(inputEl.value, socialState.pendingChatItems).body.length; // 보낼 글의 길이([이름]은 ⟦번호⟧로 줄어든다)
    counterEl.textContent = `${len}/${SOCIAL_MSG_MAX}`;
    counterEl.style.color = len > SOCIAL_MSG_MAX ? '#e88' : 'var(--copy-muted)';
}

function renderChatBody(m) {
    let body = String(m.body || '');
    let items = (m.payload && Array.isArray(m.payload.items)) ? m.payload.items.slice(0, SOCIAL_MAX_ITEMS_PER_MSG) : [];
    if (!items.length || body.indexOf('⟦') === -1) return socialEscape(body);
    let out = '', lastIndex = 0;
    let re = new RegExp(SOCIAL_ITEM_TOKEN_RE.source, 'g');
    let match;
    while ((match = re.exec(body)) !== null) {
        out += socialEscape(body.slice(lastIndex, match.index));
        let n = parseInt(match[1], 10);
        let snap = items[n];
        out += snap ? renderChatItemLink(`${m.id}:${n}`, snap) : socialEscape(match[0]);
        lastIndex = match.index + match[0].length;
    }
    out += socialEscape(body.slice(lastIndex));
    return out;
}
/** 채팅 속 아이템 링크 하나. 남이 보낸 그림은 모양을 믿을 수 없다: 카드를 그리다 오류가 나면 목록을 멈추지 않고 이름만 단 칩을 그린다. */
function renderChatItemLink(key, snap) {
    let name = socialEscape(snap && snap.name), card = '', color = '';
    try {
        card = renderProfileItemCard(snap);
        color = socialRarityColor(snap.rarity);
    } catch (error) {
        console.warn('채팅 아이템 카드를 그리지 못했습니다:', error);
    }
    if (!card) return `<span class="social-item-link">[${name}]</span>`;
    socialState.chatTips[key] = card;
    return `<span class="social-item-link" style="border-color:${color};color:${color};" onmouseenter="showSocialTip(event,'chat','${socialEscape(key)}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()" onclick="openTipModal('chat','${socialEscape(key)}')">[${name}]</span>`;
}
function formatChatTime(iso) {
    let d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return '';
    let mm = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
    let hh = String(d.getHours()).padStart(2, '0'), mi = String(d.getMinutes()).padStart(2, '0');
    return `${mm}/${dd} ${hh}:${mi}`;
}
function scrollSocialChatToLatest(listEl) {
    if (!listEl) return;
    let apply = () => {
        if (listEl.isConnected === false) return;
        listEl.scrollTop = listEl.scrollHeight;
    };
    apply();
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(apply);
    if (typeof setTimeout === 'function') setTimeout(apply, 50);
}
function renderChatMessages(messages, forceScroll) {
    let listEl = document.getElementById('social-chat-list');
    if (!listEl) return;
    let myId = socialLoggedInUserId();
    // 채팅 목록이 실제로 보이는 시점 = 확인한 것으로 간주. 마지막 확인 id를 갱신해
    // 백그라운드 새 채팅 알림의 기준점을 옮기고, 커뮤니티 탭 알림 점을 끈다.
    let maxId = messages.reduce((acc, m) => Math.max(acc, Number(m.id) || 0), 0);
    if (maxId > 0) setLastSeenChatId(maxId);
    if (typeof game !== 'undefined' && game && game.noti) game.noti.social = false;
    refreshSocialNotificationDots();
    let blocked = new Set(getBlockedUserIds());   // 차단한 사람의 줄은 이 기기에서 그리지 않는다(목록은 한 번만 읽는다)
    messages = messages.filter(m => !blocked.has(String(m.user_id)));
    let nearBottom = (listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight) < 60;
    let shouldScroll = !!forceScroll || socialState.scrollChatToLatestOnNextRender || nearBottom;
    let key = messages.map(m => `${m.id}:${m.nickname}`).join(',');
    if (key === socialState.lastChatRenderKey) {
        if (shouldScroll) scrollSocialChatToLatest(listEl);
        socialState.scrollChatToLatestOnNextRender = false;
        return;
    }
    socialState.lastChatRenderKey = key;
    if (!messages.length) {
        listEl.innerHTML = `<div class="social-chat-empty"><span aria-hidden="true">◇</span><strong>아직 조용합니다</strong><small>첫 메시지를 남겨보세요.</small></div>`;
        socialState.scrollChatToLatestOnNextRender = false;
        return;
    }
    socialState.chatTips = {};
    listEl.innerHTML = messages.map(m => {
        let mine = m.user_id === myId;
        let nickname = String(m.nickname || '익명');
        return `<article class="social-chat-msg${mine ? ' mine' : ''}">`
            + `<header class="social-chat-head"><button type="button" class="social-chat-author" onclick="openPlayerProfile('${socialEscape(m.user_id)}')">`
            + `<span class="social-chat-nick">${socialEscape(nickname)}</span></button>`
            + `${mine ? '<span class="social-chat-self">나</span>' : ''}<time class="social-chat-time">${formatChatTime(m.created_at)}</time></header>`
            + `<div class="social-chat-body">${renderChatBody(m)}</div></article>`;
    }).join('');
    if (shouldScroll) scrollSocialChatToLatest(listEl);
    socialState.scrollChatToLatestOnNextRender = false;
}
const socialChatMaxId = rows => rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0);
async function refreshChatPanel(forceScroll) {
    if (socialState.chatLoading) return;
    socialState.chatLoading = true;
    try {
        let now = Date.now();
        let fullSync = !socialState.chatInitialized || now - socialState.lastChatFullSyncAt >= SOCIAL_CHAT_FULL_SYNC_MS;
        let knownId = socialChatMaxId(socialState.chatMessages), wasReady = socialState.chatInitialized;
        socialState.lastChatPollAt = now;
        let incoming = await loadChatMessages(fullSync ? null : knownId, now);
        noteLiveChatGap(incoming, fullSync, wasReady);
        socialState.chatMessages = fullSync ? incoming : mergeSocialChatMessages(socialState.chatMessages, incoming, now);
        socialState.chatInitialized = true;
        if (fullSync) socialState.lastChatFullSyncAt = now;
        renderChatMessages(socialState.chatMessages, forceScroll);
        // 처음 불러올 때는 startChatPolling이 접속 인원을 함께 읽는다. 그 뒤로 새 채팅이 오면 접속 인원도 다시 읽는다.
        if (wasReady && socialChatMaxId(incoming) > knownId) socialOnlineChat.refresh(false);
    } catch (e) { console.warn('채팅 로드 실패:', e); } finally { socialState.chatLoading = false; }
}
function startChatPolling() {
    stopChatPolling();
    if (!socialCloudReady()) return;
    refreshChatPanel(true);
    refreshOnlineUsers();
    socialState.chatPollTimer = setInterval(() => {
        if (!isSocialTabActive()) { stopChatPolling(); return; }
        if (!isSocialPageHidden() && socialChatPollDue(socialState.lastChatPollAt)) refreshChatPanel(false);
    }, SOCIAL_CHAT_POLL_MS);
    socialState.onlinePollTimer = setInterval(() => {
        if (!isSocialTabActive()) { stopChatPolling(); return; }
        if (!isSocialPageHidden()) refreshOnlineUsers();
    }, SOCIAL_ONLINE_POLL_MS);
}
function stopChatPolling() {
    if (socialState.chatPollTimer) clearInterval(socialState.chatPollTimer);
    if (socialState.onlinePollTimer) clearInterval(socialState.onlinePollTimer);
    clearTimeout(socialState.onlineChatTimer);
    socialState.chatPollTimer = null;
    socialState.onlinePollTimer = null;
    socialState.onlineChatTimer = null;
}
// 다른 게임 창이 활성화돼도 화면에 남아 있는 채팅 도크의 수신은 유지한다.
function syncSocialChatPolling() {
    // 채팅을 열고 닫을 때(PC 창의 탭, 휴대폰 채팅 탭) 실시간 연결도 다시 맞춘다: 새 채팅 알림을 끈 동안은 채팅이 화면에 있을 때만 붙는다.
    syncLiveChat();
    if (!socialCloudReady() || !isSocialTabActive()) {
        stopChatPolling();
        return;
    }
    if (!socialState.chatPollTimer) startChatPolling();
}
function onSocialChatKeydown(event) {
    if (!event || event.isComposing || event.keyCode === 229 || event.repeat) return;
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    sendChatMessage();
}

// ============================================================================
// 커스텀 툴팁
// ============================================================================
function ensureSocialTooltip() {
    let tip = document.getElementById('social-tooltip');
    if (tip) return tip;
    tip = document.createElement('div');
    tip.id = 'social-tooltip'; tip.className = 'social-tooltip'; tip.style.display = 'none';
    document.body.appendChild(tip);
    return tip;
}
function tipMapByScope(scope) {
    return scope === 'chat' ? socialState.chatTips : (scope === 'pick' ? socialState.pickTips : socialState.profileTips);
}
function showSocialTip(event, scope, key) {
    let html = tipMapByScope(scope)[key];
    if (!html) return;
    let tip = ensureSocialTooltip();
    tip.innerHTML = html; tip.style.display = 'block';
    moveSocialTip(event);
}
function moveSocialTip(event) {
    let tip = document.getElementById('social-tooltip');
    if (!tip || tip.style.display === 'none') return;
    let pad = 16, w = tip.offsetWidth * uiDisplay.factor, h = tip.offsetHeight * uiDisplay.factor;
    let x = event.clientX + pad, y = event.clientY + pad;
    if (x + w > window.innerWidth - 8) x = event.clientX - w - pad;
    if (x < 8) x = 8;
    if (y + h > window.innerHeight - 8) y = window.innerHeight - h - 8;
    if (y < 8) y = 8;
    tip.style.left = x / uiDisplay.factor + 'px'; tip.style.top = y / uiDisplay.factor + 'px';
}
function hideSocialTip() { let t = document.getElementById('social-tooltip'); if (t) t.style.display = 'none'; }
function openTipModal(scope, key) {
    let html = tipMapByScope(scope)[key];
    if (!html) return;
    hideSocialTip();
    if (scope === 'profile' && showProfileItemDetail(html)) return;
    let modal = ensureProfileModal();
    modal.style.display = 'flex';
    let body = document.getElementById('social-profile-body');
    if (body) body.innerHTML = `<div class="social-equip-grid">${html}</div>`;
}

// ============================================================================
// 카드 렌더러(티어·롤범위·색상 포함)
// ============================================================================
function profileStatLabel(st) {
    return st.statName || (typeof getStatName === 'function' ? getStatName(st.id) : st.id) || st.id;
}
function profileStatTone(id) {
    return socialSafeColor(typeof window.getItemStatToneColor === 'function' ? window.getItemStatToneColor(id) : null, '#cfe0f5');
}
function profileValue(id, value) {
    return typeof formatValue === 'function' ? formatValue(id, value) : value;
}

/** 장비 카드(2026-10-03): 게임 툴팁(js/ui.js showItemTooltip)과 같은 순서다. 머리 줄, 전당, 베이스, 레벨과 요구, 고유 효과,
 * 주얼이 박힌 소켓, 융합, "베이스 옵션", "추가 옵션 (n/6)", 잠식. 주얼, 부적, 코어, 그루터기 아이템은 각자의 카드로 보낸다.
 * 전당과 채팅 첨부도 이 카드를 쓴다. */
function renderProfileItemCard(item) {
    if (!item) return '';
    if (item.kind) return renderProfileKindCard(item);
    let color = socialRarityColor(item.rarity);
    return `<div class="social-item-card" style="border-color:${color};">${profileItemTitleHtml(item, color)}${profileItemHallHtml(item)}`
        + `${profileBaseLineHtml(item)}${profileLevelLineHtml(item)}${profileItemUniqueHtml(item)}${profileItemSocketsHtml(item)}`
        + `${profileItemFusionHtml(item)}${profileItemOptionsHtml(item)}</div>`;
}

function renderProfileKindCard(item) {
    if (item.kind === 'jewel') return renderProfileJewelCard(item);
    if (item.kind === 'talisman') return renderProfileTalismanCard(item);
    if (item.kind === 'core') return renderProfileCoreCard(item);
    return item.kind === 'stump' ? renderProfileStumpCard(item) : renderSimpleCard(item);
}

function profileItemTitleHtml(item, color) {
    let stars = typeof getExceptionalBaseStars === 'function' && Array.isArray(item.baseStats) ? getExceptionalBaseStars(item) : '';
    let badges = (item.encroached ? ' <span style="color:#b084ff;">(잠식)</span>' : '') + (item.corrupted ? ' <span style="color:#e74c3c;">(타락)</span>' : '')
        + (item.loopSealed ? ' <span style="color:#7fd99a;">🌿봉인</span>' : '');
    return `<div class="social-item-title" style="color:${color};">${item.slot ? `[${socialEscape(profileItemTag(item))}] ` : ''}${socialEscape(item.name)}`
        + `${stars ? ` <span style="color:#ffb454;">${stars}</span>` : ''}${badges}</div>`;
}

/** 전당 소장품이나 복제 이력(게임 툴팁의 전당 줄). */
function profileItemHallHtml(item) {
    if (item.hallReplica) {
        return `<div class="social-item-stat" style="color:#d2b878;">🏛️ 전당 소장품, 전시자 ${socialEscape(item.hallCuratorName || '익명')}, `
            + `감정 ${Math.max(0, Math.floor(Number(item.hallAppraisalScore) || 0)).toLocaleString()}, 제작과 재등록 불가</div>`;
    }
    return item.hallRelistBlocked ? '<div class="social-item-stat" style="color:#bda979;">🏛️ 전당 복제 이력, 재등록 불가</div>' : '';
}

function profileBaseLineHtml(item) {
    if (!item.baseName) return '';
    let step = Array.isArray(item.baseStep)
        ? ` <span style="color:#7fd1a8;">[${Math.floor(Number(item.baseStep[0]) || 0)}/${Math.floor(Number(item.baseStep[1]) || 0)}]</span>` : '';
    return `<div class="social-item-base">베이스: ${socialEscape(item.baseName)}${step}</div>`;
}

/** 아이템 레벨과 등급, 요구 조건. 예전 프로필에는 없다. */
function profileLevelLineHtml(item) {
    let level = Math.floor(Number(item.itemLevel) || 0), grade = Math.floor(Number(item.grade) || 0);
    let gradeHtml = grade && typeof getTierBadgeHtml === 'function' ? ` 등급 ${getTierBadgeHtml(grade, 'T')}` : '';
    let requirement = profileRequirementText(item.requirements);
    return (level ? `<div class="social-item-base">아이템 Lv.${level}${gradeHtml}</div>` : '')
        + (requirement ? `<div class="social-item-base">${socialEscape(requirement)}</div>` : '');
}

function profileRequirementText(req) {
    if (!req || typeof req !== 'object') return '';
    let attributes = Object.entries(req.attributes || {}).filter(([, value]) => Number(value) > 0)
        .map(([key, value]) => `${profileStatLabel({ id: key })} ${Math.floor(Number(value))}`);
    return [req.exempt ? '계승, 요구 레벨 면제' : `요구 Lv.${Math.max(1, Math.floor(Number(req.level) || 1))}`, ...attributes].join(', ');
}

function profileItemUniqueHtml(item) {
    return item.uniqueEffect ? `<div class="social-item-unique">✨ 고유 효과: ${socialEscape(item.uniqueEffect)}</div>` : '';
}

/** 주얼이 박힌 소켓 줄(게임 equipmentSocketsUi.tooltipHtml과 같은 모양). 빈 소켓은 보여 주지 않는다. */
function profileItemSocketsHtml(item) {
    return (Array.isArray(item.sockets) ? item.sockets : []).filter(row => row && row.jewel).map(row => `<div class="social-item-socket">◆ ${socialEscape(row.label)}: `
        + `<span style="color:${socialRarityColor(row.jewel.rarity)};">${socialEscape(row.jewel.name)}</span>${socialEscape(profileJewelSummary(row.jewel))}</div>`).join('');
}

function profileJewelValue(id, value) {
    if (typeof formatJewelStatValue === 'function') return formatJewelStatValue(id, value);
    return profileValue(id, value);
}

function profileJewelSummary(jewel) {
    let lines = (Array.isArray(jewel.stats) ? jewel.stats : []).filter(st => st && st.id != null)
        .map(st => `${st.petite ? '쁘띠 ' : ''}${profileStatLabel({ id: st.id })} +${profileJewelValue(st.id, st.val)}`);
    return lines.length ? `, ${lines.join(', ')}` : '';
}

/** 고유 융합 유물(시간의 균열): 융합 등급과 계승 원본. */
function profileItemFusionHtml(item) {
    if (!item.fusedRelic) return '';
    let gradeLabel = item.fusionGrade === 'perfect' ? '완벽한 융합' : (item.fusionGrade === 'unstable' ? '불안정한 융합' : '보통 융합');
    return `<div class="social-item-stat" style="color:#8fd8ff;">⌛ ${gradeLabel}${item.fusedRareName ? `, [${socialEscape(item.fusedRareName)}]의 기억` : ''}</div>`;
}

/** 게임 툴팁처럼 "베이스 옵션"(방어도, 회피, 에너지 보호막은 최종값과 베이스), "추가 옵션 (n/6)"(게임과 같은 순서, 혼돈 주입 포함), 잠식. */
function profileItemOptionsHtml(item) {
    let explicit = profileExplicitStats(item);
    let html = explicit.length
        ? `<div class="social-item-section">${profileAffixHeaderText(item, explicit)}</div>${explicit.map(profileExplicitLineHtml).join('')}`
        : '<div class="social-item-stat" style="color:var(--copy-muted);">일반 아이템: 추가 옵션 없음</div>';
    return profileBaseOptionsHtml(item) + html + profileItemEncroachHtml(item) + profileItemAnointHtml(item) + profileItemEmberHtml(item);
}

/** 게임 툴팁과 같은 머리말. 줄 종류가 남은 스냅샷(2026-10-07 뒤)만 "접두 2/3, 접미 3/3"을 붙이고, 예전 프로필은 "(5/6)". */
function profileAffixHeaderText(item, explicit) {
    const kinds = explicit.map(st => st.kind).filter(Boolean);
    const used = kinds.length ? { prefix: kinds.filter(kind => kind === 'prefix').length, suffix: kinds.filter(kind => kind === 'suffix').length } : null;
    return typeof equipmentCrafting === 'object' ? equipmentCrafting.affixHeader(item.rarity, explicit.length, used).text : `추가 옵션 (${explicit.length}/6)`;
}

function profileExplicitStats(item) {
    let rows = (Array.isArray(item.stats) ? item.stats : []).filter(st => st && st.id != null);
    if (item.chaosInfusion && item.chaosInfusion.id != null) rows.push({ ...item.chaosInfusion, statName: `[주입] ${profileStatLabel(item.chaosInfusion)}` });
    return typeof itemTooltipRules === 'object' ? rows.sort(itemTooltipRules.compareStats) : rows;
}

function profileBaseOptionsHtml(item) {
    let base = (Array.isArray(item.baseStats) ? item.baseStats : []).filter(st => st && st.id != null);
    if (!base.length) return '';
    let defenseIds = typeof itemTooltipRules === 'object' ? itemTooltipRules.DEFENSE_IDS : [];
    let lines = base.filter(st => !defenseIds.includes(st.id)).map(profileBaseStatHtml).join('');
    return `<div class="social-item-section">베이스 옵션</div>${profileWardSlotsHtml(item)}${lines}${profileDefenseLinesHtml(item, base)}`;
}

/** 허리띠의 액막이 칸 줄(게임 툴팁 js/colony-wards-ui.js beltLineHtml과 같다): 칸 수와 굴림 범위. */
function profileWardSlotsHtml(item) {
    const range = COLONY_WARD_RULES.beltSlots, slots = Math.floor(Number(item.wardSlots));
    if (!(slots >= range.min && slots <= range.max)) return '';
    return `<div class="social-item-stat"><span style="color:#c8b6ff;">액막이 칸 </span><span style="color:#e6dcc6;">+${slots}</span>`
        + ` <span class="social-roll">(${range.min}~${range.max})</span></div>`;
}

/** 베이스 옵션 한 줄(게임과 같다): 이름 +값 (굴림 범위). 특출 베이스는 값이 주황이고 ✦+20%. */
function profileBaseStatHtml(st) {
    let tone = profileStatTone(st.id);
    return `<div class="social-item-stat"><span style="color:${tone};">${socialEscape(profileStatLabel(st))} </span>`
        + `<span style="color:${st.exceptional ? '#ffb454' : tone};">+${socialEscape(profileValue(st.id, st.val))}</span>${profileRollRangeHtml(st, true)}${profileExceptionalMark(st)}</div>`;
}

/** 방어도, 회피, 에너지 보호막(게임과 같다): 최종값, 옵션으로 달라졌으면 괄호에 베이스, 그다음 굴림 범위. */
function profileDefenseLinesHtml(item, base) {
    if (typeof itemTooltipRules !== 'object') return '';
    let view = itemTooltipRules.defenseView(item);
    return itemTooltipRules.DEFENSE_IDS.map(id => {
        let total = Math.floor(view[id]), baseValue = Math.floor(view.base[id]);
        if (!(total > 0) && !(baseValue > 0)) return '';
        let src = base.find(st => st.id === id) || { id };
        let value = total === baseValue ? `${baseValue}</span>` : `${total}</span> <span style="color:var(--copy-bright);">(${baseValue})</span>`;
        return `<div class="social-item-stat">${socialEscape(profileStatLabel({ id }))}: <span style="color:${src.exceptional ? '#ffb454' : profileStatTone(id)};">${value}`
            + `${src.val != null ? profileRollRangeHtml(src, true) : ''}${profileExceptionalMark(src)}</div>`;
    }).join('');
}

/** 추가 옵션 한 줄(게임과 같다): 이름 +값 (굴림 범위) [티어], 제작 출처, 벌꿀 고정. 복합 옵션은 두 개씩 한 줄에 쓰고 다음 줄은 들여 쓴다. */
function profileExplicitLineHtml(st) {
    let parts = profileAffixParts(st), suffix = profileAffixSuffixHtml(st), html = '';
    for (let i = 0; i < parts.length; i += 2) {
        html += `<div class="social-item-stat${i ? ' is-continued' : ''}">${parts.slice(i, i + 2).join(', ')}${i ? '' : suffix}</div>`;
    }
    return html;
}

function profileAffixParts(st) {
    let extras = Array.isArray(st.extraStats) ? st.extraStats.filter(ex => ex && ex.id != null) : [];
    let label = part => (extras.length ? profileStatLabel({ id: part.id }) : profileStatLabel(part));
    return [st].concat(extras).map(part => `<span style="color:${profileStatTone(part.id)};">${socialEscape(label(part))} +${socialEscape(profileValue(part.id, part.val))}</span>`);
}

function profileAffixSuffixHtml(st) {
    let source = st.source ? ` <span class="equipment-craft-source">${socialEscape(st.source)}</span>` : '';
    let honey = st.honey ? ' <span class="item-affix-lock item-affix-lock--honey">🍯 벌꿀 고정</span>' : '';
    return `${profileRollRangeHtml(st, false)}${profileTierHtml(st)}${source}${honey}${profileEmberScaleHtml(st)}`;
}

/** 티어(게임 getItemAffixTierHtml과 같다): 고정 옵션은 [T0], 티어가 있으면 [T#](0은 고유 확정 [U]). */
function profileTierHtml(st) {
    if (st.fixed) return ' <span class="tier-badge tier-badge-fixed">[T0]</span>';
    return st.tier !== undefined && typeof getTierBadgeHtml === 'function' ? ` ${getTierBadgeHtml(Math.floor(Number(st.tier)), 'T')}` : '';
}

/** 굴림 범위의 끝(게임 getItemStatRollRange와 같다): 옵션의 범위, 없으면 베이스 굴림 범위. */
function profileRollBound(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : Number(fallback);
}

/** 굴림 범위(게임 getItemStatRollRangeHtml과 같다). 베이스 옵션은 범위가 없으면 값의 0.8~1.2배로 어림한다. */
function profileRollRangeHtml(st, estimate) {
    let min = profileRollBound(st.valMin, st.baseRollMin), max = profileRollBound(st.valMax, st.baseRollMax);
    if (estimate && (!Number.isFinite(min) || !Number.isFinite(max))) {
        min = Number((Number(st.val || 0) * 0.8).toFixed(2));
        max = Number((Number(st.val || 0) * 1.2).toFixed(2));
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return '';
    return ` <span class="social-roll">(${socialEscape(profileValue(st.id, Math.min(min, max)))}~${socialEscape(profileValue(st.id, Math.max(min, max)))})</span>`;
}

function profileExceptionalMark(st) {
    return st.exceptional ? ' <span style="color:#ffb454;font-weight:700;">✦+20%</span>' : '';
}

/** 타오른 잿불가지가 다시 구운 줄의 몫(게임 툴팁과 같다): +12% 또는 -8%. */
function profileEmberScaleHtml(st) {
    const pct = Math.round(((Number(st.ember) || 1) - 1) * 100);
    return pct ? ` <span style="color:${pct > 0 ? EMBER_CORRUPTION_TONE : '#9aa3ad'};font-weight:700;">🔥${pct > 0 ? '+' : ''}${pct}%</span>` : '';
}

/** 목걸이에 바른 기름(12번 루프 36, js/garden-oils.js): 노드 이름과 효과 문장(보는 사람의 기기에 패시브 트리가 없어도 읽힌다). */
function profileAnointSnapshot(item) {
    const nodes = typeof gardenOils === 'object' ? gardenOils.nodesOf(item).filter(Boolean) : [];
    return nodes.length ? nodes.map(node => ({ title: node.title,
        text: node.effects.map(effect => `${getStatName(effect.stat)} ${effect.val >= 0 ? '+' : ''}${formatValue(effect.stat, effect.val)}`).join(', ') })) : undefined;
}

/** 기름 줄(게임 툴팁과 같다). */
function profileItemAnointHtml(item) {
    return (Array.isArray(item.anoint) ? item.anoint : []).filter(row => row && row.title)
        .map(row => `<div class="social-item-stat" style="color:#cfe0a0;">🌿 기름: ${socialEscape(row.title)} (${socialEscape(row.text || '')})</div>`).join('');
}

/** 타오른 장비(게임 툴팁과 같다): 다시 태울 수 없다는 표시와 타락 전용 줄. */
function profileItemEmberHtml(item) {
    if (!Array.isArray(item.ember)) return '';
    const lines = item.ember.map(line => `<div class="social-item-stat" style="color:${EMBER_CORRUPTION_TONE};">[잿불] ${socialEscape(profileStatLabel(line))} +${socialEscape(profileValue(line.id, line.val))}</div>`).join('');
    return `<div class="social-item-section" style="color:${EMBER_CORRUPTION_TONE};">🔥 타오른 장비 (다시 태울 수 없음)</div>${lines}`;
}

/** 잠식 특수 옵션(게임과 같다): 해방하면 고른 옵션과 티어, 아니면 효과 없음. */
function profileItemEncroachHtml(item) {
    let encroached = item.encroached;
    if (!encroached) return '';
    let chosen = encroached.liberated && encroached.chosen;
    let line = chosen && chosen.id != null
        ? `<div class="social-item-stat" style="color:#d7b8ff;">[잠식] ${socialEscape(profileStatLabel(chosen))} +${socialEscape(profileValue(chosen.id, chosen.val))}${profileTierHtml({ tier: Number(chosen.tier) || 10 })}</div>`
        : '<div class="social-item-stat" style="color:#8d7bb3;">해방 전에는 효과 없음, 모든 제작으로도 변하지 않음</div>';
    return `<div class="social-item-section" style="color:#b084ff;">잠식 특수 옵션</div>${line}`;
}

// ── 주얼 카드: 게임 createJewelRangeTooltipHtml과 같은 구성 ─────────────────
function renderProfileJewelCard(jewel) {
    let color = socialRarityColor(jewel.rarity);
    let lines = (Array.isArray(jewel.stats) ? jewel.stats : []).map(profileJewelLineHtml).join('');
    return `<div class="social-item-card" style="border-color:${color};"><div class="social-item-title" style="color:${color};">${socialEscape(jewel.name || '주얼')}</div>`
        + `${profileJewelHeadHtml(jewel)}${lines || '<div class="social-item-stat" style="color:var(--copy-muted);">옵션 정보 없음</div>'}</div>`;
}

function profileJewelHeadHtml(jewel) {
    let unique = jewel.uniqueEffect ? `<div class="social-item-unique">✨ 고유 효과: ${socialEscape(jewel.uniqueEffect)}</div>` : '';
    let key = jewel.keystone;
    let keystone = key && key.name
        ? `<div class="social-item-stat" style="color:${key.active ? '#8fe7b0' : '#ffd68a'};">🔯 배정 키스톤: ${socialEscape(key.name)}${key.ascend ? `(${socialEscape(key.ascend)})` : ''}`
            + `${key.active ? ', 할당 중' : ', 짝 주얼의 키스톤과 같으면 할당'}</div>`
        : '';
    return unique + keystone + profileJewelTierHtml(jewel);
}

function profileJewelTierHtml(jewel) {
    if (jewel.rarity === 'unique') return '<div class="social-item-base">고유 고정 옵션, 티어 평가 제외</div>';
    let core = (Array.isArray(jewel.stats) ? jewel.stats : []).filter(st => st && !st.petite);
    if (!core.length) return '';
    let average = core.reduce((sum, st) => sum + Math.max(1, Math.floor(Number(st.tier) || 1)), 0) / core.length;
    return `<div class="social-item-base">옵션 평균 티어: T${average.toFixed(1)}</div>`;
}

/** 주얼 한 줄(게임과 같다): [밀랍] [쁘띠] 이름: +값 T#, 고정 범위. 범위가 없으면 값 그대로. */
function profileJewelLineHtml(st) {
    if (!st || st.id == null) return '';
    let tone = socialSafeColor(typeof window.getJewelStatToneColor === 'function' ? window.getJewelStatToneColor(st.id) : null, '#cfe0f5');
    let marks = (st.wax ? '<span style="color:#ffd98a;">밀랍 </span>' : '') + (st.petite ? '<span style="color:var(--copy-bright);">쁘띠 </span>' : '');
    let tier = Number.isFinite(Number(st.tier)) && !st.petite ? ` <span style="color:#ffd68a;">T${Math.floor(Number(st.tier))}</span>` : '';
    let min = profileJewelValue(st.id, st.valMin ?? st.val), max = profileJewelValue(st.id, st.valMax ?? st.val);
    return `<div class="social-item-stat"><span style="color:${tone};">${marks}${socialEscape(profileStatLabel({ id: st.id }))}: +${socialEscape(profileJewelValue(st.id, st.val))}${tier}</span>`
        + ` <span class="social-roll">(고정 범위 ${socialEscape(min)}~${socialEscape(max)})</span></div>`;
}

// ── 부적 카드: 게임 그루터기 함의 부적 설명과 같은 구성 ───────────────────────
// 상태 줄은 게임(js/stump-talisman-ui.js stateLine)처럼 효과가 달라질 때만 적고, 효과가 없는 동안 줄은 회색 "(비활성)"이다.
const PROFILE_TALISMAN_STATES = Object.freeze({
    awake: '', asleep: '', suppressed: '비활성화: 척력 인접', amplified: '척력으로 효과 +25%', stored: ''
});
const PROFILE_OFF_STYLE = ' style="color:#8d867a;"';
const PROFILE_TALISMAN_RARITY = Object.freeze({ magic: '마법', rare: '희귀', unique: '고유' });
const profileOwn = (table, key) => (Object.prototype.hasOwnProperty.call(table, key) ? table[key] : '');

/** 부적 카드: 이름, 그루터기 함에서 깨어나는 중이면 그 경험치, 희귀도, 고유 효과, 줄(조건부는 보라색), 상태, 접붙이기. */
function renderProfileTalismanCard(t) {
    if (!Array.isArray(t.lines)) return renderSimpleCard(t);
    let tone = profileTalismanTone(t), off = t.state !== 'awake' && t.state !== 'amplified';
    let effect = t.uniqueEffect ? `<div class="social-item-unique"${off ? PROFILE_OFF_STYLE : ''}>${socialEscape(t.uniqueEffect)}${off ? ' (비활성)' : ''}</div>` : '';
    let lines = t.lines.map(line => profileTalismanLineHtml(line, off)).join('');
    let growth = profileGrowthText(t);
    let notes = [profileOwn(PROFILE_TALISMAN_STATES, t.state), profileGraftText(t)].filter(Boolean).map(text => `<div class="social-item-base">${socialEscape(text)}</div>`).join('');
    return `<div class="social-item-card" style="border-color:${tone};"><div class="social-item-title" style="color:${tone};">${socialEscape(t.name || '부적')}</div>`
        + `${growth ? `<div class="social-item-base">${socialEscape(growth)}</div>` : ''}`
        + `<div class="social-item-base" style="color:${tone};">${profileOwn(PROFILE_TALISMAN_RARITY, t.rarity) || '마법'} 부적</div>${effect}${lines}${notes}</div>`;
}

/** One talisman line: purple for a condition line, grey with (비활성) while the talisman gives nothing (the game's rule). */
function profileTalismanLineHtml(line, off) {
    let style = off ? PROFILE_OFF_STYLE : (line && line.condition ? ' style="color:#d7b8ff;"' : '');
    return `<div class="social-item-stat"${style}>${socialEscape(line && line.text)}${off ? ' (비활성)' : ''}</div>`;
}

function profileTalismanTone(t) {
    return socialSafeColor(typeof TALISMAN_RARITY_TONES === 'object' ? profileOwn(TALISMAN_RARITY_TONES, t.rarity) : null, socialRarityColor(t.rarity));
}

/** 그루터기 함에서 성장 중이면 게임과 같은 "경험치 120 / 400". 성장 완료되었거나 성장 정보가 없으면 빈 글. */
function profileGrowthText(item) {
    let need = Math.floor(Number(item.need) || 0);
    return item.ripe || need <= 0 ? '' : `경험치 ${Math.floor(Number(item.xp) || 0)} / ${need}`;
}

function profileGraftText(item) {
    let rank = Math.floor(Number(item.graft) || 0);
    return rank > 0 ? `접붙이기 ${rank}단계, +${Math.floor(Number(item.graftPct) || 0)}%` : '';
}

// ── 코어 카드: 게임 코어 툴팁(core-items-ui.js)과 같은 이름과 줄 ─────────────
const PROFILE_CORE_TONE = '#6d8fa8';
function renderProfileCoreCard(core) {
    let lines = (Array.isArray(core.lines) ? core.lines : []).map(line => `<div class="social-item-stat">${socialEscape(line)}</div>`).join('');
    return `<div class="social-item-card" style="border-color:${PROFILE_CORE_TONE};"><div class="social-item-title">${socialEscape(core.name || '코어')}</div>${lines}</div>`;
}

// ── 씨앗과 수액 카드: 게임 그루터기 함의 아이템 설명과 같은 순서 ──────────────
function renderProfileStumpCard(item) {
    let tone = profileStumpTone(item), scar = item.family === 'scar';
    let gain = item.yieldText ? `${item.yieldText}${item.ripe && !item.suppressed ? '' : ' (비활성)'}` : '';
    let head = [scar ? '' : `품질 ${Math.floor(Number(item.quality) || 0)}%${item.golden === true ? ', 황금' : ''}`, profileGrowthText(item), gain];
    let rows = list => list.filter(Boolean).map(text => `<div class="social-item-base">${socialEscape(text)}</div>`).join('');
    return `<div class="social-item-card" style="border-color:${tone};"><div class="social-item-title" style="color:${tone};">${socialEscape(item.name || '그루터기 아이템')}</div>`
        + rows(head) + profileStumpExtraHtml(item) + rows([item.note, profileGraftText(item)]) + '</div>';
}

/** 성장 완료 때 굴린 추가 줄과 흉터가 흡수한 줄(게임과 같은 문장과 색). */
function profileStumpExtraHtml(item) {
    let rows = Array.isArray(item.extra) ? item.extra.slice(0, 40) : [];
    return rows.filter(row => row && typeof row.text === 'string')
        .map(row => `<div class="social-item-stat" style="color:${profileStatTone(row.id)};">${socialEscape(row.text)}</div>`).join('');
}

function profileStumpTone(item) {
    if (item.kind === 'talisman') return profileTalismanTone(item);
    if (item.family === 'scar' && typeof STUMP_BOX_SCAR === 'object') return STUMP_BOX_SCAR.tone;
    let color = typeof STUMP_BOX_COLORS === 'object' ? profileOwn(STUMP_BOX_COLORS, item.color) : '';
    return socialSafeColor(color && color.tone, '#9d927d');
}

/** 예전 형식(부적의 stats와 effects): 이름 +값 줄과 효과 문장. */
function renderSimpleCard(snap) {
    let color = socialRarityColor(snap.rarity);
    let lines = (Array.isArray(snap.stats) ? snap.stats : []).filter(st => st && st.id != null)
        .map(st => `<div class="social-item-stat" style="color:${profileStatTone(st.id)};">${socialEscape(profileStatLabel(st))} +${socialEscape(profileValue(st.id, st.val))}</div>`)
        .concat((Array.isArray(snap.effects) ? snap.effects : []).map(effect => `<div class="social-item-stat" style="color:#d7b8ff;">${socialEscape(effect)}</div>`)).join('');
    return `<div class="social-item-card" style="border-color:${color};"><div class="social-item-title" style="color:${color};">${socialEscape(snap.name)}</div>`
        + (lines || '<div class="social-item-stat" style="color:var(--copy-muted);">옵션 없음</div>') + '</div>';
}

// ============================================================================
// 프로필 모달
// ============================================================================
function ensureProfileModal() {
    let modal = document.getElementById('social-profile-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'social-profile-modal'; modal.className = 'social-modal-overlay'; modal.style.display = 'none';
    modal.onclick = function (e) { if (e.target === modal) closePlayerProfile(); };
    modal.innerHTML = `<div class="social-modal-box"><button class="social-modal-close" onclick="closePlayerProfile()" aria-label="닫기">✕</button><div class="social-modal-content"><div id="social-profile-body"></div></div></div>`;
    document.body.appendChild(modal);
    return modal;
}
function closePlayerProfile() { hideSocialTip(); let m = document.getElementById('social-profile-modal'); if (m) m.style.display = 'none'; }
// 내 프로필 미리보기: 프로필은 서버에 마지막으로 업로드된 스냅샷이므로, 그대로 열면
// 방금 장착한 주얼/부적/장비가 빠진 옛 데이터가 보인다. 미리보기 전에 현재 상태를
// 업로드해 남들이 보게 될 것과 동일한 최신 프로필을 보여준다.
async function openMyProfilePreview() {
    selectionDialog.close(CHAT_SETTINGS_ID);
    if (!socialCloudReady()) { showGameToast('프로필을 보려면 먼저 클라우드 로그인이 필요합니다.', 'warning'); return; }
    // 닉네임 줄을 쓰기 전에 서버의 닉네임을 다시 읽는다(syncPlayerProfile과 같다).
    await restoreNicknameFromServer(true);
    if (!getMyNickname()) await promptAndSetNickname();
    if (!getMyNickname()) return;
    try {
        await uploadPlayerProfile({ required: true });
    } catch (error) {
        if (error && error.socialCode === 'nickname_conflict') setMyNicknameLocal('');
        showGameToast('프로필 갱신 실패: ' + String(error && error.message || error), 'danger');
        return;
    }
    openPlayerProfile(socialLoggedInUserId());
}

/** 머리 줄: 레벨, 직업, 전직, 루프, 총 DPS를 칩으로(가운뎃점 없이). 예전 프로필(직업 없음)은 전직만 나온다. */
function renderProfileIdentityChips(p) {
    let chips = [`Lv.${p.level || 1}`, p.heroClassName, p.className || '미전직', `루프 ${socialComma(p.loop || 0)}`];
    return chips.filter(Boolean).map(chip => `<span class="social-profile-chip">${socialEscape(chip)}</span>`).join('');
}

function renderProfileGemRow(label, gem, extra) {
    if (!gem || !gem.name) return '';
    // 남의 프로필 값이라 품질도 다른 칸처럼 이스케이프한다(2026-10-27 검토: 이 한 칸만 날것으로 들어가 저장형 XSS가 됐다).
    let quality = gem.quality ? ` 품질 ${socialEscape(gem.quality)}` : '';
    return `<div class="social-skill-row"><span class="social-skill-label">${socialEscape(label)}</span>`
        + `<strong>${socialEscape(gem.name)}</strong><span class="social-skill-level">Lv.${socialEscape(gem.level || 1)}${quality}${extra || ''}</span></div>`;
}

/** 스킬 탭(2026-10-03): 주 스킬과 연결한 보조스킬룬, 이동 스킬, 소환수. 예전 프로필에는 스킬 정보가 없다. */
function renderProfileSkills(skills) {
    if (!skills || !skills.active) return '';
    let rows = [renderProfileGemRow('주 스킬', skills.active)]
        .concat((skills.supports || []).map(gem => renderProfileGemRow('보조', gem)))
        .concat([renderProfileGemRow('이동', skills.mobility)])
        .concat((skills.summons || []).map(gem => renderProfileGemRow('소환', gem, Math.floor(Number(gem.count)) > 1 ? ` ${Math.floor(Number(gem.count))}마리` : '')));
    return `<div class="social-skill-list">${rows.join('')}</div>`;
}

/** 프로필 안의 아이템 카드는 프로필 위에 겹쳐 띄운다. 예전에는 프로필 내용을 카드로 바꿔 버려 닫으면 프로필도 사라졌다. */
function showProfileItemDetail(html) {
    let box = document.querySelector('#social-profile-modal .social-modal-box');
    if (!box) return false;
    let layer = box.querySelector(':scope > .social-item-detail');
    if (!layer) {
        layer = document.createElement('div');
        layer.className = 'social-item-detail';
        layer.onclick = event => { if (event.target === layer || event.target.closest('[data-item-detail-close]')) layer.hidden = true; };
        box.appendChild(layer);
    }
    layer.innerHTML = `<div class="social-item-detail-card">${html}<button type="button" data-item-detail-close>닫기</button></div>`;
    layer.hidden = false;
    return true;
}

// 장비 탭: 끼고 있는 장비만 장비창의 제자리에 그린다(빈 칸은 그리지 않는다). 코어를 끼고 있으면 왼쪽 위 코어 칸도.
/** 장비 탭(2026-10-11 고급 테마): 장비창과 같은 인형 배치에 장비 그림. 낀 칸은 등급 색 테, 비어 있는 기본 칸은 점선,
 * 코어와 셋째 반지는 낀 때만 나온다. 이름과 옵션은 올리거나 누르면 뜨는 카드에 있다. */
function renderProfileEquipPaperdoll(p) {
    let bySlot = new Map((p.equipment || []).filter(it => it && it.slot).map(it => [it.slot, it]));
    let core = p.core && typeof p.core === 'object' && p.core.name ? { ...p.core, kind: 'core' } : null;
    if (!bySlot.size && !core) return '<div class="social-profile-empty">장착한 장비 없음</div>';
    let filled = slot => profileSlotHtml(slot, bySlot.get(slot), profileItemTag(bySlot.get(slot)));
    let cards = SOCIAL_EQUIP_SLOTS.map(slot => (bySlot.has(slot) ? filled(slot) : profileEmptySlotHtml(slot)));
    if (bySlot.has('반지3')) cards.push(filled('반지3'));
    if (core) cards.push(profileSlotHtml('코어', core, '코어'));
    return `<div class="social-doll">${cards.join('')}</div>`;
}

function profileEmptySlotHtml(slot) {
    return `<div class="social-slot is-empty slot-${slot}"><span class="social-slot-tag">${socialEscape(weaponCategorySlotLabel(null, slot.replace(/[123]$/, '')))}</span></div>`;
}

/** 코어 그림: 이름의 묶음 말(수호의 코어 ...)로 고른다. 프로필에는 코어의 줄 글만 올라온다. */
function profileCoreArt(core) {
    const names = CORE_ITEM_RULES.groupNames;
    const prefix = `${CORE_ITEM_RULES.perfect.prefix} `;
    const name = String(core && core.name || '');
    const plainName = name.startsWith(prefix) ? name.slice(prefix.length) : name;
    const group = Object.keys(names).find(key => plainName.startsWith(names[key]));
    return ITEM_VISUAL_ASSET_DB.coreAssets[group || 'empty'];
}

/** 장비 그림(게임 가방과 같은 그림). 베이스 id 없이 올라온 예전 프로필은 베이스 이름으로 찾는다. */
function profileItemArt(it) {
    if (it.kind === 'core') return profileCoreArt(it);
    if (typeof getEquipmentGridVisualAsset !== 'function') return '';
    let base = !it.baseId && typeof BASE_ITEM_DB !== 'undefined' ? BASE_ITEM_DB.find(row => row.name === it.baseName) : null;
    return getEquipmentGridVisualAsset({ slot: it.slot, rarity: it.rarity, name: it.name, baseName: it.baseName, baseId: it.baseId || (base && base.id) });
}

function profileSlotHtml(slot, it, tag) {
    let key = `eq:${slot}`;
    socialState.profileTips[key] = renderProfileItemCard(it);
    let color = it.kind === 'core' ? PROFILE_CORE_TONE : socialRarityColor(it.rarity);
    let art = profileItemArt(it);
    return `<div class="social-slot slot-${slot}" style="--r:${color};" role="button" tabindex="0" aria-label="${socialEscape(`[${tag}] ${it.name}`)}" onmouseenter="showSocialTip(event,'profile','${key}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()" onclick="openTipModal('profile','${key}')">`
        + `${art ? `<img src="${socialEscape(art)}" alt="" draggable="false">` : ''}<span class="social-slot-tag">${socialEscape(tag)}</span></div>`;
}

/** 주얼 탭의 줄: 장비 소켓에 박힌 주얼과 그 자리([단궁] 심연 소켓 1). 소켓 정보가 없는 예전 프로필은 주얼 목록만. */
function profileJewelRows(p) {
    let rows = [];
    (p.equipment || []).forEach(item => (item && Array.isArray(item.sockets) ? item.sockets : []).forEach(row => {
        if (row && row.jewel) rows.push({ jewel: row.jewel, where: `[${profileItemTag(item)}] ${row.label}` });
    }));
    return rows.length ? rows : (p.jewels || []).filter(Boolean).map(jewel => ({ jewel, where: '' }));
}

function renderProfileJewels(p) {
    return `<div class="social-mini-grid">${profileJewelRows(p).map((row, i) => profileMiniCardHtml(`jw:${i}`, row.jewel, row.jewel.name || '주얼', row.where)).join('')}</div>`;
}

/** 판 정보가 없는 예전 프로필의 부적 목록. */
function renderProfileTalismans(p) {
    return `<div class="social-mini-grid">${(p.talismans || []).filter(Boolean).map((t, i) => profileMiniCardHtml(`tl:${i}`, t, t.name || '부적', '')).join('')}</div>`;
}

const PROFILE_STUMP_CELLS = 25; // 그루터기 함 판 5×5(data/stump-box.js STUMP_BOX_SIZE)

function profileStumpFilled(stump) {
    return !!stump && Array.isArray(stump.cells) && stump.cells.some(row => row && row.item);
}

/** 그루터기 함 탭: 게임 판과 같은 5×5 자리. 닫힌 칸은 체크 무늬, 놓인 것은 그림과 성장 막대, 접붙이기 단계는 왼쪽 위 숫자. 누르면 카드. */
function renderProfileStump(stump) {
    return `<div class="social-stump-board">${stump.cells.slice(0, PROFILE_STUMP_CELLS).map(profileStumpCellHtml).join('')}</div>`;
}

function profileStumpCellHtml(row, cell) {
    if (!row || typeof row !== 'object') return '<span class="social-stump-cell is-locked"></span>';
    let rank = Math.floor(Number(row.graft) || 0);
    let mark = rank > 0 ? `<span class="social-stump-graft">${rank}</span>` : '';
    let item = row.item;
    if (!item || typeof item !== 'object') return `<span class="social-stump-cell">${mark}</span>`;
    let key = `st:${cell}`;
    socialState.profileTips[key] = renderProfileItemCard({ ...item, graft: row.graft, graftPct: row.graftPct });
    let state = (item.suppressed || item.state === 'suppressed' ? ' is-suppressed' : '') + (item.resonant ? ' is-resonant' : '');
    return `<span class="social-stump-cell is-filled${state}" style="--stump-tone:${profileStumpTone(item)};" onmouseenter="showSocialTip(event,'profile','${key}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()" onclick="openTipModal('profile','${key}')">`
        + `${profileStumpIconHtml(item)}${profileStumpBarHtml(item)}${mark}</span>`;
}

/** 그림 파일 이름의 끝: '-색'이나 '-희귀도', 색 없는 불씨의 흉터는 '', 알 수 없는 것이면 null. */
function profileStumpIconSuffix(item) {
    if (item.stage === 'scar' || item.stage === 'scarAsleep') return '';
    let tint = item.kind === 'talisman' ? profileOwn(PROFILE_TALISMAN_RARITY, item.rarity) && item.rarity
        : typeof STUMP_BOX_COLORS === 'object' && profileOwn(STUMP_BOX_COLORS, item.color) && item.color;
    return tint ? `-${tint}` : null;
}

/** 판 칸의 그림(게임 stumpBox.iconPath와 같은 파일). 알려진 단계, 색, 희귀도만 쓴다. */
function profileStumpIconHtml(item) {
    let stage = typeof STUMP_BOX_STAGES === 'object' ? profileOwn(STUMP_BOX_STAGES, item.stage) : '', suffix = profileStumpIconSuffix(item);
    return stage && suffix !== null ? `<img src="assets/items/stump-pixel-v1/${stage.icon}${suffix}.png" alt="" draggable="false">` : '';
}

function profileStumpBarHtml(item) {
    let need = Number(item.need) || 0;
    if (item.ripe || need <= 0) return '';
    return `<span class="social-stump-bar"><i style="width:${Math.max(0, Math.min(100, Math.round((Number(item.xp) || 0) / need * 100)))}%"></i></span>`;
}

function profileMiniCardHtml(key, snap, name, sub) {
    socialState.profileTips[key] = renderProfileItemCard(snap);
    let color = socialRarityColor(snap && snap.rarity);
    return `<div class="social-mini-card" style="border-color:${color};color:${color};" onmouseenter="showSocialTip(event,'profile','${key}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()" onclick="openTipModal('profile','${key}')">`
        + `${socialEscape(name)}${sub ? `<small>${socialEscape(sub)}</small>` : ''}</div>`;
}

/** 탭(2026-10-03): 내용이 있는 것만 보인다. 해금하지 않았거나 끼지 않은 것은 탭도 없다. 장비 탭은 늘 있다. */
function profileTabList(p) {
    let tabs = [['equipment', '장비']];
    if (p.skills && p.skills.active) tabs.push(['skills', '스킬']);
    if (profileJewelRows(p).length) tabs.push(['jewels', '주얼']);
    if (profileStumpFilled(p.stump)) tabs.push(['stump', '그루터기 함']);
    else if ((p.talismans || []).length) tabs.push(['stump', '부적']);
    return tabs;
}

function profileTabsHtml(p) {
    return profileTabList(p).map(([cat, label], i) => `<button data-cat="${cat}"${i ? '' : ' class="active"'} onclick="switchProfileTab('${cat}')">${label}</button>`).join('');
}

function renderProfileItemsArea() {
    let p = socialState.currentProfile;
    if (!p) return '';
    socialState.profileTips = {};
    let cat = socialState.profileTab;
    if (cat === 'skills') return renderProfileSkills(p.skills);
    if (cat === 'jewels') return renderProfileJewels(p);
    if (cat === 'stump') return profileStumpFilled(p.stump) ? renderProfileStump(p.stump) : renderProfileTalismans(p);
    return renderProfileEquipPaperdoll(p);
}
function switchProfileTab(cat) {
    socialState.profileTab = cat;
    hideSocialTip();
    let tabsEl = document.getElementById('social-profile-tabs');
    if (tabsEl) Array.from(tabsEl.children).forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-cat') === cat));
    let areaEl = document.getElementById('social-profile-items');
    if (areaEl) areaEl.innerHTML = renderProfileItemsArea();
}
function renderProfileData(profile) {
    let body = document.getElementById('social-profile-body');
    if (!body) return;
    if (!profile) { body.innerHTML = `<div class="social-profile-empty">공개 프로필을 찾을 수 없습니다.<br>프로필 생성 또는 동기화가 완료되지 않았을 수 있어요.</div>`; return; }
    socialState.currentProfile = profile;
    socialState.profileTab = 'equipment';
    let p = profile;
    let stats = Array.isArray(p.stats) ? p.stats : [];
    let updatedAt = p.updatedAt ? new Date(p.updatedAt) : null;
    let updated = (updatedAt && Number.isFinite(updatedAt.getTime())) ? updatedAt.toLocaleString('ko-KR') : '';
    let duelAction = canDuelFromProfile() ? `<div class="social-profile-duel"><button type="button" onclick="fightCurrentProfileGhost()">대전 탭에서 친선전</button><small>상대를 지정해 지도 창의 대전 탭으로 이동합니다.</small></div>` : '';
    duelAction += renderProfileModerationRow();
    // 고급 테마(2026-10-11, css/social-profile.css): 머리 띠에 이름과 큰 총 DPS, 제목 띠가 있는 두 판(능력치 묶음, 장착 구성).
    body.innerHTML = `
        <div class="social-profile-header">
            <div class="social-profile-id">
                <div class="social-profile-name">${socialEscape(p.nickname || '익명')}</div>
                <div class="social-profile-sub">${renderProfileIdentityChips(p)}</div>
                ${updated ? `<div class="social-profile-updated">갱신: ${socialEscape(updated)}</div>` : ''}
            </div>
            ${profilePowerHtml(p)}
        </div>
        ${duelAction}
        <div class="social-profile-cols">
            <section class="social-profile-col social-profile-card">
                <h3>능력치</h3>
                ${profileStatsHtml(stats)}
            </section>
            <section class="social-profile-col social-profile-card">
                <h3>장착 구성</h3>
                <div id="social-profile-tabs" class="social-profile-tabs">${profileTabsHtml(p)}</div>
                <div id="social-profile-items">${renderProfileItemsArea()}</div>
            </section>
        </div>`;
}
/** 남의 프로필에서 친선전 단추를 보여 주는가. 대전 탭은 루프 3부터 열린다(data/maps.js): 그 전에 누르면 프로필만 닫히고 지도의 다른
 * 탭이 열렸다. */
function canDuelFromProfile() {
    let target = socialState.currentProfileUserId;
    if (!target || target === socialLoggedInUserId()) return false;
    return contentProgression.canOpen('map-tab-pvp') && isMapPrimaryContentUnlocked(game, 'map-tab-pvp');
}
/** 남의 프로필 아래 줄(2026-10-27): 차단(이 기기에서 채팅 숨김)과 신고(사유를 골라 서버에 남김). 내 프로필에는 없다. */
function renderProfileModerationRow() {
    let target = socialState.currentProfileUserId;
    if (!target || target === socialLoggedInUserId()) return '';
    let blocked = isUserBlocked(target);
    return `<div class="social-profile-duel social-profile-moderation">`
        + `<button type="button" onclick="toggleProfileBlock()">${blocked ? '차단 해제' : '차단'}</button>`
        + `<select id="social-report-reason" aria-label="신고 사유"><option value="욕설">욕설</option><option value="도배">도배</option><option value="사칭">사칭</option><option value="기타">기타</option></select>`
        + `<button type="button" onclick="reportCurrentProfile()">신고</button>`
        + `<small>${blocked ? '이 기기에서 이 사람의 채팅을 숨기는 중' : '차단은 이 기기에서 채팅을 숨기고, 신고는 운영자에게 갑니다'}</small></div>`;
}
function toggleProfileBlock() {
    let target = socialState.currentProfileUserId;
    if (!target || target === socialLoggedInUserId()) return;
    let blocked = !isUserBlocked(target);
    setUserBlocked(target, blocked, socialState.currentProfile && socialState.currentProfile.nickname);
    socialState.lastChatRenderKey = '';
    renderChatMessages(socialState.chatMessages || [], false);
    let tab = socialState.profileTab;   // 다시 그리면 장비 탭으로 돌아가므로 보던 탭을 되살린다
    if (socialState.currentProfile) { renderProfileData(socialState.currentProfile); if (tab) switchProfileTab(tab); }
    showGameToast(blocked ? '이 사람의 채팅을 이 기기에서 숨깁니다.' : '차단을 풀었습니다.', 'info');
}
// 신고 보내기(reportCurrentProfile)는 서버를 부르므로 js/cloud-tools-ui.js에 있다(이 파일은 ui 파일을 새로 부르지 않는다는 계층 규칙).
/** 읽어 온 프로필 줄을 그린다. 줄이 없으면 빈 프로필이고, 이름이 없는 예전 프로필은 줄의 닉네임을 쓴다. */
function showFetchedProfile(rows) {
    let row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return renderProfileData(null);
    let profile = row.profile_data || {};
    if (!profile.nickname && row.nickname) profile.nickname = row.nickname;
    renderProfileData(profile);
}
async function openPlayerProfile(userId) {
    if (!userId) return;
    selectionDialog.close(CHAT_SETTINGS_ID);
    if (!socialCloudReady()) { showGameToast('프로필을 보려면 먼저 클라우드 로그인이 필요합니다.', 'warning'); return; }
    socialState.currentProfileUserId = String(userId);
    let modal = ensureProfileModal();
    modal.style.display = 'flex';
    let body = document.getElementById('social-profile-body');
    if (body) body.innerHTML = `<div class="social-profile-empty">불러오는 중…</div>`;
    try {
        let rows = await cloudJsonRequest(`/rest/v1/player_profiles?user_id=eq.${encodeURIComponent(userId)}&select=nickname,profile_data,updated_at`, {});
        // 그새 다른 프로필을 열었으면 늦게 온 답이 그 창을 덮지 않게 버린다
        if (socialState.currentProfileUserId === String(userId)) showFetchedProfile(rows);
    } catch (e) {
        if (body) body.innerHTML = `<div class="social-profile-empty">불러오기 실패: ${socialEscape(String(e && e.message || e))}</div>`;
    }
}

// ============================================================================
// 소셜 탭
// ============================================================================
// #tab-social에는 도킹 모드에서 창 관리자가 붙이는 크롬(헤더/리사이즈 핸들)이 공존하므로,
// 소셜 콘텐츠는 전용 하위 컨테이너(.social-root)에만 렌더링해 서로를 파괴하지 않는다.
function getSocialRenderRoot(host) {
    let root = host.querySelector(':scope > .social-root');
    if (!root) {
        root = document.createElement('div');
        root.className = 'social-root';
        host.appendChild(root);
    }
    return root;
}

/** 채팅 칸을 다시 그려도(PC 창의 탭을 오가거나 휴대폰 채팅 탭을 다시 열 때) 쓰던 글과 그 안의 첨부 표시(⟦0⟧)를 잃지 않는다
 * (docs/chat-refresh-20260914.md). 칸을 그린 계정이 아니면(다른 계정이 들어옴) 버린다. */
function takeChatDraft() {
    let input = document.getElementById('social-chat-input');
    if (!input || !input.value || socialState.chatDraftUserId !== socialLoggedInUserId()) return null;
    return { text: String(input.value), start: input.selectionStart, end: input.selectionEnd, focused: document.activeElement === input };
}
/** 다시 그린 칸에 쓰던 글을 되돌린다. 쓰던 중이었으면 커서 자리와 포커스도. */
function restoreChatDraft(draft) {
    socialState.chatDraftUserId = socialLoggedInUserId();
    let input = document.getElementById('social-chat-input');
    if (!draft || !input) return;
    input.value = draft.text;
    if (!draft.focused || input.disabled) return;
    input.focus({ preventScroll: true });
    if (typeof input.setSelectionRange === 'function' && Number.isFinite(draft.start)) input.setSelectionRange(draft.start, draft.end);
}
function renderSocialTab() {
    let host = document.getElementById('tab-social');
    if (!host) return;
    let root = getSocialRenderRoot(host);
    let loggedIn = socialCloudReady();
    let nickname = getMyNickname();
    syncSocialBackgroundTasks();
    if (!loggedIn) {
        let checkingCloud = typeof cloudState !== 'undefined' && cloudState
            && (cloudState.busy || cloudState.initialized === false);
        root.innerHTML = checkingCloud
            ? `<div class="social-notice social-notice-loading"><strong>클라우드 세션을 연결하는 중입니다.</strong><br>연결이 끝나면 채팅이 이 화면에서 자동으로 열립니다.</div>`
            : `<div class="social-notice social-empty-state"><span class="social-empty-sigil" aria-hidden="true">✦</span><strong>클라우드 커뮤니티</strong><p>로그인하면 채팅과 프로필을 바로 쓸 수 있습니다.</p><button type="button" onclick="closeCommunityDock(); openStartupGate({ accountOnly: true })">로그인 화면 열기</button></div>`;
        stopChatPolling();
        return;
    }
    // 채팅 창에는 대화와 입력 줄만 둔다. 닉네임, 프로필, 동기화, 차단한 사람, 접속자는 ⚙ 창(openChatSettings, 2026-10-03).
    let draft = takeChatDraft();
    root.innerHTML = `
        ${nickname ? '' : '<div class="social-notice social-nickname-notice">닉네임을 정하면 채팅할 수 있습니다. <button type="button" onclick="promptAndSetNickname()">닉네임 정하기</button></div>'}
        <div class="social-chat-wrap">
            <span id="social-chat-online" class="social-chat-online" hidden></span>
            <div id="social-chat-list" class="social-chat-list"><div class="social-chat-empty"><span aria-hidden="true">◇</span><strong>대화를 불러오는 중</strong></div></div>
            <div id="social-pending-items" class="social-pending-items" style="display:none;"></div>
            <div class="social-chat-inputbar">
                <button class="social-attach-btn" onclick="openItemPicker()" title="아이템 첨부" aria-label="아이템 첨부" ${nickname ? '' : 'disabled'}><span aria-hidden="true">＋</span> 첨부</button>
                <div class="social-chat-input-shell">
                    <input id="social-chat-input" name="social-chat-message" type="text" maxlength="${SOCIAL_MSG_MAX}" placeholder="${nickname ? '메시지를 입력하세요…' : '먼저 닉네임을 설정하세요'}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" onkeydown="onSocialChatKeydown(event)" oninput="updateChatCounter()" ${nickname ? '' : 'disabled'}>
                    <span id="social-chat-counter" class="social-chat-counter">0/${SOCIAL_MSG_MAX}</span>
                </div>
                <button id="social-chat-send" class="social-send-btn" onclick="sendChatMessage()" ${nickname ? '' : 'disabled'}>전송</button>
            </div>
        </div>`;
    restoreChatDraft(draft);
    socialState.lastChatRenderKey = '';
    socialState.lastOnlineRenderKey = '';
    socialState.scrollChatToLatestOnNextRender = true;
    renderPendingChatItems();
    updateChatCounter();
    updateChatSendButton();
    ensureHeartbeat();
    startChatPolling();
    restoreNicknameFromServer().then(restored => { if (restored !== nickname) renderSocialTab(); });
}

// ============================================================================
// 채팅 설정 창(2026-10-03 사용자 요청): 닉네임, 공개 프로필 보기와 동기화, 차단한 사람(2026-10-27), 접속자 목록을 ⚙ 하나로 연다.
// ============================================================================
const CHAT_SETTINGS_ID = 'chat-settings-overlay';

function chatSettingsBody() {
    if (!socialCloudReady()) {
        return '<div class="chat-settings"><p class="social-notice">로그인하면 닉네임, 공개 프로필, 접속자 목록을 쓸 수 있습니다.</p>'
            + `<button type="button" onclick="selectionDialog.close('${CHAT_SETTINGS_ID}'); closeCommunityDock(); openStartupGate({ accountOnly: true })">로그인 화면 열기</button></div>`;
    }
    let nickname = getMyNickname();
    return `<div class="chat-settings">
        <div class="chat-settings-row"><span>닉네임</span><strong>${nickname ? socialEscape(nickname) : '<em>미설정</em>'}</strong>
            <button type="button" onclick="promptAndSetNickname()">${nickname ? '바꾸기' : '정하기'}</button></div>
        <div class="chat-settings-row"><span>공개 프로필</span>
            <button type="button" onclick="openMyProfilePreview()">보기</button>
            <button type="button" onclick="syncPlayerProfile()" title="지금 장비와 능력치를 공개 프로필에 올립니다">동기화</button></div>
        ${renderBlockedUsersRow()}
        <div id="social-online" class="social-online" style="display:none;"></div>
    </div>`;
}
/** 이 기기에서 차단한 사람들: 이름과 풀기 단추. 없으면 줄을 두지 않는다. */
function renderBlockedUsersRow() {
    let blocked = getBlockedUsers();
    if (!blocked.length) return '';
    let chips = blocked.map(entry => `<button type="button" data-user-id="${socialEscape(entry.id)}" onclick="unblockUser(this.dataset.userId)" title="차단 풀기">${socialEscape(entry.name || entry.id.slice(0, 8))} 풀기</button>`).join('');
    return `<div class="chat-settings-row"><span>차단한 사람</span>${chips}</div>`;
}

function openChatSettings() {
    selectionDialog.show({ id: CHAT_SETTINGS_ID, title: '채팅 설정', panelClass: 'chat-settings-panel', body: chatSettingsBody() });
    if (!socialCloudReady()) return;
    socialState.lastOnlineRenderKey = '';
    refreshOnlineUsers();
}

function refreshChatSettings() {
    if (selectionDialog.isOpen(CHAT_SETTINGS_ID)) openChatSettings();
}

// ============================================================================
// 스타일
// ============================================================================
function injectSocialStyles() {
    if (document.getElementById('social-styles')) return;
    let style = document.createElement('style');
    style.id = 'social-styles';
    // 레이어 안에 둔다: 레이어 밖 CSS는 모든 @layer 규칙(스킨 포함)을 이겨 테마가 덮지 못한다.
    style.textContent = `@layer components {
    .social-notice{color:var(--copy-bright);font-size:12px;line-height:1.5;}
    .social-notice{background:rgba(20,34,56,0.6);border:1px solid #24344f;border-radius:8px;padding:12px;margin-top:8px;}
    .social-notice-loading{border-color:#386383;background:linear-gradient(110deg,rgba(20,46,67,.72),rgba(17,29,48,.72));box-shadow:inset 3px 0 #64b5e5;}
    .social-toolbar{display:flex;gap:8px;align-items:center;justify-content:space-between;margin:10px 0;}
    .social-profile-summary{display:grid;gap:1px;min-width:0;}.social-profile-summary>span{color:var(--copy-muted);font-size:12px;}.social-profile-summary>strong{overflow:hidden;color:#e8d7b6;text-overflow:ellipsis;white-space:nowrap;}.social-profile-summary em{color:#d58478;font-style:normal;}
    .social-toolbar-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;}
    .social-online{background:rgba(13,15,13,.72);border:1px solid #40392e;border-radius:5px;padding:8px 10px;margin-bottom:8px;}
    .social-online-title{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--copy-bright);font-size:12px;font-weight:700;margin-bottom:6px;}
    .social-presence-summary{display:flex;gap:8px;color:var(--copy-muted);font-weight:500;}.social-presence-summary>span{display:inline-flex;align-items:center;gap:4px;}
    .social-presence-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#767169;box-shadow:0 0 0 1px rgba(0,0,0,.7);}.social-presence-dot.active{background:#62b36f;box-shadow:0 0 6px rgba(98,179,111,.38);}.social-presence-dot.recent{background:#c8a64f;}
    .social-online-list{display:flex;flex-wrap:wrap;gap:6px;}
    .social-online-chip{display:inline-flex;align-items:center;gap:6px;min-height:26px;font-size:12px;background:#11130f;border:1px solid #3d382e;border-radius:3px;padding:2px 8px;color:#ddd5c8;cursor:pointer;}.social-online-chip em{padding-left:5px;border-left:1px solid #454036;color:#bfa36d;font-size:12px;font-style:normal;}
    .social-online-chip.active{border-color:#3f6744;}
    .social-online-chip.recent{border-color:#6b5b32;color:#c8bfaa;opacity:.88;}
    .social-online-chip:hover{filter:brightness(1.18);}
    .social-online-chip.me{border-color:#8b6838;box-shadow:inset 0 0 0 1px rgba(213,174,105,.08);}
    .social-online-empty{color:var(--copy-muted);font-size:12px;}
    .social-chat-wrap{position:relative;display:flex;flex-direction:column;gap:8px;}
    .social-chat-online{position:absolute;top:5px;right:10px;z-index:2;display:inline-flex;align-items:center;gap:5px;padding:1px 7px;font-size:12px;line-height:1.4;color:var(--copy-muted);background:rgba(10,12,10,.82);border:1px solid #3d382e;border-radius:9px;pointer-events:auto;}
    .social-chat-online[hidden]{display:none;}
    .social-chat-online:not([hidden]) + .social-chat-list{margin-top:28px;} /* 접속 인원 칸 자리는 목록 밖에: 목록의 padding은 PC 창과 휴대폰 규칙에 덮였고, 스크롤과 함께 올라가 맨 위 줄의 시각을 가렸다. */
    .social-chat-list{height:calc(46vh / var(--scale-display-factor, 1));min-height:240px;overflow-y:auto;background:linear-gradient(170deg,#0d1420,#111c2c);border:1px solid #24344f;border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;}
    .social-chat-empty{display:grid;justify-items:center;gap:5px;color:var(--copy-muted);text-align:center;margin:auto;font-size:12px;}.social-chat-empty>span{display:grid;place-items:center;width:36px;height:36px;border:1px solid #5b4a31;border-radius:50%;color:#d6b572;font-size:18px;}.social-chat-empty strong{color:#cfc5b5;}.social-chat-empty small{font-size:12px;}
    .social-chat-msg{max-width:82%;align-self:flex-start;background:#141713;border:1px solid #343229;border-radius:6px;padding:7px 9px;}
    .social-chat-msg.mine{align-self:flex-end;background:#1b1914;border-color:#5b4930;}
    .social-chat-head{display:flex;align-items:center;gap:6px;min-width:0;}.social-chat-author{display:inline-flex;align-items:center;min-width:0;padding:0;border:0;background:none;color:inherit;cursor:pointer;}.social-chat-self{padding:1px 4px;border:1px solid #675132;border-radius:2px;color:#c9aa70;font-size:12px;}
    .social-chat-nick{overflow:hidden;color:#d6b572;font-weight:700;font-size:12px;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;}
    .social-chat-nick:hover{text-decoration:underline;}
    .social-chat-time{margin-left:auto;color:var(--copy-muted);font-size:12px;white-space:nowrap;}
    .social-chat-body{color:var(--copy-bright);margin:4px 0 0;white-space:pre-wrap;word-break:break-word;font-size:var(--font-size-chat,12px);line-height:1.5;}
    .social-chat-inputbar{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:7px;align-items:stretch;}
    .social-chat-input-shell{position:relative;min-width:0;}
    .social-chat-input-shell input{box-sizing:border-box;width:100%;height:100%;min-height:44px;padding:8px 52px 8px 11px;background:#0e1726;border:1px solid #2a3e5c;border-radius:7px;color:#ffffff;}
    .social-chat-inputbar button{box-sizing:border-box;min-width:0;min-height:44px;margin:0;padding:7px 11px;white-space:nowrap;line-height:1;}
    .social-attach-btn{background:#16243a;border:1px solid #2f5180;color:#ffffff;cursor:pointer;}
    .social-attach-btn span{font-size:15px;line-height:0;}
    .social-chat-inputbar .social-send-btn{min-width:58px;background:linear-gradient(180deg,#315b7c,#203d58);border-color:#4d7898;color:var(--copy-bright);}
    .social-chat-counter{position:absolute;right:9px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--copy-muted);pointer-events:none;text-align:right;}
    .social-pending-items{display:flex;flex-wrap:wrap;gap:6px;}
    .social-pending-chip{display:inline-flex;align-items:center;gap:4px;font-size:12px;background:#0f1a28;border:1px solid;border-radius:14px;padding:2px 6px 2px 9px;}
    .social-pending-chip button{background:none;border:none;color:inherit;cursor:pointer;padding:0 2px;font-size:12px;}
    .social-item-link{display:inline;font-size:12px;font-weight:700;border:0;padding:0;margin:0 1px;background:none;cursor:pointer;}
    .social-item-link:hover{text-decoration:underline;text-underline-offset:2px;}
    .social-modal-overlay{position:fixed;inset:0;background:rgba(4,8,14,0.78);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;}
    .social-modal-box{position:relative;width:min(760px,calc(96vw / var(--scale-display-factor, 1)));max-height:calc(90vh / var(--scale-display-factor, 1));display:flex;flex-direction:column;overflow:hidden;background:var(--color-surface);border:1px solid var(--color-line-strong);border-radius:var(--radius-lg);color:var(--color-text);}
    .social-modal-content{flex:1 1 auto;overflow-y:auto;padding:20px;min-height:0;overscroll-behavior:contain;}
    /* position 계열에 !important: ui-premium.css 의 고특이도 전역 버튼 규칙(position:relative)이
       덮어쓰면 X버튼이 왼쪽 위 일반 흐름으로 배치되어 한 줄을 차지하는 문제가 재발한다. */
    .social-modal-close{position:absolute !important;top:10px !important;right:12px !important;left:auto !important;z-index:3;box-sizing:border-box;width:36px;height:36px;min-height:0;padding:0;display:flex;align-items:center;justify-content:center;background:var(--color-surface-raised);border:1px solid var(--color-line);color:var(--color-text);border-radius:50%;cursor:pointer;font-size:12px;line-height:1;}
    .social-modal-close:hover{background:var(--color-control);}
    .social-profile-empty{color:var(--copy-muted);text-align:center;padding:24px;}
    .social-profile-header{border-bottom:1px solid var(--color-line);padding-bottom:12px;margin-bottom:14px;padding-right:34px;}
    .social-profile-name{font-size:1.4em;font-weight:800;color:var(--color-accent);}
    .social-profile-sub{color:var(--copy-bright);margin-top:4px;}
    .social-profile-updated{color:var(--copy-muted);font-size:12px;margin-top:4px;}
    .social-profile-duel{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:9px;}.social-profile-duel small{color:var(--copy-muted);}.social-profile-moderation select{min-width:72px;padding:2px 6px;}
    .social-profile-col{min-width:0;}.social-profile-cols{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:16px;}
    @media(max-width:640px){.social-profile-cols{grid-template-columns:1fr;}}
    .social-profile-col h3{color:var(--copy-bright);font-size:1em;margin:0 0 8px;}
    .social-profile-tabs{display:flex;gap:6px;margin-bottom:8px;}
    .social-profile-tabs button{flex:1;min-width:0;min-height:40px;padding:6px 4px;background:var(--color-surface-raised);border:1px solid var(--color-line);border-radius:7px;color:var(--color-text);cursor:pointer;font-size:12px;}
    .social-profile-tabs button.active{background:var(--color-control);border-color:var(--color-accent);color:var(--color-text);font-weight:700;}
    @media(max-width:420px){
        .social-chat-inputbar{grid-template-columns:44px minmax(0,1fr) 64px;gap:5px;}
        .social-chat-inputbar button{padding:7px 8px;font-size:12px;}
        .social-attach-btn{font-size:0!important;}
        .social-attach-btn span{font-size:16px!important;}
        .social-send-btn{min-width:52px!important;}
    }
    .social-stat-grid{display:grid;grid-template-columns:1fr;gap:4px;}
    .social-stat-item{display:flex;justify-content:space-between;gap:10px;background:var(--color-surface-raised);border:1px solid var(--color-line);border-radius:6px;padding:5px 9px;}
    .social-stat-label{display:inline-flex;align-items:center;color:var(--copy-bright);font-size:12px;}
    .social-stat-label .combat-log-icon,.social-stat-icon{flex:0 0 auto;width:16px;height:16px;margin-right:6px;}
    .social-stat-icon{display:inline-block;background:url('assets/ui/passive-tree-icons-v3.webp') no-repeat;background-size:110px 88px;}
    .social-stat-icon.is-none{background:none;}
    .social-stat-value{color:var(--color-text);font-weight:700;font-size:12px;}
    .social-mini-grid{display:flex;flex-direction:column;gap:6px;}
    .social-mini-card{background:var(--color-surface-raised);border:1px solid;border-left-width:3px;border-radius:7px;padding:8px 10px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .social-mini-card:hover{background:var(--color-control);}
    .social-paperdoll{margin:0;}
    .social-paperdoll .social-slot{min-height:62px;display:flex;flex-direction:column;gap:2px;justify-content:center;align-items:center;text-align:center;padding:6px 5px;border-radius:8px;cursor:pointer;background:var(--color-surface-raised);}
    .social-paperdoll .social-slot.empty{cursor:default;border:1px dashed var(--color-line);}
    .social-paperdoll .social-slot-tag{font-size:12px;color:var(--copy-muted);font-weight:700;}
    .social-paperdoll .social-slot-name{font-size:12px;font-weight:700;line-height:1.15;word-break:break-all;}
    .social-equip-grid{display:flex;flex-direction:column;gap:8px;}
    .social-item-card{background:#0f1a28;border:1px solid #2c4063;border-left-width:3px;border-radius:8px;padding:8px 10px;}
    .social-item-title{font-weight:700;font-size:12px;}
    .social-item-base{color:var(--copy-muted);font-size:12px;margin:2px 0 4px;}
    .social-item-unique{color:#d7b8ff;font-size:12px;margin:3px 0;}
    .social-item-stat{color:var(--copy-bright);font-size:12px;line-height:1.4;}
    .social-item-stat.base{color:#f1c40f;}
    .social-roll{color:var(--copy-muted);font-size:12px;}
    .social-tooltip{position:fixed;z-index:10001;max-width:320px;pointer-events:none;display:none;filter:drop-shadow(0 6px 18px rgba(0,0,0,0.6));}
    .social-tooltip .social-item-card{background:#0c1421;border-width:1px;border-left-width:3px;}
    }`;
    document.head.appendChild(style);
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { injectSocialStyles(); ensureSocialTooltip(); });
    else { injectSocialStyles(); ensureSocialTooltip(); }
    // 클라우드 복원이 늦어지는 환경을 위한 1회성 보조 동기화. 이후 수명주기는 세션 변경 이벤트가 관리한다.
    if (typeof setTimeout === 'function') setTimeout(syncSocialBackgroundTasks, 15000);
    document.addEventListener('visibilitychange', syncLiveChat);   // 실시간 채팅: 가리면 잠시 뒤 놓고, 보이면 다시 붙는다
}

if (typeof safeExposeGlobals === 'function') {
    safeExposeGlobals({
        socialState, getMyNickname, promptAndSetNickname, uploadPlayerProfile, syncPlayerProfileQuiet, syncPlayerProfile,
        sendChatMessage, onSocialChatKeydown, refreshChatPanel, startChatPolling, stopChatPolling, syncSocialChatPolling,
        openPlayerProfile, openMyProfilePreview, closePlayerProfile, renderSocialTab, socialLoggedInUserId, restoreNicknameFromServer,
        attachChatItem, removePendingChatItem, attachChatSnapshot, openTipModal, updateChatCounter,
        showSocialTip, moveSocialTip, hideSocialTip, switchProfileTab, sendPresenceHeartbeat, refreshOnlineUsers,
        checkSocialChatNotification, syncSocialChatNotificationSetting, syncSocialBackgroundTasks, toggleProfileBlock, unblockUser
    });
}
