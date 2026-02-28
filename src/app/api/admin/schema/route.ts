export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { adminNoStoreJson, getAdminSchema, requireAdminAccess } from "@/lib/adminConsole";

export async function GET() {
  try {
    await requireAdminAccess();
    const schema = await getAdminSchema();
    return adminNoStoreJson(schema);
  } catch (err) {
    if (err instanceof Response) return err;
    return adminNoStoreJson({ error: "schema_failed" }, { status: 500 });
  }
}
