import { pool } from "@/lib/db";
import Link from "next/link";

import CategoryIcon from "@/components/icons/CategoryIcon";

interface Props { params: { id: string } }

export default async function CategoryDetail({ params }: Props){
  const { rows: cat } = await pool.query(
    `SELECT id, name_en FROM public.categories WHERE id=$1 LIMIT 1`,
    [params.id]
  );

  const { rows: nodes } = await pool.query(
    `
    SELECT DISTINCT s.slug, sn.name, sn.city, sn.country
    FROM public.service_nodes sn
    JOIN public.service_node_categories snc ON snc.service_node_id = sn.id
    JOIN public.services s ON s.id = sn.service_id
    WHERE snc.category_id = $1
    ORDER BY sn.name
    LIMIT 48
    `,
    [params.id]
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{cat[0]?.name_en || "Category"}</h1>

      {nodes.length === 0 ? (
        <div className="card">No services in this category yet. (Coming soon)</div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {nodes.map((n:any)=> (
            <a key={n.slug} href={`/s/${n.slug}`} className="card block hover:shadow-lg">
              <div className="font-semibold" dir="auto">{n.name}</div>
              <div className="text-sm text-slate-600">
                {n.city || ""}{n.country ? ` • ${n.country}` : ""}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
