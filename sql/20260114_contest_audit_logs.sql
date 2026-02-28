CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.contest_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL,
  actor_user_id uuid,
  action text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contest_audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id)
    REFERENCES public.users (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE SET NULL,
  CONSTRAINT contest_audit_logs_contest_id_fkey FOREIGN KEY (contest_id)
    REFERENCES public.contests (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS contest_audit_logs_contest_idx
  ON public.contest_audit_logs (contest_id, created_at DESC);

CREATE INDEX IF NOT EXISTS contest_audit_logs_action_idx
  ON public.contest_audit_logs (action);

CREATE OR REPLACE FUNCTION public.log_contest_audit(
  p_contest_id uuid,
  p_action text,
  p_message text DEFAULT NULL,
  p_payload jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  actor_user_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    actor_user_id := NULLIF(current_setting('app.user_id', true), '')::uuid;
  EXCEPTION WHEN others THEN
    actor_user_id := NULL;
  END;

  final_payload := p_payload;
  IF p_message IS NOT NULL THEN
    final_payload := COALESCE(final_payload, '{}'::jsonb) || jsonb_build_object('message', p_message);
  END IF;

  INSERT INTO public.contest_audit_logs (
    contest_id,
    actor_user_id,
    action,
    payload
  )
  VALUES (
    p_contest_id,
    actor_user_id,
    p_action,
    final_payload
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.contest_audit_contests()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  changed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_contest_audit(
      NEW.id,
      'contest_created',
      NULL,
      jsonb_build_object(
        'title', NEW.title,
        'status', NEW.status,
        'selection', NEW.selection
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    changed := (NEW.status IS DISTINCT FROM OLD.status)
      OR (NEW.starts_at IS DISTINCT FROM OLD.starts_at)
      OR (NEW.ends_at IS DISTINCT FROM OLD.ends_at)
      OR (NEW.selection IS DISTINCT FROM OLD.selection)
      OR (NEW.max_winners IS DISTINCT FROM OLD.max_winners)
      OR (NEW.visibility IS DISTINCT FROM OLD.visibility)
      OR (NEW.title IS DISTINCT FROM OLD.title);
    IF changed THEN
      PERFORM public.log_contest_audit(
        NEW.id,
        'contest_updated',
        NULL,
        jsonb_build_object(
          'title', NEW.title,
          'status', NEW.status,
          'starts_at', NEW.starts_at,
          'ends_at', NEW.ends_at,
          'selection', NEW.selection,
          'max_winners', NEW.max_winners,
          'visibility', NEW.visibility
        )
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_contest_audit(
      OLD.id,
      'contest_deleted',
      NULL,
      jsonb_build_object('title', OLD.title)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.contest_audit_prizes()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  payload jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'prize_id', NEW.id,
      'name', NEW.name,
      'type', NEW.type,
      'amount', NEW.amount,
      'currency', NEW.currency,
      'quantity', NEW.quantity
    );
    PERFORM public.log_contest_audit(NEW.contest_id, 'prize_added', NULL, payload);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (NEW.name IS DISTINCT FROM OLD.name)
      OR (NEW.type IS DISTINCT FROM OLD.type)
      OR (NEW.amount IS DISTINCT FROM OLD.amount)
      OR (NEW.currency IS DISTINCT FROM OLD.currency)
      OR (NEW.quantity IS DISTINCT FROM OLD.quantity)
    THEN
      payload := jsonb_build_object(
        'prize_id', NEW.id,
        'name', NEW.name,
        'type', NEW.type,
        'amount', NEW.amount,
        'currency', NEW.currency,
        'quantity', NEW.quantity
      );
      PERFORM public.log_contest_audit(NEW.contest_id, 'prize_updated', NULL, payload);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'prize_id', OLD.id,
      'name', OLD.name
    );
    PERFORM public.log_contest_audit(OLD.contest_id, 'prize_removed', NULL, payload);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.contest_audit_referees()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  payload jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'user_id', NEW.user_id,
      'role', NEW.role
    );
    PERFORM public.log_contest_audit(NEW.contest_id, 'referee_added', NULL, payload);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      payload := jsonb_build_object(
        'user_id', NEW.user_id,
        'role', NEW.role
      );
      PERFORM public.log_contest_audit(NEW.contest_id, 'referee_updated', NULL, payload);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'user_id', OLD.user_id,
      'role', OLD.role
    );
    PERFORM public.log_contest_audit(OLD.contest_id, 'referee_removed', NULL, payload);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.contest_audit_winners_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT contest_id, COUNT(*) AS winner_count
    FROM new_rows
    GROUP BY contest_id
  LOOP
    PERFORM public.log_contest_audit(
      rec.contest_id,
      'winners_published',
      NULL,
      jsonb_build_object('count', rec.winner_count)
    );
  END LOOP;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.contest_audit_winners_update()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.prize_id IS DISTINCT FROM OLD.prize_id THEN
    PERFORM public.log_contest_audit(
      NEW.contest_id,
      'winner_prize_linked',
      NULL,
      jsonb_build_object(
        'winner_id', NEW.id,
        'entry_id', NEW.entry_id,
        'prize_id', NEW.prize_id
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS contest_audit_contests_trg ON public.contests;
CREATE TRIGGER contest_audit_contests_trg
AFTER INSERT OR UPDATE OR DELETE ON public.contests
FOR EACH ROW
EXECUTE FUNCTION public.contest_audit_contests();

DROP TRIGGER IF EXISTS contest_audit_prizes_trg ON public.contest_prizes;
CREATE TRIGGER contest_audit_prizes_trg
AFTER INSERT OR UPDATE OR DELETE ON public.contest_prizes
FOR EACH ROW
EXECUTE FUNCTION public.contest_audit_prizes();

DROP TRIGGER IF EXISTS contest_audit_referees_trg ON public.contest_referees;
CREATE TRIGGER contest_audit_referees_trg
AFTER INSERT OR UPDATE OR DELETE ON public.contest_referees
FOR EACH ROW
EXECUTE FUNCTION public.contest_audit_referees();

DROP TRIGGER IF EXISTS contest_audit_winners_insert_trg ON public.contest_winners;
CREATE TRIGGER contest_audit_winners_insert_trg
AFTER INSERT ON public.contest_winners
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION public.contest_audit_winners_insert();

DROP TRIGGER IF EXISTS contest_audit_winners_update_trg ON public.contest_winners;
CREATE TRIGGER contest_audit_winners_update_trg
AFTER UPDATE ON public.contest_winners
FOR EACH ROW
EXECUTE FUNCTION public.contest_audit_winners_update();
