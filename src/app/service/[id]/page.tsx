
import { pool } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyServiceIdPage({ params }:{ params:{ id:string }}){
  const svc = await pool.query(
    `SELECT s.slug FROM public.services s
     JOIN public.service_nodes sn ON sn.service_id=s.id
     WHERE sn.id=$1 LIMIT 1`, [params.id]);
  const slug = svc.rows[0]?.slug;
  if(!slug) return redirect("/");
  return redirect(`/s/${slug}`);
}
