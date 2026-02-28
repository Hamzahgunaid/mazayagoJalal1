CREATE EXTENSION IF NOT EXISTS pgcrypto;

/* -------------------------------------------------------------------------- */
/* 1) Businesses (user-owned)                                                  */
/* -------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  name text NOT NULL,
  avatar_url text,
  logo_url text,
  cover_url text,
  website_url text,
  phone text,
  social_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  meta_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT businesses_owner_user_id_fkey FOREIGN KEY (owner_user_id)
    REFERENCES public.users (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS businesses_owner_idx ON public.businesses (owner_user_id);

/* -------------------------------------------------------------------------- */
/* 2) Contest ↔ Organizer link (many-to-many, polymorphic)                     */
/* -------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS public.contest_organizers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL,
  organizer_kind text NOT NULL CHECK (organizer_kind IN ('USER', 'BUSINESS')),
  organizer_user_id uuid,
  organizer_business_id uuid,
  role text NOT NULL DEFAULT 'HOST',
  is_primary boolean NOT NULL DEFAULT false,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contest_organizers_contest_id_fkey FOREIGN KEY (contest_id)
    REFERENCES public.contests (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE,
  CONSTRAINT contest_organizers_user_id_fkey FOREIGN KEY (organizer_user_id)
    REFERENCES public.users (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE RESTRICT,
  CONSTRAINT contest_organizers_business_id_fkey FOREIGN KEY (organizer_business_id)
    REFERENCES public.businesses (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE RESTRICT,
  CONSTRAINT contest_organizers_created_by_user_id_fkey FOREIGN KEY (created_by_user_id)
    REFERENCES public.users (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE SET NULL,
  CONSTRAINT contest_organizers_kind_check CHECK (
    (organizer_kind = 'USER' AND organizer_user_id IS NOT NULL AND organizer_business_id IS NULL)
    OR
    (organizer_kind = 'BUSINESS' AND organizer_business_id IS NOT NULL AND organizer_user_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS contest_organizers_contest_idx ON public.contest_organizers (contest_id);
CREATE INDEX IF NOT EXISTS contest_organizers_user_idx ON public.contest_organizers (organizer_user_id);
CREATE INDEX IF NOT EXISTS contest_organizers_business_idx ON public.contest_organizers (organizer_business_id);
CREATE UNIQUE INDEX IF NOT EXISTS contest_organizers_primary_unique
  ON public.contest_organizers (contest_id)
  WHERE is_primary = true;
CREATE UNIQUE INDEX IF NOT EXISTS contest_organizers_user_unique
  ON public.contest_organizers (contest_id, organizer_user_id)
  WHERE organizer_kind = 'USER';
CREATE UNIQUE INDEX IF NOT EXISTS contest_organizers_business_unique
  ON public.contest_organizers (contest_id, organizer_business_id)
  WHERE organizer_kind = 'BUSINESS';

/* -------------------------------------------------------------------------- */
/* 3) Frozen snapshot per contest + organizer                                  */
/* -------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS public.contest_organizer_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL,
  contest_organizer_id uuid NOT NULL,
  organizer_kind text NOT NULL CHECK (organizer_kind IN ('USER', 'BUSINESS')),
  organizer_user_id uuid,
  organizer_business_id uuid,
  display_name text NOT NULL,
  display_avatar_url text,
  display_logo_url text,
  display_website_url text,
  display_phone text,
  display_social_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_meta_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  frozen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contest_organizer_snapshots_contest_id_fkey FOREIGN KEY (contest_id)
    REFERENCES public.contests (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE,
  CONSTRAINT contest_organizer_snapshots_link_fkey FOREIGN KEY (contest_organizer_id)
    REFERENCES public.contest_organizers (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE,
  CONSTRAINT contest_organizer_snapshots_user_id_fkey FOREIGN KEY (organizer_user_id)
    REFERENCES public.users (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE RESTRICT,
  CONSTRAINT contest_organizer_snapshots_business_id_fkey FOREIGN KEY (organizer_business_id)
    REFERENCES public.businesses (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE RESTRICT,
  CONSTRAINT contest_organizer_snapshots_kind_check CHECK (
    (organizer_kind = 'USER' AND organizer_user_id IS NOT NULL AND organizer_business_id IS NULL)
    OR
    (organizer_kind = 'BUSINESS' AND organizer_business_id IS NOT NULL AND organizer_user_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS contest_organizer_snapshots_link_unique
  ON public.contest_organizer_snapshots (contest_organizer_id);
CREATE INDEX IF NOT EXISTS contest_organizer_snapshots_contest_idx
  ON public.contest_organizer_snapshots (contest_id);

/* -------------------------------------------------------------------------- */
/* 4) Rename contests.owner_service_id → primary_organizer_link_id              */
/* -------------------------------------------------------------------------- */
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contests'
      AND column_name = 'owner_service_id'
  ) THEN
    ALTER TABLE public.contests RENAME COLUMN owner_service_id TO primary_organizer_link_id;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contests'
      AND column_name = 'primary_organizer_link_id'
  ) THEN
    ALTER TABLE public.contests ADD COLUMN primary_organizer_link_id uuid;
  END IF;
END;
$$;

ALTER TABLE public.contests DROP CONSTRAINT IF EXISTS contests_owner_service_id_fkey;
ALTER TABLE public.contests DROP CONSTRAINT IF EXISTS contests_primary_organizer_link_id_fkey;

/* -------------------------------------------------------------------------- */
/* 5) updated_at helpers                                                       */
/* -------------------------------------------------------------------------- */
CREATE OR REPLACE FUNCTION public.businesses_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.contest_organizers_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.contest_organizer_snapshots_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS businesses_set_updated_at_trg ON public.businesses;
CREATE TRIGGER businesses_set_updated_at_trg
BEFORE UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.businesses_set_updated_at();

DROP TRIGGER IF EXISTS contest_organizers_set_updated_at_trg ON public.contest_organizers;
CREATE TRIGGER contest_organizers_set_updated_at_trg
BEFORE UPDATE ON public.contest_organizers
FOR EACH ROW
EXECUTE FUNCTION public.contest_organizers_set_updated_at();

DROP TRIGGER IF EXISTS contest_organizer_snapshots_set_updated_at_trg ON public.contest_organizer_snapshots;
CREATE TRIGGER contest_organizer_snapshots_set_updated_at_trg
BEFORE UPDATE ON public.contest_organizer_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.contest_organizer_snapshots_set_updated_at();

/* -------------------------------------------------------------------------- */
/* 6) Snapshot + primary sync triggers                                         */
/* -------------------------------------------------------------------------- */
CREATE OR REPLACE FUNCTION public.contest_organizers_snapshot_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.organizer_kind = 'USER' THEN
    INSERT INTO public.contest_organizer_snapshots (
      contest_id,
      contest_organizer_id,
      organizer_kind,
      organizer_user_id,
      organizer_business_id,
      display_name,
      display_avatar_url,
      display_logo_url,
      display_website_url,
      display_phone,
      display_social_json,
      display_meta_json,
      frozen_at
    )
    SELECT
      NEW.contest_id,
      NEW.id,
      NEW.organizer_kind,
      NEW.organizer_user_id,
      NULL,
      COALESCE(u.display_name, u.full_name, u.email, 'Organizer'),
      u.avatar_url,
      NULL,
      NULL,
      u.phone,
      '{}'::jsonb,
      '{}'::jsonb,
      now()
    FROM public.users u
    WHERE u.id = NEW.organizer_user_id
    ON CONFLICT (contest_organizer_id) DO NOTHING;
  ELSIF NEW.organizer_kind = 'BUSINESS' THEN
    INSERT INTO public.contest_organizer_snapshots (
      contest_id,
      contest_organizer_id,
      organizer_kind,
      organizer_user_id,
      organizer_business_id,
      display_name,
      display_avatar_url,
      display_logo_url,
      display_website_url,
      display_phone,
      display_social_json,
      display_meta_json,
      frozen_at
    )
    SELECT
      NEW.contest_id,
      NEW.id,
      NEW.organizer_kind,
      NULL,
      NEW.organizer_business_id,
      b.name,
      b.avatar_url,
      b.logo_url,
      b.website_url,
      b.phone,
      b.social_json,
      b.meta_json,
      now()
    FROM public.businesses b
    WHERE b.id = NEW.organizer_business_id
    ON CONFLICT (contest_organizer_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.contest_organizers_sync_contest()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_primary THEN
      UPDATE public.contests
        SET primary_organizer_link_id = NEW.id
      WHERE id = NEW.contest_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_primary AND NOT NEW.is_primary THEN
      UPDATE public.contests
        SET primary_organizer_link_id = (
          SELECT id
          FROM public.contest_organizers
          WHERE contest_id = NEW.contest_id AND is_primary = true
          ORDER BY created_at ASC
          LIMIT 1
        )
      WHERE id = NEW.contest_id AND primary_organizer_link_id = OLD.id;
    ELSIF NEW.is_primary THEN
      UPDATE public.contests
        SET primary_organizer_link_id = NEW.id
      WHERE id = NEW.contest_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.is_primary THEN
      UPDATE public.contests
        SET primary_organizer_link_id = (
          SELECT id
          FROM public.contest_organizers
          WHERE contest_id = OLD.contest_id AND is_primary = true
          ORDER BY created_at ASC
          LIMIT 1
        )
      WHERE id = OLD.contest_id AND primary_organizer_link_id = OLD.id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS contest_organizers_snapshot_trg ON public.contest_organizers;
CREATE TRIGGER contest_organizers_snapshot_trg
AFTER INSERT ON public.contest_organizers
FOR EACH ROW
EXECUTE FUNCTION public.contest_organizers_snapshot_insert();

DROP TRIGGER IF EXISTS contest_organizers_sync_contest_trg ON public.contest_organizers;
CREATE TRIGGER contest_organizers_sync_contest_trg
AFTER INSERT OR UPDATE OR DELETE ON public.contest_organizers
FOR EACH ROW
EXECUTE FUNCTION public.contest_organizers_sync_contest();

/* -------------------------------------------------------------------------- */
/* 7) Seed links from existing contests (PERSONAL only)                         */
/* -------------------------------------------------------------------------- */
INSERT INTO public.contest_organizers (
  contest_id,
  organizer_kind,
  organizer_user_id,
  role,
  is_primary,
  created_by_user_id
)
SELECT
  c.id,
  'USER',
  c.created_by_user_id,
  'HOST',
  true,
  c.created_by_user_id
FROM public.contests c
WHERE c.created_by_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.contest_organizers co
    WHERE co.contest_id = c.id AND co.is_primary = true
  );

UPDATE public.contests c
SET primary_organizer_link_id = co.id
FROM public.contest_organizers co
WHERE co.contest_id = c.id
  AND co.is_primary = true
  AND (c.primary_organizer_link_id IS DISTINCT FROM co.id);

UPDATE public.contests c
SET primary_organizer_link_id = NULL
WHERE c.primary_organizer_link_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.contest_organizers co WHERE co.id = c.primary_organizer_link_id
  );

/* -------------------------------------------------------------------------- */
/* 8) Final FK + index                                                         */
/* -------------------------------------------------------------------------- */
ALTER TABLE public.contests
  ADD CONSTRAINT contests_primary_organizer_link_id_fkey FOREIGN KEY (primary_organizer_link_id)
    REFERENCES public.contest_organizers (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS contests_primary_organizer_link_id_idx
  ON public.contests (primary_organizer_link_id);
