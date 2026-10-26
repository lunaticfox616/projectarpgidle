-- 멀티 요소 보강(2026-10-27). Supabase 대시보드 > SQL Editor > New query에 이 파일 내용을 전부 붙여 넣고 Run.
-- db/cloud-and-playtest.sql, db/operations-and-ghost.sql, db/social.sql, db/equipment-hall.sql, db/anti-cheat.sql을 실행한 프로젝트에 쓴다.
-- 같은 내용이 db/social.sql, db/cloud-and-playtest.sql, db/equipment-hall.sql에도 들어 있어, 나중에 처음부터 다시 설치해도 같은 상태가 된다.
-- 여러 번 실행해도 안전하다. 기존 데이터는 지우거나 고치지 않는다(지우는 것은 쓰지 않는 예전 순위표 player_rankings뿐이다).
-- 한 묶음이라 중간에 오류가 나면 아무것도 바뀌지 않는다.
--
-- 2026-10-27 검토에서 찾은 것과 고친 방향:
--   1. 시각 열(chat_messages.created_at, player_profiles.last_seen과 nickname_updated_at, 원격 측정 표의 created_at)을 클라이언트가
--      직접 쓸 수 있었다. 채팅 도배 제한과 원격 측정 일일 한도가 그 열로 세어 과거 시각을 넣으면 비켜 갔고, 미래 시각을 넣으면
--      늘 접속 중으로 보였고, 닉네임 하루 1회 제한도 풀렸다. 이제 트리거가 서버 시각으로 덮어쓴다.
--   2. 채팅 UPDATE 정책이 user_id만 봐서 지난 메시지의 본문, 시각, 닉네임을 바꿀 수 있었다. 이제 닉네임만, 자기 프로필의 닉네임으로만 바뀐다.
--   3. 채팅 payload와 공개 프로필 profile_data에 크기 상한이 없었다(payload 8KB와 아이템 3개, profile_data 512KB).
--   4. 원격 측정 표(playtest_runs, client_error_reports)의 jsonb와 글 열에 크기 상한이 없었다.
--   5. 닉네임 글자 규칙(한글, 영문, 숫자, _ -)이 클라이언트에만 있었다. 공개 프로필의 updated_at이 하트비트마다 바뀌어
--      프로필의 갱신 시각이 접속 시각이 됐다. 이제 그림이나 닉네임이 바뀔 때만 움직인다.
--   6. 트리거 함수에 anon과 authenticated의 execute가 남아 있었다(Supabase 보안 권고. 트리거는 실행 권한을 보지 않으므로 회수해도 돈다).
--      저장소에서 지운 예전 순위표 함수와 표가 라이브 DB에 남아 있었다. 저장소에 없는 rls_auto_enable()은 지우지 않고 권한만 회수한다.
--   7. RLS 정책의 auth.uid()를 (select auth.uid())로 바꿔 행마다 다시 계산하지 않는다(Supabase 성능 권고).
--      채팅 속도 제한이 보는 (user_id, created_at)과 전당 등록부의 owner_id에 색인을 건다.

begin;

-- ============================================================================
-- 1) 채팅
-- ============================================================================
-- 넣을 때: 시각은 서버가 정하고 payload는 8KB와 아이템 3개까지. 그 뒤 기존 속도 제한(1.5초, 60초 15개, 연속 중복).
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
    if new.payload is not null then
        if jsonb_typeof(new.payload) <> 'object' or pg_column_size(new.payload) > 8192
           or jsonb_typeof(new.payload -> 'items') <> 'array' or jsonb_array_length(new.payload -> 'items') > 3 then
            raise exception 'CHAT_PAYLOAD_INVALID: 아이템 링크는 메시지마다 3개, 8KB까지입니다.';
        end if;
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
set search_path = public
as $$
begin
    if pg_column_size(new.profile_data) > 524288 then
        raise exception 'PROFILE_TOO_LARGE: 공개 프로필이 너무 큽니다.';
    end if;
    if tg_op = 'INSERT' or new.nickname is distinct from old.nickname then
        if new.nickname !~ '^[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ_-]+$' then
            raise exception 'NICK_INVALID: 닉네임은 한글, 영문, 숫자, _ - 만 쓸 수 있습니다.';
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
    if pg_column_size(new.context) > 8192 or char_length(new.fingerprint) > 200 or char_length(new.app_version) > 60 then
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
revoke all on function public.social_set_updated_at() from public, anon, authenticated;
revoke all on function public.guard_playtest_run_insert() from public, anon, authenticated;
revoke all on function public.guard_client_error_insert() from public, anon, authenticated;

-- 저장소에 없는 함수가 라이브 DB에 있으면(rls_auto_enable) 지우지 않고 바깥 호출만 막는다. 본문은 대시보드에서 확인한다.
do $$
begin
    if to_regprocedure('public.rls_auto_enable()') is not null then
        execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
    end if;
end
$$;

-- 예전 일일 루프/DPS 순위표(db/equipment-hall.sql이 지우지만 라이브 DB에 남아 있었다). 클라이언트는 더 부르지 않는다.
drop function if exists public.submit_player_ranking(bigint, bigint);
drop table if exists public.player_rankings;

-- 전당 등록부의 owner_id 외래키 색인.
create index if not exists hall_item_registry_owner_idx
    on public.hall_item_registry (owner_id);

commit;
