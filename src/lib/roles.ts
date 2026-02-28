import { pool } from "@/lib/db";

/** خدمة يملكها المستخدم (نرجع آخر خدمة لو وُجدت) */
export type ServiceRow = {
  id: string;
  display_name: string;
  avatar_url?: string;
  owner_user_id: string;
};

export type NodeRow = {
  id: string;
  service_id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  avatar_url?: string;
  geo_lat?: number;
  geo_lng?: number;
  active: boolean;
};

/** ارجع خدمة المالك إن وجدت */
export async function serviceOwnedBy(userId: string): Promise<ServiceRow | null> {
  const { rows } = await pool.query(
    `SELECT id, display_name, avatar_url, owner_user_id
       FROM public.services
      WHERE owner_user_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

/** كل النودات التابعة لخدمة معيّنة */
export async function nodesForService(serviceId: string): Promise<NodeRow[]> {
  const { rows } = await pool.query(
    `SELECT id, service_id, name, address, city, country, avatar_url, geo_lat, geo_lng, active
       FROM public.service_nodes
      WHERE service_id = $1
      ORDER BY created_at DESC`,
    [serviceId]
  );
  return rows;
}

/** النودات التي يُديرها المستخدم كعضو نشِط في الخدمة */
export async function nodesManagedBy(userId: string): Promise<NodeRow[]> {
  const { rows } = await pool.query(
    `SELECT sn.id, sn.service_id, sn.name, sn.address, sn.city, sn.country, sn.avatar_url, sn.geo_lat, sn.geo_lng, sn.active
       FROM public.service_nodes sn
       JOIN public.service_members sm
         ON sm.service_id = sn.service_id
        AND sm.user_id = $1
        AND sm.status = 'active'
      ORDER BY sn.created_at DESC`,
    [userId]
  );
  return rows;
}

/** عدد مراجعات المستخدم (للإحصائيات) */
export async function myReviewCount(userId: string): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS c FROM public.reviews WHERE user_id = $1`,
    [userId]
  );
  return rows[0]?.c ?? 0;
}

/** تحقّق ملكية خدمة */
export async function isServiceOwner(userId: string, serviceId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM public.services WHERE id = $1 AND owner_user_id = $2 LIMIT 1`,
    [serviceId, userId]
  );
  return !!rows.length;
}

/** تحقّق إدارة نود (عضو نشِط في خدمة النود) */
export async function isNodeManager(userId: string, nodeId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1
       FROM public.service_nodes sn
       JOIN public.service_members sm
         ON sm.service_id = sn.service_id
        AND sm.user_id = $2
        AND sm.status = 'active'
      WHERE sn.id = $1
      LIMIT 1`,
    [nodeId, userId]
  );
  return !!rows.length;
}

/** (اختياري) استدعاء الدالة SQL لضمان إنشاء خدمة للمالك */
export async function ensureServiceForOwner(ownerId: string, displayName: string): Promise<string> {
  const { rows } = await pool.query(
    `SELECT public.ensure_service_for_owner($1, $2) AS id`,
    [ownerId, displayName]
  );
  return rows[0]?.id;
}
