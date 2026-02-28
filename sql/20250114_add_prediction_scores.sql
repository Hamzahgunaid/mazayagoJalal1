ALTER TABLE public.contest_entries
    ADD COLUMN IF NOT EXISTS prediction_team_a_score integer,
    ADD COLUMN IF NOT EXISTS prediction_team_b_score integer,
    ADD COLUMN IF NOT EXISTS prediction_winner text;
