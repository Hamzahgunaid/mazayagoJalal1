create table if not exists public.facebook_comment_sources (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  fb_page_id text not null,
  fb_post_id text not null,
  is_active boolean not null default true,
  comment_input_mode text not null default 'TEXT' check (comment_input_mode in ('TEXT','MCQ','MEDIA_ONLY','TEXT_OR_MEDIA')),
  task_id uuid null,
  allowed_options jsonb not null default '[]'::jsonb,
  allow_multiple_answers boolean not null default false,
  max_answers_per_user integer not null default 1,
  allow_media_only boolean not null default false,
  require_text boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_facebook_comment_sources_post unique (fb_post_id)
);

alter table public.facebook_comment_sources add column if not exists contest_id uuid;
alter table public.facebook_comment_sources add column if not exists fb_page_id text;
alter table public.facebook_comment_sources add column if not exists fb_post_id text;
alter table public.facebook_comment_sources add column if not exists is_active boolean not null default true;
alter table public.facebook_comment_sources add column if not exists comment_input_mode text not null default 'TEXT';
alter table public.facebook_comment_sources add column if not exists task_id uuid null;
alter table public.facebook_comment_sources add column if not exists allowed_options jsonb not null default '[]'::jsonb;
alter table public.facebook_comment_sources add column if not exists allow_multiple_answers boolean not null default false;
alter table public.facebook_comment_sources add column if not exists max_answers_per_user integer not null default 1;
alter table public.facebook_comment_sources add column if not exists allow_media_only boolean not null default false;
alter table public.facebook_comment_sources add column if not exists require_text boolean not null default true;
alter table public.facebook_comment_sources add column if not exists created_at timestamptz not null default now();
alter table public.facebook_comment_sources add column if not exists updated_at timestamptz not null default now();

create unique index if not exists uq_facebook_comment_sources_post on public.facebook_comment_sources(fb_post_id);
create index if not exists idx_facebook_comment_sources_contest_id on public.facebook_comment_sources(contest_id);
create index if not exists idx_facebook_comment_sources_fb_page_id on public.facebook_comment_sources(fb_page_id);
create index if not exists idx_facebook_comment_sources_fb_post_id on public.facebook_comment_sources(fb_post_id);
