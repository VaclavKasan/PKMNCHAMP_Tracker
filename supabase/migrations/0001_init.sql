-- PKMNCHAMP Tracker — initial Supabase schema
-- Run this once in the Supabase SQL editor on a fresh project.

-- ── profiles ──────────────────────────────────────────────────────────────────
-- (RLS enabled further down, after `friends` exists — profiles_select
-- references it.)

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  friend_code  text unique not null,
  created_at   timestamptz not null default now()
);

-- ── friends ───────────────────────────────────────────────────────────────────

create type public.friend_status as enum ('pending', 'accepted', 'declined');

create table public.friends (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references auth.users(id) on delete cascade,
  owner_id      uuid not null references auth.users(id) on delete cascade,
  status        public.friend_status not null default 'pending',
  -- Chosen by the requester when sending: true grants the owner read access
  -- back into the requester's data too; false keeps it one-directional
  -- (requester can view owner, owner cannot automatically view requester).
  mutual        boolean not null default true,
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  constraint no_self_friend check (requester_id <> owner_id),
  constraint unique_pair unique (requester_id, owner_id)
);

create index friends_owner_idx on public.friends(owner_id, status);
create index friends_requester_idx on public.friends(requester_id, status);

alter table public.friends enable row level security;

create policy friends_select on public.friends for select
using (auth.uid() = requester_id or auth.uid() = owner_id);

create policy friends_insert on public.friends for insert
with check (auth.uid() = requester_id and status = 'pending');

-- Only the recipient can accept/decline.
create policy friends_update on public.friends for update
using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Either party can withdraw a pending request or unfriend an accepted one.
create policy friends_delete on public.friends for delete
using (auth.uid() = requester_id or auth.uid() = owner_id);

-- ── profiles RLS (now that `friends` exists) ──────────────────────────────────

alter table public.profiles enable row level security;

create policy profiles_select on public.profiles for select
using (
  id = auth.uid()
  or exists (
    select 1 from public.friends f
    where (f.requester_id = auth.uid() and f.owner_id = profiles.id)
       or (f.owner_id = auth.uid() and f.requester_id = profiles.id)
  )
);

create policy profiles_update on public.profiles for update
using (id = auth.uid()) with check (id = auth.uid());

-- Friend code is assigned once at signup and not directly editable by clients.
revoke update (friend_code) on public.profiles from authenticated;

-- 8-char code, excludes ambiguous characters (0/O, 1/I/L).
create or replace function public.generate_friend_code() returns text
language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code  text;
begin
  loop
    code := (
      select string_agg(substr(chars, (floor(random() * length(chars)) + 1)::int, 1), '')
      from generate_series(1, 8)
    );
    exit when not exists (select 1 from public.profiles where friend_code = code);
  end loop;
  return code;
end $$;

-- Auto-create a profile (with friend code) whenever a new auth user signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url, friend_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    public.generate_friend_code()
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Resolve a typed friend code to a user id, without exposing the whole
-- profiles table to unauthenticated lookups.
create or replace function public.find_user_by_friend_code(code text)
returns table(user_id uuid, display_name text, avatar_url text)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select p.id, p.display_name, p.avatar_url
    from public.profiles p
    where p.friend_code = upper(trim(code))
    limit 1;
end $$;

grant execute on function public.find_user_by_friend_code(text) to authenticated;

-- ── box_pokemon ───────────────────────────────────────────────────────────────

create table public.box_pokemon (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  slug        text not null,
  name        text not null,
  national    integer,
  is_form     boolean not null default false,
  types       text[],
  moves       text[] not null default '{}',
  ability     text,
  item        text,
  nature      text,
  ev_training jsonb,
  added_at    timestamptz not null default now()
);

create index box_pokemon_user_idx on public.box_pokemon(user_id);

alter table public.box_pokemon enable row level security;

create policy box_pokemon_select on public.box_pokemon for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.friends f
    where f.status = 'accepted'
      and (
        (f.requester_id = auth.uid() and f.owner_id = box_pokemon.user_id)
        or (f.owner_id = auth.uid() and f.requester_id = box_pokemon.user_id and f.mutual)
      )
  )
);

create policy box_pokemon_write on public.box_pokemon for all
using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── matches ───────────────────────────────────────────────────────────────────

create table public.matches (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  played_at      timestamptz not null default now(),
  match_date     date,
  match_time     text,  -- kept as plain "HH:MM" text — a `time` column round-trips with seconds appended
  starred        boolean not null default false,
  my_team        jsonb not null default '[]',
  enemy_team     jsonb not null default '[]',
  enemy_strategy text,
  regulation     text,
  season         text,
  rank           text,
  result         text not null check (result in ('win', 'loss')),
  notes          text
);

create index matches_user_played_idx on public.matches(user_id, played_at desc);

alter table public.matches enable row level security;

create policy matches_select on public.matches for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.friends f
    where f.status = 'accepted'
      and (
        (f.requester_id = auth.uid() and f.owner_id = matches.user_id)
        or (f.owner_id = auth.uid() and f.requester_id = matches.user_id and f.mutual)
      )
  )
);

create policy matches_write on public.matches for all
using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── widget_config ─────────────────────────────────────────────────────────────
-- One row per user. Always the viewer's own layout preference — never
-- friend-readable, unlike box_pokemon/matches.

create table public.widget_config (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  visible_ids text[] not null default '{}',
  widths      jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

alter table public.widget_config enable row level security;

create policy widget_config_all on public.widget_config for all
using (user_id = auth.uid()) with check (user_id = auth.uid());
