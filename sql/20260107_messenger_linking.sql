ALTER TABLE public.messenger_entries
    ADD COLUMN IF NOT EXISTS user_id uuid,
    ADD COLUMN IF NOT EXISTS round_id uuid,
    ADD COLUMN IF NOT EXISTS prediction_winner text,
    ADD COLUMN IF NOT EXISTS prediction_team_a_score integer,
    ADD COLUMN IF NOT EXISTS prediction_team_b_score integer,
    ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE public.messenger_threads
    ADD COLUMN IF NOT EXISTS user_id uuid,
    ADD COLUMN IF NOT EXISTS cursor_index integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS current_task_id uuid,
    ADD COLUMN IF NOT EXISTS state_json jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'ACTIVE';

CREATE TABLE IF NOT EXISTS public.messenger_user_links (
    id uuid primary key default gen_random_uuid(),
    fb_page_id text not null,
    psid text not null,
    user_id uuid not null,
    created_at timestamptz not null default now(),
    unique (fb_page_id, psid),
    unique (fb_page_id, user_id)
);

CREATE INDEX IF NOT EXISTS messenger_entries_fb_page_psid_idx
    ON public.messenger_entries (fb_page_id, psid);
CREATE INDEX IF NOT EXISTS messenger_entries_contest_id_idx
    ON public.messenger_entries (contest_id);
CREATE INDEX IF NOT EXISTS messenger_entries_user_id_idx
    ON public.messenger_entries (user_id);

CREATE INDEX IF NOT EXISTS messenger_threads_contest_id_idx
    ON public.messenger_threads (contest_id);
CREATE INDEX IF NOT EXISTS messenger_threads_user_id_idx
    ON public.messenger_threads (user_id);
