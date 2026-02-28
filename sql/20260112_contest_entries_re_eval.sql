CREATE OR REPLACE FUNCTION public.contest_entries_re_eval(
  p_contest_id uuid,
  p_task_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  updated_count integer := 0;
BEGIN
  WITH target_tasks AS (
    SELECT
      t.id,
      t.kind,
      t.metadata,
      COALESCE((NULLIF(t.metadata->>'result_recorded', ''))::boolean, false) AS result_recorded,
      NULLIF(t.metadata->>'result_team_a_score', '')::int AS result_team_a_score,
      NULLIF(t.metadata->>'result_team_b_score', '')::int AS result_team_b_score,
      NULLIF(t.metadata->>'result_winner', '') AS result_winner
    FROM public.contest_tasks t
    WHERE t.contest_id = p_contest_id
      AND (p_task_id IS NULL OR t.id = p_task_id)
      AND (
        COALESCE((NULLIF(t.metadata->>'match_prediction', ''))::boolean, false) = true
        OR upper(coalesce(t.kind, '')) = 'PREDICTION'
      )
  ),
  correct_options AS (
    SELECT o.task_id, o.id AS correct_option_id
    FROM public.contest_mcq_options o
    WHERE o.contest_id = p_contest_id
      AND o.is_correct = true
  ),
  updated AS (
    UPDATE public.contest_entries e
       SET status = CASE
          WHEN t.result_recorded IS NOT TRUE THEN e.status
          WHEN co.correct_option_id IS NULL THEN e.status
          WHEN t.result_team_a_score IS NULL
            OR t.result_team_b_score IS NULL
            OR t.result_winner IS NULL THEN e.status
          WHEN e.mcq_option_id = co.correct_option_id
               AND e.prediction_team_a_score IS NOT NULL
               AND e.prediction_team_b_score IS NOT NULL
               AND e.prediction_team_a_score = t.result_team_a_score
               AND e.prediction_team_b_score = t.result_team_b_score
               AND lower(e.prediction_winner) = lower(t.result_winner)
            THEN 'CORRECT'
          ELSE 'INCORRECT'
       END,
       score = CASE
          WHEN t.result_recorded IS NOT TRUE THEN e.score
          WHEN co.correct_option_id IS NULL THEN e.score
          WHEN t.result_team_a_score IS NULL
            OR t.result_team_b_score IS NULL
            OR t.result_winner IS NULL THEN e.score
          WHEN e.mcq_option_id = co.correct_option_id
               AND e.prediction_team_a_score IS NOT NULL
               AND e.prediction_team_b_score IS NOT NULL
               AND e.prediction_team_a_score = t.result_team_a_score
               AND e.prediction_team_b_score = t.result_team_b_score
               AND lower(e.prediction_winner) = lower(t.result_winner)
            THEN 1
          ELSE 0
       END
      FROM target_tasks t
      LEFT JOIN correct_options co ON co.task_id = t.id
     WHERE e.contest_id = p_contest_id
       AND e.task_id = t.id
       AND e.status IS DISTINCT FROM 'DISQUALIFIED'
    RETURNING 1
  )
  SELECT COUNT(*) INTO updated_count FROM updated;

  RETURN updated_count;
END;
$function$;
