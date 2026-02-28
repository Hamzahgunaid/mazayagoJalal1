// src/app/me/qr/[nodeId]/page.tsx
import { notFound } from "next/navigation";
import { pool } from "@/lib/db";
import QRPosterClient from "@/components/qr/QRPosterClient";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { nodeId: string } }) {
  const { nodeId } = params;

  const { rows } = await pool.query(
    `SELECT
        sn.id              AS node_id,
        sn.name            AS node_name,
        sn.address,
        sn.city,
        sn.country,
        s.display_name     AS service_name,
        s.logo_url,
        s.cover_url,
        s.slug
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
      <QRPosterClient
        nodeId={r.node_id}
        serviceName={r.service_name}
        nodeName={r.node_name}
        logoUrl={r.logo_url || undefined}
        coverUrl={r.cover_url || undefined}
        address={addressLine || undefined}
        serviceSlug={r.slug}
      />
    </div>
  );
}
