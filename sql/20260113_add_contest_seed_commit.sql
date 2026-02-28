ALTER TABLE public.contests
  ADD COLUMN IF NOT EXISTS seed_commit text;
