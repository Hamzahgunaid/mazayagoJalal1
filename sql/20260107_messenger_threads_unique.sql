ALTER TABLE public.messenger_threads
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS cursor_index integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS current_task_id uuid,
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS state_json jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS messenger_threads_page_psid_idx
    ON public.messenger_threads (fb_page_id, psid);

DO $$
DECLARE
  fb_att smallint;
  psid_att smallint;
  constraint_name text;
BEGIN
  SELECT attnum INTO fb_att
  FROM pg_attribute
  WHERE attrelid = 'public.messenger_threads'::regclass
    AND attname = 'fb_page_id';

  SELECT attnum INTO psid_att
  FROM pg_attribute
  WHERE attrelid = 'public.messenger_threads'::regclass
    AND attname = 'psid';

  IF fb_att IS NULL OR psid_att IS NULL THEN
    RETURN;
  END IF;

  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.messenger_threads'::regclass
    AND contype = 'u'
    AND conkey @> ARRAY[fb_att, psid_att]
    AND array_length(conkey, 1) = 2
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.messenger_threads DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.messenger_threads'::regclass
      AND contype = 'u'
      AND conkey @> ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.messenger_threads'::regclass AND attname = 'contest_id'),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.messenger_threads'::regclass AND attname = 'fb_page_id'),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.messenger_threads'::regclass AND attname = 'psid')
      ]
      AND array_length(conkey, 1) = 3
  ) THEN
    ALTER TABLE public.messenger_threads
      ADD CONSTRAINT messenger_threads_contest_page_psid_key UNIQUE (contest_id, fb_page_id, psid);
  END IF;
END $$;
