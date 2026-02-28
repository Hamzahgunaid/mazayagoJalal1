import { pool } from '@/lib/db';

import type {
  ExternalPostPlatform,
  ExternalPostReviewBadge,
  ExternalPostStatus,
  ExternalPostWinnersStatus,
} from '@/lib/externalContestPosts';

function isMissingRelationError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === '42P01';
}

export type ExternalContestPostRow = {
  id: string;
  source_platform: ExternalPostPlatform;
  source_url: string;
  source_account_name: string | null;
  source_account_url: string | null;
  source_text: string | null;
  source_media_urls: string[];
  source_media_cover_url: string | null;
  card_title: string;
  card_prize: string;
  card_how_to_enter: { chips: string[]; extra_text: string };
  card_deadline_at: string | null;
  status: ExternalPostStatus;
  review_badge: ExternalPostReviewBadge;
  winners_status: ExternalPostWinnersStatus;
  winners_evidence_url: string | null;
  created_at: string;
};

function mapRow(row: any): ExternalContestPostRow {
  return {
    ...row,
    source_media_urls: Array.isArray(row.source_media_urls) ? row.source_media_urls : [],
    card_how_to_enter:
      typeof row.card_how_to_enter === 'object' && row.card_how_to_enter
        ? row.card_how_to_enter
        : { chips: [], extra_text: '' },
  } as ExternalContestPostRow;
}

export async function getExternalContestFeed(): Promise<ExternalContestPostRow[]> {
  try {
    const { rows } = await pool.query(
      `SELECT id, source_platform, source_url, source_account_name, source_account_url, source_text,
              source_media_urls, source_media_cover_url, card_title, card_prize, card_how_to_enter,
              card_deadline_at, status, review_badge, winners_status, winners_evidence_url, created_at
         FROM public.external_contest_posts
        WHERE status = 'PUBLISHED'
        ORDER BY created_at DESC`,
    );
    return rows.map(mapRow);
  } catch (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }
}

export async function getExternalContestPostById(id: string): Promise<ExternalContestPostRow | null> {
  try {
    const { rows } = await pool.query(
      `SELECT id, source_platform, source_url, source_account_name, source_account_url, source_text,
              source_media_urls, source_media_cover_url, card_title, card_prize, card_how_to_enter,
              card_deadline_at, status, review_badge, winners_status, winners_evidence_url, created_at
         FROM public.external_contest_posts
        WHERE id = $1
        LIMIT 1`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  } catch (error) {
    if (isMissingRelationError(error)) return null;
    throw error;
  }
}
