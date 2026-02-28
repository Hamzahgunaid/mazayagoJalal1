alter table public.facebook_comment_entries
  add column if not exists fb_user_name text;

alter table public.facebook_comment_entries
  add column if not exists fb_comment_created_at timestamptz;
