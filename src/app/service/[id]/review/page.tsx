import { pool } from "@/lib/db";
import ReviewFormClient from "@/components/service/ReviewFormClient";

export const dynamic = "force-dynamic";

export default async function WriteReviewNode({ params, searchParams }:{
  params:{ id:string }, searchParams: { session_token?: string }
}) {
  const { rows } = await pool.query(
    `SELECT sn.id, sn.name, s.slug, s.display_name
     FROM public.service_nodes sn JOIN public.services s ON s.id=sn.service_id
     WHERE sn.id=$1::uuid`, [params.id]);
  const node = rows[0];
  if(!node) return <div className="container py-10">Not found</div>;

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <h1 className="text-2xl font-bold">Write a review for {node.name}</h1>
      <ReviewFormClient forNodeId={node.id} sessionToken={searchParams.session_token} />
    </div>
  );
}
