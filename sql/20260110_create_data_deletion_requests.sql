CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL,
  email text,
  messenger_mt text,
  psid text,
  page text,
  contest_url text,
  notes text,
  status text NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_data_deletion_updated_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'PROCESSED' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS data_deletion_requests_set_updated_at ON public.data_deletion_requests;
CREATE TRIGGER data_deletion_requests_set_updated_at
BEFORE UPDATE ON public.data_deletion_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_data_deletion_updated_at();

ALTER TABLE public.data_deletion_requests
  ADD CONSTRAINT data_deletion_requests_status_check
  CHECK (status IN ('OPEN', 'PROCESSED'));

CREATE INDEX IF NOT EXISTS data_deletion_requests_created_at_idx
  ON public.data_deletion_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS data_deletion_requests_status_idx
  ON public.data_deletion_requests (status);
