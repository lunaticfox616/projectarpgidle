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

-- updated_at 자동 갱신용 트리거 함수 -----------------------------------------
create or replace function public.social_set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

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

-- 닉네임은 하루(24시간)에 한 번만 변경할 수 있다.
create or replace function public.player_profiles_nickname_guard()
returns trigger
language plpgsql
as $$
begin
    if new.nickname is distinct from old.nickname then
        if old.nickname_updated_at is not null
           and old.nickname_updated_at > now() - interval '24 hours' then
            raise exception 'NICK_COOLDOWN: 닉네임은 하루에 한 번만 변경할 수 있습니다.';
        end if;
        new.nickname_updated_at := now();
    end if;
    return new;
end;
$$;

drop trigger if exists trg_player_profiles_nickname_guard on public.player_profiles;
create trigger trg_player_profiles_nickname_guard
    before update on public.player_profiles
    for each row execute function public.player_profiles_nickname_guard();

drop trigger if exists trg_player_profiles_updated_at on public.player_profiles;
create trigger trg_player_profiles_updated_at
    before update on public.player_profiles
    for each row execute function public.social_set_updated_at();

alter table public.player_profiles enable row level security;

-- 로그인한 사용자라면 누구나 프로필을 볼 수 있다(구경 기능).
drop policy if exists "player_profiles_select" on public.player_profiles;
create policy "player_profiles_select"
    on public.player_profiles for select
    to authenticated
    using (true);

-- 자기 자신의 프로필만 생성/수정할 수 있다.
drop policy if exists "player_profiles_insert_own" on public.player_profiles;
create policy "player_profiles_insert_own"
    on public.player_profiles for insert
    to authenticated
    with check (auth.uid() = user_id);

drop policy if exists "player_profiles_update_own" on public.player_profiles;
create policy "player_profiles_update_own"
    on public.player_profiles for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

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
    with check (auth.uid() = user_id);

-- 자기 메시지는 수정 가능(닉네임 변경 시 과거 채팅 닉네임 일괄 갱신용).
drop policy if exists "chat_messages_update_own" on public.chat_messages;
create policy "chat_messages_update_own"
    on public.chat_messages for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- (선택) 자기 메시지는 본인이 삭제 가능.
drop policy if exists "chat_messages_delete_own" on public.chat_messages;
create policy "chat_messages_delete_own"
    on public.chat_messages for delete
    to authenticated
    using (auth.uid() = user_id);

-- 스팸 방지: 서버 측 속도 제한 트리거 -----------------------------------------
--   * 같은 사용자가 1.5초 안에 연속 전송 → 차단
--   * 같은 사용자가 최근 60초 동안 15개 초과 전송 → 차단
--   * 직전 메시지와 완전히 동일한 본문 연속 전송 → 차단
-- SECURITY DEFINER 로 RLS 우회하여 본인 최근 메시지를 집계한다.
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

-- 저장 공간 보호: 채팅 로그 자동 정리 -----------------------------------------
-- 무료 티어에서 데이터가 무한히 쌓이지 않도록, 새 메시지가 들어올 때마다
-- 최신 CHAT_KEEP개만 남기고 오래된 메시지를 삭제한다.
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

drop trigger if exists trg_chat_messages_prune on public.chat_messages;
create trigger trg_chat_messages_prune
    after insert on public.chat_messages
    for each row execute function public.chat_messages_prune();

-- ============================================================================
-- 끝. player_profiles / chat_messages 두 테이블과 RLS·스팸방지·자동정리가 준비되었습니다.
-- ============================================================================
