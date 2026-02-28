import ManageExternalContestPostClient from '@/components/externalContests/ManageExternalContestPostClient';
import { requireExternalContestStaff } from '@/lib/auth/externalContestStaff';

export default async function ExternalContestManagePage({ params }: { params: { id: string } }) {
  const auth = await requireExternalContestStaff();
  if (!auth.ok) {
    return <div className="rounded-xl border border-danger p-6 text-danger">403</div>;
  }

  return <ManageExternalContestPostClient id={params.id} />;
}
