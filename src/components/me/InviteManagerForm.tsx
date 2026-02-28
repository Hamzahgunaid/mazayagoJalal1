"use client";
import * as React from "react";

type Props = {
  serviceId?: number | string;
  nodeId?: number | string;
};

export default function InviteManagerForm({ serviceId, nodeId }: Props) {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      // TODO: اربط بمناداة الـ API الفعلية لديك
      console.log("invite manager", { email, serviceId, nodeId });
      setMsg("Invitation queued.");
      setEmail("");
    } catch (err) {
      setMsg("Failed to send invitation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2 items-center">
      <input
        className="border rounded px-3 py-2 flex-1"
        placeholder="manager@example.com"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button
        type="submit"
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "Sending..." : "Invite"}
      </button>
      {msg && <span className="text-sm text-slate-600">{msg}</span>}
    </form>
  );
}