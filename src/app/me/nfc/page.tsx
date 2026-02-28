import SectionCard from "@/components/me/SectionCard";

export const dynamic = "force-dynamic";

export default async function NFCPage(){
  return (
    <div className="space-y-4">
      <SectionCard title="NFC Card request">
        <form method="post" action="/api/me/nfc/request" className="grid md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm">Service ID (optional)</span>
            <input name="service_id" className="h-10 rounded-lg border px-3"/>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Node ID (optional)</span>
            <input name="service_node_id" className="h-10 rounded-lg border px-3"/>
          </label>
          <label className="md:col-span-2 flex flex-col gap-1">
            <span className="text-sm">Notes</span>
            <textarea name="notes" rows={3} className="rounded-lg border px-3 py-2"/>
          </label>
          <div className="md:col-span-2">
            <button className="px-4 h-10 rounded-lg bg-slate-900 text-white">Submit request</button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
