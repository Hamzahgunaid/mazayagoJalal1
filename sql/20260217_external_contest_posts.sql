-- 20260217_external_contest_posts.sql
-- External contest posts (Facebook/Instagram) -> MazayaGo cards
-- MVP: SUBMITTED/PUBLISHED/HIDDEN + UNREVIEWED/REVIEWED + WINNERS_UNKNOWN/WINNERS_PUBLISHED
-- No filters, no categories, no region/country.

-- Enums (use enum types if you already use enums; otherwise keep as TEXT with CHECK)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'external_post_platform') THEN
    CREATE TYPE public.external_post_platform AS ENUM ('facebook', 'instagram');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'external_post_status') THEN
    CREATE TYPE public.external_post_status AS ENUM ('SUBMITTED', 'PUBLISHED', 'HIDDEN');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'external_post_review_badge') THEN
    CREATE TYPE public.external_post_review_badge AS ENUM ('UNREVIEWED', 'REVIEWED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'external_post_winners_status') THEN
    CREATE TYPE public.external_post_winners_status AS ENUM ('WINNERS_UNKNOWN', 'WINNERS_PUBLISHED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.external_contest_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source
  source_platform public.external_post_platform NOT NULL,
  source_url text NOT NULL,
  source_account_name text,
  source_account_url text,
  source_text text,

  -- Media (store what you fetched + what user selected)
  source_media_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_media_cover_url text,

  -- Card fields (MVP)
  card_title text NOT NULL,
  card_prize text NOT NULL,

  -- Chips + optional extra text in a single JSONB payload
  -- Example: {"chips":["like","comment","tag"],"extra_text":"..." }
  card_how_to_enter jsonb NOT NULL DEFAULT '{"chips":[],"extra_text":""}'::jsonb,

  -- Optional deadline
  card_deadline_at timestamptz,

  -- States
  status public.external_post_status NOT NULL DEFAULT 'SUBMITTED',
  review_badge public.external_post_review_badge NOT NULL DEFAULT 'UNREVIEWED',
  winners_status public.external_post_winners_status NOT NULL DEFAULT 'WINNERS_UNKNOWN',
  winners_evidence_url text,

  -- Moderation / audit (keep minimal but useful)
  created_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  published_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Basic constraints
  CONSTRAINT external_contest_posts_source_url_nonempty CHECK (length(trim(source_url)) > 0),
  CONSTRAINT external_contest_posts_title_nonempty CHECK (length(trim(card_title)) > 0),
  CONSTRAINT external_contest_posts_prize_nonempty CHECK (length(trim(card_prize)) > 0),
  CONSTRAINT external_contest_posts_media_urls_is_array CHECK (jsonb_typeof(source_media_urls) = 'array'),
  CONSTRAINT external_contest_posts_howto_is_object CHECK (jsonb_typeof(card_how_to_enter) = 'object')
);

-- Uniqueness: prevent duplicate cards for the same post URL
-- If you already canonicalize URLs in app code, keep it strict unique.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='uq_external_contest_posts_source_url'
  ) THEN
    CREATE UNIQUE INDEX uq_external_contest_posts_source_url
      ON public.external_contest_posts (source_url);
  END IF;
END $$;

-- Feed performance: latest published first
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='idx_external_contest_posts_feed'
  ) THEN
    CREATE INDEX idx_external_contest_posts_feed
      ON public.external_contest_posts (status, created_at DESC);
  END IF;
END $$;

-- Quick filter for winners published (even though filters are postponed, used for future)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='idx_external_contest_posts_winners'
  ) THEN
    CREATE INDEX idx_external_contest_posts_winners
      ON public.external_contest_posts (winners_status, created_at DESC);
  END IF;
END $$;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_external_contest_posts_updated_at'
  ) THEN
    CREATE TRIGGER trg_external_contest_posts_updated_at
    BEFORE UPDATE ON public.external_contest_posts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
