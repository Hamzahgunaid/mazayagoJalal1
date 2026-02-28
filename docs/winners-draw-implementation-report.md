# Winners/Draw Implementation Report

## 1) UI coverage (`/offers/[slug]/status` + transparency/seed)

### `/offers/[slug]/status`
- The page includes a dedicated **winners section** (`section id=contest-section-winners`) rendered via `WinnersSelection`.
- Draw/publish action is implemented by posting to `POST /api/owner/contests/:id/draw` with payload:
  - `seed_reveal: null`
  - `external_entropy: null`
  - `take` derived from `selectionMode` and `max_winners`.
- Prize assignment from status UI uses:
  - `PATCH /api/owner/contests/:id/winners/:winnerId/prize`.
- Eligibility summary in status page is based on entry statuses `CORRECT|VALIDATED`.

### Status winners UX behavior
- `WinnersSelection` uses one primary action button for:
  - draw (`RANDOM_FROM_CORRECT`),
  - publish (`TOP_SCORE|FASTEST_TIME|MOST_CODES`),
  - publish all codes (`EVERY_CODE`).
- Candidates shown are filtered to `CORRECT|VALIDATED`.
- Prize-linking UI exists for published winners.

### Transparency/proof UI (not on `/status`)
- A fairness/proof section exists in **manage page** (`/offers/[slug]/manage`) and displays:
  - `seed_commit`, `seed_reveal`, `external_entropy`, `selection`, `max_winners`, `published_at`, plus raw JSON.
- Public offer detail (`/offers/[slug]`) also shows proof details when `public_proof` exists.
- A separate `Transparency` admin component exists and can call draw/publish with explicit seed/entropy; however, manage page currently sets `showTransparencyTab = false` (not exposed as active tab).

## 2) APIs: draw, publish, winners list, proof fields

### `POST /api/owner/contests/:id/draw` (draw + publish)
- Single endpoint currently handles both draw and publish semantics.
- Reads body: `seed_reveal`, `external_entropy`, `take`.
- Behavior:
  1. Requires authenticated user.
  2. Sets `app.user_id` for DB session.
  3. Ensures `contests.seed_commit` exists and may backfill from `rules_json.seed_commit`.
  4. Auto-generates `seed_reveal` when `take > 0` and no reveal provided.
  5. Computes commit hash from reveal and sets `seed_commit` if empty.
  6. Calls `public.publish_winners(contestId, seedReveal, externalEntropy, take)`.
  7. Returns `published`, `has_published_winners`, `count`, `winners`, `public_proof`.
- Error mapping includes:
  - seed reveal mismatch -> 400
  - locked after publish -> 409
  - fallback -> 500

**Sample request**
```json
{
  "seed_reveal": null,
  "external_entropy": null,
  "take": 10
}
```

**Sample response**
```json
{
  "published": true,
  "has_published_winners": true,
  "count": 3,
  "winners": [ ... ],
  "public_proof": { ... }
}
```

### Prize assignment endpoint
- `PATCH /api/owner/contests/:id/winners/:winnerId/prize`
- Body: `{ "prizeId": "..." }` or `{ "prizeId": null }`.
- Update is contest-scoped in SQL (`WHERE contest_id=$1 AND id=$2`).

### Winners list endpoints
- Public by slug: `GET /api/public/contests/by-slug/:slug/winners`
  - Uses `contest_winners_public_v` and returns enriched winner fields including `public_proof` per row.
- Legacy/ID winners list: `GET /api/contests/:id/winners`
  - Returns rows from `public.contest_winners` (not restricted to `published=true`).

### Proof endpoint
- `GET /api/contests/:id/proof`
  - Returns first available non-null `public_proof` for contest.
  - Returns 204 with `{}` when absent.

## 3) DB fields used today

### `seed_commit`
- Added by migration: `ALTER TABLE public.contests ADD COLUMN IF NOT EXISTS seed_commit text`.
- Set/used from multiple places:
  - Owner contest PATCH allows updating `seed_commit` directly.
  - Draw endpoint backfills from `rules_json.seed_commit`, computes from reveal, and stores if missing.
  - By-slug contest fetch also backfills from `rules_json.seed_commit` when null.

### `public_proof`
- Read from `public.contest_winners` latest published row in:
  - draw response,
  - owner contest PATCH response,
  - contest by-slug response,
  - proof endpoint.
- Displayed in manage/public UI fairness sections.

### `selectionMode` / `selection`
- Stored as `contests.selection` (uppercase in owner PATCH).
- Used in status page and winners component to switch action semantics:
  - RANDOM_FROM_CORRECT / EVERY_CODE / TOP_SCORE / FASTEST_TIME / MOST_CODES.

### `max_winners`
- Used by status UI draw action to compute `take` (fallback to 1).
- Included in fairness proof readouts (from `public_proof` fallback to contest value).

### `prizes`
- Contest prizes loaded in by-slug API via `contest_prizes` JSON aggregation.
- Used in status winners section and for prize-linking updates.

## 4) Security/authorization review (IDOR focus)

### Draw (`POST /api/owner/contests/:id/draw`)
- ✅ Requires session (`requireUser`).
- ⚠️ No explicit application-layer check that caller is owner/judge/staff for the contest.
- ⚠️ Uses contest id directly from params; safety likely depends on DB-side permissions/RLS tied to `app.user_id` and/or `publish_winners` checks.
- **IDOR risk at app layer**: if DB policies are permissive/misconfigured, endpoint could be abused with guessed contest IDs.

### Publish (same draw endpoint)
- Same findings as draw (publish is merged into draw endpoint).

### Winners list
- `GET /api/public/contests/by-slug/:slug/winners` is public-by-design (no session required).
- `GET /api/contests/:id/winners` has no auth and returns from `contest_winners` by contest id; depending on data model this may expose unpublished/internal rows.

### Prize assignment (`PATCH /api/owner/contests/:id/winners/:winnerId/prize`)
- ✅ Requires session.
- ✅ SQL update is contest-scoped (`contest_id + winner id`) reducing cross-contest winner-id abuse.
- ⚠️ No explicit owner/judge/staff check in route handler.
- **IDOR posture**: partial mitigation via contest-scoped WHERE clause; full posture still depends on DB policies.

### Net authorization gap
- There is a robust helper (`src/lib/auth/contestAccess.ts`) that checks owner/judge/staff allowlists, but these critical draw/prize routes do not currently invoke it.

## 5) Proof fields currently produced/consumed

### Consumed/displayed in UI
- `seed_commit`
- `seed_reveal`
- `external_entropy`
- `selection`
- `max_winners`
- `published_at` (or `decided_at` fallback)
- raw proof JSON

### Produced by API responses
- Draw response returns full `public_proof` payload from latest published winner row.
- By-slug contest and proof endpoints also expose `public_proof`.

## 6) Missing pieces vs policy expectations

### Commit/reveal/proof hardening
- Missing explicit route-level authorization (`owner/judge/staff`) for draw/publish/prize actions.
- `seed_commit` can be auto-derived at draw time, which weakens strict pre-commit guarantees if policy requires commit to be locked **before** reveal.
- No separate immutable publish lock endpoint; publish happens in draw endpoint and lock enforcement is delegated to DB error handling.

### Publish lock
- Config lock after publish is enforced on owner contest PATCH for `seed_commit|selection|max_winners` and via draw endpoint error handling.
- Consider adding an explicit state machine (draft -> committed -> published) enforced in app layer plus DB constraints.

## 7) UI improvements for a “final pro design”

1. Add an explicit transparency card directly on `/offers/[slug]/status` winners section (seed commit, reveal, entropy, proof hash, timestamp).
2. Split CTA labels and actions into two explicit buttons where appropriate:
   - “Run draw simulation” vs “Publish winners”.
3. Add immutable timeline badges:
   - `Seed committed at`, `Reveal submitted at`, `Published at`.
4. Show “lock status” chip and disabled reason for post-publish config fields.
5. Expose the existing `Transparency` workflow in manage tabs (currently hidden by `showTransparencyTab = false`) or merge it into the active fairness section.
6. Add explicit copy/share links for proof endpoints and downloadable signed proof snapshot.
