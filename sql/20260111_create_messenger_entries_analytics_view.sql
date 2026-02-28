CREATE OR REPLACE VIEW public.messenger_entries_analytics AS
SELECT
  e.contest_id,
  e.task_id,
  e.fb_page_id,
  CASE
    WHEN e.prediction_winner IS NOT NULL AND e.prediction_winner <> '' THEN 'PREDICTION'
    WHEN e.mcq_option_id IS NOT NULL THEN 'MCQ'
    WHEN e.answer_text IS NOT NULL AND e.answer_text <> '' THEN 'TEXT'
    ELSE 'UNKNOWN'
  END AS answer_kind,
  CASE
    WHEN e.prediction_winner IS NOT NULL AND e.prediction_winner <> '' THEN e.prediction_winner
    WHEN e.mcq_option_id IS NOT NULL THEN e.mcq_option_id::text
    ELSE NULL
  END AS answer_key,
  COUNT(*)::int AS answers_count,
  COUNT(DISTINCT e.psid)::int AS participants_count
FROM public.messenger_entries e
GROUP BY
  e.contest_id,
  e.task_id,
  e.fb_page_id,
  answer_kind,
  answer_key;
