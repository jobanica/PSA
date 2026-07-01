import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import type { OrderStatus } from "../../lib/types";
import { APP_NAME, STAGES, stageIndex } from "../../lib/constants";

interface TrackResult {
  order_code: string;
  document_type: string;
  status: OrderStatus;
  submitted_at: string | null;
  released_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  jnt_tracking_no: string | null;
  created_at: string;
}

// Public tracking. order_code alone is NOT enough (codes are guessable) — the
// server RPC only returns a row when order_code + phone match.
export function Track() {
  const { order_code } = useParams<{ order_code: string }>();
  const [code, setCode] = useState(order_code ?? "");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const { data, error } = await supabase.rpc("track_order", {
        p_order_code: code.trim(),
        p_phone: phone.trim(),
      });
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        setError("No matching order found. Check your order number and phone.");
      } else {
        setResult(row as TrackResult);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between px-5 py-4">
        <Link to="/" className="text-lg font-bold text-indigo-700">{APP_NAME}</Link>
        <Link to="/order" className="text-sm font-medium text-indigo-700">Order →</Link>
      </header>

      <div className="mx-auto max-w-md px-4 pb-10">
        <h1 className="mb-1 text-2xl font-bold">Track your order</h1>
        <p className="mb-5 text-sm text-slate-500">
          Enter your order number and the phone number you used.
        </p>

        <form onSubmit={lookup} className="rounded-2xl border border-slate-200 bg-white p-6">
          <label className="mb-3 block text-sm">
            <span className="mb-1 block text-slate-600">Order number</span>
            <input
              value={code} onChange={(e) => setCode(e.target.value)}
              placeholder="ORD-2026-0042" required
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-indigo-500 focus:outline-none"
            />
          </label>
          <label className="mb-4 block text-sm">
            <span className="mb-1 block text-slate-600">Phone (or last 4 digits)</span>
            <input
              value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="09xxxxxxxxx" required
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-indigo-500 focus:outline-none"
            />
          </label>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {busy ? "Checking…" : "Check status"}
          </button>
        </form>

        {result && <ResultView result={result} />}
      </div>
    </div>
  );
}

function ResultView({ result }: { result: TrackResult }) {
  const current = stageIndex(result.status);
  const tsFor = (key: OrderStatus): string | null => {
    const map: Partial<Record<OrderStatus, string | null>> = {
      submitted: result.submitted_at,
      released: result.released_at,
      shipped: result.shipped_at,
      delivered: result.delivered_at,
    };
    const v = map[key];
    return v ? new Date(v).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : null;
  };

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400">Order</div>
          <div className="font-bold text-indigo-700">{result.order_code}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Document</div>
          <div className="font-medium">{result.document_type}</div>
        </div>
      </div>

      <ol className="flex flex-col gap-4">
        {STAGES.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const ts = tsFor(s.key);
          return (
            <li key={s.key} className="flex items-center gap-3">
              <span className={"flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold " + (done ? "bg-emerald-500 text-white" : active ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500")}>
                {done ? "✓" : i + 1}
              </span>
              <span className={"flex-1 text-sm " + (active ? "font-semibold text-indigo-700" : done ? "text-slate-700" : "text-slate-400")}>
                {s.label}
              </span>
              {ts && <span className="text-xs text-slate-400">{ts}</span>}
            </li>
          );
        })}
      </ol>

      {result.jnt_tracking_no && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
          <span className="text-slate-400">J&T tracking: </span>
          <span className="font-medium">{result.jnt_tracking_no}</span>
        </div>
      )}
      <p className="mt-4 text-center text-xs text-slate-400">
        Estimated: ~1 week processing + ~1 week delivery.
      </p>
    </div>
  );
}
