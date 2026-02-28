-- Facebook comments participation source + entries hardening

create table if not exists public.facebook_comment_sources (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null,
  fb_page_id text,
  fb_post_id text,
  is_active boolean not null default false,
  comment_input_mode text not null default 'TEXT',
  task_id uuid null,
  allowed_options jsonb not null default '[]'::jsonb,
  allow_multiple_answers boolean not null default false,
  max_answers_per_user int not null default 1,
  allow_replies boolean not null default false,
  allow_media_only boolean not null default true,
  require_text boolean not null default false,
  require_regex text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_facebook_comment_sources_contest_id
  on public.facebook_comment_sources(contest_id);

alter table public.facebook_comment_sources add column if not exists fb_page_id text;
alter table public.facebook_comment_sources add column if not exists fb_post_id text;
alter table public.facebook_comment_sources add column if not exists is_active boolean not null default false;
alter table public.facebook_comment_sources add column if not exists comment_input_mode text not null default 'TEXT';
alter table public.facebook_comment_sources add column if not exists task_id uuid null;
alter table public.facebook_comment_sources add column if not exists allowed_options jsonb not null default '[]'::jsonb;
alter table public.facebook_comment_sources add column if not exists allow_multiple_answers boolean not null default false;
alter table public.facebook_comment_sources add column if not exists max_answers_per_user int not null default 1;
alter table public.facebook_comment_sources add column if not exists allow_replies boolean not null default false;
alter table public.facebook_comment_sources add column if not exists allow_media_only boolean not null default true;
alter table public.facebook_comment_sources add column if not exists require_text boolean not null default false;
alter table public.facebook_comment_sources add column if not exists require_regex text null;
alter table public.facebook_comment_sources add column if not exists created_at timestamptz not null default now();
alter table public.facebook_comment_sources add column if not exists updated_at timestamptz not null default now();

create table if not exists public.facebook_comment_entries (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null,
  fb_page_id text,
  fb_post_id text,
  fb_comment_id text,
  fb_parent_comment_id text,
  fb_user_id text,
  message_text text,
  answer_text text,
  task_id uuid null,
  mcq_option_id uuid null,
  is_correct boolean null,
  status text not null default 'PENDING_LINK',
  raw_event jsonb,
  created_at timestamptz not null default now(),
  r2_key text,
  r2_url text,
  r2_etag text,
  r2_size_bytes bigint,
  r2_sha256 text,
  media_fetched_at timestamptz
);

create unique index if not exists ux_facebook_comment_entries_comment_id
  on public.facebook_comment_entries(fb_comment_id)
  where fb_comment_id is not null;

alter table public.facebook_comment_entries add column if not exists r2_key text;
alter table public.facebook_comment_entries add column if not exists r2_url text;
alter table public.facebook_comment_entries add column if not exists r2_etag text;
alter table public.facebook_comment_entries add column if not exists r2_size_bytes bigint;
alter table public.facebook_comment_entries add column if not exists r2_sha256 text;
alter table public.facebook_comment_entries add column if not exists media_fetched_at timestamptz;

