-- SparkAgent Phase 1 schema
-- Run against project nzaelikbjumaidaombmp
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE throughout.

create extension if not exists "uuid-ossp";

-- ============================================================
-- profiles: one row per authenticated user, mirrors auth.users
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- conversations
-- ============================================================
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_id_idx on public.conversations(user_id);
create index if not exists conversations_updated_at_idx on public.conversations(updated_at desc);

alter table public.conversations enable row level security;

drop policy if exists "conversations_all_own" on public.conversations;
create policy "conversations_all_own" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- messages
-- ============================================================
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  model text,
  status text not null default 'completed' check (status in ('pending', 'streaming', 'completed', 'failed', 'cancelled')),
  error text,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on public.messages(conversation_id, created_at);

alter table public.messages enable row level security;

drop policy if exists "messages_all_own" on public.messages;
create policy "messages_all_own" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Keep conversations.updated_at fresh whenever a message is added
create or replace function public.touch_conversation()
returns trigger as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_message_inserted on public.messages;
create trigger on_message_inserted
  after insert on public.messages
  for each row execute procedure public.touch_conversation();
