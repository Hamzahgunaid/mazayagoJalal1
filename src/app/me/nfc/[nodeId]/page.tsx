import { notFound } from "next/navigation";
import { pool } from "@/lib/db";
import NFCCardClient from "@/components/nfc/NFCCardClient";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { nodeId: string } }) {
  const user = await currentUser();
  if(!user) return notFound(); // أو اعرض تسجيل دخول

  const { nodeId } = params;

  // (اختياري) تحقّق ملكية/عضوية المستخدم
  const can = await pool.query(
    `SELECT 1
       FROM public.service_nodes sn
       JOIN public.services s ON s.id = sn.service_id
  LEFT JOIN public.service_members sm ON sm.service_id = s.id AND sm.user_id = $2
      WHERE sn.id = $1 AND (s.owner_user_id = $2 OR sm.user_id IS NOT NULL)
      LIMIT 1`,
    [nodeId, user.id]
  );
  if (!can.rows[0]) return notFound();

  const { rows } = await pool.query(
    `SELECT
        sn.id              AS node_id,
        sn.name            AS node_name,
        sn.address,
        sn.city,
        sn.country,
        s.id               AS service_id,
        s.display_name     AS service_name,
        s.slug             AS service_slug,
        s.logo_url,
        s.cover_url
     FROM public.service_nodes sn
     JOIN public.services s ON s.id = sn.service_id
     WHERE sn.id = $1
     LIMIT 1`,
    [nodeId]
  );
  const r = rows[0];
  if (!r) return notFound();

  const addressLine = [r.address, r.city, r.country].filter(Boolean).join(" • ");

  return (
    <div className="p-4">
      <NFCCardClient
        nodeId={r.node_id}
        serviceId={r.service_id}
        serviceSlug={r.service_slug}
        serviceName={r.service_name}
        nodeName={r.node_name}
        logoUrl={r.logo_url || undefined}
        coverUrl={r.cover_url || undefined}
        address={addressLine || undefined}
      />
    </div>
  );
}
