import { pool } from "@/lib/db";
import ReviewFormClient from "@/components/service/ReviewFormClient";

export const dynamic = "force-dynamic";

// ✅ على Next.js 15 يجب انتظار params
export default async function ServiceReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const svc = await pool.query(
    `SELECT id, slug, display_name
     FROM public.services
     WHERE slug=$1
     LIMIT 1`,
    [slug]
  );
  const service = svc.rows[0];
  if (!service) return <div className="p-6">Service not found.</div>;

  const { rows: nodes } = await pool.query(
    `SELECT id, name
     FROM public.service_nodes
     WHERE service_id=$1 AND active=TRUE
     ORDER BY name`,
    [service.id]
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">
        Write a review for {service.display_name}
      </h1>
      <ReviewFormClient serviceId={service.id} nodes={nodes} />
    </div>
  );
}
