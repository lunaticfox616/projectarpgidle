-- 멀티 요소 보강(2026-10-27). Supabase 대시보드 > SQL Editor > New query에 이 파일 내용을 전부 붙여 넣고 Run.
-- db/cloud-and-playtest.sql, db/operations-and-ghost.sql, db/social.sql, db/equipment-hall.sql, db/anti-cheat.sql,
-- db/ghost-duel-moving-20261022.sql을 실행한 프로젝트에 쓴다.
-- 같은 내용이 db/social.sql, db/cloud-and-playtest.sql, db/equipment-hall.sql, db/anti-cheat.sql, db/operations-and-ghost.sql,
-- db/ghost-duel-moving-20261022.sql에도 들어 있어, 나중에 처음부터 다시 설치해도 같은 상태가 된다.
-- 여러 번 실행해도 안전하다. 기존 데이터는 지우거나 고치지 않는다(지우는 것은 쓰지 않는 예전 순위표 player_rankings뿐이다).
-- 한 묶음이라 중간에 오류가 나면 아무것도 바뀌지 않는다. 먼저 오류만 보고 싶으면 맨 끝의 commit;을 rollback;으로 바꿔 한 번 돌려 본다.
--
-- 2026-10-27 검토에서 찾은 것과 고친 방향:
--   1. 시각 열(chat_messages.created_at, player_profiles.last_seen과 nickname_updated_at, 원격 측정 표의 created_at)을 클라이언트가
--      직접 쓸 수 있었다. 채팅 도배 제한과 원격 측정 일일 한도가 그 열로 세어 과거 시각을 넣으면 비켜 갔고, 미래 시각을 넣으면
--      늘 접속 중으로 보였고, 닉네임 하루 1회 제한도 풀렸다. 이제 트리거가 서버 시각으로 덮어쓴다.
--   2. 채팅 UPDATE 정책이 user_id만 봐서 지난 메시지의 본문, 시각, 닉네임을 바꿀 수 있었다. 이제 닉네임만, 자기 프로필의 닉네임으로만 바뀐다.
--   3. 채팅 payload와 공개 프로필 profile_data에 크기 상한이 없었다(payload 64KB와 아이템 3개, profile_data 512KB).
--   4. 원격 측정 표(playtest_runs, client_error_reports)의 jsonb와 글 열에 크기 상한이 없었다.
--   5. 닉네임 글자 규칙(한글, 영문, 숫자, _ -)이 클라이언트에만 있었다. 공개 프로필의 updated_at이 하트비트마다 바뀌어
--      프로필의 갱신 시각이 접속 시각이 됐다. 이제 그림이나 닉네임이 바뀔 때만 움직인다.
--   6. 트리거 함수에 anon과 authenticated의 execute가 남아 있었다(Supabase 보안 권고. 트리거는 실행 권한을 보지 않으므로 회수해도 돈다).
--      저장소에서 지운 예전 순위표 함수와 표가 라이브 DB에 남아 있었다. 저장소에 없는 rls_auto_enable()은 지우지 않고 권한만 회수한다.
--   7. RLS 정책의 auth.uid()를 (select auth.uid())로 바꿔 행마다 다시 계산하지 않는다(Supabase 성능 권고).
--      채팅 속도 제한이 보는 (user_id, created_at)과 전당 등록부의 owner_id에 색인을 건다.
--   8. 채팅 금지와 신고(chat_mutes, chat_reports, report_player_chat, 관리자 RPC). 금지한 계정은 채팅을 보낼 수 없다.
--   9. 고스트: 나올 수 없는 크기(DPS와 EHP 100억, 생명력과 보호막 10억 초과)는 등록을 거절한다. EHP 이상치도 기록한다.
--      7일 안에 기록된 고스트는 순위전에서 점수가 움직이지 않고 상대도 잃지 않는다(ghost_under_review). 관리자가 기록을 지울 수 있다.
--  10. 전당: 고유 효과 값(uniqueEffectParams)과 품질의 크기를 본다. 90일 지난 대전 기록과 30일 지난 팔린 적 없는 내린 전시는 지운다.
--      접속 인원만 돌려주는 get_online_counts(채팅 창 배지가 80줄 대신 이것을 묻는다).
--  11. 권고에 걸린 함수 8개의 search_path를 public으로 고정한다(social_set_updated_at는 2절에서 지운다).
--  12. get_ghost_arena가 underReview를 돌려주어 대전 탭이 점수가 멈춘 까닭을 보여 준다. 순위표, 최근 대전, 전당 전시자는 지금 닉네임으로 보인다.
--  13. 채팅 본문, 닉네임, 채팅에 붙인 장비 이름, 전당 전시 이름의 가벼운 한국어 비속어 필터(관리자가 운영 창이나 chat_banned_terms 표에
--      낱말을 더할 수 있다), 링크와 글자 반복과 5분 안 같은 메시지 세 번 차단, 60초 안 15개면 10분 자동 금지.

begin;

-- ============================================================================
-- 1) 채팅
-- ============================================================================
-- 넣을 때: 시각은 서버가 정하고 payload는 64KB와 아이템 3개까지(끝판 장비 셋이 jsonb로 약 20KB). 그 뒤 기존 속도 제한(1.5초, 60초 15개, 연속 중복).
create or replace function public.chat_messages_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    recent_count int;
    last_at      timestamptz;
    last_body    text;
begin
    new.created_at := now();
    if public.chat_muted_until(new.user_id) is not null then
        raise exception 'CHAT_MUTED: 채팅이 금지된 상태입니다. %분 뒤 풀립니다.',
            greatest(1, ceil(extract(epoch from (public.chat_muted_until(new.user_id) - now())) / 60));
    end if;
    if new.payload is not null then
        if jsonb_typeof(new.payload) <> 'object' or pg_column_size(new.payload) > 65536
           or coalesce(jsonb_typeof(new.payload -> 'items'), '') <> 'array' or jsonb_array_length(new.payload -> 'items') not between 1 and 3
           or exists (select 1 from jsonb_array_elements(new.payload -> 'items') linked where jsonb_typeof(linked) <> 'object') then
            raise exception 'CHAT_PAYLOAD_INVALID: 아이템 링크는 메시지마다 3개까지입니다.';
        end if;
    end if;
    -- 본문과, 붙인 아이템 링크의 이름(남의 화면에 그대로 보인다)을 본다.
    if public.chat_text_is_offensive(new.body)
       or (new.payload is not null and exists (select 1 from jsonb_array_elements(new.payload -> 'items') linked
                                                where public.chat_text_is_offensive(linked ->> 'name'))) then
        raise exception 'CHAT_PROFANITY: 비속어가 들어 있어 보낼 수 없습니다.';
    end if;
    if lower(new.body) ~ '(https?://|www\.|discord\.gg|t\.me/|bit\.ly)' then
        raise exception 'CHAT_LINK: 링크는 보낼 수 없습니다.';
    end if;
    if new.body ~ '(.)\1{24,}' then
        raise exception 'SPAM_FLOOD: 같은 글자를 너무 많이 반복했습니다.';
    end if;

    select count(*), max(created_at)
      into recent_count, last_at
      from public.chat_messages
     where user_id = new.user_id
       and created_at > now() - interval '60 seconds';

    if last_at is not null and last_at > now() - interval '1.5 seconds' then
        raise exception 'SPAM_TOO_FAST: 메시지를 너무 빠르게 보냈습니다.';
    end if;

    if recent_count >= 15 then
        raise exception 'SPAM_RATE_LIMIT: 잠시 후 다시 시도해주세요.';
    end if;

    -- 5분 안에 같은 본문을 세 번째 보내면 막는다(연속이 아니어도). "ㅇㅇ", "ㅋㅋ" 같은 짧은 반응(6자 미만)은 둔다.
    if new.payload is null and char_length(new.body) >= 6 and (select count(*) from public.chat_messages
         where user_id = new.user_id and payload is null and body = new.body and created_at > now() - interval '5 minutes') >= 2 then
        raise exception 'SPAM_REPEAT: 같은 메시지를 5분 안에 세 번 보낼 수 없습니다.';
    end if;

    -- 아이템 링크가 포함된 메시지(payload 존재)는 본문 토큰이 같을 수 있으므로
    -- 중복 검사에서 제외한다. 순수 텍스트 메시지만 연속 중복을 차단한다.
    if new.payload is null then
        select body into last_body
          from public.chat_messages
         where user_id = new.user_id
           and payload is null
         order by created_at desc
         limit 1;

        if last_body is not null and last_body = new.body then
            raise exception 'SPAM_DUPLICATE: 동일한 메시지를 연속으로 보낼 수 없습니다.';
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_chat_messages_rate_limit on public.chat_messages;
create trigger trg_chat_messages_rate_limit
    before insert on public.chat_messages
    for each row execute function public.chat_messages_rate_limit();

-- 고칠 때: 닉네임만 바뀐다(닉네임을 바꾼 뒤 지난 채팅의 표기를 맞추는 용도). 새 닉네임은 자기 프로필의 닉네임이어야 한다.
create or replace function public.chat_messages_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.id <> old.id or new.user_id <> old.user_id or new.body <> old.body
       or new.payload is distinct from old.payload or new.created_at <> old.created_at then
        raise exception 'CHAT_UPDATE_FORBIDDEN: 지난 채팅은 닉네임 표기만 고칠 수 있습니다.';
    end if;
    if new.nickname is distinct from old.nickname and lower(new.nickname) is distinct from
       (select lower(profile.nickname) from public.player_profiles profile where profile.user_id = new.user_id) then
        raise exception 'CHAT_NICKNAME_MISMATCH: 채팅 닉네임은 프로필 닉네임과 같아야 합니다.';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_chat_messages_update_guard on public.chat_messages;
create trigger trg_chat_messages_update_guard
    before update on public.chat_messages
    for each row execute function public.chat_messages_update_guard();

-- 속도 제한이 보는 (user_id, created_at)에 색인을 건다(외래키 user_id에 색인이 없었다).
create index if not exists chat_messages_user_created_idx
    on public.chat_messages (user_id, created_at desc);

-- 정책은 그대로이고 auth.uid()만 (select auth.uid())로 바꾼다.
drop policy if exists "chat_messages_insert_own" on public.chat_messages;
create policy "chat_messages_insert_own"
    on public.chat_messages for insert
    to authenticated
    with check (
        (select auth.uid()) = user_id
        and lower(nickname) = (
            select lower(profile.nickname)
            from public.player_profiles profile
            where profile.user_id = (select auth.uid())
        )
    );

drop policy if exists "chat_messages_update_own" on public.chat_messages;
create policy "chat_messages_update_own"
    on public.chat_messages for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "chat_messages_delete_own" on public.chat_messages;
create policy "chat_messages_delete_own"
    on public.chat_messages for delete
    to authenticated
    using ((select auth.uid()) = user_id);

-- ============================================================================
-- 2) 공개 프로필
-- ============================================================================
-- 넣고 고칠 때: last_seen과 nickname_updated_at은 서버가 정한다(하트비트 PATCH는 보낸 값과 상관없이 now()가 된다).
-- 닉네임은 클라이언트 규칙과 같은 글자(한글, 영문, 숫자, _ -)만, 하루 한 번만 바뀐다. profile_data는 512KB까지.
-- updated_at은 그림(profile_data)이나 닉네임이 바뀔 때만 움직인다(전: 하트비트마다 바뀌어 프로필의 갱신 시각이 접속 시각이 됐다).
-- 예전 트리거 둘(trg_player_profiles_nickname_guard, trg_player_profiles_updated_at)을 이 하나로 합친다.
create or replace function public.player_profiles_guard()
returns trigger
language plpgsql
security definer   -- 실행 권한을 회수한 chat_text_is_offensive를 부르므로(검토 지적 2026-10-27). 자기 줄만 다룬다.
set search_path = public
as $$
begin
    if pg_column_size(new.profile_data) > 524288 then
        raise exception 'PROFILE_TOO_LARGE: 공개 프로필이 너무 큽니다.';
    end if;
    -- 글자 규칙은 새 닉네임에만 건다. 클라이언트의 줄 쓰기는 upsert라 기존 줄에도 INSERT 트리거가 먼저 도는데, 예전 닉네임이
    -- 규칙 밖이어도 그 계정의 동기화를 막지 않는다(검토 지적 2026-10-27).
    if (tg_op = 'INSERT' and not exists (select 1 from public.player_profiles existing where existing.user_id = new.user_id))
       or (tg_op = 'UPDATE' and new.nickname is distinct from old.nickname) then
        if new.nickname !~ '^[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ_-]+$' then
            raise exception 'NICK_INVALID: 닉네임은 한글, 영문, 숫자, _ - 만 쓸 수 있습니다.';
        end if;
        if public.chat_text_is_offensive(new.nickname) then
            raise exception 'NICK_PROFANITY: 닉네임에 비속어를 쓸 수 없습니다.';
        end if;
    end if;
    if tg_op = 'INSERT' then
        new.last_seen := now();
        new.nickname_updated_at := null;
        new.updated_at := now();
        return new;
    end if;
    new.nickname_updated_at := old.nickname_updated_at;
    if new.nickname is distinct from old.nickname then
        if old.nickname_updated_at is not null
           and old.nickname_updated_at > now() - interval '24 hours' then
            raise exception 'NICK_COOLDOWN: 닉네임은 하루에 한 번만 변경할 수 있습니다.';
        end if;
        new.nickname_updated_at := now();
    end if;
    new.last_seen := case when new.last_seen is distinct from old.last_seen then now() else old.last_seen end;
    new.updated_at := case when new.profile_data is distinct from old.profile_data or new.nickname is distinct from old.nickname
                           then now() else old.updated_at end;
    return new;
end;
$$;

drop trigger if exists trg_player_profiles_nickname_guard on public.player_profiles;
drop trigger if exists trg_player_profiles_updated_at on public.player_profiles;
drop trigger if exists trg_player_profiles_guard on public.player_profiles;
create trigger trg_player_profiles_guard
    before insert or update on public.player_profiles
    for each row execute function public.player_profiles_guard();
drop function if exists public.player_profiles_nickname_guard();
-- 예전 updated_at 트리거 함수는 player_profiles_guard가 대신하므로, 다른 트리거가 쓰지 않으면 지운다.
do $$
begin
    if to_regprocedure('public.social_set_updated_at()') is not null
       and not exists (select 1 from pg_trigger where tgfoid = to_regprocedure('public.social_set_updated_at()')) then
        execute 'drop function public.social_set_updated_at()';
    end if;
end
$$;

drop policy if exists "player_profiles_insert_own" on public.player_profiles;
create policy "player_profiles_insert_own"
    on public.player_profiles for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "player_profiles_update_own" on public.player_profiles;
create policy "player_profiles_update_own"
    on public.player_profiles for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

-- ============================================================================
-- 3) 원격 측정(playtest_runs, client_error_reports)
-- ============================================================================
-- 시각은 서버가 정한다. 열마다 크기 상한을 둔다(content_context는 db/operations-and-ghost.sql이 더한 열이라 to_jsonb로 있을 때만 본다).
create or replace function public.guard_playtest_run_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    new.created_at := now();
    if jsonb_typeof(new.ghost_snapshot) <> 'object' or pg_column_size(new.ghost_snapshot) > 8192 then
        raise exception 'INVALID_GHOST_SNAPSHOT';
    end if;
    if pg_column_size(new.ehp_by_element) > 2048 or coalesce(pg_column_size(to_jsonb(new) -> 'content_context'), 0) > 4096
       or char_length(new.zone_id) > 120 or char_length(new.zone_type) > 60 or char_length(coalesce(new.ascend_class, '')) > 80
       or char_length(coalesce(new.hero_id, '')) > 80 or char_length(coalesce(new.active_skill, '')) > 120
       or char_length(new.app_version) > 60 or char_length(new.platform) > 60 then
        raise exception 'PLAYTEST_RUN_TOO_LARGE';
    end if;
    delete from public.playtest_runs where created_at < now() - interval '30 days';
    if (select count(*) from public.playtest_runs where user_id = new.user_id and created_at >= now() - interval '1 day') >= 60 then
        raise exception 'PLAYTEST_DAILY_LIMIT';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_guard_playtest_run_insert on public.playtest_runs;
create trigger trg_guard_playtest_run_insert before insert on public.playtest_runs
    for each row execute function public.guard_playtest_run_insert();

create or replace function public.guard_client_error_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    new.created_at := now();
    if pg_column_size(new.context) > 8192 or char_length(new.fingerprint) > 500 or char_length(new.app_version) > 60 then
        raise exception 'ERROR_REPORT_TOO_LARGE';
    end if;
    delete from public.client_error_reports where created_at < now() - interval '30 days';
    if exists (
        select 1 from public.client_error_reports
         where user_id = new.user_id and fingerprint = new.fingerprint
           and created_at >= now() - interval '10 minutes'
    ) then raise exception 'ERROR_DUPLICATE_LIMIT'; end if;
    if (select count(*) from public.client_error_reports where user_id = new.user_id and created_at >= now() - interval '1 day') >= 20 then
        raise exception 'ERROR_DAILY_LIMIT';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_guard_client_error_insert on public.client_error_reports;
create trigger trg_guard_client_error_insert before insert on public.client_error_reports
    for each row execute function public.guard_client_error_insert();

drop policy if exists "playtest_runs_insert_own" on public.playtest_runs;
create policy "playtest_runs_insert_own" on public.playtest_runs
    for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "client_error_reports_insert_own" on public.client_error_reports;
create policy "client_error_reports_insert_own" on public.client_error_reports
    for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "cloud_saves_select_own" on public.cloud_saves;
create policy "cloud_saves_select_own" on public.cloud_saves
    for select to authenticated using ((select auth.uid()) = user_id);

-- ============================================================================
-- 4) 권한과 잔여물 정리
-- ============================================================================
-- 트리거 함수는 RPC로 부를 수 없게 한다. 트리거는 호출자의 실행 권한을 보지 않으므로 회수해도 그대로 돈다.
revoke all on function public.chat_messages_rate_limit() from public, anon, authenticated;
revoke all on function public.chat_messages_prune() from public, anon, authenticated;
revoke all on function public.chat_messages_update_guard() from public, anon, authenticated;
revoke all on function public.player_profiles_guard() from public, anon, authenticated;
revoke all on function public.guard_playtest_run_insert() from public, anon, authenticated;
revoke all on function public.guard_client_error_insert() from public, anon, authenticated;

-- 저장소에 없는 함수가 라이브 DB에 있으면(rls_auto_enable) 지우지 않고 바깥 호출만 막는다. 본문은 대시보드에서 확인한다.
do $$
begin
    if to_regprocedure('public.rls_auto_enable()') is not null then
        execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
    end if;
    -- 저장소에 없는 라이브 트리거 함수(cloud_saves의 updated_at): 트리거는 실행 권한을 보지 않으므로 회수해도 돈다.
    if to_regprocedure('public.touch_cloud_save_updated_at()') is not null then
        execute 'revoke all on function public.touch_cloud_save_updated_at() from public, anon, authenticated';
    end if;
end
$$;

-- 예전 일일 루프/DPS 순위표(db/equipment-hall.sql이 지우지만 라이브 DB에 남아 있었다). 클라이언트는 더 부르지 않는다.
drop function if exists public.submit_player_ranking(bigint, bigint);
drop table if exists public.player_rankings;

-- 전당 등록부의 owner_id 외래키 색인.
create index if not exists hall_item_registry_owner_idx
    on public.hall_item_registry (owner_id);

-- ============================================================================
-- 5) 채팅 금지와 신고 (db/social.sql과 같다)
-- ============================================================================
-- 채팅 운영(2026-10-27): 금지와 신고. 금지한 계정은 채팅을 보낼 수 없다(chat_messages_rate_limit). 신고는 쌓아 두고 관리자가
-- 운영 통계 창(?admin=1, js/cloud-tools-ui.js)에서 보고 금지하거나 줄을 지운다. 차단(남의 채팅 숨기기)은 기기 안에서만 한다.
create table if not exists public.chat_mutes (
    user_id    uuid primary key references auth.users(id) on delete cascade,
    until_at   timestamptz not null,
    note       text not null default '',
    created_at timestamptz not null default now()
);
create table if not exists public.chat_reports (
    id             bigint generated always as identity primary key,
    reporter_id    uuid not null references auth.users(id) on delete cascade,
    target_user_id uuid not null references auth.users(id) on delete cascade,
    message_id     bigint,
    nickname       text not null default '',
    body           text,
    reason         text not null,
    created_at     timestamptz not null default now()
);
create index if not exists chat_reports_created_idx on public.chat_reports (created_at desc);
create index if not exists chat_reports_reporter_created_idx on public.chat_reports (reporter_id, created_at desc);
create index if not exists chat_reports_target_idx on public.chat_reports (target_user_id);
alter table public.chat_mutes enable row level security;
alter table public.chat_reports enable row level security;
-- 정책을 두지 않는다. 아래 보안 정의자 함수만 쓰고 읽는다.
revoke all on public.chat_mutes, public.chat_reports from anon, authenticated;

create or replace function public.chat_muted_until(p_user_id uuid)
returns timestamptz language sql stable security definer set search_path = public as $$
    select mute.until_at from public.chat_mutes mute where mute.user_id = p_user_id and mute.until_at > now();
$$;

-- 신고: 상대와 사유, 있으면 그 사람의 채팅 한 줄(본문은 그때 그대로 남긴다). 같은 사람은 하루 한 번, 하루 20건까지. 90일 뒤 지운다.
create or replace function public.report_player_chat(p_target_user_id uuid, p_reason text, p_message_id bigint default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    account_id uuid := auth.uid();
    message_row public.chat_messages%rowtype;
    target_name text;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    if p_target_user_id is null or p_target_user_id = account_id then raise exception 'REPORT_INVALID_TARGET'; end if;
    if not exists (select 1 from public.player_profiles target where target.user_id = p_target_user_id) then raise exception 'REPORT_INVALID_TARGET'; end if;
    if p_reason is null or char_length(trim(p_reason)) not between 1 and 200 then raise exception 'REPORT_INVALID_REASON'; end if;
    if exists (select 1 from public.chat_reports where reporter_id = account_id and target_user_id = p_target_user_id
                  and created_at >= now() - interval '1 day') then raise exception 'REPORT_ALREADY_SENT'; end if;
    if (select count(*) from public.chat_reports where reporter_id = account_id and created_at >= now() - interval '1 day') >= 20 then
        raise exception 'REPORT_DAILY_LIMIT';
    end if;
    if p_message_id is not null then
        select * into message_row from public.chat_messages where id = p_message_id and user_id = p_target_user_id;
    end if;
    select nickname into target_name from public.player_profiles where user_id = p_target_user_id;
    insert into public.chat_reports (reporter_id, target_user_id, message_id, nickname, body, reason)
    values (account_id, p_target_user_id, message_row.id, coalesce(target_name, message_row.nickname, ''),
            left(message_row.body, 500), left(trim(p_reason), 200));
    delete from public.chat_reports where created_at < now() - interval '90 days';
    return jsonb_build_object('reported', true);
end;
$$;

-- 관리자: 최근 신고 200건과 지금 금지 중인 계정.
create or replace function public.admin_get_chat_reports()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
    if not public.is_project_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    -- 풀린 지 30일 지난 금지 줄은 관리자가 열 때 지운다(표가 계속 크지 않게).
    delete from public.chat_mutes where until_at < now() - interval '30 days';
    return jsonb_build_object(
        'reports', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc) from (
            select report.id, report.created_at, report.target_user_id, report.nickname, report.message_id, report.body, report.reason,
                   reporter.nickname as reporter_nickname,
                   (select count(*) from public.chat_reports same where same.target_user_id = report.target_user_id
                      and same.created_at >= now() - interval '1 day') as reports_24h,
                   public.chat_muted_until(report.target_user_id) as muted_until,
                   exists (select 1 from public.chat_messages message where message.id = report.message_id) as message_exists
              from public.chat_reports report
              left join public.player_profiles reporter on reporter.user_id = report.reporter_id
             order by report.created_at desc limit 200) row_data), '[]'::jsonb),
        'mutes', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.until_at desc) from (
            select mute.user_id, profile.nickname, mute.until_at, mute.note, mute.created_at
              from public.chat_mutes mute
              left join public.player_profiles profile on profile.user_id = mute.user_id
             where mute.until_at > now()
             order by mute.until_at desc) row_data), '[]'::jsonb)
    );
end;
$$;

-- 관리자: 금지(분 단위, 최대 366일). 0이면 푼다.
create or replace function public.admin_set_chat_mute(p_user_id uuid, p_minutes integer, p_note text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
begin
    if not public.is_project_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    if p_user_id is null or p_minutes is null or p_minutes < 0 then raise exception 'INVALID_REQUEST'; end if;
    if not exists (select 1 from public.player_profiles target where target.user_id = p_user_id) then raise exception 'PLAYER_NOT_FOUND'; end if;
    if p_minutes = 0 then
        delete from public.chat_mutes where user_id = p_user_id;
    else
        insert into public.chat_mutes (user_id, until_at, note)
        values (p_user_id, now() + make_interval(mins => least(p_minutes, 527040)), left(coalesce(p_note, ''), 200))
        on conflict (user_id) do update set until_at = excluded.until_at, note = excluded.note, created_at = now();
    end if;
    return jsonb_build_object('userId', p_user_id, 'mutedUntil', public.chat_muted_until(p_user_id));
end;
$$;

-- 관리자: 채팅 한 줄 삭제(실시간으로는 빠지지 않고 다음 전체 조회에서 사라진다).
create or replace function public.admin_delete_chat_message(p_message_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare removed integer;
begin
    if not public.is_project_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    delete from public.chat_messages where id = p_message_id;
    get diagnostics removed = row_count;
    return jsonb_build_object('deleted', removed > 0);
end;
$$;

-- 관리자: 닉네임으로 금지(신고 줄이 없는 계정도 운영 창에서 금지할 수 있게). 대소문자는 무시한다.
create or replace function public.admin_set_chat_mute_by_nickname(p_nickname text, p_minutes integer, p_note text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    target_id uuid;
begin
    if not public.is_project_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    select user_id into target_id from public.player_profiles where lower(nickname) = lower(trim(coalesce(p_nickname, '')));
    if target_id is null then raise exception 'PLAYER_NOT_FOUND'; end if;
    return public.admin_set_chat_mute(target_id, p_minutes, p_note);
end;
$$;

revoke all on function public.chat_muted_until(uuid) from public, anon, authenticated;
revoke all on function public.report_player_chat(uuid, text, bigint) from public, anon;
revoke all on function public.admin_get_chat_reports() from public, anon;
revoke all on function public.admin_set_chat_mute(uuid, integer, text) from public, anon;
revoke all on function public.admin_delete_chat_message(bigint) from public, anon;
grant execute on function public.report_player_chat(uuid, text, bigint) to authenticated;
grant execute on function public.admin_get_chat_reports() to authenticated;
grant execute on function public.admin_set_chat_mute(uuid, integer, text) to authenticated;
grant execute on function public.admin_delete_chat_message(bigint) to authenticated;
revoke all on function public.admin_set_chat_mute_by_nickname(text, integer, text) from public, anon;
grant execute on function public.admin_set_chat_mute_by_nickname(text, integer, text) to authenticated;

-- ============================================================================
-- 6) 고스트 수치 검사와 검토 중 점수 멈춤 (db/anti-cheat.sql, db/operations-and-ghost.sql과 같다)
-- ============================================================================
alter table public.cheat_flags drop constraint if exists cheat_flags_kind_check;
alter table public.cheat_flags add constraint cheat_flags_kind_check check (kind in ('clock', 'currency', 'level', 'ghost_dps', 'ghost_ehp'));

-- 원소별 EHP 가운데 가장 작은 값(감시와 기록이 보는 한 수).
create or replace function public.ghost_min_ehp(ehp_data jsonb)
returns numeric language sql immutable set search_path = public as $$
    select coalesce(min(public.cheat_number(element.value)), 0) from jsonb_each(coalesce(ehp_data, '{}'::jsonb)) element;
$$;

-- register_my_ghost는 등록할 때마다 active를 켠다. 보류한 계정이면 등록을 거절한다(대전 결과로 점수만 바뀔 때는 돌지 않는다).
-- 보류를 걸 때 active를 끄는 갱신은 그대로 들어간다.
-- 수치 상한(2026-10-27): 게임에서 나올 수 없는 크기는 막는다. 문서와 측정에 남은 가장 큰 DPS가 천만 자리라 DPS와 EHP는 100억,
-- 생명력과 보호막은 10억까지 받는다(틀릴 수 없는 검사만 막는다는 원칙). 그 아래의 이상치는 watch_ghost_dps가 기록만 한다.
create or replace function public.guard_ghost_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if new.active and public.cheat_account_held(new.user_id) then raise exception 'GHOST_ACCOUNT_HELD'; end if;
    -- 등록(active를 켜는 쓰기)에만 건다. 보류가 active를 끄는 갱신은 값이 커도 들어가야 한다(검토 지적 2026-10-27).
    if new.active and (new.dps > 10000000000
       or public.cheat_number(new.combat_snapshot -> 'maxHp') > 1000000000
       or public.cheat_number(new.combat_snapshot -> 'energyShield') > 1000000000
       or exists (select 1 from jsonb_each(new.ehp_by_element) element where public.cheat_number(element.value) > 10000000000)) then
        raise exception 'GHOST_SNAPSHOT_IMPLAUSIBLE';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_guard_ghost_profile on public.ghost_profiles;
create trigger trg_guard_ghost_profile before insert or update of active on public.ghost_profiles
    for each row execute function public.guard_ghost_profile();

-- 같은 전투 판에서 DPS 상위 20명(자기 빼고)의 가운데 값보다 10배 넘게 크면 기록한다. 20명이 안 되면 보지 않는다.
-- EHP(원소별 가장 작은 값)도 같은 규칙으로 기록한다(2026-10-27). 7일 안의 기록은 순위전 점수를 멈춘다(ghost_under_review).
-- 실제로 들어간 등록에만 한 번 돈다(AFTER). 기록이 실패해도 등록은 막지 않는다. 잠금을 2초 넘게 기다리면 그 오류도 잡히도록
-- lock_timeout을 둔다(요청 시간 제한으로 끊기면 예외 블록이 잡지 못해 등록까지 실패한다).
create or replace function public.watch_ghost_dps()
returns trigger language plpgsql security definer set search_path = public set lock_timeout = '2s' as $$
declare
    peers integer;
    top_median numeric;
    ehp_peers integer;
    ehp_median numeric;
    new_ehp numeric := public.ghost_min_ehp(new.ehp_by_element);
begin
    if tg_op = 'UPDATE' and new.dps is not distinct from old.dps and new.ehp_by_element is not distinct from old.ehp_by_element then
        return null;
    end if;
    begin
        select count(*), percentile_cont(0.5) within group (order by top.dps)
          into peers, top_median
          from (select profile.dps from public.ghost_profiles profile
                 where profile.combat_version = new.combat_version and profile.user_id <> new.user_id and profile.active
                 order by profile.dps desc limit 20) top;
        if peers >= 20 and top_median > 0 and new.dps > top_median * 10 then
            perform public.note_cheat_flag(new.user_id, 'ghost_dps',
                jsonb_build_object('dps', new.dps, 'topMedian', round(top_median), 'combatVersion', new.combat_version));
        end if;
        select count(*), percentile_cont(0.5) within group (order by top.ehp)
          into ehp_peers, ehp_median
          from (select public.ghost_min_ehp(profile.ehp_by_element) as ehp from public.ghost_profiles profile
                 where profile.combat_version = new.combat_version and profile.user_id <> new.user_id and profile.active
                 order by public.ghost_min_ehp(profile.ehp_by_element) desc limit 20) top;
        if ehp_peers >= 20 and ehp_median > 0 and new_ehp > ehp_median * 10 then
            perform public.note_cheat_flag(new.user_id, 'ghost_ehp',
                jsonb_build_object('ehp', round(new_ehp), 'topMedian', round(ehp_median), 'combatVersion', new.combat_version));
        end if;
    exception when others then
        raise warning 'watch_ghost_dps: %', sqlerrm;
    end;
    return null;
end;
$$;

drop trigger if exists trg_watch_ghost_dps on public.ghost_profiles;
create trigger trg_watch_ghost_dps after insert or update of dps, ehp_by_element on public.ghost_profiles
    for each row execute function public.watch_ghost_dps();

-- 검토 중인 고스트(db/anti-cheat.sql의 감시가 7일 안에 DPS나 EHP 이상치로 기록한 계정): 순위전에서 점수를 얻지 못하고,
-- 상대도 그 고스트에게 점수를 잃지 않는다. 친선전은 그대로다. 감시 표가 아직 없는 설치에서는 늘 false다.
create or replace function public.ghost_under_review(p_user_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
    if to_regclass('public.cheat_flags') is null then return false; end if;
    return exists (select 1 from public.cheat_flags flag
                    where flag.user_id = p_user_id and flag.kind in ('ghost_dps', 'ghost_ehp')
                      and flag.last_at >= now() - interval '7 days');
end;
$$;

create or replace function public.fight_ghost(p_combat_version text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    account_id uuid := auth.uid();
    challenger public.ghost_profiles%rowtype;
    defender public.ghost_profiles%rowtype;
    defender_id uuid;
    seed_value text;
    duel jsonb;
    result_value text;
    challenger_score numeric;
    expected_score numeric;
    rating_delta integer;
    challenger_delta integer;
    defender_delta integer;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    -- ponytail: 테스터 규모에서는 전역 매치 잠금이 가장 안전하다. 동시 매치가 병목이 될 때 계정 순서 잠금으로 교체한다.
    perform pg_advisory_xact_lock(937041);
    if exists (select 1 from public.ghost_matches
                where challenger_id = account_id and created_at >= now() - interval '20 seconds') then
        raise exception 'GHOST_DUEL_COOLDOWN';
    end if;
    if (select count(*) from public.ghost_matches
         where challenger_id = account_id and ranked and created_at >= now() - interval '1 day') >= 20 then
        raise exception 'GHOST_DAILY_LIMIT';
    end if;
    -- 90일 지난 대전 기록은 지운다(2026-10-27: 정리가 없어 계정당 하루 50행까지 쌓였다).
    delete from public.ghost_matches where created_at < now() - interval '90 days';
    select * into challenger from public.ghost_profiles
     where user_id = account_id and active and combat_version = p_combat_version for update;
    if not found then raise exception 'GHOST_REGISTRATION_REQUIRED'; end if;

    select candidate.user_id into defender_id
      from public.ghost_profiles candidate
     where candidate.user_id <> account_id and candidate.active
       and candidate.combat_version = p_combat_version
       and (select count(*) from public.ghost_matches previous
             where ((previous.challenger_id = account_id and previous.defender_id = candidate.user_id)
                 or (previous.challenger_id = candidate.user_id and previous.defender_id = account_id))
               and previous.ranked
               and previous.created_at >= now() - interval '1 day') < 5
     order by abs(candidate.rating - challenger.rating), random() limit 1;
    if defender_id is null then raise exception 'GHOST_OPPONENT_NOT_FOUND'; end if;
    select * into defender from public.ghost_profiles where user_id = defender_id for update;

    seed_value := md5(account_id::text || defender_id::text || clock_timestamp()::text || random()::text);
    duel := public.simulate_ghost_duel(challenger.combat_snapshot, defender.combat_snapshot, seed_value);
    result_value := case duel ->> 'winner' when 'left' then 'win' when 'right' then 'loss' else 'draw' end;
    challenger_score := case result_value when 'win' then 1 when 'loss' then 0 else 0.5 end;
    duel := duel || jsonb_build_object('seed',seed_value,
        'left', jsonb_build_object('nickname',challenger.nickname,'ascendClass',challenger.ascend_class,'snapshot',challenger.combat_snapshot),
        'right', jsonb_build_object('nickname',defender.nickname,'ascendClass',defender.ascend_class,'snapshot',defender.combat_snapshot));
    expected_score := 1 / (1 + power(10::numeric, (defender.rating - challenger.rating) / 400.0));
    rating_delta := round(24 * (challenger_score - expected_score));
    if rating_delta = 0 and result_value <> 'draw' then rating_delta := case when result_value = 'win' then 1 else -1 end; end if;
    -- 검토 중인 고스트(ghost_under_review)는 점수가 움직이지 않고, 그 상대는 잃지 않는다(얻는 것은 그대로).
    challenger_delta := rating_delta;
    defender_delta := -rating_delta;
    if public.ghost_under_review(account_id) then challenger_delta := 0; defender_delta := greatest(defender_delta, 0); end if;
    if public.ghost_under_review(defender_id) then defender_delta := 0; challenger_delta := greatest(challenger_delta, 0); end if;

    update public.ghost_profiles set
        rating = greatest(100, least(4000, rating + challenger_delta)),
        wins = wins + case when result_value = 'win' then 1 else 0 end,
        losses = losses + case when result_value = 'loss' then 1 else 0 end,
        draws = draws + case when result_value = 'draw' then 1 else 0 end,
        matches = matches + 1
     where user_id = account_id;
    update public.ghost_profiles set
        rating = greatest(100, least(4000, rating + defender_delta)),
        wins = wins + case when result_value = 'loss' then 1 else 0 end,
        losses = losses + case when result_value = 'win' then 1 else 0 end,
        draws = draws + case when result_value = 'draw' then 1 else 0 end,
        matches = matches + 1
     where user_id = defender_id;

    insert into public.ghost_matches(
        challenger_id, defender_id, result,
        challenger_rating_before, challenger_rating_after,
        defender_rating_before, defender_rating_after, seed, combat_version
    ) values (
        account_id, defender_id, result_value,
        challenger.rating, greatest(100, least(4000, challenger.rating + challenger_delta)),
        defender.rating, greatest(100, least(4000, defender.rating + defender_delta)),
        seed_value, p_combat_version
    );
    return jsonb_build_object(
        'opponent', coalesce((select profile.nickname from public.player_profiles profile where profile.user_id = defender_id), defender.nickname),
        'opponentClass', defender.ascend_class,
        'opponentSkill', defender.active_skill, 'result', result_value,
        'ratingBefore', challenger.rating,
        'ratingAfter', greatest(100, least(4000, challenger.rating + challenger_delta)),
        'ratingDelta', greatest(100, least(4000, challenger.rating + challenger_delta)) - challenger.rating,
        'seed', seed_value, 'duel', duel
    );
end;
$$;

-- 관리자: 한 계정의 감시 기록을 지운다(종류를 주면 그 종류만). 순위전의 검토 중 상태(ghost_under_review)도 함께 풀린다.
create or replace function public.admin_clear_cheat_flags(p_user_id uuid, p_kind text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare removed integer;
begin
    if not public.is_project_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    if p_user_id is null then raise exception 'INVALID_REQUEST'; end if;
    delete from public.cheat_flags where user_id = p_user_id and (p_kind is null or kind = p_kind);
    get diagnostics removed = row_count;
    return jsonb_build_object('userId', p_user_id, 'removed', removed);
end;
$$;

revoke all on function public.ghost_min_ehp(jsonb) from public, anon, authenticated;
revoke all on function public.admin_clear_cheat_flags(uuid, text) from public, anon;
grant execute on function public.admin_clear_cheat_flags(uuid, text) to authenticated;
revoke all on function public.ghost_under_review(uuid) from public, anon, authenticated;

-- ============================================================================
-- 7) 전당 값 상한, 기록 정리, 접속 인원 (db/anti-cheat.sql, db/operations-and-ghost.sql, db/equipment-hall.sql, db/social.sql과 같다)
-- ============================================================================
-- 고유 효과의 값(uniqueEffectParams)과 품질: 클라이언트가 상한 없이 곱하는 칸이라 서버가 크기를 본다(2026-10-27).
-- 배율(mul, explicitStatMultiplier)과 젬 레벨 보너스(level)는 10까지, 그 밖의 숫자 값은 100000까지(데이터의 가장 큰 값은 sleepMs 10000),
-- 품질은 30까지(한계 돌파와 타락의 상한).
create or replace function public.hall_item_params_out_of_range(item_data jsonb)
returns boolean language sql immutable set search_path = public as $$
    select public.cheat_number(item_data -> 'quality') > 30
        or (jsonb_typeof(item_data -> 'uniqueEffectParams') = 'object' and exists (
            select 1 from jsonb_each(item_data -> 'uniqueEffectParams') param
             where jsonb_typeof(param.value) = 'number'
               and (abs(public.cheat_number(param.value)) > 100000
                    or (param.key in ('mul', 'explicitStatMultiplier', 'level') and public.cheat_number(param.value) > 10))));
$$;

create or replace function public.guard_hall_listing()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if public.cheat_account_held(new.curator_id) then raise exception 'HALL_ACCOUNT_HELD'; end if;
    if public.hall_item_out_of_range(new.item_snapshot) then raise exception 'HALL_ITEM_OUT_OF_RANGE'; end if;
    if public.hall_item_params_out_of_range(new.item_snapshot) then raise exception 'HALL_ITEM_OUT_OF_RANGE'; end if;
    -- 전시 이름은 전당을 여는 모두에게 보인다: 채팅과 같은 비속어 검사(db/social.sql chat_text_is_offensive).
    if public.chat_text_is_offensive(new.item_snapshot ->> 'name') then raise exception 'HALL_ITEM_NAME_REJECTED'; end if;
    return new;
end;
$$;
revoke all on function public.hall_item_params_out_of_range(jsonb) from public, anon, authenticated;

create index if not exists ghost_matches_created_idx
    on public.ghost_matches(created_at);

create or replace function public.get_player_hall()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    account_id uuid := auth.uid();
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    -- 내린 뒤 30일 지난, 팔린 적 없는 전시는 지운다(2026-10-27: 영구 보관으로 표가 계속 컸다). 팔린 전시는 복제품이 가리키므로 둔다.
    delete from public.hall_listings where status = 'withdrawn' and copies_sold = 0 and retired_at < now() - interval '30 days';
    return jsonb_build_object(
        'listings', coalesce((select jsonb_agg(row_data order by (row_data ->> 'score')::bigint desc, (row_data ->> 'createdAt') desc) from (
            select jsonb_build_object('id', listing.id, 'curatorName', coalesce(curator.nickname, listing.curator_name),
                'item', listing.item_snapshot, 'score', listing.item_score, 'price', listing.price,
                'honorPerCopy', listing.honor_per_copy, 'copiesSold', listing.copies_sold,
                'copyCap', listing.copy_cap, 'createdAt', listing.created_at,
                'isMine', listing.curator_id = account_id,
                'alreadyCollected', exists(select 1 from public.hall_purchases purchase
                    where purchase.listing_id = listing.id and purchase.buyer_id = account_id)) row_data
              from public.hall_listings listing
              left join public.player_profiles curator on curator.user_id = listing.curator_id   -- 전시자의 지금 닉네임(2026-10-27)
             where listing.status = 'open'
             order by listing.item_score desc, listing.created_at desc limit 80) open_rows), '[]'::jsonb),
        'mine', coalesce((select jsonb_agg(row_data order by (row_data ->> 'createdAt') desc) from (
            select jsonb_build_object('id', listing.id, 'item', listing.item_snapshot,
                'score', listing.item_score, 'price', listing.price, 'status', listing.status,
                'copiesSold', listing.copies_sold, 'copyCap', listing.copy_cap, 'createdAt', listing.created_at) row_data
              from public.hall_listings listing where listing.curator_id = account_id
                and listing.status in ('open','sold_out')
             order by listing.created_at desc limit 20) mine_rows), '[]'::jsonb),
        'honor', coalesce((select honor from public.hall_curator_profiles where user_id = account_id), 0),
        'copiesShared', coalesce((select copies_shared from public.hall_curator_profiles where user_id = account_id), 0),
        'collectionCount', (select count(*) from public.hall_purchases where buyer_id = account_id)
    );
end;
$$;

-- 접속 인원만(채팅 창 배지): 접속자 목록이 닫혀 있을 때 80줄을 받지 않고 수만 묻는다(2026-10-27, 내려받기 용량. js/social.js loadOnlineUsers).
create or replace function public.get_online_counts()
returns jsonb language sql stable security definer set search_path = public as $$
    select jsonb_build_object(
        'active', count(*) filter (where profile.last_seen >= now() - interval '5 minutes'),
        'recent', count(*) filter (where profile.last_seen < now() - interval '5 minutes'))
      from public.player_profiles profile
     where profile.last_seen >= now() - interval '30 minutes';
$$;
revoke all on function public.get_online_counts() from public, anon;
grant execute on function public.get_online_counts() to authenticated;


-- ============================================================================
-- 8) 함수의 search_path 고정 (Supabase 보안 권고 "Function Search Path Mutable"; 원본 파일에서는 함수 머리에 set search_path = public.
--    touch_cloud_save_updated_at는 저장소에 없는 라이브 DB의 함수라 있을 때만 바꾼다)
-- ============================================================================
do $$
begin
    if to_regprocedure('public.touch_cloud_save_updated_at()') is not null then execute 'alter function public.touch_cloud_save_updated_at() set search_path = public'; end if;
    if to_regprocedure('public.normalize_ghost_combat_snapshot(jsonb, numeric, jsonb)') is not null then execute 'alter function public.normalize_ghost_combat_snapshot(jsonb, numeric, jsonb) set search_path = public'; end if;
    if to_regprocedure('public.ghost_snapshot_number(jsonb, text, numeric, numeric, numeric)') is not null then execute 'alter function public.ghost_snapshot_number(jsonb, text, numeric, numeric, numeric) set search_path = public'; end if;
    if to_regprocedure('public.ghost_duel_roll(text, text)') is not null then execute 'alter function public.ghost_duel_roll(text, text) set search_path = public'; end if;
    if to_regprocedure('public.ghost_ehp_for_element(jsonb, text)') is not null then execute 'alter function public.ghost_ehp_for_element(jsonb, text) set search_path = public'; end if;
    if to_regprocedure('public.prepare_ghost_duel_fighter(jsonb, text, jsonb)') is not null then execute 'alter function public.prepare_ghost_duel_fighter(jsonb, text, jsonb) set search_path = public'; end if;
    if to_regprocedure('public.simulate_ghost_duel(jsonb, jsonb, text)') is not null then execute 'alter function public.simulate_ghost_duel(jsonb, jsonb, text) set search_path = public'; end if;
    if to_regprocedure('public.resolve_ghost_duel_attack(jsonb, jsonb, jsonb, numeric)') is not null then execute 'alter function public.resolve_ghost_duel_attack(jsonb, jsonb, jsonb, numeric) set search_path = public'; end if;
end
$$;

-- ============================================================================
-- 9) 대전 탭에 검토 중 표시 (db/operations-and-ghost.sql의 get_ghost_arena와 같다; underReview 한 칸이 늘었다)
-- ============================================================================
create or replace function public.get_ghost_arena(p_combat_version text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    account_id uuid := auth.uid();
    payload jsonb;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    select jsonb_build_object(
        -- 5: 움직이며 싸우는 대결(simulate_ghost_duel의 arena, 사건의 lx, rx)
        'combatProtocolVersion', 5,
        'underReview', public.ghost_under_review(account_id),   -- 7일 안의 수치 기록: 순위전 점수가 멈춰 있다(2026-10-27)
        'me', (select to_jsonb(me) - 'user_id' - 'combat_snapshot' from public.ghost_profiles me where me.user_id = account_id),
        'leaderboard', coalesce((select jsonb_agg(to_jsonb(board)) from (
            select row_number() over (order by ghost.rating desc, ghost.wins desc, ghost.updated_at asc) as rank,
                   coalesce(profile.nickname, ghost.nickname) as nickname,   -- 닉네임을 바꾸면 순위표도 따라간다(2026-10-27)
                   ghost.ascend_class, ghost.active_skill, ghost.rating, ghost.wins, ghost.losses, ghost.draws, ghost.matches,
                   case when ghost.matches < 10 then true else false end as provisional
              from public.ghost_profiles ghost
              left join public.player_profiles profile on profile.user_id = ghost.user_id
             where ghost.active and ghost.combat_version = p_combat_version
             order by ghost.rating desc, ghost.wins desc, ghost.updated_at asc limit 50
        ) board), '[]'::jsonb),
        'recent', coalesce((select jsonb_agg(to_jsonb(recent_match)) from (
            select match_row.created_at, match_row.ranked,
                   case when match_row.challenger_id = account_id then match_row.result
                        when match_row.result = 'win' then 'loss'
                        when match_row.result = 'loss' then 'win' else 'draw' end as result,
                   case when match_row.challenger_id = account_id then coalesce(defender_profile.nickname, defender.nickname)
                        else coalesce(challenger_profile.nickname, challenger.nickname) end as opponent,   -- 지금 닉네임(2026-10-27)
                   case when match_row.challenger_id = account_id then match_row.challenger_rating_after - match_row.challenger_rating_before
                        else match_row.defender_rating_after - match_row.defender_rating_before end as rating_delta
              from public.ghost_matches match_row
              join public.ghost_profiles challenger on challenger.user_id = match_row.challenger_id
              join public.ghost_profiles defender on defender.user_id = match_row.defender_id
              left join public.player_profiles challenger_profile on challenger_profile.user_id = match_row.challenger_id
              left join public.player_profiles defender_profile on defender_profile.user_id = match_row.defender_id
             where match_row.challenger_id = account_id or match_row.defender_id = account_id
             order by match_row.created_at desc limit 10
        ) recent_match), '[]'::jsonb)
    ) into payload;
    return payload;
end;
$$;

-- ============================================================================
-- 10) 비속어 필터, 도배와 스팸 차단 (db/social.sql과 같다; 1절의 chat_messages_rate_limit와 2절의 player_profiles_guard가 쓴다)
-- ============================================================================
-- 가벼운 비속어 필터(2026-10-27): 띄어쓰기, 기호, 숫자를 빼고 소문자로 바꾼 뒤 자주 쓰는 욕설 줄기를 찾는다. 돌려 쓰는 말은
-- 다 잡지 못하고, 흔한 말과 겹치는 줄기(보지, 자지, 미친)는 일부러 넣지 않았다. 목록을 고칠 때는 chat_text_is_offensive만 고친다.
-- 채팅 본문(chat_messages_rate_limit)과 닉네임(player_profiles_guard)이 같이 쓴다.
create or replace function public.chat_text_normalized(p_text text)
returns text language sql immutable set search_path = public as $$
    select regexp_replace(lower(coalesce(p_text, '')), '[^a-z가-힣ㄱ-ㅎㅏ-ㅣ]', '', 'g');
$$;
-- 띄어쓰기는 남기고(여러 칸은 한 칸) 기호와 숫자만 뺀 글: 낱말 사이를 넘어 걸리면 안 되는 짧은 줄기가 본다.
create or replace function public.chat_text_spaced(p_text text)
returns text language sql immutable set search_path = public as $$
    select regexp_replace(regexp_replace(lower(coalesce(p_text, '')), '[^a-z가-힣ㄱ-ㅎㅏ-ㅣ ]', '', 'g'), ' +', ' ', 'g');
$$;
-- 관리자가 더하는 금칙어: 운영 창(?admin=1)의 금칙어 칸이나 아래 admin_set_banned_term으로 넣으면 바로 적용된다.
-- 소문자로 넣는다. spaced가 true면 띄어쓰기를 남긴 글에서(짧은 말, 기본), false면 띄어쓰기를 지운 글에서 찾는다.
create table if not exists public.chat_banned_terms (
    term       text primary key check (char_length(term) between 2 and 40),
    spaced     boolean not null default true,
    note       text not null default '',
    created_at timestamptz not null default now()
);
alter table public.chat_banned_terms enable row level security;
-- 정책을 두지 않는다. 아래 검사 함수가 보안 정의자 트리거 안에서만 읽는다.
revoke all on public.chat_banned_terms from anon, authenticated;

-- 관리자: 금칙어 보기와 넣기/빼기(운영 통계 창의 채팅 신고 절, js/cloud-tools-ui.js). 낱말은 소문자로 다듬어 넣는다.
create or replace function public.admin_get_banned_terms()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
    if not public.is_project_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    return coalesce((select jsonb_agg(to_jsonb(term_row) order by term_row.created_at desc) from public.chat_banned_terms term_row), '[]'::jsonb);
end;
$$;
create or replace function public.admin_set_banned_term(p_term text, p_spaced boolean default true, p_remove boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    -- 검사 글과 같은 방식으로 다듬어 넣는다(숫자와 기호는 빠진다): 그래야 position()이 맞는다(검토 지적 2026-10-27).
    term_value text := trim(case when coalesce(p_spaced, true) then public.chat_text_spaced(p_term) else public.chat_text_normalized(p_term) end);
begin
    if not public.is_project_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    if char_length(term_value) not between 2 and 40 then raise exception 'INVALID_REQUEST'; end if;
    if p_remove then
        delete from public.chat_banned_terms where term = term_value;
    else
        insert into public.chat_banned_terms (term, spaced) values (term_value, coalesce(p_spaced, true))
        on conflict (term) do update set spaced = excluded.spaced;
    end if;
    return jsonb_build_object('term', term_value, 'removed', p_remove);
end;
$$;
revoke all on function public.admin_get_banned_terms() from public, anon;
revoke all on function public.admin_set_banned_term(text, boolean, boolean) from public, anon;
grant execute on function public.admin_get_banned_terms() to authenticated;
grant execute on function public.admin_set_banned_term(text, boolean, boolean) to authenticated;

-- 긴 줄기(3음절 이상과 fuck, bitch)는 띄어쓰기를 다 지운 글에서, 짧은 줄기(2음절, 자모 두 글자, shit)는 띄어쓰기를 남긴 글에서 찾는다.
-- "혹시 발사체", "3개 새로", "기존 나온", "ㅂㅂ ㅅㄱ", "sushi time" 같은 평범한 말이 걸리지 않게(검토 지적 2026-10-27). 그 뒤 금칙어 표를 본다.
create or replace function public.chat_text_is_offensive(p_text text)
returns boolean language sql stable security definer set search_path = public as $$
    select public.chat_text_normalized(p_text) ~ '(개새끼|미친놈|미친년|새끼야|새끼들|병신|븅신|지랄|느금|엠창|섹스|fuck|bitch)'
        or public.chat_text_spaced(p_text) ~ '(시발|씨발|시팔|씨팔|씨바|개새|미친새|존나|애미|좆|ㅅㅂ|ㅆㅂ|ㅂㅅ|ㅈㄴ|ㅈㄹ|창녀|창놈|\mshit\M)'
        or exists (select 1 from public.chat_banned_terms banned
                    where position(lower(banned.term) in case when banned.spaced then public.chat_text_spaced(p_text)
                                                                 else public.chat_text_normalized(p_text) end) > 0);
$$;

-- 도배 자동 금지(2026-10-27): 성공한 메시지 뒤에 60초 안 15개째면 10분 금지를 건다(한도와 같다: 클라이언트는 1분에 12개까지만 보내므로 정상 플레이는 닿지 않고, 우회한 쪽만 걸린다). 관리자가 건 더 긴 금지는 줄이지 않는다.
create or replace function public.chat_messages_auto_mute()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if (select count(*) from public.chat_messages where user_id = new.user_id and created_at > now() - interval '60 seconds') >= 15 then
        insert into public.chat_mutes (user_id, until_at, note) values (new.user_id, now() + interval '10 minutes', '자동: 60초 안 15개')
        on conflict (user_id) do update
            set until_at = greatest(chat_mutes.until_at, excluded.until_at),
                note = case when chat_mutes.until_at > excluded.until_at then chat_mutes.note else excluded.note end;
    end if;
    return null;
end;
$$;

drop trigger if exists trg_chat_messages_auto_mute on public.chat_messages;
create trigger trg_chat_messages_auto_mute
    after insert on public.chat_messages
    for each row execute function public.chat_messages_auto_mute();

revoke all on function public.chat_text_normalized(text) from public, anon, authenticated;
revoke all on function public.chat_text_spaced(text) from public, anon, authenticated;
revoke all on function public.chat_text_is_offensive(text) from public, anon, authenticated;
revoke all on function public.chat_messages_auto_mute() from public, anon, authenticated;

commit;
