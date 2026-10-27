-- 문의와 제보, 관리자 플레이어 조회(2026-10-27). Supabase 대시보드 > SQL Editor > New query에 이 파일 내용을 전부 붙여 넣고 Run.
-- db/account-deletion-hold-chat-20261027.sql까지 실행한 프로젝트에 쓴다. 같은 내용이 db/operations-and-ghost.sql 끝 절에도 들어 있어,
-- 나중에 처음부터 다시 설치해도 같은 상태가 된다(npm run check:db가 둘의 일치를 본다).
-- 여러 번 실행해도 안전하다. 기존 데이터는 지우거나 고치지 않는다. 한 묶음이라 중간에 오류가 나면 아무것도 바뀌지 않는다.
-- 먼저 오류만 보고 싶으면 맨 끝의 commit;을 rollback;으로 바꿔 한 번 돌려 본다.
--
--   1. player_feedback 표와 submit_player_feedback, get_my_feedback: 플레이어가 설정 > 문의와 제보에서 버그, 문의, 건의를 보내고
--      운영자의 답변을 같은 창에서 본다(로그인한 계정만, 하루 5건).
--   2. admin_get_feedback, admin_set_feedback: 운영 창(?admin=1)의 문의 목록, 상태(새 글, 확인함, 처리함)와 답변.
--   3. admin_search_players, admin_get_player, admin_get_player_save: 운영 창의 플레이어 찾기, 자세히 보기, 저장 JSON 내려받기.
--      관리자(app_metadata의 project_admin)만 부를 수 있다.

begin;

-- 전제 확인: db/operations-and-ghost.sql의 is_project_admin, db/anti-cheat.sql의 cheat_save_digest, db/social.sql의 chat_mutes, db/equipment-hall.sql의
-- hall_listings가 있어야 한다. plpgsql 본문은 만들 때 표를 검사하지 않아, 없으면 묶음은 성공하고 운영 창의 플레이어 절이 실행 때 깨진다.
do $$
begin
    if to_regprocedure('public.is_project_admin()') is null then
        raise exception 'db/operations-and-ghost.sql을 먼저 실행해야 합니다(is_project_admin이 없다)';
    end if;
    if to_regprocedure('public.cheat_save_digest(jsonb)') is null then
        raise exception 'db/anti-cheat.sql을 먼저 실행해야 합니다(cheat_save_digest가 없다)';
    end if;
    if to_regclass('public.chat_mutes') is null then
        raise exception 'db/social.sql을 먼저 실행해야 합니다(chat_mutes가 없다)';
    end if;
    if to_regclass('public.hall_listings') is null or to_regclass('public.hall_curator_profiles') is null then
        raise exception 'db/equipment-hall.sql을 먼저 실행해야 합니다(hall_listings가 없다)';
    end if;
end;
$$;

-- ============================================================================
-- 문의와 제보, 관리자 플레이어 조회 (2026-10-27)
-- ============================================================================
-- 플레이어가 설정 > 문의와 제보에서 보낸 글(버그, 문의, 건의)과 운영자의 답변. 표는 RPC로만 다룬다(정책 없음).
-- 운영 창(js/cloud-tools-ui.js, ?admin=1)에서 읽고 상태와 답변을 적는다. 계정이 지워지면 글도 함께 지워진다.
create table if not exists public.player_feedback (
    id          bigint generated always as identity primary key,
    user_id     uuid not null references auth.users(id) on delete cascade,
    kind        text not null check (kind in ('bug', 'question', 'suggestion')),
    body        text not null check (char_length(body) between 5 and 2000),
    contact     text not null default '' check (char_length(contact) <= 120),
    context     jsonb not null default '{}'::jsonb,
    app_version text not null default '',
    status      text not null default 'new' check (status in ('new', 'seen', 'done')),
    reply       text not null default '' check (char_length(reply) <= 2000),
    replied_at  timestamptz,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);
create index if not exists player_feedback_status_created_idx on public.player_feedback (status, created_at desc);
create index if not exists player_feedback_user_created_idx on public.player_feedback (user_id, created_at desc);
alter table public.player_feedback enable row level security;
revoke all on public.player_feedback from anon, authenticated;

-- 보내기: 로그인한 계정만, 하루 5건, 본문 5~2000자, 연락처 120자, 상황 정보(게임 버전, 지역, 루프, 직업, 기기)는 8KB까지.
create or replace function public.submit_player_feedback(p_kind text, p_body text, p_contact text default '', p_context jsonb default '{}'::jsonb, p_app_version text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    uid uuid := auth.uid();
    body text := left(btrim(coalesce(p_body, '')), 2000);
    today_count integer;
    new_id bigint;
begin
    if uid is null then raise exception 'AUTH_REQUIRED'; end if;
    if p_kind is null or p_kind not in ('bug', 'question', 'suggestion') then raise exception 'FEEDBACK_KIND_INVALID'; end if;
    if char_length(body) < 5 then raise exception 'FEEDBACK_TOO_SHORT'; end if;
    if pg_column_size(coalesce(p_context, '{}'::jsonb)) > 8192 then raise exception 'FEEDBACK_CONTEXT_TOO_LARGE'; end if;
    perform pg_advisory_xact_lock(hashtext('player_feedback:' || uid::text));   -- 같은 계정의 동시 요청이 하루 한도를 넘지 못하게
    select count(*) into today_count from public.player_feedback where user_id = uid and created_at >= now() - interval '1 day';
    if today_count >= 5 then raise exception 'FEEDBACK_DAILY_LIMIT'; end if;
    delete from public.player_feedback where status = 'done' and updated_at < now() - interval '180 days';   -- 처리한 글은 180일 뒤 지운다
    insert into public.player_feedback (user_id, kind, body, contact, context, app_version)
    values (uid, p_kind, body, left(btrim(coalesce(p_contact, '')), 120), coalesce(p_context, '{}'::jsonb), left(coalesce(p_app_version, ''), 40))
    returning id into new_id;
    return jsonb_build_object('id', new_id);
end;
$$;

-- 내가 보낸 글과 답변(최근 20건). 문의 창을 열 때마다 읽는다.
create or replace function public.get_my_feedback()
returns jsonb language sql stable security definer set search_path = public as $$
    select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at desc), '[]'::jsonb)
      from (select id, kind, body, status, reply, replied_at, created_at
              from public.player_feedback where user_id = auth.uid()
             order by created_at desc limit 20) f;
$$;

-- 관리자: 글 목록(상태를 주면 그 상태만, 최근 300건). 지금 닉네임과 이메일을 붙인다.
create or replace function public.admin_get_feedback(p_status text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
    if not public.is_project_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    return coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at desc) from (
        select fb.id, fb.user_id, fb.kind, fb.body, fb.contact, fb.context, fb.app_version, fb.status, fb.reply, fb.replied_at, fb.created_at,
               p.nickname, u.email
          from public.player_feedback fb
          left join public.player_profiles p on p.user_id = fb.user_id
          left join auth.users u on u.id = fb.user_id
         where p_status is null or fb.status = p_status
         order by fb.created_at desc limit 300) f), '[]'::jsonb);
end;
$$;

-- 관리자: 상태(new, seen, done)와 답변을 적는다. 답변은 플레이어가 문의 창에서 본다. null로 준 칸은 그대로 둔다.
create or replace function public.admin_set_feedback(p_id bigint, p_status text default null, p_reply text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
    if not public.is_project_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    if p_status is not null and p_status not in ('new', 'seen', 'done') then raise exception 'FEEDBACK_STATUS_INVALID'; end if;
    update public.player_feedback
       set status = coalesce(p_status, status),
           reply = case when p_reply is null then reply else left(btrim(p_reply), 2000) end,
           replied_at = case when p_reply is null then replied_at when btrim(p_reply) = '' then null else now() end,
           updated_at = now()
     where id = p_id;
    if not found then raise exception 'FEEDBACK_NOT_FOUND'; end if;
    return jsonb_build_object('id', p_id);
end;
$$;

-- 관리자: 플레이어 찾기. 닉네임과 이메일은 글자 그대로(LIKE 와일드카드 없음, 검토 지적 2026-10-27), user_id는 앞부분으로 찾고(비우면 최근 활동순),
-- 한 줄에 계정, 프로필 요약, 저장, 고스트, 전당,
-- 보류, 금지, 기록과 신고와 문의 수를 모은다. 최대 200명. save_bytes는 디스크의 압축 크기(JSON 글자 수는 자세히 보기가 센다).
create or replace function public.admin_search_players(p_query text default '', p_limit integer default 50)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    q text := nullif(btrim(coalesce(p_query, '')), '');
    lim integer := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
    if not public.is_project_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    return coalesce((select jsonb_agg(to_jsonb(r) order by r.last_active desc nulls last) from (
        select u.id as user_id, u.email, u.created_at as joined_at, u.last_sign_in_at,
               p.nickname, p.last_seen,
               p.profile_data ->> 'level' as level, p.profile_data ->> 'loop' as loop, p.profile_data ->> 'power' as power,
               s.revision as save_revision, s.updated_at as save_updated_at, pg_column_size(s.save_data) as save_bytes,
               g.rating as ghost_rating, g.active as ghost_active,
               h.honor as hall_honor,
               (select count(*) from public.hall_listings l where l.curator_id = u.id and l.status = 'open') as hall_open,
               exists (select 1 from public.cheat_holds c where c.user_id = u.id) as held,
               (select m.until_at from public.chat_mutes m where m.user_id = u.id and m.until_at > now()) as muted_until,
               (select count(*) from public.cheat_flags f where f.user_id = u.id) as flag_count,
               (select count(*) from public.chat_reports cr where cr.target_user_id = u.id) as report_count,
               (select count(*) from public.player_feedback fb where fb.user_id = u.id) as feedback_count,
               greatest(p.last_seen, s.updated_at, u.last_sign_in_at) as last_active
          from auth.users u
          left join public.player_profiles p on p.user_id = u.id
          left join public.cloud_saves s on s.user_id = u.id
          left join public.ghost_profiles g on g.user_id = u.id
          left join public.hall_curator_profiles h on h.user_id = u.id
         where q is null or position(lower(q) in lower(coalesce(p.nickname, ''))) > 0 or position(lower(q) in lower(coalesce(u.email, ''))) > 0
            or starts_with(u.id::text, lower(q))
         order by greatest(p.last_seen, s.updated_at, u.last_sign_in_at) desc nulls last
         limit lim) r), '[]'::jsonb);
end;
$$;

-- 관리자: 한 플레이어의 자세한 정보. 계정, 공개 프로필 전체, 저장 요약(cheat_save_digest의 네 칸과 크기), 고스트, 전당과 전시, 보류, 금지,
-- 기록, 받은 신고, 최근 채팅, 보낸 문의. 저장 JSON 전체는 admin_get_player_save로 따로 받는다(크기).
create or replace function public.admin_get_player(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
    if not public.is_project_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    if p_user_id is null then raise exception 'INVALID_REQUEST'; end if;
    if not exists (select 1 from auth.users where id = p_user_id) then raise exception 'PLAYER_NOT_FOUND'; end if;
    return jsonb_build_object(
        'account', (select to_jsonb(a) from (
            select u.id as user_id, u.email, u.created_at as joined_at, u.last_sign_in_at, u.raw_app_meta_data -> 'providers' as providers,
                   p.nickname, p.last_seen, p.nickname_updated_at, p.updated_at as profile_updated_at
              from auth.users u left join public.player_profiles p on p.user_id = u.id where u.id = p_user_id) a),
        'profile', coalesce((select p.profile_data from public.player_profiles p where p.user_id = p_user_id), '{}'::jsonb),
        'save', (select to_jsonb(s) from (
            select revision, updated_at, octet_length(save_data::text) as bytes, public.cheat_save_digest(save_data) as digest
              from public.cloud_saves where user_id = p_user_id) s),
        'saveVersions', (select count(*) from public.cloud_save_versions where user_id = p_user_id),
        'ghost', (select to_jsonb(g) from (
            select rating, dps, wins, losses, draws, matches, active, ascend_class, active_skill, updated_at
              from public.ghost_profiles where user_id = p_user_id) g),
        'hall', (select to_jsonb(h) from (select honor, copies_shared from public.hall_curator_profiles where user_id = p_user_id) h),
        'listings', coalesce((select jsonb_agg(to_jsonb(l) order by l.created_at desc) from (
            select id, status, item_snapshot ->> 'name' as name, item_score, created_at
              from public.hall_listings where curator_id = p_user_id order by created_at desc limit 20) l), '[]'::jsonb),
        'hold', (select to_jsonb(c) from (select note, created_at from public.cheat_holds where user_id = p_user_id) c),
        'mute', (select to_jsonb(m) from (select until_at, note, created_at from public.chat_mutes where user_id = p_user_id) m),
        'flags', coalesce((select jsonb_agg(to_jsonb(f) order by f.last_at desc) from (
            select kind, seen_on, hits, detail, last_at from public.cheat_flags where user_id = p_user_id order by last_at desc limit 30) f), '[]'::jsonb),
        'reports', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from (
            select reason, body, created_at from public.chat_reports where target_user_id = p_user_id order by created_at desc limit 20) r), '[]'::jsonb),
        'chat', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from (
            select id, body, created_at from public.chat_messages where user_id = p_user_id order by created_at desc limit 20) c), '[]'::jsonb),
        'feedback', coalesce((select jsonb_agg(to_jsonb(fb) order by fb.created_at desc) from (
            select id, kind, body, status, reply, created_at from public.player_feedback where user_id = p_user_id order by created_at desc limit 20) fb), '[]'::jsonb)
    );
end;
$$;

-- 관리자: 저장 JSON 전체(버그 재현용 내려받기). 수백 KB가 될 수 있어 자세히 보기와 따로 둔다.
create or replace function public.admin_get_player_save(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    data jsonb;
begin
    if not public.is_project_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    select save_data into data from public.cloud_saves where user_id = p_user_id;
    if data is null then raise exception 'SAVE_NOT_FOUND'; end if;
    return data;
end;
$$;

revoke all on function public.submit_player_feedback(text, text, text, jsonb, text) from public, anon;
revoke all on function public.get_my_feedback() from public, anon;
revoke all on function public.admin_get_feedback(text) from public, anon;
revoke all on function public.admin_set_feedback(bigint, text, text) from public, anon;
revoke all on function public.admin_search_players(text, integer) from public, anon;
revoke all on function public.admin_get_player(uuid) from public, anon;
revoke all on function public.admin_get_player_save(uuid) from public, anon;
grant execute on function public.submit_player_feedback(text, text, text, jsonb, text) to authenticated;
grant execute on function public.get_my_feedback() to authenticated;
grant execute on function public.admin_get_feedback(text) to authenticated;
grant execute on function public.admin_set_feedback(bigint, text, text) to authenticated;
grant execute on function public.admin_search_players(text, integer) to authenticated;
grant execute on function public.admin_get_player(uuid) to authenticated;
grant execute on function public.admin_get_player_save(uuid) to authenticated;

commit;
