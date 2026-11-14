export function getGhostArenaError(error) {
    let message = String(error && error.message || error);
    let texts = [
        [/GHOST_SNAPSHOT_UNAVAILABLE|INVALID_GHOST_SNAPSHOT/, '현재 세팅의 전투 능력치를 불러오지 못했습니다.'],
        [/GHOST_ACCOUNT_HELD/, '운영 검토 중인 계정이라 고스트 대결에 참여할 수 없습니다.'],
        [/GHOST_SNAPSHOT_IMPLAUSIBLE/, '게임에서 나올 수 없는 수치라 서버가 고스트 등록을 거절했습니다.'],
        [/GHOST_OPPONENT_NOT_FOUND/, '대결 가능한 상대가 아직 없습니다.'],
        [/GHOST_TARGET_NOT_REGISTERED/, '상대가 현재 버전의 고스트를 등록하지 않았습니다.'],
        [/GHOST_REGISTRATION_REQUIRED/, '먼저 내 고스트를 등록하세요.'],
        [/GHOST_REGISTRATION_COOLDOWN/, '고스트는 5분마다 한 번 갱신할 수 있습니다.'],
        [/GHOST_DUEL_COOLDOWN/, '대전 시작 후 20초가 지나야 다시 대전할 수 있습니다.'],
        [/GHOST_FRIENDLY_TARGET_LIMIT/, '최근 24시간 동안 이 상대와 친선전 10회를 모두 진행했습니다.'],
        [/GHOST_FRIENDLY_DAILY_LIMIT/, '최근 24시간의 친선전 한도 30회를 모두 사용했습니다.'],
        [/GHOST_DAILY_LIMIT/, '최근 24시간의 랭크 대전 한도 20회를 모두 사용했습니다.'],
        [/NICKNAME_REQUIRED/, '먼저 커뮤니티 닉네임을 설정하세요.'],
        [/schema cache|could not find|does not exist/i, '고스트 대결 서버를 준비 중입니다. 잠시 후 다시 시도해주세요.']
    ];
    let match = texts.find(([pattern]) => pattern.test(message));
    return match ? match[1] : message;
}
