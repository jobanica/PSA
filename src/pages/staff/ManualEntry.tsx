import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, functionsUrl } from "../../lib/supabaseClient";
import type { DocumentType, ParsedIntake } from "../../lib/types";
import { useDocumentTypes, fieldsForDocType } from "../../hooks/useDocumentTypes";
import { peso } from "../../lib/constants";
import { useToast } from "../../context/ToastContext";

// Staff fallback intake. Most orders arrive automatically from the public
// landing page; this is for phone-in / walk-in / referral orders.
export function ManualEntry() {
  const { docTypes } = useDocumentTypes();
  const toast = useToast();
  const navigate = useNavigate();

  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [unmatched, setUnmatched] = useState("");
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [docTypeId, setDocTypeId] = useState("");
  const [copies, setCopies] = useState(1);
  const [fee, setFee] = useState<number | "">("");
  const [downpayment, setDownpayment] = useState(0);

  // form fields
  const [f, setF] = useState({
    first_name: "", middle_name: "", last_name: "", sex: "",
    date_of_birth: "", place_of_birth: "", fathers_full_name: "", mothers_full_name: "",
    spouse_name: "", purpose: "",
    recipient_name: "", phone: "", address_line: "", barangay: "",
    city: "", province: "", postal_code: "",
  });
  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  const selectedDoc: DocumentType | undefined = docTypes.find((d) => d.id === docTypeId);
  const fieldCfg = selectedDoc ? fieldsForDocType(selectedDoc.name) : fieldsForDocType("birth");

  function pickDoc(id: string) {
    setDocTypeId(id);
    const d = docTypes.find((x) => x.id === id);
    if (d && fee === "") setFee(Number(d.base_fee));
  }

  async function parse() {
    if (!rawText.trim()) return;
    setParsing(true);
    setRawResponse(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(`${functionsUrl}/parse-intake`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess.session?.access_token}`,
        },
        body: JSON.stringify({ text: rawText }),
      });
      const json = await res.json();
      if (json.parsed) {
        applyParsed(json.parsed as ParsedIntake);
        setUnmatched((json.parsed as ParsedIntake).unmatched_notes ?? "");
        toast("Parsed — review the fields below");
      } else {
        setRawResponse(json.raw ?? json.error ?? "Parse failed");
        toast("Could not parse automatically — fill manually", "error");
      }
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setParsing(false);
    }
  }

  function applyParsed(p: ParsedIntake) {
    setF({
      first_name: p.first_name ?? "",
      middle_name: p.middle_name ?? "",
      last_name: p.last_name ?? "",
      sex: p.sex ?? "",
      date_of_birth: p.date_of_birth ?? "",
      place_of_birth: p.place_of_birth ?? "",
      fathers_full_name: p.fathers_full_name ?? "",
      mothers_full_name: p.mothers_full_name ?? "",
      spouse_name: "",
      purpose: "",
      recipient_name: p.delivery?.recipient_name ?? "",
      phone: p.delivery?.phone ?? "",
      address_line: p.delivery?.address_line ?? "",
      barangay: p.delivery?.barangay ?? "",
      city: p.delivery?.city ?? "",
      province: p.delivery?.province ?? "",
      postal_code: p.delivery?.postal_code ?? "",
    });
  }

  async function save() {
    if (!docTypeId) return toast("Pick a document type", "error");
    if (!f.phone.trim()) return toast("Phone is required", "error");
    if (fee === "") return toast("Enter a fee", "error");
    setSaving(true);
    try {
      // find or create customer by phone
      const recipient = f.recipient_name || [f.first_name, f.last_name].filter(Boolean).join(" ");
      const address = [f.address_line, f.barangay].filter(Boolean).join(", ");
      const { data: existing } = await supabase
        .from("customers").select("id").eq("phone", f.phone).limit(1).maybeSingle();
      let customerId = existing?.id;
      if (!customerId) {
        const { data: cust, error } = await supabase
          .from("customers")
          .insert({
            full_name: recipient, phone: f.phone, shipping_address: address,
            city: f.city, province: f.province, postal_code: f.postal_code,
          })
          .select("id").single();
        if (error) throw new Error(error.message);
        customerId = cust.id;
      }

      const total = Number(fee) * copies;
      const { data: order, error: oErr } = await supabase
        .from("orders")
        .insert({
          customer_id: customerId, document_type_id: docTypeId, status: "new_order",
          copies, total_amount: total, downpayment, payment_method: "cod",
          raw_intake_text: rawText || null,
        })
        .select("id").single();
      if (oErr) throw new Error(oErr.message);

      await supabase.from("order_details").insert({
        order_id: order.id,
        first_name: f.first_name, middle_name: f.middle_name, last_name: f.last_name,
        sex: f.sex, date_of_birth: f.date_of_birth || null, place_of_birth: f.place_of_birth,
        fathers_full_name: f.fathers_full_name, mothers_full_name: f.mothers_full_name,
        subject_full_name: [f.first_name, f.middle_name, f.last_name].filter(Boolean).join(" "),
        spouse_name: f.spouse_name, purpose: f.purpose,
      });
      await supabase.from("status_history").insert({
        order_id: order.id, to_status: "new_order", note: "Manual staff entry",
      });

      toast("Order created");
      navigate(`/staff/orders/${order.id}`);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  const emptyCls = (v: string) =>
    "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none " +
    (v ? "border-slate-300 focus:border-indigo-500" : "border-amber-300 bg-amber-50");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <h1 className="text-2xl font-bold">Manual Order Entry</h1>

      {/* Smart Paste */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Smart Paste (optional)
        </h2>
        <p className="mb-2 text-xs text-slate-500">
          Paste a messy blob of customer details (phone-in, chat, referral) and let the app auto-fill the fields.
        </p>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={5}
          placeholder="Paste details here…"
          className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <button
          onClick={parse}
          disabled={parsing || !rawText.trim()}
          className="mt-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
        >
          {parsing ? "Parsing…" : "Parse"}
        </button>
        {unmatched && (
          <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            ⚠ Unmatched notes: {unmatched}
          </div>
        )}
        {rawResponse && (
          <pre className="mt-3 overflow-auto rounded-lg bg-slate-100 p-3 text-xs text-slate-600">{rawResponse}</pre>
        )}
      </div>

      {/* Document + fee */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Document & Fee</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Document type</span>
            <select value={docTypeId} onChange={(e) => pickDoc(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="">Select…</option>
              {docTypes.map((d) => (
                <option key={d.id} value={d.id}>{d.name} — {peso(d.base_fee)}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Copies</span>
            <input type="number" min={1} value={copies} onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Fee per copy (₱)</span>
            <input type="number" value={fee} onChange={(e) => setFee(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Downpayment (₱)</span>
            <input type="number" value={downpayment} onChange={(e) => setDownpayment(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        </div>
        {fee !== "" && (
          <p className="mt-2 text-sm text-slate-500">Total: <b>{peso(Number(fee) * copies)}</b></p>
        )}
      </div>

      {/* PSA details */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">PSA Request Details</h2>
        <p className="mb-3 text-xs text-slate-500">Amber fields are empty — double-check spelling; PSA rejects over a single wrong letter.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="First name" v={f.first_name} on={(v) => set("first_name", v)} cls={emptyCls} />
          <Input label="Middle name" v={f.middle_name} on={(v) => set("middle_name", v)} cls={emptyCls} />
          <Input label="Last name" v={f.last_name} on={(v) => set("last_name", v)} cls={emptyCls} />
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Sex</span>
            <select value={f.sex} onChange={(e) => set("sex", e.target.value)} className={emptyCls(f.sex)}>
              <option value="">—</option>
              <option>Male</option>
              <option>Female</option>
            </select>
          </label>
          <Input label={fieldCfg.eventLabel} type="date" v={f.date_of_birth} on={(v) => set("date_of_birth", v)} cls={emptyCls} />
          <Input label="Place" v={f.place_of_birth} on={(v) => set("place_of_birth", v)} cls={emptyCls} />
          {fieldCfg.showParents && (
            <>
              <Input label="Father's full name" v={f.fathers_full_name} on={(v) => set("fathers_full_name", v)} cls={emptyCls} />
              <Input label="Mother's maiden name" v={f.mothers_full_name} on={(v) => set("mothers_full_name", v)} cls={emptyCls} />
            </>
          )}
          {fieldCfg.showSpouse && (
            <Input label="Spouse name" v={f.spouse_name} on={(v) => set("spouse_name", v)} cls={emptyCls} />
          )}
          <Input label="Purpose" v={f.purpose} on={(v) => set("purpose", v)} cls={emptyCls} />
        </div>
      </div>

      {/* Delivery */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Delivery</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Recipient name" v={f.recipient_name} on={(v) => set("recipient_name", v)} cls={emptyCls} />
          <Input label="Phone" v={f.phone} on={(v) => set("phone", v)} cls={emptyCls} />
          <Input label="Address line" v={f.address_line} on={(v) => set("address_line", v)} cls={emptyCls} />
          <Input label="Barangay" v={f.barangay} on={(v) => set("barangay", v)} cls={emptyCls} />
          <Input label="City" v={f.city} on={(v) => set("city", v)} cls={emptyCls} />
          <Input label="Province" v={f.province} on={(v) => set("province", v)} cls={emptyCls} />
          <Input label="Postal code" v={f.postal_code} on={(v) => set("postal_code", v)} cls={emptyCls} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save order"}
        </button>
      </div>
    </div>
  );
}

function Input({
  label, v, on, cls, type = "text",
}: {
  label: string; v: string; on: (v: string) => void; cls: (v: string) => string; type?: string;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-slate-600">{label}</span>
      <input type={type} value={v} onChange={(e) => on(e.target.value)} className={cls(v)} />
    </label>
  );
}
