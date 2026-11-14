// GENERATED from modules/cloud-tools-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/application/cloud-account-request.mjs
  var CloudAccountRequest = class {
    constructor(owner, state2, request) {
      this.owner = owner;
      this.state = state2;
      this.send = request;
    }
    capture() {
      return { userId: this.owner.userId(), epoch: this.owner.current.sessionEpoch };
    }
    current(context) {
      return this.state.active && this.owner.isCurrentAccount(context.userId, context.epoch);
    }
    assertCurrent(context) {
      if (!this.current(context)) throw new Error("로그인 계정이 변경되어 작업을 중단했습니다.");
    }
    async request(context, path, options) {
      this.assertCurrent(context);
      const result = await this.send(path, { ...options, expectedUserId: context.userId, expectedSessionEpoch: context.epoch });
      this.assertCurrent(context);
      return result;
    }
  };

  // modules/data/cloud-tools.mjs
  var ACCOUNT_DELETE_ERROR_TEXTS = [
    [/AUTH_REQUIRED/, "로그인이 풀렸습니다. 다시 로그인한 뒤 눌러 주세요."],
    [/schema cache|could not find|does not exist/i, "서버에 계정 삭제 기능이 아직 없습니다. db/account-deletion-hold-chat-20261027.sql을 실행해야 합니다."]
  ];
  var OPS_ZONE_TYPE_LABELS = {
    abyss: "심연",
    act: "막",
    meteor: "유성 낙하지",
    labyrinth: "고대 미궁",
    cosmos: "우주",
    trial: "시련",
    timeRift: "시간 균열",
    atlasMap: "지도",
    ocean: "심해",
    hunting: "사냥터",
    breach: "균열",
    colony: "군락",
    incident: "사건",
    duel: "대결",
    unknown: "알 수 없음"
  };
  var OPS_ZONE_ID_LABELS = {
    meteor_fall_site: "유성 낙하지",
    labyrinth_endless: "끝없는 미궁",
    cosmos_challenge: "우주 도전",
    time_rift_past: "과거 균열"
  };
  var OPS_SECTIONS = [
    ["ops-stats", "전투 통계", "지역, 직업과 스킬"],
    ["ops-cheat", "치트 감시", "감시 기록, 성장 속도, 보류"],
    ["ops-chat", "채팅 신고", "신고, 금지, 금칙어"],
    ["ops-feedback", "문의와 제보", "플레이어가 보낸 글과 답변"],
    ["ops-players", "플레이어", "찾기, 자세히 보기, 저장 내려받기"]
  ];
  var OPS_TODO_ITEMS = [
    ["feedbackNew", "새 문의", "ops-feedback"],
    ["reports24h", "24시간 신고", "ops-chat"],
    ["mutesActive", "금지 중", "ops-chat"],
    ["ghostsUnderReview", "검토 중 고스트", "ops-cheat"],
    ["holds", "보류 계정", "ops-cheat"],
    ["errors24h", "24시간 오류", "ops-stats"]
  ];
  var FEEDBACK_KIND_LABELS = { bug: "버그 제보", question: "문의", suggestion: "건의" };
  var FEEDBACK_STATUS_LABELS = { new: "새 글", seen: "확인함", done: "처리함" };
  var FEEDBACK_ERROR_TEXTS = [
    [/FEEDBACK_DAILY_LIMIT/, "24시간 안에 5건까지 보낼 수 있습니다. 잠시 뒤 다시 보내 주세요."],
    [/FEEDBACK_TOO_SHORT/, "내용을 5자 이상 적어 주세요."],
    [/AUTH_REQUIRED/, "로그인이 풀렸습니다. 다시 로그인한 뒤 보내 주세요."],
    [/schema cache|could not find|does not exist/i, "서버에 문의 기능이 아직 없습니다. 잠시 뒤 다시 시도해 주세요."]
  ];

  // modules/ui/cloud-tools-format.mjs
  var CloudToolsFormat = class {
    constructor(deps2, links, state2) {
      this.deps = deps2;
      this.links = links;
      this.state = state2;
    }
    cloudToolsEscape(value) {
      return typeof this.deps.escapeHTML === "function" ? (0, this.deps.escapeHTML)(String(value == null ? "" : value)) : String(value == null ? "" : value);
    }
    cloudToolsNumber(value) {
      return Math.floor(Number(value) || 0).toLocaleString(this.deps.i18n.locale);
    }
    cloudToolsTime(value) {
      return value ? new Date(value).toLocaleString(this.deps.i18n.locale) : "";
    }
    /** A titled table. A column shows row[key], or render(row) as text, or html(row) as markup the column escapes itself (buttons). */
    renderOpsTable(title, columns, rows) {
      let safeTitle = this.cloudToolsEscape(title);
      if (!rows.length) return `<section><h3>${safeTitle}</h3><p class="cloud-tools-empty">표본 없음</p></section>`;
      let head = columns.map((column) => `<th>${this.cloudToolsEscape(column.label)}</th>`).join("");
      let cell = (column, row) => column.html ? column.html(row) : this.cloudToolsEscape(column.render ? column.render(row) : row[column.key]);
      let body = rows.map((row) => `<tr>${columns.map((column) => `<td>${cell(column, row)}</td>`).join("")}</tr>`).join("");
      return `<section><h3>${safeTitle}</h3><div class="cloud-tools-table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></section>`;
    }
    /** 새 RPC가 아직 서버에 없을 때(묶음 SQL 미실행)와 그 밖의 오류를 가른다. sqlFile은 그 절을 만드는 묶음 파일. */
    renderSectionError(title, error, sqlFile = "db/feedback-and-admin-players-20261027.sql") {
      let text = String(error && error.message || error);
      return /schema cache|could not find|does not exist/i.test(text) ? `<section><h3>${title}</h3><p class="cloud-tools-note">Supabase에서 ${sqlFile}을 실행하면 보입니다.</p></section>` : `<section><h3>${title}</h3><p class="cloud-tools-error">불러올 수 없습니다: ${this.cloudToolsEscape(text)}</p></section>`;
    }
    /** A hold or release button for one account; the dialog's click handler sends it (setCheatHold). */
    renderCheatHoldButton(userId, held, note) {
      return `<button type="button" data-cheat-hold="${this.cloudToolsEscape(userId)}" data-cheat-held="${held ? "1" : "0"}" data-cheat-note="${this.cloudToolsEscape(note)}">${held ? "보류 풀기" : "보류"}</button>`;
    }
    /** 금지 풀기(금지 중일 때), 1일, 7일 금지 단추(setChatMute). 신고 표, 금지 표, 플레이어 자세히 보기가 같이 쓴다. */
    renderMuteButtons(userId, nickname, muted) {
      let id = this.cloudToolsEscape(userId), name = this.cloudToolsEscape(nickname || "");
      return (muted ? `<button type="button" data-chat-mute="${id}" data-chat-minutes="0" data-chat-name="${name}">금지 풀기</button>` : "") + `<button type="button" data-chat-mute="${id}" data-chat-minutes="1440" data-chat-name="${name}">1일 금지</button><button type="button" data-chat-mute="${id}" data-chat-minutes="10080" data-chat-name="${name}">7일 금지</button>`;
    }
    /** The 최근 채팅 button of one player (peekPlayerChat). */
    peekButton(userId, name) {
      return `<button type="button" data-chat-peek="${this.cloudToolsEscape(userId)}" data-chat-name="${this.cloudToolsEscape(name || "")}">최근 채팅</button>`;
    }
    playerDetailButton(userId, name) {
      return `<button type="button" data-player-detail="${this.cloudToolsEscape(userId)}" data-player-name="${this.cloudToolsEscape(name || "")}">자세히</button>`;
    }
    /** 원격 측정의 zone_type, zone_id, 단계를 한 줄 한글로: "심연 22층", "유성 낙하지 14단계", "막 9". */
    opsZoneLabel(type, id, stage) {
      let typeLabel = OPS_ZONE_TYPE_LABELS[type] || String(type || "");
      let idText = String(id == null ? "" : id);
      let place = OPS_ZONE_ID_LABELS[idText] || (/^\d+$/.test(idText) ? `${typeLabel} ${idText}${type === "abyss" ? "층" : ""}` : `${typeLabel} ${idText}`.trim());
      return stage ? `${place} ${/^\d+$/.test(String(stage)) ? `${stage}단계` : stage}` : place;
    }
    opsClassLabel(ascendClass) {
      if (!ascendClass || ascendClass === "unascended") return "미전직";
      return typeof this.deps.CLASS_TEMPLATES !== "undefined" && this.deps.CLASS_TEMPLATES[ascendClass] ? this.deps.CLASS_TEMPLATES[ascendClass].name : String(ascendClass);
    }
    /** 빌드 경고의 zone_id는 서버가 "직업id · 스킬"로 붙인 글: 직업을 한글로, 가운뎃점 없이. */
    opsBuildLabel(text) {
      let [ascendClass, ...skill] = String(text || "").split(" · ");
      return skill.length ? `${this.opsClassLabel(ascendClass)}, ${skill.join(" ")}` : this.opsClassLabel(ascendClass);
    }
    renderCloudHistoryRows(rows) {
      if (!rows.length) return '<p class="cloud-tools-empty">저장 이력이 없습니다.</p>';
      return `<div class="cloud-history-list">${rows.map((row) => {
        let time = row.saved_at ? new Date(row.saved_at).toLocaleString(this.deps.i18n.locale) : "-";
        let action = row.is_current ? '<span class="cloud-current-badge">현재</span>' : `<button type="button" onclick="restoreCloudSaveVersion(${Number(row.revision) || 0})">복구</button>`;
        return `<div class="cloud-history-row"><div><strong>리비전 ${this.cloudToolsNumber(row.revision)}</strong><small>루프 ${this.cloudToolsNumber(row.loop_number)}, ${this.cloudToolsEscape(time)}</small></div>${action}</div>`;
      }).join("")}</div><p class="cloud-tools-note">정상적으로 완료된 클라우드 저장의 이전 버전을 약 30분 간격으로 최대 2개 보관합니다.</p>`;
    }
  };

  // modules/ui/cloud-player-view.mjs
  var CloudPlayerView = class {
    constructor(deps2, links, state2) {
      this.deps = deps2;
      this.links = links;
      this.state = state2;
    }
    // ---------------------------------------------------------------------------
    renderPlayerLookupShell() {
      return '<section><h3>플레이어</h3><p class="cloud-tools-note">닉네임, 이메일, 계정 id 앞부분으로 찾습니다. 비워 두면 최근 활동순 50명입니다.</p><div class="ops-summary"><input id="player-query" type="text" maxlength="80" placeholder="닉네임, 이메일, id"><button type="button" data-player-search="1">찾기</button></div></section><div id="player-results"></div><div id="player-detail"></div>';
    }
    renderPlayerRows(rows) {
      return this.links.format.renderOpsTable(`플레이어 ${rows.length}명`, [
        { label: "닉네임", html: (row) => `${this.links.format.cloudToolsEscape(row.nickname || "(프로필 없음)")}<br><small>${this.links.format.cloudToolsEscape(row.email || "")}</small>` },
        { label: "레벨", render: (row) => `${row.level || "-"}, 루프 ${row.loop || "-"}` },
        { label: "전투력", render: (row) => this.links.format.cloudToolsNumber(row.power) },
        { label: "마지막 활동", render: (row) => this.links.format.cloudToolsTime(row.last_active) },
        { label: "저장", render: (row) => row.save_revision == null ? "없음" : `r${row.save_revision}, 압축 ${Math.round((row.save_bytes || 0) / 1024)}KB` },
        { label: "고스트", render: (row) => row.ghost_rating == null ? "" : `${row.ghost_rating}${row.ghost_active ? "" : " (꺼짐)"}` },
        { label: "전당", render: (row) => row.hall_honor == null ? "" : `명예 ${this.links.format.cloudToolsNumber(row.hall_honor)}, 전시 ${row.hall_open || 0}` },
        { label: "상태", render: (row) => this.playerStatusText(row) },
        { label: "조치", html: (row) => this.links.format.playerDetailButton(row.user_id, row.nickname) + this.links.format.renderCheatHoldButton(row.user_id, row.held, "") + this.links.format.peekButton(row.user_id, row.nickname) }
      ], rows);
    }
    playerStatusText(row) {
      let parts = [];
      if (row.held) parts.push("보류");
      if (row.muted_until) parts.push(`채팅 금지 ${this.links.format.cloudToolsTime(row.muted_until)}까지`);
      if (Number(row.flag_count)) parts.push(`기록 ${row.flag_count}`);
      if (Number(row.report_count)) parts.push(`신고 ${row.report_count}`);
      if (Number(row.feedback_count)) parts.push(`문의 ${row.feedback_count}`);
      return parts.join(", ");
    }
    renderPlayerDetail(data) {
      let account = data.account || {};
      let name = account.nickname || String(account.user_id || "").slice(0, 8);
      let muted = !!(data.mute && new Date(data.mute.until_at).getTime() > Date.now());
      let actions = this.links.format.renderCheatHoldButton(account.user_id, !!data.hold, data.hold ? data.hold.note : "") + this.links.format.renderMuteButtons(account.user_id, name, muted) + this.links.format.peekButton(account.user_id, name) + `<button type="button" data-player-save="${this.links.format.cloudToolsEscape(account.user_id)}" data-player-name="${this.links.format.cloudToolsEscape(name)}">저장 JSON 내려받기</button>`;
      let facts = [...this.accountFacts(data), ...this.saveFacts(data), ...this.standingFacts(data)].map(([label, value]) => `<div><dt>${label}</dt><dd>${this.links.format.cloudToolsEscape(value)}</dd></div>`).join("");
      return `<section><h3>자세히: ${this.links.format.cloudToolsEscape(name)}</h3><div class="ops-summary">${actions}</div><dl class="player-facts">${facts}</dl></section>` + this.renderPlayerTables(data) + `<section><h3>공개 프로필 JSON</h3><details><summary>펼치기</summary><pre class="player-json">${this.links.format.cloudToolsEscape(JSON.stringify(data.profile || {}, null, 2))}</pre></details></section>`;
    }
    accountFacts(data) {
      let account = data.account || {}, profile = data.profile || {};
      return [
        ["계정", `${account.email || ""} ${account.user_id || ""}`],
        ["가입", this.links.format.cloudToolsTime(account.joined_at)],
        ["마지막 로그인", this.links.format.cloudToolsTime(account.last_sign_in_at)],
        ["마지막 접속", this.links.format.cloudToolsTime(account.last_seen)],
        ["로그인 방식", Array.isArray(account.providers) ? account.providers.join(", ") : ""],
        ["닉네임 바꾼 때", this.links.format.cloudToolsTime(account.nickname_updated_at)],
        ["캐릭터", `${profile.className || profile.heroClassName || ""} 레벨 ${profile.level || "-"}, 루프 ${profile.loop || "-"}, 전투력 ${this.links.format.cloudToolsNumber(profile.power)}`]
      ];
    }
    saveFacts(data) {
      let save = data.save;
      return [
        ["저장", save ? `r${save.revision}, ${Math.round((save.bytes || 0) / 1024)}KB, ${this.links.format.cloudToolsTime(save.updated_at)}, 이력 ${data.saveVersions || 0}개` : "없음"],
        ["저장 요약", save && save.digest ? this.saveDigestText(save.digest) : ""]
      ];
    }
    standingFacts(data) {
      let ghost = data.ghost;
      return [
        ["고스트", ghost ? `점수 ${ghost.rating}, DPS ${this.links.format.cloudToolsNumber(ghost.dps)}, ${ghost.wins}승 ${ghost.losses}패 ${ghost.draws}무${ghost.active ? "" : ", 꺼짐"}` : "없음"],
        ["전당", data.hall ? `명예 ${this.links.format.cloudToolsNumber(data.hall.honor)}, 나눠 준 복제품 ${data.hall.copies_shared}` : "없음"],
        ["보류", data.hold ? `${this.links.format.cloudToolsTime(data.hold.created_at)} ${data.hold.note || ""}` : "없음"],
        ["채팅 금지", data.mute ? `${this.links.format.cloudToolsTime(data.mute.until_at)}까지 ${data.mute.note || ""}` : "없음"]
      ];
    }
    /** cheat_save_digest의 네 칸(level, season, currencies, saveMeta)을 한 줄로. */
    saveDigestText(digest) {
      let currencies = digest.currencies && typeof digest.currencies === "object" ? Object.keys(digest.currencies).length : 0;
      let modified = digest.saveMeta && digest.saveMeta.lastModifiedAt ? this.links.format.cloudToolsTime(digest.saveMeta.lastModifiedAt) : "";
      return `레벨 ${digest.level == null ? "-" : digest.level}, 루프 ${digest.season == null ? "-" : digest.season}, 재화 ${currencies}종${modified ? `, 기기 저장 ${modified}` : ""}`;
    }
    renderPlayerTables(data) {
      return this.links.format.renderOpsTable("감시 기록", [
        { label: "종류", key: "kind" },
        { label: "날짜", key: "seen_on" },
        { label: "횟수", key: "hits" },
        { label: "마지막", render: (row) => this.links.format.cloudToolsTime(row.last_at) },
        { label: "내용", render: (row) => JSON.stringify(row.detail || {}).slice(0, 120) }
      ], Array.isArray(data.flags) ? data.flags : []) + this.links.format.renderOpsTable("받은 신고", [
        { label: "시각", render: (row) => this.links.format.cloudToolsTime(row.created_at) },
        { label: "사유", key: "reason" },
        { label: "채팅", render: (row) => row.body || "" }
      ], Array.isArray(data.reports) ? data.reports : []) + this.links.format.renderOpsTable("최근 채팅", [
        { label: "시각", render: (row) => this.links.format.cloudToolsTime(row.created_at) },
        { label: "내용", key: "body" }
      ], Array.isArray(data.chat) ? data.chat : []) + this.links.format.renderOpsTable("전당 전시", [
        { label: "시각", render: (row) => this.links.format.cloudToolsTime(row.created_at) },
        { label: "이름", render: (row) => row.name || "" },
        { label: "점수", render: (row) => this.links.format.cloudToolsNumber(row.item_score) },
        { label: "상태", key: "status" }
      ], Array.isArray(data.listings) ? data.listings : []) + this.links.format.renderOpsTable("보낸 문의", [
        { label: "시각", render: (row) => this.links.format.cloudToolsTime(row.created_at) },
        { label: "종류", render: (row) => FEEDBACK_KIND_LABELS[row.kind] || row.kind },
        { label: "내용", key: "body" },
        { label: "상태", render: (row) => FEEDBACK_STATUS_LABELS[row.status] || row.status }
      ], Array.isArray(data.feedback) ? data.feedback : []);
    }
  };

  // modules/ui/cloud-ops-view.mjs
  var CloudOpsView = class {
    constructor(deps2, links, state2) {
      this.deps = deps2;
      this.links = links;
      this.state = state2;
    }
    /** 전투 통계 절의 몸통(admin_get_ops_dashboard의 zones, builds): 지역과 직업을 한글로. 머리 숫자와 오류는 admin_get_ops_overview가 맡는다(2026-10-27). */
    renderOpsStats(data) {
      let html = this.links.format.renderOpsTable("지역 통계, 최근 30일", [
        { label: "지역", render: (row) => this.links.format.opsZoneLabel(row.zone_type, row.zone_id, row.content_stage) },
        { key: "players", label: "사람" },
        { key: "runs", label: "전투" },
        { label: "클리어율", render: (row) => `${row.clear_rate_pct || 0}%` },
        { label: "DPS", render: (row) => this.links.format.cloudToolsNumber(row.median_dps) },
        { label: "EHP", render: (row) => this.links.format.cloudToolsNumber(row.median_ehp) },
        { label: "p95", render: (row) => `${row.p95_frame_ms || 0}ms` },
        { key: "peak_fx", label: "최대 FX" }
      ], Array.isArray(data.zones) ? data.zones : []);
      html += this.links.format.renderOpsTable("직업/스킬 통계, 최근 30일", [
        { label: "직업", render: (row) => this.links.format.opsClassLabel(row.ascend_class) },
        { key: "active_skill", label: "스킬" },
        { key: "players", label: "사람" },
        { key: "runs", label: "전투" },
        { label: "클리어율", render: (row) => `${row.clear_rate_pct || 0}%` },
        { label: "DPS", render: (row) => this.links.format.cloudToolsNumber(row.median_dps) },
        { label: "EHP", render: (row) => this.links.format.cloudToolsNumber(row.median_ehp) }
      ], Array.isArray(data.builds) ? data.builds : []);
      return html;
    }
    /** A ghost flag (DPS or EHP outlier) from the last 7 days: the server freezes that ghost's ranked rating meanwhile (ghost_under_review). */
    isGhostFlagUnderReview(row) {
      return /^ghost_/.test(String(row.kind || "")) && Date.now() - new Date(row.last_at).getTime() < 7 * 24 * 60 * 60 * 1e3;
    }
    /** The anti-cheat watch (db/anti-cheat.sql admin_get_cheat_watch): flags, growth per hour, held accounts. */
    renderCheatWatch(data) {
      const kinds = {
        clock: "기기 시계",
        currency: "화폐",
        level: "레벨",
        ghost_dps: "고스트 DPS",
        ghost_ehp: "고스트 EHP",
        golden_rule: "황금률 잔액",
        hall_buy: "전당 구매",
        hall_list: "전당 등록"
      };
      const account = { label: "계정", render: (row) => row.nickname || String(row.user_id || "").slice(0, 8) };
      const hold = (note) => ({ label: "보류", html: (row) => this.links.format.renderCheatHoldButton(row.user_id, row.held === true, note(row)) });
      let html = '<section><h3>치트 감시</h3><p class="cloud-tools-note">감시는 기록만 하고 막지 않습니다. 보류한 계정은 전당과 고스트 대결에서 빠지고, 저장과 혼자 하는 플레이는 그대로입니다. 고스트 기록(DPS, EHP)은 7일 동안 순위전 점수를 멈추고, 지우면 바로 풀립니다.</p></section>';
      html += this.links.format.renderOpsTable("감시 기록, 최근 90일", [
        account,
        { label: "종류", render: (row) => kinds[row.kind] || row.kind },
        { key: "seen_on", label: "날짜" },
        { key: "hits", label: "횟수" },
        { label: "내용", render: (row) => JSON.stringify(row.detail || {}) },
        { label: "순위전", render: (row) => this.isGhostFlagUnderReview(row) ? "점수 멈춤" : "" },
        hold((row) => `${kinds[row.kind] || row.kind} ${row.seen_on}`),
        { label: "기록", html: (row) => `<button type="button" data-cheat-clear="${this.links.format.cloudToolsEscape(row.user_id)}" data-cheat-kind="${this.links.format.cloudToolsEscape(row.kind)}">지우기</button>` }
      ], Array.isArray(data.flags) ? data.flags : []);
      html += this.links.format.renderOpsTable("성장 속도, 최근 7일", [
        account,
        { key: "seen_on", label: "날짜" },
        { key: "samples", label: "저장" },
        { key: "hours", label: "시간" },
        { label: "화폐/시간", render: (row) => this.links.format.cloudToolsNumber(row.currency_per_hour) },
        { label: "최고 속도", render: (row) => `${this.links.format.cloudToolsNumber(row.max_currency_per_hour)} ${row.max_currency_key || ""}` },
        { key: "level_per_hour", label: "레벨/시간" },
        { key: "season_per_hour", label: "루프/시간" },
        hold((row) => `성장 ${row.seen_on}`)
      ], Array.isArray(data.rates) ? data.rates : []);
      html += this.links.format.renderOpsTable("보류한 계정", [
        account,
        { key: "note", label: "메모" },
        { label: "시각", render: (row) => new Date(row.created_at).toLocaleString(this.deps.i18n.locale) },
        { label: "보류", html: (row) => this.links.format.renderCheatHoldButton(row.user_id, true, "") }
      ], Array.isArray(data.holds) ? data.holds : []);
      return html;
    }
    /** Chat reports and mutes (db/social.sql admin_get_chat_reports); the dialog's click handler sends the mute and delete buttons. */
    renderChatReports(data) {
      const muteButtons = (row) => this.links.format.renderMuteButtons(row.target_user_id || row.user_id, row.nickname, row.muted_until || row.until_at);
      let html = '<section><h3>채팅 신고</h3><p class="cloud-tools-note">신고는 플레이어가 프로필 창에서 보냅니다. 금지한 계정은 풀릴 때까지 채팅을 보낼 수 없고, 지운 줄은 모든 플레이어의 채팅창에서 사라집니다.</p></section>';
      html += this.links.format.renderOpsTable("신고, 최근 200건", [
        { label: "시각", render: (row) => new Date(row.created_at).toLocaleString(this.deps.i18n.locale) },
        { label: "신고자", render: (row) => row.reporter_nickname || "" },
        { label: "대상", render: (row) => row.nickname || String(row.target_user_id || "").slice(0, 8) },
        { label: "24시간 신고", render: (row) => this.links.format.cloudToolsNumber(row.reports_24h) },
        { key: "reason", label: "사유" },
        { label: "채팅", render: (row) => row.body ? row.body.length > 60 ? `${row.body.slice(0, 60)}…` : row.body : "" },
        { label: "상태", render: (row) => row.muted_until ? `금지 중, ${new Date(row.muted_until).toLocaleString(this.deps.i18n.locale)}까지` : row.message_id && !row.message_exists ? "줄 지워짐" : "" },
        { label: "조치", html: (row) => muteButtons(row) + (row.message_id && row.message_exists ? `<button type="button" data-chat-delete="${this.links.format.cloudToolsEscape(row.message_id)}">줄 지우기</button>` : "") + this.links.format.peekButton(row.target_user_id, row.nickname) }
      ], Array.isArray(data.reports) ? data.reports : []);
      html += '<div id="chat-peek"></div>';
      html += '<div class="ops-summary"><input id="chat-mute-nickname" type="text" maxlength="16" placeholder="닉네임으로 금지"><button type="button" data-mute-nick="1440">1일 금지</button><button type="button" data-mute-nick="10080">7일 금지</button><button type="button" data-mute-nick="0">금지 풀기</button><button type="button" data-chat-clear="1">채팅 전체 비우기</button></div>';
      html += this.links.format.renderOpsTable("금지 중인 계정", [
        { label: "계정", render: (row) => row.nickname || String(row.user_id || "").slice(0, 8) },
        { label: "풀리는 시각", render: (row) => new Date(row.until_at).toLocaleString(this.deps.i18n.locale) },
        { key: "note", label: "메모" },
        { label: "조치", html: (row) => muteButtons(row) + this.links.format.peekButton(row.user_id, row.nickname) }
      ], Array.isArray(data.mutes) ? data.mutes : []);
      return html + this.renderBannedTerms(Array.isArray(data.terms) ? data.terms : null);
    }
    /** The admin's extra banned terms (chat_banned_terms): a list with 빼기 buttons and a row to add one; the server trims the term the
     * way the check normalises text. terms is null when the server has no such function yet. */
    renderBannedTerms(terms) {
      if (!terms) return '<section><h3>금칙어(관리자 추가)</h3><p class="cloud-tools-note">Supabase에서 db/multiplayer-hardening-20261027.sql을 실행하면 보입니다.</p></section>';
      let html = this.links.format.renderOpsTable("금칙어(관리자 추가)", [
        { key: "term", label: "낱말" },
        { label: "찾는 글", render: (row) => row.spaced === false ? "띄어쓰기 지운 글" : "띄어쓰기 남긴 글" },
        { label: "시각", render: (row) => new Date(row.created_at).toLocaleString(this.deps.i18n.locale) },
        { label: "조치", html: (row) => `<button type="button" data-term-remove="${this.links.format.cloudToolsEscape(row.term)}">빼기</button>` }
      ], terms);
      return html + '<p class="cloud-tools-note">기본 목록은 서버 함수(chat_text_is_offensive)에 있고, 여기 더한 낱말은 바로 적용됩니다. 짧은 낱말은 띄어쓰기를 남긴 글에서 찾아야 "혹시 발사체" 같은 말이 걸리지 않습니다.</p><div class="ops-summary"><input id="banned-term-input" type="text" maxlength="40" placeholder="낱말(2~40자)"><label><input id="banned-term-spaced" type="checkbox" checked> 띄어쓰기 남긴 글에서 찾기</label><button type="button" data-term-add="1">더하기</button></div>';
    }
    renderChatPeek(name, rows) {
      return this.links.format.renderOpsTable(`${name || "이 플레이어"}의 최근 채팅`, [
        { label: "시각", render: (row) => new Date(row.created_at).toLocaleString(this.deps.i18n.locale) },
        { key: "body", label: "채팅" },
        { label: "조치", html: (row) => `<button type="button" data-chat-delete="${this.links.format.cloudToolsEscape(row.id)}">줄 지우기</button>` }
      ], rows);
    }
    renderOpsShell() {
      let nav = OPS_SECTIONS.map(([id, title]) => `<button type="button" data-ops-jump="${id}">${title}</button>`).join("");
      let section = (id, body) => {
        let [, title, hint] = OPS_SECTIONS.find((entry) => entry[0] === id);
        return `<details class="ops-section" id="${id}"><summary><strong>${title}</strong><small>${hint}</small></summary><div class="ops-section-body">${body}</div></details>`;
      };
      let loading = (title) => `<section><h3>${title}</h3><p class="cloud-tools-empty">불러오는 중…</p></section>`;
      return `<div id="ops-top"><p class="cloud-tools-empty">집계 중…</p></div><nav class="ops-nav">${nav}</nav>` + section("ops-stats", '<div id="ops-stats-body"><p class="cloud-tools-empty">집계 중…</p></div>') + section("ops-cheat", `<div id="cheat-watch">${loading("치트 감시")}</div>`) + section("ops-chat", `<div id="chat-reports">${loading("채팅 신고")}</div>`) + section("ops-feedback", `<div id="admin-feedback">${loading("문의와 제보")}</div>`) + section("ops-players", this.links.playerView.renderPlayerLookupShell());
    }
    renderOpsHead(overview) {
      if (overview.error) return this.links.format.renderSectionError("운영 지표", overview.error, "db/ops-overview-20261027.sql");
      return this.renderTodoStrip(overview.todo || {}) + this.renderKpiCards(overview);
    }
    renderOpsAlertBlock(overview, dashboard2) {
      let alerts = dashboard2.error ? this.links.format.renderSectionError("경고", dashboard2.error) : this.renderOpsAlerts(Array.isArray(dashboard2.alerts) ? dashboard2.alerts : []);
      return alerts + (overview.error ? "" : this.renderErrorGroups(Array.isArray(overview.errors) ? overview.errors : []));
    }
    renderTodoStrip(todo) {
      let chips = OPS_TODO_ITEMS.map(([key, label, section]) => {
        let count = Number(todo[key]) || 0;
        return `<button type="button" class="ops-todo${count ? "" : " is-zero"}" data-ops-jump="${section}"><strong>${this.links.format.cloudToolsNumber(count)}</strong>${label}</button>`;
      }).join("");
      return `<section class="ops-todo-strip"><h3>할 일</h3><div class="ops-todo-row">${chips}</div></section>`;
    }
    /** 이번 7일과 그 전 7일: "162 (전주 230)". */
    opsWeekPair(current, previous) {
      return `${this.links.format.cloudToolsNumber(current)} <small>(전주 ${this.links.format.cloudToolsNumber(previous)})</small>`;
    }
    renderKpiCards(overview) {
      let accounts = overview.accounts || {}, play = overview.play || {}, social = overview.social || {}, server = overview.server || {};
      let dbMb = Math.round((Number(server.dbBytes) || 0) / 1048576), dbLimitMb = Math.round((Number(server.dbLimitBytes) || 524288e3) / 1048576);
      let cards = [
        ["계정", [
          ["가입", this.links.format.cloudToolsNumber(accounts.total)],
          ["7일 새 가입", this.opsWeekPair(accounts.new7d, accounts.newPrev7d)],
          ["7일 로그인", this.links.format.cloudToolsNumber(accounts.signedIn7d)],
          ["24시간 접속", this.links.format.cloudToolsNumber(accounts.seen24h)],
          ["공개 프로필", this.links.format.cloudToolsNumber(accounts.profiles)]
        ]],
        ["전투", [
          ["30일 전투", this.links.format.cloudToolsNumber(play.runs30d)],
          ["7일 전투", this.opsWeekPair(play.runs7d, play.runsPrev7d)],
          ["7일 전투한 사람", this.opsWeekPair(play.players7d, play.playersPrev7d)],
          ["30일 클리어율", `${play.clearRate30d == null ? "-" : play.clearRate30d}%`],
          ["30일 중단", this.links.format.cloudToolsNumber(play.abandons30d)]
        ]],
        ["멀티", [
          ["7일 채팅", this.opsWeekPair(social.chat7d, social.chatPrev7d)],
          ["고스트 등록", this.links.format.cloudToolsNumber(social.ghostsActive)],
          ["30일 대전", this.links.format.cloudToolsNumber(social.ghostMatches30d)],
          ["전시 중", this.links.format.cloudToolsNumber(social.hallOpen)],
          ["30일 구매", this.links.format.cloudToolsNumber(social.hallPurchases30d)]
        ]],
        ["서버", [
          ["DB 크기", `${dbMb}MB / ${dbLimitMb}MB`],
          ["저장", `${this.links.format.cloudToolsNumber(server.saves)}개, ${Math.round((Number(server.saveBytes) || 0) / 1048576)}MB`],
          ["저장 이력", this.links.format.cloudToolsNumber(server.saveVersions)],
          ["30일 오류", this.links.format.cloudToolsNumber(server.errors30d)],
          ["마지막 전투 기록", this.links.format.cloudToolsTime(play.lastRunAt)]
        ]]
      ];
      let html = cards.map(([title, rows]) => `<div class="ops-kpi"><h4>${title}</h4><dl>${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl></div>`).join("");
      return `<section><h3>지표</h3><div class="ops-kpi-row">${html}</div></section>`;
    }
    renderOpsAlerts(alerts) {
      let order = { critical: 0, warning: 1 };
      let rows = alerts.slice().sort((a, b) => (order[a.severity] ?? 2) - (order[b.severity] ?? 2) || (Number(b.runs) || 0) - (Number(a.runs) || 0));
      return this.links.format.renderOpsTable("경고, 최근 30일", [
        { label: "등급", render: (row) => row.severity === "critical" ? "심각" : "주의" },
        { label: "지역", render: (row) => row.zone_type === "build" ? this.links.format.opsBuildLabel(row.zone_id) : this.links.format.opsZoneLabel(row.zone_type, row.zone_id, row.content_stage) },
        { key: "message", label: "판정" },
        { key: "runs", label: "전투" },
        { label: "사람", render: (row) => row.players == null ? "" : this.links.format.cloudToolsNumber(row.players) }
      ], rows);
    }
    renderErrorGroups(errors) {
      return this.links.format.renderOpsTable("오류, 최근 30일(같은 오류는 묶음)", [
        { label: "오류", html: (row) => `<div class="feedback-cell">${this.links.format.cloudToolsEscape(row.message || row.fingerprint)}</div>` },
        { key: "hits", label: "횟수" },
        { key: "users", label: "사람" },
        { label: "마지막", render: (row) => this.links.format.cloudToolsTime(row.last_at) },
        { key: "app_version", label: "버전" }
      ], errors);
    }
  };

  // modules/ui/cloud-feedback-view.mjs
  var CloudFeedbackView = class {
    constructor(deps2, links, state2) {
      this.deps = deps2;
      this.links = links;
      this.state = state2;
    }
    renderFeedbackForm() {
      if (!this.deps.cloudState || !this.deps.cloudState.user) {
        return '<section><p class="cloud-tools-note">로그인한 계정으로만 보낼 수 있습니다. 설정의 클라우드 세이브에서 로그인한 뒤 다시 열어 주세요.</p></section>';
      }
      let kinds = Object.entries(FEEDBACK_KIND_LABELS).map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
      return `<section><p class="cloud-tools-note">게임 버전, 현재 지역과 루프, 직업, 기기 종류가 함께 갑니다. 답변은 이 창에서 봅니다.</p><div class="feedback-form"><select id="feedback-kind">${kinds}</select><textarea id="feedback-body" rows="6" maxlength="2000" placeholder="무슨 일이 있었는지, 어디서, 어떤 순서로 눌렀는지 적어 주세요."></textarea><input id="feedback-contact" type="text" maxlength="120" placeholder="연락처(선택): 이메일이나 디스코드 이름"><button type="button" data-feedback-send="1">보내기</button></div></section><div id="my-feedback"></div>`;
    }
    renderMyFeedback(rows) {
      if (!rows.length) return '<section><h3>내가 보낸 글</h3><p class="cloud-tools-empty">아직 없습니다.</p></section>';
      let items = rows.map((row) => `<div class="feedback-item"><div class="feedback-meta"><span>${this.links.format.cloudToolsEscape(FEEDBACK_KIND_LABELS[row.kind] || row.kind)}</span><span>${this.links.format.cloudToolsTime(row.created_at)}</span><span>${this.links.format.cloudToolsEscape(FEEDBACK_STATUS_LABELS[row.status] || row.status)}</span></div><div class="feedback-body">${this.links.format.cloudToolsEscape(row.body)}</div>` + (row.reply ? `<div class="feedback-reply"><strong>운영자 답변</strong> ${this.links.format.cloudToolsEscape(row.reply)}</div>` : "") + "</div>").join("");
      return `<section><h3>내가 보낸 글</h3><div class="feedback-list">${items}</div></section>`;
    }
    renderAdminFeedback(rows) {
      let filters = [["all", "전체"], ["new", "새 글"], ["seen", "확인함"], ["done", "처리함"]].map(([value, label]) => `<button type="button" data-feedback-filter="${value}"${(value === "all" ? "" : value) === this.state.adminFeedbackFilter ? " disabled" : ""}>${label}</button>`).join("");
      let html = `<section><h3>문의와 제보</h3><p class="cloud-tools-note">플레이어가 설정 > 문의와 제보에서 보낸 글입니다. 답변을 적어 저장하면 플레이어가 같은 창에서 보고, 새 글은 확인함이 됩니다.</p><div class="ops-summary">${filters}</div></section>`;
      return html + this.links.format.renderOpsTable("글, 최근 300건", [
        { label: "시각", render: (row) => this.links.format.cloudToolsTime(row.created_at) },
        { label: "종류", render: (row) => FEEDBACK_KIND_LABELS[row.kind] || row.kind },
        { label: "보낸 사람", html: (row) => `${this.links.format.cloudToolsEscape(row.nickname || String(row.user_id || "").slice(0, 8))}<br><small>${this.links.format.cloudToolsEscape(row.email || "")}</small>` + this.links.format.playerDetailButton(row.user_id, row.nickname) },
        { label: "내용", html: (row) => `<div class="feedback-cell">${this.links.format.cloudToolsEscape(row.body)}</div>` + (row.contact ? `<small>연락처: ${this.links.format.cloudToolsEscape(row.contact)}</small>` : "") },
        { label: "상황", render: (row) => this.feedbackContextSummary(row) },
        { label: "상태", render: (row) => FEEDBACK_STATUS_LABELS[row.status] || row.status },
        { label: "조치", html: (row) => this.renderFeedbackActions(row) }
      ], rows);
    }
    feedbackContextSummary(row) {
      let context = row.context || {};
      return [row.app_version, context.zoneId, context.loop ? `루프 ${context.loop}` : "", context.ascendClass, context.platform, context.screen].filter(Boolean).join(" ");
    }
    renderFeedbackActions(row) {
      let id = this.links.format.cloudToolsEscape(row.id);
      let statusButtons = Object.entries(FEEDBACK_STATUS_LABELS).filter(([value]) => value !== row.status).map(([value, label]) => `<button type="button" data-feedback-status="${id}" data-status="${value}">${label}</button>`).join("");
      return `<div class="feedback-actions"><div>${statusButtons}</div><textarea id="feedback-reply-${id}" rows="2" maxlength="2000" placeholder="답변">${this.links.format.cloudToolsEscape(row.reply || "")}</textarea><button type="button" data-feedback-reply="${id}" data-status-now="${this.links.format.cloudToolsEscape(row.status)}">답변 저장</button></div>`;
    }
  };

  // modules/ui/cloud-tools-dialog.mjs
  var CloudToolsDialog = class {
    constructor(deps2, links, state2) {
      this.deps = deps2;
      this.links = links;
      this.state = state2;
      this.version = 0;
      this.created = null;
    }
    invalidate() {
      this.version++;
    }
    capture() {
      return { dialog: this.deps.document.getElementById("cloud-tools-dialog"), version: this.version };
    }
    current(ticket) {
      return this.state.active && ticket.version === this.version && ticket.dialog?.open && ticket.dialog === this.deps.document.getElementById("cloud-tools-dialog");
    }
    dispose() {
      this.invalidate();
      const dialog2 = this.deps.document.getElementById("cloud-tools-dialog");
      if (dialog2?.open) dialog2.close();
      this.created?.remove();
      this.created = null;
    }
    ensureCloudToolsDialog() {
      let dialog2 = this.deps.document.getElementById("cloud-tools-dialog");
      if (dialog2) return dialog2;
      dialog2 = this.deps.document.createElement("dialog");
      dialog2.id = "cloud-tools-dialog";
      dialog2.className = "cloud-tools-dialog";
      dialog2.innerHTML = `<div class="cloud-tools-head"><strong id="cloud-tools-title"></strong><button type="button" onclick="closeCloudToolsDialog()" aria-label="닫기">✕</button></div><div id="cloud-tools-body" class="cloud-tools-body"></div>`;
      this.deps.document.body.appendChild(dialog2);
      this.created = dialog2;
      return dialog2;
    }
    openCloudToolsDialog(title, html) {
      if (!this.state.active) return null;
      this.invalidate();
      let dialog2 = this.ensureCloudToolsDialog();
      this.deps.document.getElementById("cloud-tools-title").textContent = title;
      this.deps.document.getElementById("cloud-tools-body").innerHTML = html;
      if (!dialog2.open) dialog2.showModal();
      return { dialog: dialog2, version: this.version };
    }
    closeCloudToolsDialog() {
      if (!this.state.active) return;
      this.invalidate();
      let dialog2 = this.deps.document.getElementById("cloud-tools-dialog");
      if (dialog2 && dialog2.open) dialog2.close();
    }
    injectCloudToolsStyles() {
      if (this.deps.document.getElementById("cloud-tools-styles")) return;
      let style = this.deps.document.createElement("style");
      style.id = "cloud-tools-styles";
      style.textContent = `@layer components{.cloud-tools-dialog{width:min(980px,calc(94vw / var(--scale-display-factor, 1)));max-height:calc(88vh / var(--scale-display-factor, 1));padding:0;border:1px solid #445b78;border-radius:12px;background:#0d1623;color:#eef6ff}.cloud-tools-dialog::backdrop{background:rgba(0,0,0,.72)}.cloud-tools-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#142238;border-bottom:1px solid #304765}.cloud-tools-head button{margin:0}.cloud-tools-body{padding:14px;overflow:auto}.cloud-history-list{display:grid;gap:7px}.cloud-history-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px;border:1px solid #2b405d;border-radius:8px;background:#111e30}.cloud-history-row small{display:block;color:#9eb0c8;margin-top:3px}.cloud-current-badge{color:#8be5aa;font-weight:700}.cloud-tools-note,.cloud-tools-empty{color:#a9b8cc}.cloud-tools-error{color:#ff9b9b}.ops-summary{display:flex;gap:8px;flex-wrap:wrap}.ops-summary span{padding:8px 12px;border:1px solid #304765;border-radius:8px;background:#142238}.cloud-tools-body section{margin-top:18px}.cloud-tools-table-wrap{overflow:auto}.cloud-tools-table-wrap table{width:100%;border-collapse:collapse;font-size:12px}.cloud-tools-table-wrap th,.cloud-tools-table-wrap td{padding:7px;border-bottom:1px solid #263a54;text-align:left;white-space:nowrap}.feedback-form{display:grid;gap:8px}.feedback-form textarea,.feedback-form input,.feedback-form select,.feedback-actions textarea,#player-query{box-sizing:border-box;background:#111e30;color:#eef6ff;border:1px solid #2b405d;border-radius:6px;padding:6px;font:inherit}.feedback-form textarea,.feedback-form input,.feedback-form select,.feedback-actions textarea{width:100%}#player-query{flex:1;min-width:200px}.feedback-list{display:grid;gap:8px}.feedback-item{padding:10px;border:1px solid #2b405d;border-radius:8px;background:#111e30}.feedback-meta{display:flex;flex-wrap:wrap;gap:10px;color:#9eb0c8;font-size:12px}.feedback-body{white-space:pre-wrap;margin-top:4px}.feedback-reply{margin-top:6px;padding:6px 8px;border-left:3px solid #8be5aa;white-space:pre-wrap}.feedback-cell{white-space:normal;min-width:220px;max-width:380px}.feedback-actions{display:grid;gap:4px;min-width:220px}.player-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:4px 16px;margin:8px 0}.player-facts dt{color:#9eb0c8;font-size:12px}.player-facts dd{margin:0;overflow-wrap:anywhere}.player-json{max-height:320px;overflow:auto;font-size:11px;white-space:pre-wrap}.ops-nav{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 4px;position:sticky;top:46px;z-index:1;padding:6px 0;background:#0d1623}.ops-nav button{margin:0}.ops-section{margin-top:10px;border:1px solid #2b405d;border-radius:8px;background:#0f1a2b}.ops-section>summary{display:flex;align-items:baseline;gap:10px;padding:10px 14px;cursor:pointer;list-style:none}.ops-section>summary::-webkit-details-marker{display:none}.ops-section>summary::before{content:"▸";color:#9eb0c8}.ops-section[open]>summary::before{content:"▾"}.ops-section>summary small{color:#9eb0c8}.ops-section-body{padding:0 14px 12px}.ops-section-body section:first-child{margin-top:4px}.ops-todo-strip h3,.ops-kpi-row+h3{margin-top:0}.ops-todo-row{display:flex;flex-wrap:wrap;gap:8px}.ops-todo{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:112px;padding:8px 12px;border:1px solid #304765;border-radius:8px;background:#142238;color:#eef6ff;text-align:left}.ops-todo strong{font-size:20px;color:#ffd27a}.ops-todo.is-zero{opacity:.55}.ops-todo.is-zero strong{color:#9eb0c8}.ops-kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px}.ops-kpi{padding:10px 12px;border:1px solid #304765;border-radius:8px;background:#142238}.ops-kpi h4{margin:0 0 6px;color:#ffd27a;font-size:13px}.ops-kpi dl{margin:0;display:grid;gap:3px}.ops-kpi dl div{display:flex;justify-content:space-between;gap:8px;font-size:12px}.ops-kpi dt{color:#9eb0c8}.ops-kpi dd{margin:0;text-align:right}.ops-kpi dd small{color:#9eb0c8}}`;
      this.deps.document.head.appendChild(style);
    }
  };

  // modules/application/cloud-account-maintenance.mjs
  var CloudAccountMaintenance = class {
    constructor(deps2, links, state2) {
      this.deps = deps2;
      this.links = links;
      this.state = state2;
    }
    async openCloudSaveHistory() {
      if (!this.state.active) return;
      const accountContext = this.links.session.capture();
      if (!this.deps.cloudState || !this.deps.cloudState.user) return (0, this.deps.showGameToast)((0, this.deps._t)("클라우드 로그인이 필요합니다."), "warning");
      const ticket = this.links.dialog.openCloudToolsDialog("클라우드 저장 이력", '<p class="cloud-tools-empty">불러오는 중…</p>');
      try {
        let rows = await this.links.session.request(accountContext, "/rest/v1/rpc/list_cloud_save_versions", { method: "POST", body: {} });
        if (!this.links.dialog.current(ticket)) return;
        this.deps.document.getElementById("cloud-tools-body").innerHTML = this.links.format.renderCloudHistoryRows(Array.isArray(rows) ? rows : []);
      } catch (error) {
        if (!this.links.session.current(accountContext) || !this.links.dialog.current(ticket)) return;
        this.deps.document.getElementById("cloud-tools-body").innerHTML = `<p class="cloud-tools-error">불러오기 실패: ${this.links.format.cloudToolsEscape(error.message || error)}</p>`;
      }
    }
    async restoreCloudSaveVersion(revision) {
      if (!this.state.active) return;
      const accountContext = this.links.session.capture();
      const context = (0, this.deps.captureCloudSaveContext)();
      let confirmed = await (0, this.deps.requestGameConfirmation)(`리비전 ${revision}의 저장으로 복구할까요?
현재 저장은 복구 직전 이력으로 보관됩니다.`, {
        title: "클라우드 저장 복구",
        tone: "warning",
        confirmLabel: "복구"
      });
      if (!confirmed || !this.links.session.current(accountContext)) return;
      if (this.deps.cloudState.busy) return (0, this.deps.showGameToast)((0, this.deps._t)("클라우드 작업이 끝난 뒤 다시 눌러 주세요."), "warning");
      return this.restoreVersion(revision, context, accountContext);
    }
    async restoreVersion(revision, context, accountContext) {
      this.deps.cloudState.busy = true;
      (0, this.deps.cancelScheduledCloudSync)();
      try {
        await this.commitCloudSaveRestore(revision, context);
        await this.receiveRestoredCloudSave(accountContext);
      } catch (error) {
        if (!this.links.session.current(accountContext)) return;
        const message = /CLOUD_SAVE_HALL_HISTORY_CONFLICT/.test(String(error.message || error)) ? (0, this.deps._t)("전당 거래 전의 저장으로는 복구할 수 없습니다. 현재 저장은 유지됩니다.") : error.message || error;
        (0, this.deps.showGameToast)((0, this.deps._t)("저장 복구 실패: {value}", { value: message }), "danger");
      } finally {
        if (this.links.session.current(accountContext)) {
          this.deps.cloudState.busy = false;
          (0, this.deps.updateCloudSaveUI)();
        }
      }
    }
    /** The server takes the chosen revision as its newest save (db restore_cloud_save_version), or this throws. */
    async commitCloudSaveRestore(revision, context) {
      (0, this.deps.assertCloudSaveContext)(context);
      let rows = await (0, this.deps.cloudJsonRequest)("/rest/v1/rpc/restore_cloud_save_version", {
        method: "POST",
        expectedUserId: context.userId,
        expectedSessionEpoch: context.sessionEpoch,
        body: { target_revision: revision, expected_revision: (0, this.deps.getLocalCloudRevision)() }
      });
      (0, this.deps.assertCloudSaveContext)(context);
      let result = Array.isArray(rows) ? rows[0] : rows;
      if (!result || result.restored !== true) throw new Error("다른 기기에서 저장이 변경되었습니다. 서버 저장을 다시 불러오세요.");
    }
    /** The restored save comes down. When it cannot, the restore still stands on the server: uploads stop so this device's older copy
     * never goes over it, and the player is told to fetch it (전: "복구 실패"로 보여 옛 사본으로 계속하다 다음 접속에 그 진행이 지워졌다). */
    async receiveRestoredCloudSave(accountContext) {
      const ticket = this.links.dialog.capture();
      try {
        await (0, this.deps.pullCloudSave)({ silent: true });
      } catch (error) {
        this.deps.console.warn("restored cloud save could not be fetched:", error);
        if (!this.links.session.current(accountContext)) return;
        this.deps.cloudState.syncHalted = true;
        (0, this.deps.showGameToast)((0, this.deps._t)("복구는 끝났지만 복구한 저장을 받지 못했습니다. 설정의 서버 저장 다시 받기를 눌러 주세요."), "warning");
        return;
      }
      if (!this.links.session.current(accountContext)) return;
      if (this.links.dialog.current(ticket)) this.links.dialog.closeCloudToolsDialog();
      (0, this.deps.showGameToast)((0, this.deps._t)("선택한 클라우드 저장을 복구했습니다."), "success");
    }
    /** 설정 > 클라우드 세이브의 계정 삭제 단추. 지워지는 것을 알린 뒤 "삭제"를 그대로 쳐야 delete_my_account(db/cloud-and-playtest.sql)를 부른다.
     * 서버가 auth.users 한 줄을 지우면 모든 표가 외래키로 따라 지워지므로 이쪽은 이 기기의 토큰과 그 계정의 저장 칸을 치우고(js/ui.js
     * forgetDeletedAccountSave) 게스트 저장으로 시작 화면을 연다. 게스트 저장은 그대로 있다. */
    async deleteCloudAccount() {
      if (!this.state.active) return;
      const accountContext = this.links.session.capture();
      if (!this.deps.cloudState || !this.deps.cloudState.user) return (0, this.deps.setCloudMessage)((0, this.deps._t)("로그인한 계정이 없습니다."));
      if (this.deps.cloudState.busy) return (0, this.deps.setCloudMessage)((0, this.deps._t)("클라우드 작업이 끝난 뒤 다시 눌러 주세요."));
      if (!await this.confirmAccountDeletion()) return;
      if (!this.links.session.current(accountContext) || this.deps.cloudState.busy) return;
      return this.deleteConfirmedAccount(accountContext);
    }
    async deleteConfirmedAccount(accountContext) {
      let userId = this.deps.cloudState.user.id;
      this.deps.cloudState.busy = true;
      (0, this.deps.setCloudMessage)((0, this.deps._t)("계정을 지우는 중입니다..."));
      (0, this.deps.updateCloudSaveUI)();
      let outcome = await this.requestAccountDeletion(accountContext);
      if (!this.links.session.current(accountContext)) return;
      if (outcome.failed) {
        this.deps.cloudState.busy = false;
        (0, this.deps.updateCloudSaveUI)();
        (0, this.deps.setCloudMessage)((0, this.deps._t)("계정을 지우지 못했습니다: {failed}", { failed: outcome.failed }));
        return (0, this.deps.showGameToast)((0, this.deps._t)("계정을 지우지 못했습니다."), "danger");
      }
      const clearedContext = await this.forgetDeletedAccountSession();
      if (!this.links.session.current(clearedContext)) return;
      this.deps.cloudState.busy = false;
      (0, this.deps.forgetDeletedAccountSave)(userId);
      (0, this.deps.setCloudMessage)(outcome.alreadyGone ? "이미 지워진 계정이라 이 기기의 로그인 정보와 계정 저장을 치웠습니다. 게스트 저장은 그대로 있습니다." : "계정과 클라우드 자료를 지웠습니다. 게스트 저장은 그대로 있습니다.");
      (0, this.deps.showGameToast)((0, this.deps._t)("계정을 지웠습니다."), "success");
    }
    /** 설정 > 클라우드 세이브의 "계정과 데이터 삭제 요청" 링크(2026-10-27 사용자: 로그인한 계정은 게임 안 계정 삭제 창이 바로 열리게): 로그인했으면
     * 메일 대신 계정 삭제(deleteCloudAccount)를 연다. 메일 앱이 없는 PC에서는 메일 링크가 아무 일도 하지 않았다. 로그인하지 않았으면 메일 링크
     * 그대로 간다(서버에 지울 계정이 없다). */
    openAccountDeletionRequest(event) {
      if (!this.state.active) return;
      if (!this.deps.cloudState || !this.deps.cloudState.user) return;
      event.preventDefault();
      this.deleteCloudAccount();
    }
    /** delete_my_account를 부른다. 다른 기기에서 이미 지운 계정(ACCOUNT_NOT_FOUND)은 성공으로 본다: 이 기기의 로그인 정보만 치우면 된다(검토 지적 2026-10-27). */
    async requestAccountDeletion(accountContext) {
      try {
        await this.links.session.request(accountContext, "/rest/v1/rpc/delete_my_account", { method: "POST", body: {} });
        return { alreadyGone: false };
      } catch (error) {
        let message = String(error && error.message || error);
        if (/ACCOUNT_NOT_FOUND/.test(message)) return { alreadyGone: true };
        let known = ACCOUNT_DELETE_ERROR_TEXTS.find(([pattern]) => pattern.test(message));
        return { failed: known ? known[1] : message };
      }
    }
    /** 두 단계 확인: 지워지는 것의 목록, 그 다음 "삭제"를 그대로 쳐야 한다(다른 글은 입력 칸 아래 안내로 막힌다). */
    async confirmAccountDeletion() {
      let agreed = await (0, this.deps.requestGameConfirmation)(
        "이 계정을 지울까요?\n클라우드 저장과 저장 이력, 공개 프로필과 닉네임, 채팅, 전당 전시와 구매, 고스트 기록이 모두 지워지고 되돌릴 수 없습니다.\n이 기기의 게스트 저장은 남습니다.",
        { title: "계정 삭제", tone: "danger", confirmLabel: "계속" }
      );
      if (!agreed) return false;
      let typed = await (0, this.deps.requestGameText)({
        title: "계정 삭제",
        tone: "danger",
        message: "정말 지우려면 삭제 라고 입력해 주세요.",
        placeholder: "삭제",
        maxLength: 10,
        confirmLabel: "영구 삭제",
        validate: (value) => String(value || "").trim() === "삭제" ? true : "삭제 라고 입력해야 지워집니다."
      });
      return typeof typed === "string";
    }
    /** 지워진 계정의 흔적을 이 기기에서 치운다. 먼저 게임 세션을 기다림 없이 비워(clearCloudSessionLocally: 사용자, 토큰, 자동 저장 대기와 타이머)
     * 죽은 토큰으로 나가는 저장이나 갱신이 없게 하고, 그 다음 supabase-js의 세션을 서버에 묻지 않고(local) 지운다. 서버 로그아웃은 부르지 않는다:
     * 계정이 없어 세션도 함께 사라졌고, 부르면 만료 직전 토큰을 갱신하려다 "세션 만료" 경고를 남긴다(검토 지적 2026-10-27).
     * supabase-js의 signOut은 던지지 않고 { error }를 돌려준다. */
    async forgetDeletedAccountSession() {
      if (!this.state.active) return;
      (0, this.deps.clearCloudSessionLocally)();
      const context = this.links.session.capture();
      let client = typeof this.deps.getSupabaseClient === "function" ? (0, this.deps.getSupabaseClient)() : null;
      if (!client) return context;
      try {
        let result = await client.auth.signOut({ scope: "local" });
        if (result && result.error) this.deps.console.warn("supabase local sign-out after deletion failed:", result.error);
      } catch (error) {
        this.deps.console.warn("supabase local sign-out after deletion failed:", error);
      }
      return context;
    }
  };

  // modules/application/cloud-moderation.mjs
  var CloudModeration = class {
    constructor(deps2, links, state2) {
      this.deps = deps2;
      this.links = links;
      this.state = state2;
    }
    /** Fills the watch under the ops tables. Before db/anti-cheat.sql runs, the server has no such function and a note says so. */
    async loadCheatWatch() {
      const accountContext = this.links.session.capture();
      let box = this.deps.document.getElementById("cheat-watch");
      if (!box) return;
      try {
        let data = await this.links.session.request(accountContext, "/rest/v1/rpc/admin_get_cheat_watch", { method: "POST", body: {} });
        box.innerHTML = this.links.opsView.renderCheatWatch(data || {});
      } catch (error) {
        if (!this.links.session.current(accountContext)) return;
        let text = String(error && error.message || error);
        box.innerHTML = /schema cache|could not find|does not exist/i.test(text) ? '<section><h3>치트 감시</h3><p class="cloud-tools-note">Supabase에서 db/anti-cheat.sql을 실행하면 보입니다.</p></section>' : `<section><h3>치트 감시</h3><p class="cloud-tools-error">불러올 수 없습니다: ${this.links.format.cloudToolsEscape(text)}</p></section>`;
      }
    }
    /** Holds or releases one account after a confirmation (db/anti-cheat.sql admin_set_cheat_hold), then reloads the watch. */
    async setCheatHold(button) {
      if (!this.state.active) return;
      const accountContext = this.links.session.capture();
      let held = button.dataset.cheatHeld === "1";
      let confirmed = await (0, this.deps.requestGameConfirmation)(held ? "이 계정의 보류를 풀까요?\n다음 고스트 등록부터 다시 순위에 듭니다.\n닫은 전시는 닫힌 채로 둡니다." : "이 계정을 보류할까요?\n전당 등록과 구매, 고스트 대결, 채팅에서 빠집니다.\n열린 전시는 더 팔리지 않습니다.", {
        title: "치트 감시",
        tone: "warning",
        confirmLabel: held ? "보류 풀기" : "보류"
      });
      if (!confirmed) return;
      try {
        await this.links.session.request(accountContext, "/rest/v1/rpc/admin_set_cheat_hold", {
          method: "POST",
          body: { p_user_id: button.dataset.cheatHold, p_hold: !held, p_note: button.dataset.cheatNote || "" }
        });
        (0, this.deps.showGameToast)(held ? "보류를 풀었습니다." : "계정을 보류했습니다.", "success");
      } catch (error) {
        if (!this.links.session.current(accountContext)) return;
        (0, this.deps.showGameToast)((0, this.deps._t)("보류를 바꾸지 못했습니다: {value}", { value: error.message || error }), "danger");
      }
      await this.loadCheatWatch();
    }
    /** The profile window's 신고 button (js/social.js renderProfileActionsRow): the chosen reason and that player's newest chat row
     * held on this device go to the server (report_player_chat, one report per player per day). Lives here because social.js must not
     * reach the cloud through a ui file. */
    async reportCurrentProfile() {
      if (!this.state.active) return;
      const accountContext = this.links.session.capture();
      let target = this.reportTargetUserId();
      if (!target) return;
      let reason = this.reportReasonValue();
      let confirmed = await (0, this.deps.requestGameConfirmation)(`${this.reportTargetName()} 님을 ${reason} 사유로 신고할까요?
그 사람의 최근 채팅 한 줄이 함께 운영자에게 갑니다.`, {
        title: "신고",
        tone: "warning",
        confirmLabel: "신고"
      });
      if (!confirmed) return;
      try {
        await this.links.session.request(accountContext, "/rest/v1/rpc/report_player_chat", {
          method: "POST",
          body: { p_target_user_id: target, p_reason: reason, p_message_id: this.latestChatRowId(target) }
        });
        (0, this.deps.showGameToast)((0, this.deps._t)("신고를 보냈습니다. 운영자가 확인합니다."), "success");
      } catch (error) {
        if (!this.links.session.current(accountContext)) return;
        (0, this.deps.showGameToast)("신고 실패: " + this.translateReportError(error), "danger");
      }
    }
    /** The shown profile's player, or null when it is mine or there is no login. */
    reportTargetUserId() {
      let target = this.deps.socialState && this.deps.socialState.currentProfileUserId;
      if (!target || !this.deps.cloudState || !this.deps.cloudState.user || target === this.deps.cloudState.user.id) return null;
      return target;
    }
    reportReasonValue() {
      let reasonEl = this.deps.document.getElementById("social-report-reason");
      return reasonEl ? String(reasonEl.value || "기타") : "기타";
    }
    reportTargetName() {
      return this.deps.socialState.currentProfile && this.deps.socialState.currentProfile.nickname || "이 플레이어";
    }
    /** The newest chat row of that player among the rows this device holds, or null. */
    latestChatRowId(userId) {
      let latest = (this.deps.socialState.chatMessages || []).filter((m) => m && String(m.user_id) === String(userId)).reduce((best, m) => !best || Number(m.id) > Number(best.id) ? m : best, null);
      return latest ? Number(latest.id) : null;
    }
    translateReportError(error) {
      let msg = String(error && error.message || error);
      if (/REPORT_ALREADY_SENT/.test(msg)) return "같은 사람은 하루에 한 번만 신고할 수 있습니다.";
      if (/REPORT_DAILY_LIMIT/.test(msg)) return "오늘은 더 신고할 수 없습니다.";
      if (/REPORT_INVALID_TARGET/.test(msg)) return "자기 자신은 신고할 수 없습니다.";
      if (/schema cache|could not find|does not exist/i.test(msg)) return "서버에 신고 기능이 아직 없습니다.";
      return msg;
    }
    /** Clears one account's watch rows of one kind after a confirmation (admin_clear_cheat_flags), then reloads the watch. */
    async clearCheatFlags(button) {
      if (!this.state.active) return;
      const accountContext = this.links.session.capture();
      let confirmed = await (0, this.deps.requestGameConfirmation)("이 계정의 이 종류 감시 기록을 지울까요?\n고스트 기록이면 순위전 점수가 다시 움직입니다.", {
        title: "치트 감시",
        tone: "warning",
        confirmLabel: "지우기"
      });
      if (!confirmed) return;
      try {
        await this.links.session.request(accountContext, "/rest/v1/rpc/admin_clear_cheat_flags", {
          method: "POST",
          body: { p_user_id: button.dataset.cheatClear, p_kind: button.dataset.cheatKind || null }
        });
        (0, this.deps.showGameToast)((0, this.deps._t)("감시 기록을 지웠습니다."), "success");
      } catch (error) {
        if (!this.links.session.current(accountContext)) return;
        (0, this.deps.showGameToast)((0, this.deps._t)("기록을 지우지 못했습니다: {value}", { value: error.message || error }), "danger");
      }
      await this.loadCheatWatch();
    }
    /** The term a click refers to: the row's own term for 빼기, else the input row's text. */
    bannedTermOf(button, remove) {
      if (remove) return String(button.dataset.termRemove || "");
      let input = this.deps.document.getElementById("banned-term-input");
      return String(input && input.value || "").trim();
    }
    bannedTermSpaced() {
      let box = this.deps.document.getElementById("banned-term-spaced");
      return !box || box.checked;
    }
    /** Adds (from the input row) or removes (a row's button) one banned term after a confirmation, then reloads the section. */
    async setBannedTerm(button, remove) {
      if (!this.state.active) return;
      const accountContext = this.links.session.capture();
      let term = this.bannedTermOf(button, remove);
      if (term.length < 2) return (0, this.deps.showGameToast)((0, this.deps._t)("낱말은 2~40자여야 합니다."), "warning");
      let confirmed = await (0, this.deps.requestGameConfirmation)(`금칙어 "${term}"${remove ? "을 뺄까요?" : "을 더할까요?"}`, {
        title: "금칙어",
        tone: "warning",
        confirmLabel: remove ? "빼기" : "더하기"
      });
      if (!confirmed) return;
      try {
        await this.links.session.request(accountContext, "/rest/v1/rpc/admin_set_banned_term", {
          method: "POST",
          body: { p_term: term, p_spaced: this.bannedTermSpaced(), p_remove: !!remove }
        });
        (0, this.deps.showGameToast)(remove ? "금칙어를 뺐습니다." : "금칙어를 더했습니다.", "success");
      } catch (error) {
        if (!this.links.session.current(accountContext)) return;
        (0, this.deps.showGameToast)((0, this.deps._t)("금칙어를 바꾸지 못했습니다: {value}", { value: error.message || error }), "danger");
      }
      await this.loadChatReports();
    }
    /** Fills the chat reports under the watch. Before db/multiplayer-hardening-20261027.sql runs, the server has no such function and a note says so. */
    async loadChatReports() {
      const accountContext = this.links.session.capture();
      let box = this.deps.document.getElementById("chat-reports");
      if (!box) return;
      try {
        let data = await this.links.session.request(accountContext, "/rest/v1/rpc/admin_get_chat_reports", { method: "POST", body: {} });
        let terms = await this.links.session.request(accountContext, "/rest/v1/rpc/admin_get_banned_terms", { method: "POST", body: {} }).catch((error) => {
          this.deps.console.warn("banned terms lookup failed:", error);
          return null;
        });
        if (!this.links.session.current(accountContext)) return;
        box.innerHTML = this.links.opsView.renderChatReports(Object.assign({}, data || {}, { terms }));
      } catch (error) {
        if (!this.links.session.current(accountContext)) return;
        let text = String(error && error.message || error);
        box.innerHTML = /schema cache|could not find|does not exist/i.test(text) ? '<section><h3>채팅 신고</h3><p class="cloud-tools-note">Supabase에서 db/multiplayer-hardening-20261027.sql을 실행하면 보입니다.</p></section>' : `<section><h3>채팅 신고</h3><p class="cloud-tools-error">불러올 수 없습니다: ${this.links.format.cloudToolsEscape(text)}</p></section>`;
      }
    }
    /** Mutes or unmutes the account whose nickname is in the input row (admin_set_chat_mute_by_nickname): accounts without a report row. */
    async setChatMuteByNickname(button) {
      if (!this.state.active) return;
      const accountContext = this.links.session.capture();
      let input = this.deps.document.getElementById("chat-mute-nickname");
      let nickname = String(input && input.value || "").trim();
      if (!nickname) return (0, this.deps.showGameToast)((0, this.deps._t)("닉네임을 넣어 주세요."), "warning");
      let minutes = Math.max(0, Math.floor(Number(button.dataset.muteNick) || 0));
      let confirmed = await (0, this.deps.requestGameConfirmation)(this.muteConfirmText(nickname, minutes), { title: "채팅 신고", tone: "warning", confirmLabel: minutes ? "금지" : "풀기" });
      if (!confirmed) return;
      return this.muteByNickname(accountContext, nickname, minutes);
    }
    async muteByNickname(accountContext, nickname, minutes) {
      try {
        await this.links.session.request(accountContext, "/rest/v1/rpc/admin_set_chat_mute_by_nickname", { method: "POST", body: { p_nickname: nickname, p_minutes: minutes, p_note: "" } });
        (0, this.deps.showGameToast)(minutes ? "채팅을 금지했습니다." : "채팅 금지를 풀었습니다.", "success");
        await this.loadChatReports();
      } catch (error) {
        if (!this.links.session.current(accountContext)) return;
        (0, this.deps.showGameToast)(this.describeMuteError(error), "danger");
      }
    }
    muteConfirmText(name, minutes) {
      return minutes ? `${name} 계정의 채팅을 ${minutes >= 10080 ? "7일" : "1일"} 동안 금지할까요?` : `${name} 계정의 채팅 금지를 풀까요?`;
    }
    describeMuteError(error) {
      let text = String(error && error.message || error);
      return /PLAYER_NOT_FOUND/.test(text) ? "그 닉네임의 플레이어가 없습니다." : `금지를 바꾸지 못했습니다: ${text}`;
    }
    /** The reported player's newest chat rows (readable by any signed-in user) under the report table, with 줄 지우기 buttons. */
    async peekPlayerChat(button) {
      if (!this.state.active) return;
      const accountContext = this.links.session.capture();
      let box = this.deps.document.getElementById("chat-peek");
      if (!box) return;
      box.dataset.peekUser = button.dataset.chatPeek;
      box.dataset.peekName = button.dataset.chatName || "";
      box.innerHTML = '<p class="cloud-tools-empty">불러오는 중…</p>';
      try {
        let rows = await this.links.session.request(accountContext, `/rest/v1/chat_messages?select=id,body,created_at&user_id=eq.${encodeURIComponent(button.dataset.chatPeek)}&order=id.desc&limit=15`, {});
        box.innerHTML = this.links.opsView.renderChatPeek(button.dataset.chatName || "", Array.isArray(rows) ? rows : []);
      } catch (error) {
        if (!this.links.session.current(accountContext)) return;
        box.innerHTML = `<p class="cloud-tools-error">최근 채팅을 불러오지 못했습니다: ${this.links.format.cloudToolsEscape(error.message || error)}</p>`;
      }
    }
    /** Mutes (1 or 7 days) or unmutes one account after a confirmation (admin_set_chat_mute), then reloads the reports. */
    async setChatMute(button) {
      if (!this.state.active) return;
      const accountContext = this.links.session.capture();
      let minutes = Math.max(0, Math.floor(Number(button.dataset.chatMinutes) || 0));
      let name = button.dataset.chatName || "이 계정";
      let confirmed = await (0, this.deps.requestGameConfirmation)(this.muteConfirmText(name, minutes), { title: "채팅 신고", tone: "warning", confirmLabel: minutes ? "금지" : "풀기" });
      if (!confirmed) return;
      try {
        await this.links.session.request(accountContext, "/rest/v1/rpc/admin_set_chat_mute", {
          method: "POST",
          body: { p_user_id: button.dataset.chatMute, p_minutes: minutes, p_note: "" }
        });
        (0, this.deps.showGameToast)(minutes ? "채팅을 금지했습니다." : "채팅 금지를 풀었습니다.", "success");
      } catch (error) {
        if (!this.links.session.current(accountContext)) return;
        (0, this.deps.showGameToast)((0, this.deps._t)("금지를 바꾸지 못했습니다: {value}", { value: error.message || error }), "danger");
      }
      await this.loadChatReports();
    }
    /** Deletes one chat row after a confirmation (admin_delete_chat_message): from the ops window's reports and peek lists, or from a line
     * of the chat window in the admin view (js/social.js renderChatMessages). The row leaves this chat at once; the ops lists reload. */
    async deleteChatMessage(button) {
      if (!this.state.active) return;
      const accountContext = this.links.session.capture();
      let inOps = !!button.closest("#cloud-tools-dialog");
      let confirmed = await (0, this.deps.requestGameConfirmation)("이 채팅 줄을 지울까요?\n모든 플레이어의 채팅창에서 사라집니다.", {
        title: inOps ? "채팅 신고" : "채팅",
        tone: "warning",
        confirmLabel: "지우기"
      });
      if (!confirmed) return;
      return this.deleteConfirmedChatMessage(button, inOps, accountContext);
    }
    async deleteConfirmedChatMessage(button, inOps, accountContext) {
      let id = Number(button.dataset.chatDelete), peek = button.closest("#chat-peek");
      try {
        let result = await this.links.session.request(accountContext, "/rest/v1/rpc/admin_delete_chat_message", { method: "POST", body: { p_message_id: id } });
        let gone = result && result.deleted === false;
        (0, this.deps.forgetSocialChatMessages)([id]);
        (0, this.deps.showGameToast)(gone ? "이미 지워진 줄입니다." : "채팅 줄을 지웠습니다.", gone ? "warning" : "success");
      } catch (error) {
        if (!this.links.session.current(accountContext)) return;
        (0, this.deps.showGameToast)((0, this.deps._t)("줄을 지우지 못했습니다: {value}", { value: error.message || error }), "danger");
      }
      if (!inOps) return;
      await this.loadChatReports();
      if (peek) await this.peekPlayerChat({ dataset: { chatPeek: peek.dataset.peekUser, chatName: peek.dataset.peekName } });
    }
    /** Empties the whole chat after a confirmation (db/admin-gate-chat-clear-20261027.sql admin_clear_chat). Report rows keep their own
     * copy of the reported lines; the reports and peek lists reload so no 줄 지우기 button points at a row that is gone. */
    async clearAllChat() {
      if (!this.state.active) return;
      const accountContext = this.links.session.capture();
      let confirmed = await (0, this.deps.requestGameConfirmation)("채팅을 모두 지울까요?\n모든 플레이어의 채팅창이 비고, 되돌릴 수 없습니다.", {
        title: "채팅 전체 비우기",
        tone: "danger",
        confirmLabel: "모두 지우기"
      });
      if (!confirmed) return;
      try {
        let result = await this.links.session.request(accountContext, "/rest/v1/rpc/admin_clear_chat", { method: "POST", body: {} });
        (0, this.deps.forgetSocialChatMessages)();
        (0, this.deps.showGameToast)((0, this.deps._t)("채팅 {value}줄을 지웠습니다.", { value: this.links.format.cloudToolsNumber(result && result.deleted) }), "success");
      } catch (error) {
        if (!this.links.session.current(accountContext)) return;
        let text = String(error && error.message || error);
        (0, this.deps.showGameToast)(/schema cache|could not find|does not exist/i.test(text) ? "서버에 채팅 비우기 기능이 아직 없습니다. db/admin-gate-chat-clear-20261027.sql을 실행해야 합니다." : `채팅을 비우지 못했습니다: ${text}`, "danger");
        return;
      }
      await this.loadChatReports();
    }
  };

  // modules/application/cloud-feedback.mjs
  var CloudFeedback = class {
    constructor(deps2, links, state2) {
      this.deps = deps2;
      this.links = links;
      this.state = state2;
      this.adminListVersion = 0;
    }
    /** 설정 > 문의와 제보의 단추. 보내는 칸과 내가 보낸 글(운영자 답변 포함)을 한 창에 보인다. 로그인한 계정만 보낼 수 있다. */
    async openFeedbackDialog() {
      if (!this.state.active) return;
      this.links.dialog.openCloudToolsDialog("문의와 제보", this.links.feedbackView.renderFeedbackForm());
      if (this.deps.cloudState && this.deps.cloudState.user) await this.loadMyFeedback();
    }
    /** 상황 정보: 오류 보고와 같은 묶음(js/playtest-telemetry.js getClientDiagnosticContext)에 화면 크기와 브라우저를 더한다. */
    feedbackContext() {
      let context = typeof this.deps.getClientDiagnosticContext === "function" ? (0, this.deps.getClientDiagnosticContext)() : {};
      return Object.assign({}, context, { screen: `${this.deps.window.innerWidth}x${this.deps.window.innerHeight}`, userAgent: String(this.deps.navigator.userAgent || "").slice(0, 200) });
    }
    async submitPlayerFeedback(button) {
      if (!this.state.active) return;
      const accountContext = this.links.session.capture();
      const input = this.deps.document.getElementById("feedback-body");
      let body = input.value.trim();
      if (body.length < 5) return (0, this.deps.showGameToast)((0, this.deps._t)("내용을 5자 이상 적어 주세요."), "warning");
      button.disabled = true;
      try {
        await this.links.session.request(accountContext, "/rest/v1/rpc/submit_player_feedback", { method: "POST", body: {
          p_kind: this.deps.document.getElementById("feedback-kind").value,
          p_body: body,
          p_contact: this.deps.document.getElementById("feedback-contact").value.trim(),
          p_context: this.feedbackContext(),
          p_app_version: typeof this.deps.getPlaytestBuildVersion === "function" ? (0, this.deps.getPlaytestBuildVersion)() : ""
        } });
        this.clearSubmittedDraft(input, body);
        (0, this.deps.showGameToast)((0, this.deps._t)("보냈습니다. 답변은 이 창에서 볼 수 있습니다."), "success");
        await this.loadMyFeedback();
      } catch (error) {
        if (!this.links.session.current(accountContext)) return;
        (0, this.deps.showGameToast)(this.describeFeedbackError(error), "danger");
      } finally {
        button.disabled = false;
      }
    }
    clearSubmittedDraft(input, body) {
      if (input === this.deps.document.getElementById("feedback-body") && input.value.trim() === body) input.value = "";
    }
    describeFeedbackError(error) {
      let message = String(error && error.message || error);
      let known = FEEDBACK_ERROR_TEXTS.find(([pattern]) => pattern.test(message));
      return known ? known[1] : `보내지 못했습니다: ${message}`;
    }
    async loadMyFeedback() {
      const accountContext = this.links.session.capture();
      let box = this.deps.document.getElementById("my-feedback");
      if (!box) return;
      try {
        let rows = await this.links.session.request(accountContext, "/rest/v1/rpc/get_my_feedback", { method: "POST", body: {} });
        box.innerHTML = this.links.feedbackView.renderMyFeedback(Array.isArray(rows) ? rows : []);
      } catch (error) {
        if (!this.links.session.current(accountContext)) return;
        box.innerHTML = `<section><h3>내가 보낸 글</h3><p class="cloud-tools-error">불러올 수 없습니다: ${this.links.format.cloudToolsEscape(error.message || error)}</p></section>`;
      }
    }
    /** 운영 창의 문의 목록(admin_get_feedback). 상태 필터는 adminFeedbackFilter에 남아 저장 뒤에도 같은 목록을 다시 보인다. */
    async loadAdminFeedback() {
      const version = ++this.adminListVersion;
      const accountContext = this.links.session.capture();
      let box = this.deps.document.getElementById("admin-feedback");
      if (!box) return;
      try {
        let rows = await this.links.session.request(accountContext, "/rest/v1/rpc/admin_get_feedback", { method: "POST", body: { p_status: this.state.adminFeedbackFilter || null } });
        if (version !== this.adminListVersion) return;
        box.innerHTML = this.links.feedbackView.renderAdminFeedback(Array.isArray(rows) ? rows : []);
      } catch (error) {
        if (!this.links.session.current(accountContext)) return;
        if (version !== this.adminListVersion) return;
        box.innerHTML = this.links.format.renderSectionError("문의와 제보", error);
      }
    }
    setAdminFeedbackFilter(button) {
      if (!this.state.active) return;
      this.state.adminFeedbackFilter = button.dataset.feedbackFilter === "all" ? "" : button.dataset.feedbackFilter;
      return this.loadAdminFeedback();
    }
    setFeedbackStatus(button) {
      if (!this.state.active) return;
      return this.updateFeedback({ p_id: Number(button.dataset.feedbackStatus), p_status: button.dataset.status });
    }
    /** 답변 저장. 새 글이었으면 확인함으로 넘긴다(답변을 봤다는 뜻). */
    replyFeedback(button) {
      if (!this.state.active) return;
      let id = Number(button.dataset.feedbackReply);
      let reply = this.deps.document.getElementById(`feedback-reply-${id}`).value.trim();
      return this.updateFeedback({ p_id: id, p_reply: reply, p_status: button.dataset.statusNow === "new" ? "seen" : null });
    }
    async updateFeedback(body) {
      const accountContext = this.links.session.capture();
      try {
        await this.links.session.request(accountContext, "/rest/v1/rpc/admin_set_feedback", { method: "POST", body });
        (0, this.deps.showGameToast)((0, this.deps._t)("저장했습니다."), "success");
      } catch (error) {
        if (!this.links.session.current(accountContext)) return;
        (0, this.deps.showGameToast)((0, this.deps._t)("저장하지 못했습니다: {value}", { value: error.message || error }), "danger");
      }
      await this.loadAdminFeedback();
    }
  };

  // modules/application/cloud-player-lookup.mjs
  var CloudPlayerLookup = class {
    constructor(deps2, links, state2) {
      this.deps = deps2;
      this.links = links;
      this.state = state2;
      this.downloads = /* @__PURE__ */ new Map();
      this.searchVersion = 0;
      this.detailVersion = 0;
    }
    async searchPlayers() {
      if (!this.state.active) return;
      const version = ++this.searchVersion;
      const accountContext = this.links.session.capture();
      let box = this.deps.document.getElementById("player-results");
      if (!box) return;
      let input = this.deps.document.getElementById("player-query");
      box.innerHTML = '<p class="cloud-tools-empty">찾는 중…</p>';
      try {
        let rows = await this.links.session.request(accountContext, "/rest/v1/rpc/admin_search_players", { method: "POST", body: { p_query: input ? input.value.trim() : "", p_limit: 50 } });
        if (!this.canShowResult(box, version, this.searchVersion)) return;
        box.innerHTML = this.links.playerView.renderPlayerRows(Array.isArray(rows) ? rows : []);
      } catch (error) {
        if (!this.links.session.current(accountContext)) return;
        if (!this.canShowResult(box, version, this.searchVersion)) return;
        box.innerHTML = this.links.format.renderSectionError("플레이어", error);
      }
    }
    async openPlayerDetail(button) {
      if (!this.state.active) return;
      const version = ++this.detailVersion;
      const accountContext = this.links.session.capture();
      let box = this.deps.document.getElementById("player-detail");
      if (!box) return;
      this.state.playerDetailUserId = button.dataset.playerDetail;
      box.innerHTML = '<section><h3>자세히</h3><p class="cloud-tools-empty">불러오는 중…</p></section>';
      try {
        let data = await this.links.session.request(accountContext, "/rest/v1/rpc/admin_get_player", { method: "POST", body: { p_user_id: button.dataset.playerDetail } });
        if (!this.canShowResult(box, version, this.detailVersion)) return;
        box.innerHTML = this.links.playerView.renderPlayerDetail(data || {});
        box.scrollIntoView({ block: "start" });
      } catch (error) {
        if (!this.links.session.current(accountContext)) return;
        if (!this.canShowResult(box, version, this.detailVersion)) return;
        box.innerHTML = `<section><h3>자세히</h3><p class="cloud-tools-error">불러올 수 없습니다: ${this.links.format.cloudToolsEscape(error.message || error)}</p></section>`;
      }
    }
    /** 보류, 금지, 기록 지우기 뒤: 플레이어 표가 있으면 다시 찾고, 자세히 보기가 열려 있으면 다시 불러온다. */
    async refreshPlayerViews() {
      if (this.deps.document.getElementById("player-results")) await this.searchPlayers();
      if (this.state.playerDetailUserId && this.deps.document.getElementById("player-detail")) await this.openPlayerDetail({ dataset: { playerDetail: this.state.playerDetailUserId } });
    }
    /** 저장 JSON 전체를 파일로 내려받는다(버그 재현용). */
    async downloadPlayerSave(button) {
      if (!this.state.active) return;
      const accountContext = this.links.session.capture();
      try {
        let data = await this.links.session.request(accountContext, "/rest/v1/rpc/admin_get_player_save", { method: "POST", body: { p_user_id: button.dataset.playerSave } });
        let link = this.deps.document.createElement("a");
        link.href = this.deps.URL.createObjectURL(new this.deps.Blob([JSON.stringify(data)], { type: "application/json" }));
        const url = link.href;
        this.downloads.set(url, this.deps.setTimeout(() => this.releaseDownload(url), 1e3));
        link.download = `rignin-save-${String(button.dataset.playerName || button.dataset.playerSave).replace(/[^\w가-힣-]+/g, "_")}-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
        this.deps.document.body.appendChild(link);
        link.click();
        link.remove();
        (0, this.deps.showGameToast)((0, this.deps._t)("저장 파일을 내려받았습니다."), "success");
      } catch (error) {
        if (!this.links.session.current(accountContext)) return;
        (0, this.deps.showGameToast)((0, this.deps._t)("저장을 받지 못했습니다: {value}", { value: error.message || error }), "danger");
      }
    }
    canShowResult(box, version, currentVersion) {
      return version === currentVersion && box.isConnected;
    }
    releaseDownload(url) {
      this.deps.clearTimeout(this.downloads.get(url));
      this.downloads.delete(url);
      this.deps.URL.revokeObjectURL(url);
    }
    dispose() {
      this.searchVersion++;
      this.detailVersion++;
      for (const url of this.downloads.keys()) this.releaseDownload(url);
    }
  };

  // modules/application/cloud-ops-dashboard.mjs
  var CloudOpsDashboard = class {
    constructor(deps2, links, state2) {
      this.deps = deps2;
      this.links = links;
      this.state = state2;
    }
    /** 운영 창. 뼈대(할 일 띠, 지표, 경고 자리와 접힌 절들)를 먼저 그리고 RPC 여섯을 한꺼번에 불러 채운다(전: 하나씩 차례로).
     * 할 일이 있는 절만 펼쳐진 채 열린다. */
    async openOpsDashboard() {
      if (!this.state.active) return;
      const accountContext = this.links.session.capture();
      if (!this.deps.cloudState || !this.deps.cloudState.user) return (0, this.deps.showGameToast)((0, this.deps._t)("관리자 로그인이 필요합니다."), "warning");
      const ticket = this.links.dialog.openCloudToolsDialog("운영 창", this.links.opsView.renderOpsShell());
      let [overview, dashboard2] = await Promise.all([
        this.links.session.request(accountContext, "/rest/v1/rpc/admin_get_ops_overview", { method: "POST", body: {} }).catch((error) => ({ error })),
        this.links.session.request(accountContext, "/rest/v1/rpc/admin_get_ops_dashboard", { method: "POST", body: {} }).catch((error) => ({ error })),
        this.links.moderation.loadCheatWatch(),
        this.links.moderation.loadChatReports(),
        this.links.feedback.loadAdminFeedback(),
        this.links.players.searchPlayers()
      ]);
      if (this.links.session.current(accountContext) && this.links.dialog.current(ticket)) this.renderOpsTop(overview || {}, dashboard2 || {});
    }
    /** 절 이동 칩과 할 일 띠의 단추: 접힌 절을 펼치고 거기로 내린다. */
    jumpToOpsSection(button) {
      if (!this.state.active) return;
      let section = this.deps.document.getElementById(button.dataset.opsJump);
      if (!section) return;
      section.open = true;
      section.scrollIntoView({ block: "start", behavior: "smooth" });
    }
    /** 맨 위: 할 일 띠, 지표 카드, 경고 표, 묶은 오류. 통계 절의 몸통도 여기서 채운다. 할 일이 있는 절은 펼쳐 둔다. */
    renderOpsTop(overview, dashboard2) {
      let top = this.deps.document.getElementById("ops-top");
      if (!top) return;
      top.innerHTML = this.links.opsView.renderOpsHead(overview) + this.links.opsView.renderOpsAlertBlock(overview, dashboard2);
      let stats = this.deps.document.getElementById("ops-stats-body");
      if (stats) stats.innerHTML = dashboard2.error ? this.links.format.renderSectionError("전투 통계", dashboard2.error) : this.links.opsView.renderOpsStats(dashboard2);
      this.openSectionsWithTodo(overview.todo || {});
    }
    openSectionsWithTodo(todo) {
      let open = new Set(OPS_TODO_ITEMS.filter(([key]) => Number(todo[key]) > 0).map(([, , section]) => section));
      for (const [id] of OPS_SECTIONS) {
        let section = this.deps.document.getElementById(id);
        if (section) section.open = open.has(id);
      }
    }
  };

  // modules/ui/cloud-tools-controller.mjs
  var PLAYER_STATE_ACTIONS = /* @__PURE__ */ new Set(["cheatHold", "cheatClear", "chatMute", "muteNick"]);
  var CloudToolsController = class {
    constructor(deps2, links, state2) {
      this.deps = deps2;
      this.links = links;
      this.state = state2;
      this.installed = false;
      this.ready = false;
      this.saveButton = null;
      this.actions = this.createActions();
      this.selector = this.actions.map(([key]) => `[data-${key.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase())}]`).join(", ");
      this.onReady = () => this.initializeCloudTools();
      this.onClick = (event) => this.handleClick(event);
      this.onKey = (event) => this.handleKey(event);
      this.onSave = () => this.saveManually();
    }
    createActions() {
      const { moderation: m, feedback: f, players: p, dashboard: d } = this.links;
      return [
        ["cheatHold", m.setCheatHold.bind(m)],
        ["cheatClear", m.clearCheatFlags.bind(m)],
        ["chatMute", m.setChatMute.bind(m)],
        ["chatDelete", m.deleteChatMessage.bind(m)],
        ["chatClear", m.clearAllChat.bind(m)],
        ["termAdd", (button) => m.setBannedTerm(button, false)],
        ["termRemove", (button) => m.setBannedTerm(button, true)],
        ["muteNick", m.setChatMuteByNickname.bind(m)],
        ["chatPeek", m.peekPlayerChat.bind(m)],
        ["feedbackSend", f.submitPlayerFeedback.bind(f)],
        ["feedbackFilter", f.setAdminFeedbackFilter.bind(f)],
        ["feedbackStatus", f.setFeedbackStatus.bind(f)],
        ["feedbackReply", f.replyFeedback.bind(f)],
        ["playerSearch", p.searchPlayers.bind(p)],
        ["playerDetail", p.openPlayerDetail.bind(p)],
        ["playerSave", p.downloadPlayerSave.bind(p)],
        ["opsJump", d.jumpToOpsSection.bind(d)]
      ];
    }
    install() {
      if (this.installed || !this.state.active) return;
      this.installed = true;
      if (this.deps.document.readyState === "loading") this.deps.document.addEventListener("DOMContentLoaded", this.onReady, { once: true });
      else this.initializeCloudTools();
    }
    initializeCloudTools() {
      if (!this.state.active) return;
      this.links.dialog.injectCloudToolsStyles();
      if (!this.ready) {
        this.ready = true;
        this.deps.document.addEventListener("click", this.onClick);
        this.deps.document.addEventListener("keydown", this.onKey);
      }
      const saveButton = this.deps.document.querySelector(".cfg-btn--save");
      if (saveButton !== this.saveButton) {
        this.saveButton?.removeEventListener("click", this.onSave);
        this.saveButton = saveButton;
        this.saveButton?.addEventListener("click", this.onSave);
      }
      const adminButton = this.deps.document.getElementById("btn-ops-dashboard");
      if (adminButton && new this.deps.URLSearchParams(this.deps.location.search).get("admin") === "1") adminButton.hidden = false;
    }
    handleClick(event) {
      if (!this.state.active || !event.target.closest?.("#cloud-tools-dialog")) return;
      const button = event.target.closest(this.selector);
      if (!button) return;
      const action = this.actions.find(([key]) => button.dataset[key] !== void 0);
      if (action) this.runAction(action, button);
    }
    handleKey(event) {
      if (event.key !== "Enter" || event.isComposing || event.target.id !== "player-query") return;
      if (!event.target.closest("#cloud-tools-dialog")) return;
      this.runAction(this.actions.find(([key]) => key === "playerSearch"), event.target);
    }
    async runAction([key, action], button) {
      if (!this.state.active) return;
      const context = this.links.session.capture();
      try {
        await action(button);
        if (this.links.session.current(context) && PLAYER_STATE_ACTIONS.has(key)) await this.links.players.refreshPlayerViews();
      } catch (error) {
        this.deps.console.warn("cloud tools action failed:", error);
      }
    }
    saveManually() {
      if (!this.state.active) return;
      try {
        const saved = this.deps.saveGame({ manual: true });
        const message = saved ? "이 기기에 진행을 저장했습니다." : this.deps.getLocalSaveStatus().message || "진행 정산 또는 저장 복구를 마친 뒤 다시 눌러 주세요.";
        this.deps.showGameToast(message, { tone: saved ? "success" : "warning", duration: saved ? 2400 : 6e3 });
      } catch (error) {
        this.deps.console.error("[save-ui] 수동 저장 실패:", error);
        this.deps.showGameToast(this.deps._t("저장에 실패했습니다. 게임을 닫지 말고 다시 시도해 주세요."), { tone: "danger", duration: 6e3 });
      }
    }
    dispose() {
      if (!this.state.active) return;
      this.state.active = false;
      this.deps.document.removeEventListener("DOMContentLoaded", this.onReady);
      this.deps.document.removeEventListener("click", this.onClick);
      this.deps.document.removeEventListener("keydown", this.onKey);
      this.saveButton?.removeEventListener("click", this.onSave);
      this.saveButton = null;
      this.links.dialog.dispose();
      this.links.players.dispose();
    }
  };

  // modules/cloud-tools-ui-classic.mjs
  var state = { active: true, adminFeedbackFilter: "", playerDetailUserId: null };
  var deps = {
    get clearTimeout() {
      return windowClearTimeout;
    },
    get Blob() {
      return typeof Blob === "undefined" ? void 0 : Blob;
    },
    get CLASS_TEMPLATES() {
      return typeof CLASS_TEMPLATES === "undefined" ? void 0 : CLASS_TEMPLATES;
    },
    get URL() {
      return typeof URL === "undefined" ? void 0 : URL;
    },
    get URLSearchParams() {
      return typeof URLSearchParams === "undefined" ? void 0 : URLSearchParams;
    },
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get assertCloudSaveContext() {
      return typeof assertCloudSaveContext === "undefined" ? void 0 : assertCloudSaveContext;
    },
    get cancelScheduledCloudSync() {
      return typeof cancelScheduledCloudSync === "undefined" ? void 0 : cancelScheduledCloudSync;
    },
    get captureCloudSaveContext() {
      return typeof captureCloudSaveContext === "undefined" ? void 0 : captureCloudSaveContext;
    },
    get clearCloudSessionLocally() {
      return typeof clearCloudSessionLocally === "undefined" ? void 0 : clearCloudSessionLocally;
    },
    get cloudJsonRequest() {
      return typeof cloudJsonRequest === "undefined" ? void 0 : cloudJsonRequest;
    },
    get cloudState() {
      return typeof cloudState === "undefined" ? void 0 : cloudState;
    },
    get console() {
      return typeof console === "undefined" ? void 0 : console;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get escapeHTML() {
      return typeof escapeHTML === "undefined" ? void 0 : escapeHTML;
    },
    get forgetDeletedAccountSave() {
      return typeof forgetDeletedAccountSave === "undefined" ? void 0 : forgetDeletedAccountSave;
    },
    get forgetSocialChatMessages() {
      return typeof forgetSocialChatMessages === "undefined" ? void 0 : forgetSocialChatMessages;
    },
    get getClientDiagnosticContext() {
      return typeof getClientDiagnosticContext === "undefined" ? void 0 : getClientDiagnosticContext;
    },
    get getLocalCloudRevision() {
      return typeof getLocalCloudRevision === "undefined" ? void 0 : getLocalCloudRevision;
    },
    get getLocalSaveStatus() {
      return typeof getLocalSaveStatus === "undefined" ? void 0 : getLocalSaveStatus;
    },
    get getPlaytestBuildVersion() {
      return typeof getPlaytestBuildVersion === "undefined" ? void 0 : getPlaytestBuildVersion;
    },
    get getSupabaseClient() {
      return typeof getSupabaseClient === "undefined" ? void 0 : getSupabaseClient;
    },
    get i18n() {
      return typeof i18n === "undefined" ? void 0 : i18n;
    },
    get location() {
      return typeof location === "undefined" ? void 0 : location;
    },
    get navigator() {
      return typeof navigator === "undefined" ? void 0 : navigator;
    },
    get pullCloudSave() {
      return typeof pullCloudSave === "undefined" ? void 0 : pullCloudSave;
    },
    get requestGameConfirmation() {
      return typeof requestGameConfirmation === "undefined" ? void 0 : requestGameConfirmation;
    },
    get requestGameText() {
      return typeof requestGameText === "undefined" ? void 0 : requestGameText;
    },
    get saveGame() {
      return typeof saveGame === "undefined" ? void 0 : saveGame;
    },
    get setCloudMessage() {
      return typeof setCloudMessage === "undefined" ? void 0 : setCloudMessage;
    },
    get setTimeout() {
      return typeof setTimeout === "undefined" ? void 0 : windowSetTimeout;
    },
    get showGameToast() {
      return typeof showGameToast === "undefined" ? void 0 : showGameToast;
    },
    get socialState() {
      return typeof socialState === "undefined" ? void 0 : socialState;
    },
    get updateCloudSaveUI() {
      return typeof updateCloudSaveUI === "undefined" ? void 0 : updateCloudSaveUI;
    },
    get window() {
      return typeof window === "undefined" ? void 0 : window;
    }
  };
  var session = new CloudAccountRequest(window.GameModules.cloudAccountState, state, (path, options) => cloudJsonRequest(path, options));
  var format = new CloudToolsFormat(deps, {}, state);
  var playerView = new CloudPlayerView(deps, { format }, state);
  var opsView = new CloudOpsView(deps, { format, playerView }, state);
  var feedbackView = new CloudFeedbackView(deps, { format }, state);
  var dialog = new CloudToolsDialog(deps, {}, state);
  var maintenance = new CloudAccountMaintenance(deps, { session, dialog, format }, state);
  var moderation = new CloudModeration(deps, { session, opsView, format }, state);
  var feedback = new CloudFeedback(deps, { session, dialog, feedbackView, format }, state);
  var players = new CloudPlayerLookup(deps, { session, playerView, format }, state);
  var dashboard = new CloudOpsDashboard(deps, { session, dialog, opsView, moderation, feedback, players, format }, state);
  var controller = new CloudToolsController(deps, { dialog, moderation, feedback, players, dashboard, session }, state);
  window.GameModules.cloudTools = Object.freeze({
    dispose: () => controller.dispose(),
    closeCloudToolsDialog: dialog.closeCloudToolsDialog.bind(dialog),
    openCloudSaveHistory: maintenance.openCloudSaveHistory.bind(maintenance),
    restoreCloudSaveVersion: maintenance.restoreCloudSaveVersion.bind(maintenance),
    deleteCloudAccount: maintenance.deleteCloudAccount.bind(maintenance),
    openAccountDeletionRequest: maintenance.openAccountDeletionRequest.bind(maintenance),
    forgetDeletedAccountSession: maintenance.forgetDeletedAccountSession.bind(maintenance),
    setCheatHold: moderation.setCheatHold.bind(moderation),
    reportCurrentProfile: moderation.reportCurrentProfile.bind(moderation),
    clearCheatFlags: moderation.clearCheatFlags.bind(moderation),
    setBannedTerm: moderation.setBannedTerm.bind(moderation),
    setChatMuteByNickname: moderation.setChatMuteByNickname.bind(moderation),
    peekPlayerChat: moderation.peekPlayerChat.bind(moderation),
    setChatMute: moderation.setChatMute.bind(moderation),
    deleteChatMessage: moderation.deleteChatMessage.bind(moderation),
    clearAllChat: moderation.clearAllChat.bind(moderation),
    openOpsDashboard: dashboard.openOpsDashboard.bind(dashboard),
    jumpToOpsSection: dashboard.jumpToOpsSection.bind(dashboard),
    openFeedbackDialog: feedback.openFeedbackDialog.bind(feedback),
    submitPlayerFeedback: feedback.submitPlayerFeedback.bind(feedback),
    setAdminFeedbackFilter: feedback.setAdminFeedbackFilter.bind(feedback),
    setFeedbackStatus: feedback.setFeedbackStatus.bind(feedback),
    replyFeedback: feedback.replyFeedback.bind(feedback),
    searchPlayers: players.searchPlayers.bind(players),
    openPlayerDetail: players.openPlayerDetail.bind(players),
    downloadPlayerSave: players.downloadPlayerSave.bind(players),
    initializeCloudTools: controller.initializeCloudTools.bind(controller)
  });
  safeExposeGlobals({
    closeCloudToolsDialog: window.GameModules.cloudTools.closeCloudToolsDialog,
    openCloudSaveHistory: window.GameModules.cloudTools.openCloudSaveHistory,
    restoreCloudSaveVersion: window.GameModules.cloudTools.restoreCloudSaveVersion,
    deleteCloudAccount: window.GameModules.cloudTools.deleteCloudAccount,
    openAccountDeletionRequest: window.GameModules.cloudTools.openAccountDeletionRequest,
    forgetDeletedAccountSession: window.GameModules.cloudTools.forgetDeletedAccountSession,
    setCheatHold: window.GameModules.cloudTools.setCheatHold,
    reportCurrentProfile: window.GameModules.cloudTools.reportCurrentProfile,
    clearCheatFlags: window.GameModules.cloudTools.clearCheatFlags,
    setBannedTerm: window.GameModules.cloudTools.setBannedTerm,
    setChatMuteByNickname: window.GameModules.cloudTools.setChatMuteByNickname,
    peekPlayerChat: window.GameModules.cloudTools.peekPlayerChat,
    setChatMute: window.GameModules.cloudTools.setChatMute,
    deleteChatMessage: window.GameModules.cloudTools.deleteChatMessage,
    clearAllChat: window.GameModules.cloudTools.clearAllChat,
    openOpsDashboard: window.GameModules.cloudTools.openOpsDashboard,
    jumpToOpsSection: window.GameModules.cloudTools.jumpToOpsSection,
    openFeedbackDialog: window.GameModules.cloudTools.openFeedbackDialog,
    submitPlayerFeedback: window.GameModules.cloudTools.submitPlayerFeedback,
    setAdminFeedbackFilter: window.GameModules.cloudTools.setAdminFeedbackFilter,
    setFeedbackStatus: window.GameModules.cloudTools.setFeedbackStatus,
    replyFeedback: window.GameModules.cloudTools.replyFeedback,
    searchPlayers: window.GameModules.cloudTools.searchPlayers,
    openPlayerDetail: window.GameModules.cloudTools.openPlayerDetail,
    downloadPlayerSave: window.GameModules.cloudTools.downloadPlayerSave,
    initializeCloudTools: window.GameModules.cloudTools.initializeCloudTools
  });
  controller.install();
})();
