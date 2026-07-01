import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../context/ToastContext";

const TEMPLATE_KEYS = ["confirmation", "submitted", "followup", "released", "shipped", "delivered", "otp"];
const TOKENS = "{first_name} {document_type} {psa_reference_no} {jnt_tracking_no} {order_code} {balance_due} {track_url} {business_name} {code}";

export function Settings() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [scalars, setScalars] = useState<Record<string, string>>({});
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [templates, setTemplates] = useState<Record<string, string>>({});

  async function load() {
    const { data } = await supabase.from("settings").select("key, value");
    const s: Record<string, string> = {};
    (data ?? []).forEach((r) => {
      if (r.key === "sms_templates") setTemplates(r.value as Record<string, string>);
      else if (r.key === "sms_enabled") setSmsEnabled(r.value === true);
      else s[r.key] = String((r.value as unknown) ?? "");
    });
    setScalars(s);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function upsert(key: string, value: unknown) {
    const { error } = await supabase.from("settings").upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
  }

  async function saveAll() {
    setSaving(true);
    try {
      // numbers stored as jsonb numbers; text as jsonb strings
      const numKeys = ["shipping_cost", "sla_submitted_days", "sla_shipped_days", "followup_interval_days", "followup_max_count"];
      for (const [k, v] of Object.entries(scalars)) {
        const val = numKeys.includes(k) ? Number(v) : v;
        await upsert(k, val);
      }
      await upsert("sms_enabled", smsEnabled);
      await upsert("sms_templates", templates);
      toast("Settings saved");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-slate-400">Loading settings…</div>;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Panel title="Business & costs">
        <ScalarField label="Business name" k="business_name" scalars={scalars} setScalars={setScalars} />
        <ScalarField label="SMS sender name" k="sms_sender_name" scalars={scalars} setScalars={setScalars} />
        <ScalarField label="Public base URL (for track links)" k="public_base_url" scalars={scalars} setScalars={setScalars} />
        <ScalarField label="Shipping cost (₱)" k="shipping_cost" scalars={scalars} setScalars={setScalars} type="number" />
      </Panel>

      <Panel title="SLA thresholds (days before flagged)">
        <ScalarField label="Submitted to PSA" k="sla_submitted_days" scalars={scalars} setScalars={setScalars} type="number" />
        <ScalarField label="Shipped" k="sla_shipped_days" scalars={scalars} setScalars={setScalars} type="number" />
      </Panel>

      <Panel title="SMS automation">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={smsEnabled} onChange={(e) => setSmsEnabled(e.target.checked)} className="h-4 w-4" />
          <span className="font-medium text-slate-600">Automated SMS enabled</span>
        </label>
        <ScalarField label="Follow-up interval (days)" k="followup_interval_days" scalars={scalars} setScalars={setScalars} type="number" />
        <ScalarField label="Max follow-ups before flagging" k="followup_max_count" scalars={scalars} setScalars={setScalars} type="number" />
      </Panel>

      <Panel title="SMS templates">
        <p className="mb-2 text-xs text-slate-400">Available tokens: {TOKENS}</p>
        {TEMPLATE_KEYS.map((k) => (
          <label key={k} className="block text-sm">
            <span className="mb-1 block font-medium capitalize text-slate-600">{k}</span>
            <textarea
              value={templates[k] ?? ""}
              onChange={(e) => setTemplates({ ...templates, [k]: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </label>
        ))}
      </Panel>

      <div className="flex justify-end">
        <button onClick={saveAll} disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function ScalarField({
  label, k, scalars, setScalars, type = "text",
}: {
  label: string; k: string; scalars: Record<string, string>;
  setScalars: (v: Record<string, string>) => void; type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-600">{label}</span>
      <input
        type={type}
        value={scalars[k] ?? ""}
        onChange={(e) => setScalars({ ...scalars, [k]: e.target.value })}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
      />
    </label>
  );
}
