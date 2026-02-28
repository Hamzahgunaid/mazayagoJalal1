/* -------------------------------------------------------------------------- */
/* Sync organizer snapshots while contests are still active                   */
/* -------------------------------------------------------------------------- */

CREATE OR REPLACE FUNCTION public.contest_organizer_snapshots_sync_business()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF (NEW.name IS DISTINCT FROM OLD.name)
     OR (NEW.avatar_url IS DISTINCT FROM OLD.avatar_url)
     OR (NEW.logo_url IS DISTINCT FROM OLD.logo_url)
     OR (NEW.website_url IS DISTINCT FROM OLD.website_url)
     OR (NEW.phone IS DISTINCT FROM OLD.phone)
     OR (NEW.social_json IS DISTINCT FROM OLD.social_json)
     OR (NEW.meta_json IS DISTINCT FROM OLD.meta_json) THEN
    UPDATE public.contest_organizer_snapshots cos
    SET display_name = NEW.name,
        display_avatar_url = NEW.avatar_url,
        display_logo_url = NEW.logo_url,
        display_website_url = NEW.website_url,
        display_phone = NEW.phone,
        display_social_json = COALESCE(NEW.social_json, '{}'::jsonb),
        display_meta_json = COALESCE(NEW.meta_json, '{}'::jsonb),
        frozen_at = now()
    FROM public.contest_organizers co
    JOIN public.contests c ON c.id = co.contest_id
    WHERE cos.contest_organizer_id = co.id
      AND co.organizer_business_id = NEW.id
      AND (c.status::text IS DISTINCT FROM 'ENDED')
      AND (c.ends_at IS NULL OR c.ends_at > now());
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.contest_organizer_snapshots_sync_user()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  next_name text;
BEGIN
  IF (NEW.display_name IS DISTINCT FROM OLD.display_name)
     OR (NEW.full_name IS DISTINCT FROM OLD.full_name)
     OR (NEW.email IS DISTINCT FROM OLD.email)
     OR (NEW.avatar_url IS DISTINCT FROM OLD.avatar_url)
     OR (NEW.phone IS DISTINCT FROM OLD.phone) THEN
    next_name := COALESCE(NEW.display_name, NEW.full_name, NEW.email, 'Organizer');

    UPDATE public.contest_organizer_snapshots cos
    SET display_name = next_name,
        display_avatar_url = NEW.avatar_url,
        display_phone = NEW.phone,
        frozen_at = now()
    FROM public.contest_organizers co
    JOIN public.contests c ON c.id = co.contest_id
    WHERE cos.contest_organizer_id = co.id
      AND co.organizer_user_id = NEW.id
      AND (c.status::text IS DISTINCT FROM 'ENDED')
      AND (c.ends_at IS NULL OR c.ends_at > now());
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS contest_organizer_snapshots_sync_business_trg ON public.businesses;
CREATE TRIGGER contest_organizer_snapshots_sync_business_trg
AFTER UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.contest_organizer_snapshots_sync_business();

DROP TRIGGER IF EXISTS contest_organizer_snapshots_sync_user_trg ON public.users;
CREATE TRIGGER contest_organizer_snapshots_sync_user_trg
AFTER UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.contest_organizer_snapshots_sync_user();
