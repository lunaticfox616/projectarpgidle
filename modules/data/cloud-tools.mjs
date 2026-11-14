export const ACCOUNT_DELETE_ERROR_TEXTS = [
    [/AUTH_REQUIRED/, '로그인이 풀렸습니다. 다시 로그인한 뒤 눌러 주세요.'],
    [/schema cache|could not find|does not exist/i, '서버에 계정 삭제 기능이 아직 없습니다. db/account-deletion-hold-chat-20261027.sql을 실행해야 합니다.']
];

export const OPS_ZONE_TYPE_LABELS = {
    abyss: '심연', act: '막', meteor: '유성 낙하지', labyrinth: '고대 미궁', cosmos: '우주', trial: '시련', timeRift: '시간 균열',
    atlasMap: '지도', ocean: '심해', hunting: '사냥터', breach: '균열', colony: '군락', incident: '사건', duel: '대결', unknown: '알 수 없음'
};

export const OPS_ZONE_ID_LABELS = {
    meteor_fall_site: '유성 낙하지', labyrinth_endless: '끝없는 미궁', cosmos_challenge: '우주 도전', time_rift_past: '과거 균열'
};

export const OPS_SECTIONS = [
    ['ops-stats', '전투 통계', '지역, 직업과 스킬'], ['ops-cheat', '치트 감시', '감시 기록, 성장 속도, 보류'], ['ops-chat', '채팅 신고', '신고, 금지, 금칙어'],
    ['ops-feedback', '문의와 제보', '플레이어가 보낸 글과 답변'], ['ops-players', '플레이어', '찾기, 자세히 보기, 저장 내려받기']
];

export const OPS_TODO_ITEMS = [
    ['feedbackNew', '새 문의', 'ops-feedback'], ['reports24h', '24시간 신고', 'ops-chat'], ['mutesActive', '금지 중', 'ops-chat'],
    ['ghostsUnderReview', '검토 중 고스트', 'ops-cheat'], ['holds', '보류 계정', 'ops-cheat'], ['errors24h', '24시간 오류', 'ops-stats']
];

export const FEEDBACK_KIND_LABELS = { bug: '버그 제보', question: '문의', suggestion: '건의' };

export const FEEDBACK_STATUS_LABELS = { new: '새 글', seen: '확인함', done: '처리함' };

export const FEEDBACK_ERROR_TEXTS = [
    [/FEEDBACK_DAILY_LIMIT/, '24시간 안에 5건까지 보낼 수 있습니다. 잠시 뒤 다시 보내 주세요.'],
    [/FEEDBACK_TOO_SHORT/, '내용을 5자 이상 적어 주세요.'],
    [/AUTH_REQUIRED/, '로그인이 풀렸습니다. 다시 로그인한 뒤 보내 주세요.'],
    [/schema cache|could not find|does not exist/i, '서버에 문의 기능이 아직 없습니다. 잠시 뒤 다시 시도해 주세요.']
];
