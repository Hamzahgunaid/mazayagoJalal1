import { notFound } from 'next/navigation';

import { currentUser } from '@/lib/session';
import { getContestAccessBySlug } from '@/lib/auth/contestAccess';

export default async function OfferStatusLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const user = await currentUser();
  const access = await getContestAccessBySlug({ slug: params.slug, user });

  if (!access.canViewStatus) {
    notFound();
  }

  return <>{children}</>;
}
