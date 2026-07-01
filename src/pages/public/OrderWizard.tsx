import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase, functionsUrl } from "../../lib/supabaseClient";
import type { DocumentType } from "../../lib/types";
import { useDocumentTypes, fieldsForDocType } from "../../hooks/useDocumentTypes";
import { APP_NAME, peso } from "../../lib/constants";

type Step = 1 | 2 | 3 | 4 | 5;

export function OrderWizard() {
  const { docTypes } = useDocumentTypes();
  const [step, setStep] = useState<Step>(1);
  const [doc, setDoc] = useState<DocumentType | null>(null);

  const [details, setDetails] = useState({
    first_name: "", middle_name: "", last_name: "", sex: "",
    date_of_birth: "", place_of_birth: "", fathers_full_name: "", mothers_full_name: "",
    spouse_name: "", purpose: "", copies: 1,
  });
  const [delivery, setDelivery] = useState({
    recipient_name: "", phone: "", address_line: "", barangay: "",
    city: "", province: "", postal_code: "",
  });
  const [honeypot, setHoneypot] = useState("");

  // OTP state
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [normalizedPhone, setNormalizedPhone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<{ order_code: string } | null>(null);

  const cfg = doc ? fieldsForDocType(doc.name) : fieldsForDocType("birth");

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendOtp() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`${functionsUrl}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: delivery.phone, honeypot }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send code");
      setOtpSent(true);
      setCooldown(json.cooldown ?? 60);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`${functionsUrl}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: delivery.phone, code: otp }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Verification failed");
      setVerifyToken(json.verify_token);
      setNormalizedPhone(json.phone);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!doc || !verifyToken || !normalizedPhone) return;
    setError(null);
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("submit_public_order", {
        p_verify_token: verifyToken,
        p_phone: normalizedPhone,
        p_document_type_id: doc.id,
        p_copies: details.copies,
        p_details: {
          first_name: details.first_name, middle_name: details.middle_name,
          last_name: details.last_name, sex: details.sex,
          date_of_birth: details.date_of_birth || null, place_of_birth: details.place_of_birth,
          fathers_full_name: details.fathers_full_name, mothers_full_name: details.mothers_full_name,
          spouse_name: details.spouse_name, purpose: details.purpose,
        },
        p_delivery: delivery,
      });
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      setResult({ order_code: row.order_code });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
          <h1 className="text-xl font-bold">Order placed!</h1>
          <p className="mt-1 text-slate-500">We'll text you updates. Salamat!</p>
          <div className="mt-4 rounded-lg bg-slate-50 p-4">
            <div className="text-xs text-slate-400">Your order number</div>
            <div className="text-2xl font-bold tracking-wide text-indigo-700">{result.order_code}</div>
          </div>
          <Link to={`/track/${result.order_code}`} className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white">
            Track my order
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <StepBar step={step} />
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        {/* Step 1: choose document */}
        {step === 1 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold">Choose a document</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {docTypes.map((d) => (
                <button
                  key={d.id}
                  onClick={() => { setDoc(d); setStep(2); }}
                  className={"rounded-xl border p-4 text-left hover:border-indigo-400 " + (doc?.id === d.id ? "border-indigo-500" : "border-slate-200")}
                >
                  <div className="font-medium">{d.name}</div>
                  <div className="text-lg font-bold text-indigo-700">{peso(d.base_fee)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: PSA form */}
        {step === 2 && doc && (
          <div>
            <h2 className="mb-4 text-lg font-semibold">Details for {doc.name}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="First name" v={details.first_name} on={(v) => setDetails({ ...details, first_name: v })} req />
              <F label="Middle name" v={details.middle_name} on={(v) => setDetails({ ...details, middle_name: v })} />
              <F label="Last name" v={details.last_name} on={(v) => setDetails({ ...details, last_name: v })} req />
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Sex</span>
                <select value={details.sex} onChange={(e) => setDetails({ ...details, sex: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5">
                  <option value="">—</option><option>Male</option><option>Female</option>
                </select>
              </label>
              <F label={cfg.eventLabel} type="date" v={details.date_of_birth} on={(v) => setDetails({ ...details, date_of_birth: v })} />
              <F label="Place of event" v={details.place_of_birth} on={(v) => setDetails({ ...details, place_of_birth: v })} />
              {cfg.showParents && (
                <>
                  <F label="Father's full name" v={details.fathers_full_name} on={(v) => setDetails({ ...details, fathers_full_name: v })} />
                  <F label="Mother's maiden name" v={details.mothers_full_name} on={(v) => setDetails({ ...details, mothers_full_name: v })} />
                </>
              )}
              {cfg.showSpouse && (
                <F label="Spouse name" v={details.spouse_name} on={(v) => setDetails({ ...details, spouse_name: v })} />
              )}
              <F label="Purpose" v={details.purpose} on={(v) => setDetails({ ...details, purpose: v })} />
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Copies</span>
                <input type="number" min={1} value={details.copies} onChange={(e) => setDetails({ ...details, copies: Math.max(1, Number(e.target.value)) })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
              </label>
            </div>
            <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} nextOk={!!details.first_name && !!details.last_name} />
          </div>
        )}

        {/* Step 3: delivery */}
        {step === 3 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold">Delivery details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="Recipient name" v={delivery.recipient_name} on={(v) => setDelivery({ ...delivery, recipient_name: v })} req />
              <F label="Mobile number" v={delivery.phone} on={(v) => setDelivery({ ...delivery, phone: v })} req />
              <F label="House no. / Street" v={delivery.address_line} on={(v) => setDelivery({ ...delivery, address_line: v })} req wide />
              <F label="Barangay" v={delivery.barangay} on={(v) => setDelivery({ ...delivery, barangay: v })} />
              <F label="City / Municipality" v={delivery.city} on={(v) => setDelivery({ ...delivery, city: v })} req />
              <F label="Province" v={delivery.province} on={(v) => setDelivery({ ...delivery, province: v })} req />
              <F label="Postal code" v={delivery.postal_code} on={(v) => setDelivery({ ...delivery, postal_code: v })} />
            </div>
            <Nav
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
              nextOk={!!delivery.recipient_name && !!delivery.phone && !!delivery.address_line && !!delivery.city && !!delivery.province}
            />
          </div>
        )}

        {/* Step 4: OTP */}
        {step === 4 && (
          <div>
            <h2 className="mb-1 text-lg font-semibold">Verify your number</h2>
            <p className="mb-4 text-sm text-slate-500">We'll send a 6-digit code to {delivery.phone} so we can text you updates.</p>
            {/* honeypot: hidden from real users */}
            <input
              tabIndex={-1} autoComplete="off" value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="absolute left-[-9999px]" aria-hidden
            />
            {!otpSent ? (
              <button onClick={sendOtp} disabled={busy} className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white disabled:opacity-50">
                {busy ? "Sending…" : "Send code"}
              </button>
            ) : verifyToken ? (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ Number verified</div>
            ) : (
              <div className="flex flex-col gap-3">
                <input
                  value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit code" inputMode="numeric"
                  className="w-40 rounded-lg border border-slate-300 px-3 py-2.5 text-center text-lg tracking-widest"
                />
                <div className="flex gap-2">
                  <button onClick={verifyOtp} disabled={busy || otp.length !== 6} className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white disabled:opacity-50">
                    Verify
                  </button>
                  <button onClick={sendOtp} disabled={cooldown > 0 || busy} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm disabled:opacity-40">
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                  </button>
                </div>
              </div>
            )}
            <Nav onBack={() => setStep(3)} onNext={() => setStep(5)} nextOk={!!verifyToken} nextLabel="Review" />
          </div>
        )}

        {/* Step 5: review + submit */}
        {step === 5 && doc && (
          <div>
            <h2 className="mb-4 text-lg font-semibold">Review & submit</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <RowItem k="Document" v={`${doc.name} ×${details.copies}`} />
              <RowItem k="Total (COD)" v={peso(Number(doc.base_fee) * details.copies)} />
              <RowItem k="Subject" v={[details.first_name, details.middle_name, details.last_name].filter(Boolean).join(" ")} />
              <RowItem k="Recipient" v={delivery.recipient_name} />
              <RowItem k="Phone" v={delivery.phone} />
              <RowItem k="Address" v={[delivery.address_line, delivery.barangay, delivery.city, delivery.province].filter(Boolean).join(", ")} />
            </dl>
            <div className="mt-5 flex items-center justify-between">
              <button onClick={() => setStep(4)} className="text-sm text-slate-500">← Back</button>
              <button onClick={submit} disabled={busy || !verifyToken} className="rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white disabled:opacity-50">
                {busy ? "Submitting…" : "Place order"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between px-5 py-4">
        <Link to="/" className="text-lg font-bold text-indigo-700">{APP_NAME}</Link>
        <Link to="/track" className="text-sm font-medium text-indigo-700">Track →</Link>
      </header>
      <div className="mx-auto max-w-2xl px-4 pb-10">{children}</div>
    </div>
  );
}

function StepBar({ step }: { step: number }) {
  const labels = ["Document", "Details", "Delivery", "Verify", "Submit"];
  return (
    <div className="mb-4 flex items-center gap-1">
      {labels.map((l, i) => (
        <div key={l} className="flex flex-1 flex-col items-center gap-1">
          <div className={"h-1.5 w-full rounded-full " + (i + 1 <= step ? "bg-indigo-600" : "bg-slate-200")} />
          <span className={"text-[10px] " + (i + 1 <= step ? "text-indigo-600" : "text-slate-400")}>{l}</span>
        </div>
      ))}
    </div>
  );
}

function F({
  label, v, on, req, type = "text", wide,
}: {
  label: string; v: string; on: (v: string) => void; req?: boolean; type?: string; wide?: boolean;
}) {
  return (
    <label className={"text-sm " + (wide ? "sm:col-span-2" : "")}>
      <span className="mb-1 block text-slate-600">
        {label} {req && <span className="text-red-500">*</span>}
      </span>
      <input type={type} value={v} onChange={(e) => on(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-indigo-500 focus:outline-none" />
    </label>
  );
}

function Nav({ onBack, onNext, nextOk, nextLabel = "Continue" }: { onBack: () => void; onNext: () => void; nextOk: boolean; nextLabel?: string }) {
  return (
    <div className="mt-5 flex items-center justify-between">
      <button onClick={onBack} className="text-sm text-slate-500">← Back</button>
      <button onClick={onNext} disabled={!nextOk} className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white disabled:opacity-40">
        {nextLabel}
      </button>
    </div>
  );
}

function RowItem({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
      <dt className="text-slate-400">{k}</dt>
      <dd className="text-right font-medium">{v || "—"}</dd>
    </div>
  );
}
