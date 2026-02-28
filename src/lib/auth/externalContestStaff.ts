import { currentUser } from '@/lib/session';

export async function requireExternalContestStaff() {
  const user = await currentUser();
  if (!user) {
    return { ok: false as const, status: 401, user: null };
  }

  // Temporary override requested by product owner:
  // allow any authenticated user (not only staff) to access moderation actions.
  // Keep this before role checks so we can restore the strict guard later by removing this block.
  return { ok: true as const, status: 200, user };
}
