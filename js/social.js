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
const SOCIAL_CHAT_FULL_SYNC_MS = 5 * 60 * 1000;
// 커뮤니티 탭이 비활성일 때 새 채팅 여부만 가볍게 확인하는 주기(활성 탭 폴링보다 훨씬 느리게).
const SOCIAL_BG_NOTI_POLL_MS = 15000;
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
    onlineLoading: false,
    lastChatRenderKey: '',
    lastOnlineRenderKey: '',
    profileUploadPromise: null,
    profileUploadUserId: null,
    profileSyncTimer: null,
    profileBootSyncUserId: null,
    lastProfileUploadAt: 0,
    onlineSupported: true,
    pendingChatItems: [],
    sendTimestamps: [],
    lastSentBody: '',
    scrollChatToLatestOnNextRender: true,
    lastNotifiedChatId: null,
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
/** A weapon's category (대검, 곡도 ...) for its title tag, as item text shows it in the game (js/weapon-categories.js). */
function profileItemCategory(item, slot) {
    return slot === '무기' && typeof getWeaponCategoryName === 'function' ? getWeaponCategoryName(item) || undefined : undefined;
}
/** The tag before an item's name: a weapon's category, otherwise its slot without the 1, 2, 3 of paired slots. */
function profileItemTag(item) {
    return item.category || String(item.slot || '').replace(/[123]$/, '');
}
function buildItemSnapshot(item, slotOverride) {
    if (!item) return null;
    let slot = slotOverride || item.slot || '';
    let snap = {
        slot,
        category: profileItemCategory(item, slot),
        name: item.name || '',
        rarity: item.rarity || 'normal',
        baseName: item.baseName || '',
        uniqueEffect: item.uniqueEffect || '',
        corrupted: !!item.corrupted,
        baseStats: (item.baseStats || []).slice(0, 8).map(snapStat),
        stats: (item.stats || []).slice(0, 8).map(st => {
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
        uniqueEffect: jewel.uniqueEffect || undefined, keystone: buildJewelKeystoneSnapshot(jewel) };
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
const PROFILE_STAT_KEYS = Object.freeze([
    ['dps', '⚔️'], ['summonDps', '⚔️'], ['baseDmg', '💥'], ['aspd', '⚡'], ['crit', '🎯'], ['critDmg', '🔥'], ['maxHp', '❤️'],
    ['energyShield', '🔵'], ['armor', '🛡️'], ['evasion', '💨'], ['deflectChance', '🛡️'], ['blockChance', '🛑'], ['dr', '🧱'],
    ['regen', '🩹'], ['resF', '🔥'], ['resC', '❄️'], ['resL', '⚡'], ['resChaos', '☠️']
]);

function buildProfileStats() {
    let s = typeof getPlayerStats === 'function' ? getPlayerStats() : null;
    if (!s) return { stats: [], power: 0 };
    let rows = PROFILE_STAT_KEYS.filter(([key]) => key !== 'summonDps' || Number(s.summonDps) > 0)
        .map(([key, icon]) => ({ key, label: `${icon} ${COMPARE_STAT_META[key].label}`, value: COMPARE_STAT_META[key].format(Number(s[key]) || 0) }));
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
    if (/NICK_COOLDOWN/.test(message)) translated = new Error('닉네임은 하루에 한 번만 변경할 수 있습니다.');
    if (/duplicate|unique|nickname/i.test(message)) {
        translated = new Error('이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.');
        translated.socialCode = 'nickname_conflict';
    }
    return translated;
}
async function performPlayerProfileUpload(options, userId, nickname) {
    try {
        let snapshot = buildProfileSnapshot();
        await cloudJsonRequest('/rest/v1/player_profiles', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            // last_seen / nickname_updated_at 은 DB 기본값·트리거·하트비트가 관리한다.
            body: { user_id: userId, nickname, profile_data: snapshot }
        });
        socialState.lastProfileUploadAt = Date.now();
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
        if (!options.fromNicknameChange) return inFlight;
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
    if (!socialCloudReady() || !getMyNickname()) return false;
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
function syncInitialPlayerProfile() {
    let userId = socialLoggedInUserId();
    if (!userId || !getMyNickname() || socialState.profileBootSyncUserId === userId) return;
    socialState.profileBootSyncUserId = userId;
    syncPlayerProfileQuiet();
}
async function syncPlayerProfile() {
    if (!socialCloudReady()) return showGameToast('먼저 클라우드 로그인이 필요합니다.', 'warning');
    await restoreNicknameFromServer();
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
        if (typeof addLog === 'function') addLog(`🪪 닉네임이 "${name}"(으)로 설정되었습니다.`, 'season-up');
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
async function restoreNicknameFromServer() {
    if (!socialCloudReady()) return '';
    let userId = syncSocialIdentityUser();
    if (socialState.identityCheckedUserId === userId) return getMyNickname();
    if (socialState.identityCheckPromise) return socialState.identityCheckPromise;
    let task = (async () => {
        try {
            let rows = await cloudJsonRequest(`/rest/v1/player_profiles?user_id=eq.${encodeURIComponent(userId)}&select=nickname`, {});
            let serverNickname = Array.isArray(rows) && rows[0] ? String(rows[0].nickname || '') : '';
            if (socialLoggedInUserId() !== userId) return '';
            if (serverNickname) setMyNicknameLocal(serverNickname);
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
async function loadOnlineUsers() {
    if (!socialCloudReady() || !socialState.onlineSupported) return [];
    let cutoff = new Date(Date.now() - SOCIAL_RECENT_WINDOW_S * 1000).toISOString();
    try {
        let rows = await cloudJsonRequest(`/rest/v1/player_profiles?select=user_id,nickname,last_seen&last_seen=gte.${encodeURIComponent(cutoff)}&order=last_seen.desc&limit=80`, {});
        return Array.isArray(rows) ? rows : [];
    } catch (e) {
        if (/last_seen/i.test(String(e && e.message || e))) socialState.onlineSupported = false;
        return [];
    }
}
function getSocialPresenceState(lastSeen, now = Date.now()) {
    let seenAt = new Date(lastSeen).getTime();
    if (!Number.isFinite(seenAt)) return '';
    let ageSeconds = Math.max(0, now - seenAt) / 1000;
    if (ageSeconds <= SOCIAL_ONLINE_WINDOW_S) return 'active';
    return ageSeconds <= SOCIAL_RECENT_WINDOW_S ? 'recent' : '';
}
function renderOnlineUsers(users, now = Date.now()) {
    let host = document.getElementById('social-online');
    if (!host) return;
    if (!socialState.onlineSupported) { host.style.display = 'none'; return; }
    host.style.display = 'block';
    let myId = socialLoggedInUserId();
    let visible = (users || []).map(user => ({ user, state: getSocialPresenceState(user.last_seen, now) })).filter(row => row.state);
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
    if (socialState.onlineLoading || !socialState.onlineSupported) return;
    socialState.onlineLoading = true;
    try { renderOnlineUsers(await loadOnlineUsers()); } catch (e) { /* 무시 */ } finally { socialState.onlineLoading = false; }
}

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
async function checkSocialChatNotification() {
    if (!socialCloudReady() || socialState.bgNotiLoading) return;
    // 탭을 보고 있으면 활성 폴링이 채팅을 렌더하며 확인 처리하므로 알림이 필요 없다.
    if (isSocialTabActive()) return;
    if (typeof game === 'undefined' || !game || !game.noti) return;
    socialState.bgNotiLoading = true;
    try {
        let seen = getLastSeenChatId();
        let cutoff = encodeURIComponent(new Date(Date.now() - SOCIAL_CHAT_RETENTION_MS).toISOString());
        let query = seen == null
            ? `/rest/v1/chat_messages?select=id,user_id,nickname,body,payload&created_at=gte.${cutoff}&order=id.desc&limit=1`
            : `/rest/v1/chat_messages?select=id,user_id,nickname,body,payload&id=gt.${encodeURIComponent(String(seen))}&created_at=gte.${cutoff}&order=id.desc&limit=20`;
        let rows = await cloudJsonRequest(query, {});
        rows = Array.isArray(rows) ? rows : [];
        if (!rows.length) return;
        let latest = rows.reduce((max, row) => Math.max(max, Number(row && row.id) || 0), 0);
        if (!Number.isFinite(latest) || latest <= 0) return;
        // 첫 확인(이 기기에서 채팅을 한 번도 안 봄)에는 과거 메시지로 알림하지 않고 기준점만 잡는다.
        if (seen == null) { setLastSeenChatId(latest); return; }
        if (!isSocialChatNotificationEnabled()) {
            setLastSeenChatId(latest);
            game.noti.social = false;
            refreshSocialNotificationDots();
            return;
        }
        let incoming = rows.find(row => row && row.user_id !== socialLoggedInUserId());
        if (!incoming) {
            setLastSeenChatId(latest);
            return;
        }
        game.noti.social = true;
        refreshSocialNotificationDots();
        let incomingId = Number(incoming.id);
        // 채팅 메시지 id는 로컬 저장소에 남기지 않고 세션 메모리에서만 중복 토스트를 막는다.
        if (socialState.lastNotifiedChatId !== incomingId && typeof showGameToast === 'function') {
            socialState.lastNotifiedChatId = incomingId;
            let nickname = String(incoming.nickname || '플레이어');
            showGameToast(`새 채팅, ${nickname}: ${getSocialChatNotificationPreview(incoming)}`, { tone: 'info', duration: 3600 });
        }
    } catch (e) { /* 무시: 네트워크 실패 시 다음 주기에 재시도 */ } finally {
        socialState.bgNotiLoading = false;
    }
}

function syncSocialChatNotificationSetting() {
    if (typeof game !== 'undefined' && game && game.noti && !isSocialChatNotificationEnabled()) {
        game.noti.social = false;
        refreshSocialNotificationDots();
    }
    Promise.resolve(checkSocialChatNotification()).catch(error => console.warn('social notification setting sync failed:', error));
}

/** Polls rest while the page is hidden: nobody sees the chat dot or the online list there, and each poll is a server request. */
function isSocialPageHidden() {
    return typeof document !== 'undefined' && document.hidden === true;
}

function pollSocialChatNotification() {
    if (!isSocialPageHidden()) return checkSocialChatNotification();
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
function translateSpamError(msg) {
    if (/SPAM_TOO_FAST/.test(msg)) return '메시지를 너무 빠르게 보냈습니다.';
    if (/SPAM_RATE_LIMIT/.test(msg)) return '너무 많이 보냈습니다. 잠시 후 다시 시도해주세요.';
    if (/SPAM_DUPLICATE/.test(msg)) return '같은 메시지를 연속으로 보낼 수 없습니다.';
    if (/char_length|_body_check|violates check/.test(msg)) return `메시지는 1~${SOCIAL_MSG_MAX}자여야 합니다.`;
    return msg;
}
async function prepareChatSender(senderId) {
    await restoreNicknameFromServer();
    if (socialLoggedInUserId() !== senderId) throw new Error('전송 중 계정이 변경되었습니다.');
    if (!getMyNickname()) await promptAndSetNickname();
    if (socialLoggedInUserId() !== senderId) throw new Error('전송 중 계정이 변경되었습니다.');
    if (!getMyNickname()) return false;
    await uploadPlayerProfile({ required: true });
    if (socialLoggedInUserId() !== senderId) throw new Error('전송 중 계정이 변경되었습니다.');
    return true;
}

function clearSubmittedChatDraft(inputEl, draft, items) {
    if (inputEl.value !== draft || socialState.pendingChatItems.length !== items.length) return;
    if (!items.every((item, index) => socialState.pendingChatItems[index] === item)) return;
    inputEl.value = '';
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
    let body = draft.trim();
    let items = socialState.pendingChatItems.slice(0, SOCIAL_MAX_ITEMS_PER_MSG);
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
        if (!await prepareChatSender(senderId)) return;
        await cloudJsonRequest('/rest/v1/chat_messages', {
            method: 'POST', headers: { Prefer: 'return=minimal' },
            body: { user_id: senderId, nickname: getMyNickname(), body: body || '🔗', payload }
        });
        if (socialLoggedInUserId() !== senderId) return;
        clearSubmittedChatDraft(inputEl, draft, items);
        socialState.sendTimestamps.push(Date.now());
        socialState.lastSentBody = body;
        await refreshChatPanel(true);
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
function attachChatItem(source, idx) {
    let snap = getChatAttachSnapshot(source, idx);
    if (!snap) return;
    if (socialState.pendingChatItems.length >= SOCIAL_MAX_ITEMS_PER_MSG) { showGameToast(`메시지당 최대 ${SOCIAL_MAX_ITEMS_PER_MSG}개의 아이템만 첨부할 수 있습니다.`, 'warning'); return; }
    let tokenIndex = socialState.pendingChatItems.length;
    socialState.pendingChatItems.push(snap);
    let inputEl = document.getElementById('social-chat-input');
    if (inputEl) { inputEl.value = (inputEl.value || '') + `⟦${tokenIndex}⟧`; inputEl.focus(); }
    renderPendingChatItems();
    updateChatCounter();
    closeItemPicker();
}
function removePendingChatItem(idx) {
    socialState.pendingChatItems.splice(idx, 1);
    let inputEl = document.getElementById('social-chat-input');
    if (inputEl) {
        let base = String(inputEl.value || '').replace(SOCIAL_ITEM_TOKEN_RE, '').trim();
        let tokens = socialState.pendingChatItems.map((_, i) => `⟦${i}⟧`).join('');
        inputEl.value = (base + (base && tokens ? ' ' : '') + tokens);
    }
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
        return `<span class="social-pending-chip" style="border-color:${color};color:${color};">⟦${i}⟧ ${socialEscape(it.name)}<button onclick="removePendingChatItem(${i})" title="첨부 취소">✕</button></span>`;
    }).join('');
}
function updateChatCounter() {
    let inputEl = document.getElementById('social-chat-input');
    let counterEl = document.getElementById('social-chat-counter');
    if (!inputEl || !counterEl) return;
    let len = String(inputEl.value || '').length;
    counterEl.textContent = `${len}/${SOCIAL_MSG_MAX}`;
    counterEl.style.color = len > SOCIAL_MSG_MAX ? '#e88' : 'var(--copy-muted)';
}
function getChatItemPickerGroups() {
    let state = typeof game !== 'undefined' && game ? game : {};
    let entries = (source, rows, label) => (rows || []).map((item, index) => item ? { source, key: index, label: label(item, index) } : null).filter(Boolean);
    let equipment = Object.keys(state.equipment || {}).filter(slot => state.equipment[slot] && !bagItems.isSpecial(state.equipment[slot]))
        .map(slot => ({ source: 'equip', key: slot, label: `[${slot}]` }));
    let jewels = entries('jewel', bagItems.jewels(state), () => '[가방]');
    let gear = entries('inv', (state.inventory || []).slice(0, 300), item => `[${item.slot || '장비'}]`).filter(entry => !bagItems.isSpecial(state.inventory[entry.key]));
    let stump = state.stumpBox || { items: [], board: [] };
    let talismanEntries = stump.items.filter(item => item.family === 'talisman')
        .map(item => ({ source: 'talisman', key: item.id, label: stump.board.includes(item.id) ? '[판]' : '[보관]' }));
    return [
        { title: '장착 장비', entries: equipment },
        { title: '장비 인벤토리', entries: gear },
        { title: '주얼', entries: jewels.slice(0, 300) },
        { title: '부적', entries: talismanEntries.slice(0, 300) }
    ];
}
function renderChatItemPickerGroup(group) {
    let cards = group.entries.map(entry => {
        let snap = getChatAttachSnapshot(entry.source, entry.key);
        if (!snap) return '';
        let tipKey = `${entry.source}:${entry.key}`;
        let color = socialRarityColor(snap.rarity);
        let keyArg = socialEscape(JSON.stringify(entry.key));
        socialState.pickTips[tipKey] = renderProfileItemCard(snap);
        return `<div class="social-pick-item" style="border-color:${color};" onclick="attachChatItem('${entry.source}',${keyArg})" onmouseenter="showSocialTip(event,'pick','${socialEscape(tipKey)}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()"><span style="color:${color};">${socialEscape(entry.label)} ${socialEscape(snap.name)}</span></div>`;
    }).join('') || `<div class="social-profile-empty">보유 아이템 없음</div>`;
    return `<h4 class="social-pick-sub">${socialEscape(group.title)}</h4><div class="social-pick-grid">${cards}</div>`;
}
function openItemPicker() {
    if (!socialCloudReady()) { showGameToast('먼저 클라우드 로그인이 필요합니다.', 'warning'); return; }
    let modal = document.getElementById('social-item-picker-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'social-item-picker-modal';
        modal.className = 'social-modal-overlay';
        modal.onclick = function (e) { if (e.target === modal) closeItemPicker(); };
        document.body.appendChild(modal);
    }
    socialState.pickTips = {};
    let groups = getChatItemPickerGroups().map(renderChatItemPickerGroup).join('');
    modal.innerHTML = `<div class="social-modal-box"><button class="social-modal-close" onclick="closeItemPicker()" aria-label="닫기">✕</button>
        <div class="social-modal-content"><h3 style="color:var(--copy-bright);margin-top:0;">첨부할 아이템 선택 (최대 ${SOCIAL_MAX_ITEMS_PER_MSG}개), 마우스를 올리면 옵션 표시</h3>${groups}</div></div>`;
    modal.style.display = 'flex';
}
function closeItemPicker() { hideSocialTip(); let m = document.getElementById('social-item-picker-modal'); if (m) m.style.display = 'none'; }

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
        if (snap) {
            let key = `${m.id}:${n}`;
            socialState.chatTips[key] = renderProfileItemCard(snap);
            let color = socialRarityColor(snap.rarity);
            out += `<span class="social-item-link" style="border-color:${color};color:${color};" onmouseenter="showSocialTip(event,'chat','${socialEscape(key)}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()" onclick="openTipModal('chat','${socialEscape(key)}')">◇ ${socialEscape(snap.name)}</span>`;
        } else { out += socialEscape(match[0]); }
        lastIndex = match.index + match[0].length;
    }
    out += socialEscape(body.slice(lastIndex));
    return out;
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
async function refreshChatPanel(forceScroll) {
    if (socialState.chatLoading) return;
    socialState.chatLoading = true;
    try {
        let now = Date.now();
        let fullSync = !socialState.chatInitialized || now - socialState.lastChatFullSyncAt >= SOCIAL_CHAT_FULL_SYNC_MS;
        let afterId = fullSync ? null : socialState.chatMessages.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0);
        let incoming = await loadChatMessages(afterId, now);
        socialState.chatMessages = fullSync ? incoming : mergeSocialChatMessages(socialState.chatMessages, incoming, now);
        socialState.chatInitialized = true;
        if (fullSync) socialState.lastChatFullSyncAt = now;
        renderChatMessages(socialState.chatMessages, forceScroll);
    } catch (e) { console.warn('채팅 로드 실패:', e); } finally { socialState.chatLoading = false; }
}
function startChatPolling() {
    stopChatPolling();
    if (!socialCloudReady()) return;
    refreshChatPanel(true);
    refreshOnlineUsers();
    socialState.chatPollTimer = setInterval(() => {
        if (!isSocialTabActive()) { stopChatPolling(); return; }
        if (!isSocialPageHidden()) refreshChatPanel(false);
    }, SOCIAL_CHAT_POLL_MS);
    socialState.onlinePollTimer = setInterval(() => {
        if (!isSocialTabActive()) { stopChatPolling(); return; }
        if (!isSocialPageHidden()) refreshOnlineUsers();
    }, SOCIAL_ONLINE_POLL_MS);
}
function stopChatPolling() {
    if (socialState.chatPollTimer) clearInterval(socialState.chatPollTimer);
    if (socialState.onlinePollTimer) clearInterval(socialState.onlinePollTimer);
    socialState.chatPollTimer = null;
    socialState.onlinePollTimer = null;
}
// 다른 게임 창이 활성화돼도 화면에 남아 있는 채팅 도크의 수신은 유지한다.
function syncSocialChatPolling() {
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
    let stars = typeof getExceptionalBaseStars === 'function' ? getExceptionalBaseStars(item) : '';
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
    let lines = (jewel.stats || []).filter(st => st && st.id != null)
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
    return `<div class="social-item-section">베이스 옵션</div>${lines}${profileDefenseLinesHtml(item, base)}`;
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
    let lines = (jewel.stats || []).map(profileJewelLineHtml).join('');
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
    let core = (jewel.stats || []).filter(st => st && !st.petite);
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
    let lines = (snap.stats || []).filter(st => st && st.id != null)
        .map(st => `<div class="social-item-stat" style="color:${profileStatTone(st.id)};">${socialEscape(profileStatLabel(st))} +${socialEscape(profileValue(st.id, st.val))}</div>`)
        .concat((snap.effects || []).map(effect => `<div class="social-item-stat" style="color:#d7b8ff;">${socialEscape(effect)}</div>`)).join('');
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
    await restoreNicknameFromServer();
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
    if (p.power) chips.push(`${p.version >= 8 ? '총 DPS' : '전투력'} ${socialComma(p.power)}`);
    return chips.filter(Boolean).map(chip => `<span class="social-profile-chip">${socialEscape(chip)}</span>`).join('');
}

function renderProfileGemRow(label, gem, extra) {
    if (!gem || !gem.name) return '';
    let quality = gem.quality ? ` 품질 ${gem.quality}` : '';
    return `<div class="social-skill-row"><span class="social-skill-label">${socialEscape(label)}</span>`
        + `<strong>${socialEscape(gem.name)}</strong><span class="social-skill-level">Lv.${socialEscape(gem.level || 1)}${quality}${extra || ''}</span></div>`;
}

/** 스킬 탭(2026-10-03): 주 스킬과 연결한 보조 젬, 이동 스킬, 소환수. 예전 프로필에는 스킬 정보가 없다. */
function renderProfileSkills(skills) {
    if (!skills || !skills.active) return '';
    let rows = [renderProfileGemRow('주 스킬', skills.active)]
        .concat((skills.supports || []).map(gem => renderProfileGemRow('보조', gem)))
        .concat([renderProfileGemRow('이동', skills.mobility)])
        .concat((skills.summons || []).map(gem => renderProfileGemRow('소환', gem, gem.count > 1 ? ` ${gem.count}마리` : '')));
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
function renderProfileEquipPaperdoll(p) {
    let bySlot = new Map((p.equipment || []).filter(it => it && it.slot).map(it => [it.slot, it]));
    let cards = SOCIAL_EQUIP_SLOTS.concat(['반지3']).filter(slot => bySlot.has(slot))
        .map(slot => profileSlotHtml(slot, bySlot.get(slot), profileItemTag(bySlot.get(slot))));
    if (p.core && typeof p.core === 'object' && p.core.name) cards.unshift(profileSlotHtml('코어', { ...p.core, kind: 'core' }, '코어'));
    return cards.length ? `<div class="paperdoll social-paperdoll">${cards.join('')}</div>` : '<div class="social-profile-empty">장착한 장비 없음</div>';
}

function profileSlotHtml(slot, it, tag) {
    let key = `eq:${slot}`;
    socialState.profileTips[key] = renderProfileItemCard(it);
    let color = it.kind === 'core' ? PROFILE_CORE_TONE : socialRarityColor(it.rarity);
    return `<div class="slot-box slot-${slot} social-slot" style="border-color:${color};" onmouseenter="showSocialTip(event,'profile','${key}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()" onclick="openTipModal('profile','${key}')">`
        + `<div class="social-slot-tag">[${socialEscape(tag)}]</div><div class="social-slot-name" style="color:var(--color-text);">${socialEscape(it.name)}</div></div>`;
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
    return stage && suffix !== null ? `<img src="assets/px/stump/${stage.icon}${suffix}.png" alt="" draggable="false">` : '';
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
    let statsHtml = stats.length
        ? stats.map(s => `<div class="social-stat-item"><span class="social-stat-label">${socialEscape(s.label)}</span><span class="social-stat-value">${socialEscape(s.value)}</span></div>`).join('')
        : `<div class="social-profile-empty">스탯 정보 없음</div>`;
    let updatedAt = p.updatedAt ? new Date(p.updatedAt) : null;
    let updated = (updatedAt && Number.isFinite(updatedAt.getTime())) ? updatedAt.toLocaleString('ko-KR') : '';
    let canDuel = socialState.currentProfileUserId && socialState.currentProfileUserId !== socialLoggedInUserId();
    let duelAction = canDuel ? `<div class="social-profile-duel"><button type="button" onclick="fightCurrentProfileGhost()">대전 탭에서 친선전</button><small>상대를 지정해 지도 창의 대전 탭으로 이동합니다.</small></div>` : '';
    body.innerHTML = `
        <div class="social-profile-header">
            <div class="social-profile-name">${socialEscape(p.nickname || '익명')}</div>
            <div class="social-profile-sub">${renderProfileIdentityChips(p)}</div>
            ${updated ? `<div class="social-profile-updated">갱신: ${socialEscape(updated)}</div>` : ''}
            ${duelAction}
        </div>
        <div class="social-profile-cols">
            <div class="social-profile-col">
                <h3>능력치</h3>
                <div class="social-stat-grid">${statsHtml}</div>
            </div>
            <div class="social-profile-col">
                <h3>장착 구성</h3>
                <div id="social-profile-tabs" class="social-profile-tabs">${profileTabsHtml(p)}</div>
                <div id="social-profile-items">${renderProfileItemsArea()}</div>
            </div>
        </div>`;
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
        let row = Array.isArray(rows) ? rows[0] : null;
        if (!row) { renderProfileData(null); return; }
        let profile = row.profile_data || {};
        if (!profile.nickname && row.nickname) profile.nickname = row.nickname;
        renderProfileData(profile);
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
    // 채팅 창에는 대화와 입력 줄만 둔다. 닉네임, 프로필, 동기화, 접속자는 ⚙ 창(openChatSettings, 2026-10-03).
    root.innerHTML = `
        ${nickname ? '' : '<div class="social-notice social-nickname-notice">닉네임을 정하면 채팅할 수 있습니다. <button type="button" onclick="promptAndSetNickname()">닉네임 정하기</button></div>'}
        <div class="social-chat-wrap">
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
// 채팅 설정 창(2026-10-03 사용자 요청): 닉네임, 공개 프로필 보기와 동기화, 접속자 목록을 ⚙ 하나로 연다.
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
        <div id="social-online" class="social-online" style="display:none;"></div>
    </div>`;
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
    .social-chat-wrap{display:flex;flex-direction:column;gap:8px;}
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
    .social-item-link{display:inline-block;font-size:12px;font-weight:700;border:1px solid;border-radius:6px;padding:0 6px;margin:0 1px;cursor:pointer;}
    .social-item-link:hover{filter:brightness(1.2);}
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
    .social-profile-duel{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:9px;}.social-profile-duel small{color:var(--copy-muted);}
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
    .social-stat-label{color:var(--copy-bright);font-size:12px;}
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
    .social-pick-sub{color:var(--copy-bright);margin:14px 0 6px;font-size:12px;}
    .social-pick-grid{display:flex;flex-direction:column;gap:6px;max-height:calc(30vh / var(--scale-display-factor, 1));overflow-y:auto;}
    .social-pick-item{background:#0f1a28;border:1px solid;border-left-width:3px;border-radius:7px;padding:7px 10px;cursor:pointer;font-size:12px;}
    .social-pick-item:hover{background:#16243a;}
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
}

if (typeof safeExposeGlobals === 'function') {
    safeExposeGlobals({
        socialState, getMyNickname, promptAndSetNickname, uploadPlayerProfile, syncPlayerProfileQuiet, syncPlayerProfile,
        sendChatMessage, onSocialChatKeydown, refreshChatPanel, startChatPolling, stopChatPolling, syncSocialChatPolling,
        openPlayerProfile, openMyProfilePreview, closePlayerProfile, renderSocialTab, socialLoggedInUserId, restoreNicknameFromServer,
        attachChatItem, removePendingChatItem, openItemPicker, closeItemPicker, openTipModal, updateChatCounter,
        showSocialTip, moveSocialTip, hideSocialTip, switchProfileTab, sendPresenceHeartbeat, refreshOnlineUsers,
        checkSocialChatNotification, syncSocialChatNotificationSetting, syncSocialBackgroundTasks
    });
}
