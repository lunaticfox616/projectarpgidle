-- ============================================================================
-- 소셜 기능(프로필 공개 / 채팅) 백엔드 스키마
-- ----------------------------------------------------------------------------
-- 적용 방법:
--   1) Supabase 대시보드 → 좌측 메뉴 "SQL Editor" → "New query"
--   2) 이 파일 전체를 붙여넣고 "Run"
--   3) 오류 없이 "Success" 가 뜨면 완료. (여러 번 실행해도 안전하도록 작성됨)
--
-- ⚠️ service_role 키는 어디에도 붙여넣거나 공유하지 마세요. 이 SQL은 대시보드에
--    로그인된 상태에서 실행되므로 별도의 키가 필요하지 않습니다.
-- ============================================================================

-- ============================================================================
-- 1) 공개 프로필: 다른 플레이어가 장비/스탯을 구경할 수 있도록 하는 스냅샷
-- ============================================================================
create table if not exists public.player_profiles (
    user_id      uuid primary key references auth.users(id) on delete cascade,
    nickname     text not null,
    profile_data jsonb not null default '{}'::jsonb,
    updated_at   timestamptz not null default now()
);

-- 닉네임은 대소문자 무시하고 유일해야 한다.
create unique index if not exists player_profiles_nickname_unique
    on public.player_profiles (lower(nickname));

-- 닉네임 길이 제약(2~16자). 이미 만들어진 테이블에도 안전하게 추가한다.
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'player_profiles_nickname_len'
    ) then
        alter table public.player_profiles
            add constraint player_profiles_nickname_len
            check (char_length(nickname) between 2 and 16);
    end if;
end$$;

-- 접속 표시용 마지막 활동 시각(하트비트). 이미 있으면 무시.
alter table public.player_profiles
    add column if not exists last_seen timestamptz not null default now();

create index if not exists player_profiles_last_seen_idx
    on public.player_profiles (last_seen desc);

-- 닉네임 마지막 변경 시각(하루 1회 제한용). 최초 생성 시에는 null.
alter table public.player_profiles
    add column if not exists nickname_updated_at timestamptz;

-- 넣고 고칠 때(2026-10-27, db/multiplayer-hardening-20261027.sql과 같다): last_seen과 nickname_updated_at은 서버가 정한다
-- (하트비트 PATCH는 보낸 값과 상관없이 now()가 된다). 닉네임은 클라이언트 규칙과 같은 글자(한글, 영문, 숫자, _ -)만, 하루 한 번만
-- 바뀐다. profile_data는 512KB까지. updated_at은 그림(profile_data)이나 닉네임이 바뀔 때만 움직인다(전: 하트비트마다 바뀌어
-- 프로필의 갱신 시각이 접속 시각이 됐다). 예전 트리거 둘(nickname_guard, updated_at)을 이 하나로 합쳤다.
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

alter table public.player_profiles enable row level security;

-- 로그인한 사용자라면 누구나 프로필을 볼 수 있다(구경 기능).
drop policy if exists "player_profiles_select" on public.player_profiles;
create policy "player_profiles_select"
    on public.player_profiles for select
    to authenticated
    using (true);

-- 자기 자신의 프로필만 생성/수정할 수 있다. (select auth.uid())는 행마다 다시 계산하지 않기 위한 것이다(Supabase 성능 권고).
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
-- 2) 채팅 메시지
-- ============================================================================
create table if not exists public.chat_messages (
    id         bigint generated always as identity primary key,
    user_id    uuid not null references auth.users(id) on delete cascade,
    nickname   text not null,
    body       text not null check (char_length(body) between 1 and 500),
    payload    jsonb,                       -- 아이템 링크 등 부가 데이터(2차 기능용)
    created_at timestamptz not null default now()
);

create index if not exists chat_messages_created_at_idx
    on public.chat_messages (created_at desc);

alter table public.chat_messages enable row level security;

-- 로그인한 사용자라면 누구나 채팅을 읽을 수 있다.
drop policy if exists "chat_messages_select" on public.chat_messages;
create policy "chat_messages_select"
    on public.chat_messages for select
    to authenticated
    using (true);

-- 자기 user_id 로만 메시지를 보낼 수 있다.
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

-- 자기 메시지는 수정 가능(닉네임 변경 시 과거 채팅 닉네임 일괄 갱신용). 무엇을 고칠 수 있는지는 아래 update 가드가 정한다.
drop policy if exists "chat_messages_update_own" on public.chat_messages;
create policy "chat_messages_update_own"
    on public.chat_messages for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

-- 고칠 때(2026-10-27): 닉네임만 바뀐다. 새 닉네임은 자기 프로필의 닉네임이어야 한다(전: 본문, 시각, 닉네임을 마음대로 바꿀 수 있었다).
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

-- (선택) 자기 메시지는 본인이 삭제 가능.
drop policy if exists "chat_messages_delete_own" on public.chat_messages;
create policy "chat_messages_delete_own"
    on public.chat_messages for delete
    to authenticated
    using ((select auth.uid()) = user_id);

-- 실시간 채팅(2026-10-21): 새 채팅을 Supabase Realtime(postgres_changes)으로 보낸다(js/social.js syncLiveChat).
-- 읽을 수 있는 사람은 위 chat_messages_select 정책 그대로 로그인한 사용자뿐이다. 이미 설치한 프로젝트는 db/chat-realtime-20261021.sql.
do $$
begin
    if not exists (
        select 1 from pg_publication_tables
         where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
    ) then
        alter publication supabase_realtime add table public.chat_messages;
    end if;
end
$$;

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

-- 스팸 방지: 서버 측 속도 제한 트리거 -----------------------------------------
--   * 같은 사용자가 1.5초 안에 연속 전송 → 차단
--   * 같은 사용자가 최근 60초 동안 15개 초과 전송 → 차단
--   * 직전 메시지와 완전히 동일한 본문 연속 전송 → 차단
-- SECURITY DEFINER 로 RLS 우회하여 본인 최근 메시지를 집계한다.
--   * 시각은 서버가 정한다(2026-10-27: 클라이언트가 과거 시각을 넣어 이 제한을 비켜 갔다). payload는 64KB와 아이템 3개까지(끝판 장비 셋이 jsonb로 약 20KB).
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

-- 속도 제한이 보는 (user_id, created_at)에 색인을 건다(외래키 user_id에 색인이 없었다).
create index if not exists chat_messages_user_created_idx
    on public.chat_messages (user_id, created_at desc);

-- 저장 공간 보호: 채팅 로그 자동 정리 -----------------------------------------
-- 새 메시지가 들어올 때마다 3일이 지난 메시지를 지우고, 짧은 기간에 메시지가
-- 몰리는 경우에도 최신 CHAT_KEEP개만 남긴다.
create or replace function public.chat_messages_prune()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    keep_count constant int := 500;  -- 보관할 최신 메시지 수
    cutoff_id bigint;
begin
    delete from public.chat_messages
     where created_at < now() - interval '3 days';

    select id into cutoff_id
      from public.chat_messages
     order by id desc
    offset keep_count
     limit 1;

    if cutoff_id is not null then
        delete from public.chat_messages where id <= cutoff_id;
    end if;
    return null;
end;
$$;

-- 이 스키마를 기존 프로젝트에 다시 적용하는 즉시 과거 로그도 한 번 정리한다.
delete from public.chat_messages
 where created_at < now() - interval '3 days';

drop trigger if exists trg_chat_messages_prune on public.chat_messages;
create trigger trg_chat_messages_prune
    after insert on public.chat_messages
    for each row execute function public.chat_messages_prune();

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


-- ============================================================================
-- 채팅 운영(2026-10-27): 금지와 신고. 금지한 계정은 채팅을 보낼 수 없다(chat_messages_rate_limit). 신고는 쌓아 두고 관리자가
-- 운영 통계 창(?admin=1, js/cloud-tools-ui.js)에서 보고 금지하거나 줄을 지운다. 차단(남의 채팅 숨기기)은 기기 안에서만 한다.
-- ============================================================================
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

-- 관리자: 채팅 한 줄 삭제. 실시간 삭제 알림으로 열려 있는 채팅창에서 빠지고, 실시간이 아닌 창은 다음 전체 조회에서 사라진다.
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

-- 관리자: 채팅 전체 비우기(운영 창). 줄마다 실시간 삭제 알림이 가서 열려 있는 채팅창에서도 빠진다.
-- where true: Supabase의 pg-safeupdate가 WHERE 없는 DELETE를 막는다.
create or replace function public.admin_clear_chat()
returns jsonb language plpgsql security definer set search_path = public as $$
declare removed integer;
begin
    if not public.is_project_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    delete from public.chat_messages where true;
    get diagnostics removed = row_count;
    return jsonb_build_object('deleted', removed);
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
revoke all on function public.admin_clear_chat() from public, anon;
grant execute on function public.admin_clear_chat() to authenticated;
revoke all on function public.admin_set_chat_mute_by_nickname(text, integer, text) from public, anon;
grant execute on function public.admin_set_chat_mute_by_nickname(text, integer, text) to authenticated;

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

revoke all on function public.chat_text_normalized(text) from public, anon, authenticated;
revoke all on function public.chat_text_spaced(text) from public, anon, authenticated;
revoke all on function public.chat_text_is_offensive(text) from public, anon, authenticated;
revoke all on function public.chat_messages_auto_mute() from public, anon, authenticated;

-- 트리거 함수는 RPC로 부를 수 없게 한다(Supabase 보안 권고). 트리거는 호출자의 실행 권한을 보지 않으므로 회수해도 그대로 돈다.
-- 가장 오래된 두 표(chat_messages, player_profiles)는 Supabase 기본 권한(anon과 authenticated에 ALL)이 그대로였다(2026-10-27 점검).
-- RLS 정책이 authenticated에게만 있어 anon은 어차피 줄을 못 보지만, 쓰지 않는 권한은 걷는다. TRUNCATE는 RLS를 거치지 않는다.
revoke all on public.chat_messages, public.player_profiles from anon;
revoke truncate, references, trigger on public.chat_messages, public.player_profiles from authenticated;

revoke all on function public.chat_messages_rate_limit() from public, anon, authenticated;
revoke all on function public.chat_messages_prune() from public, anon, authenticated;
revoke all on function public.chat_messages_update_guard() from public, anon, authenticated;
revoke all on function public.player_profiles_guard() from public, anon, authenticated;

-- ============================================================================
-- 끝. player_profiles / chat_messages 두 테이블과 RLS·스팸방지·자동정리가 준비되었습니다.
-- ============================================================================
