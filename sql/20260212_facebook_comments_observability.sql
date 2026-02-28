create table if not exists public.meta_webhook_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  object text not null,
  page_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_meta_webhook_events_received_at on public.meta_webhook_events(received_at desc);
create index if not exists idx_meta_webhook_events_page_id on public.meta_webhook_events(page_id);

alter table public.contest_entries add column if not exists fb_comment_id text;
create unique index if not exists ux_contest_entries_fb_comment_id
  on public.contest_entries(fb_comment_id)
  where fb_comment_id is not null;
