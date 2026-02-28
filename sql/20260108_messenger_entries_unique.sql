DO $$
DECLARE
  contest_att smallint;
  page_att smallint;
  psid_att smallint;
  task_att smallint;
  constraint_name text;
BEGIN
  SELECT attnum::smallint INTO contest_att
  FROM pg_attribute
  WHERE attrelid = 'public.messenger_entries'::regclass
    AND attname = 'contest_id';

  SELECT attnum::smallint INTO page_att
  FROM pg_attribute
  WHERE attrelid = 'public.messenger_entries'::regclass
    AND attname = 'fb_page_id';

  SELECT attnum::smallint INTO psid_att
  FROM pg_attribute
  WHERE attrelid = 'public.messenger_entries'::regclass
    AND attname = 'psid';

  SELECT attnum::smallint INTO task_att
  FROM pg_attribute
  WHERE attrelid = 'public.messenger_entries'::regclass
    AND attname = 'task_id';

  IF contest_att IS NULL OR page_att IS NULL OR psid_att IS NULL OR task_att IS NULL THEN
    RETURN;
  END IF;

  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.messenger_entries'::regclass
    AND contype = 'u'
    AND conkey @> ARRAY[contest_att, page_att, psid_att]::smallint[]
    AND array_length(conkey, 1) = 3
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.messenger_entries DROP CONSTRAINT %I', constraint_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.messenger_entries'::regclass
      AND contype = 'u'
      AND conkey @> ARRAY[contest_att, page_att, psid_att, task_att]::smallint[]
      AND array_length(conkey, 1) = 4
  ) THEN
    EXECUTE 'ALTER TABLE public.messenger_entries ADD CONSTRAINT messenger_entries_contest_page_psid_task_key UNIQUE (contest_id, fb_page_id, psid, task_id)';
  END IF;
END $$;
