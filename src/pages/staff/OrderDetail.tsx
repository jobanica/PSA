import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import type { Order, OrderDetail as ODetail, Payment, ScheduledMessage, StatusHistory } from "../../lib/types";
import { STAGE_BY_KEY, nextStage, peso } from "../../lib/constants";
import { StatusStepper } from "../../components/StatusStepper";
import { PaymentBadge } from "../../components/StatusBadge";
import { advanceOrderStatus, recordPayment } from "../../lib/api";
import { statusMessage } from "../../lib/statusMessage";
import { useToast } from "../../context/ToastContext";

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [detail, setDetail] = useState<ODetail | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // advance-stage inputs
  const [psaRef, setPsaRef] = useState("");
  const [tracking, setTracking] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    const [o, d, h, p, m] = await Promise.all([
      supabase.from("orders").select("*, customers(*), document_types(*)").eq("id", id).single(),
      supabase.from("order_details").select("*").eq("order_id", id).maybeSingle(),
      supabase.from("status_history").select("*").eq("order_id", id).order("created_at"),
      supabase.from("payments").select("*").eq("order_id", id).order("received_at"),
      supabase.from("scheduled_messages").select("*").eq("order_id", id).order("created_at"),
    ]);
    setOrder(o.data as Order);
    setDetail(d.data as ODetail);
    setHistory((h.data as StatusHistory[]) ?? []);
    setPayments((p.data as Payment[]) ?? []);
    setMessages((m.data as ScheduledMessage[]) ?? []);
    setPsaRef((o.data as Order)?.psa_reference_no ?? "");
    setTracking((o.data as Order)?.jnt_tracking_no ?? "");
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdvance() {
    if (!order) return;
    const next = nextStage(order.status);
    if (!next) return;
    if (next === "shipped" && !tracking.trim()) {
      toast("J&T tracking number is required to mark as shipped.", "error");
      return;
    }
    setBusy(true);
    try {
      await advanceOrderStatus(order.id, next, {
        psaRef: next === "submitted" ? psaRef : undefined,
        jntTracking: next === "shipped" ? tracking : undefined,
      });
      toast(`Advanced to ${STAGE_BY_KEY[next].label}`);
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleRecordPayment(amount: number, method: string, ref: string) {
    if (!order) return;
    setBusy(true);
    try {
      await recordPayment(order.id, amount, method, ref || null);
      toast("Payment recorded");
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  function copyMessage() {
    if (!order) return;
    navigator.clipboard.writeText(statusMessage(order));
    toast("Status message copied");
  }

  if (loading || !order) return <div className="text-slate-400">Loading order…</div>;

  const next = nextStage(order.status);
  const c = order.customers;

  return (
    <div className="flex flex-col gap-5">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/staff/orders" className="text-sm text-slate-400 hover:text-slate-600">← Orders</Link>
          <h1 className="text-2xl font-bold">{order.order_code}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={copyMessage} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">
            Copy message
          </button>
          <Link
            to={`/staff/orders/${order.id}/print`}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Print Form
          </Link>
        </div>
      </div>

      {/* stepper */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <StatusStepper order={order} />
        {next && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            {next === "submitted" && (
              <label className="mb-3 block text-sm">
                <span className="mb-1 block font-medium text-slate-600">PSA reference no. (optional)</span>
                <input
                  value={psaRef}
                  onChange={(e) => setPsaRef(e.target.value)}
                  className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="e.g. 2026-1234567"
                />
              </label>
            )}
            {next === "shipped" && (
              <label className="mb-3 block text-sm">
                <span className="mb-1 block font-medium text-slate-600">J&T tracking no. (required)</span>
                <input
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="e.g. 620012345678"
                />
              </label>
            )}
            <button
              onClick={handleAdvance}
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Advance to {STAGE_BY_KEY[next].label} →
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* customer + shipping */}
        <Section title="Customer & Shipping">
          <Field label="Name" value={c?.full_name} />
          <Field label="Phone" value={c?.phone} />
          <Field label="Address" value={c?.shipping_address} />
          <Field label="City / Province" value={[c?.city, c?.province].filter(Boolean).join(", ")} />
          <Field label="Postal code" value={c?.postal_code} />
        </Section>

        {/* document details */}
        <Section title="Document Details">
          <Field label="Document" value={order.document_types?.name} />
          <Field label="Copies" value={String(order.copies)} />
          <Field
            label="Subject"
            value={
              detail?.subject_full_name ||
              [detail?.first_name, detail?.middle_name, detail?.last_name].filter(Boolean).join(" ")
            }
          />
          <Field label="Date of event" value={detail?.date_of_birth || detail?.date_of_event} />
          <Field label="Place" value={detail?.place_of_birth || detail?.place_of_event} />
          {detail?.fathers_full_name && <Field label="Father" value={detail.fathers_full_name} />}
          {detail?.mothers_full_name && <Field label="Mother (maiden)" value={detail.mothers_full_name} />}
          {detail?.spouse_name && <Field label="Spouse" value={detail.spouse_name} />}
          <Field label="Purpose" value={detail?.purpose} />
          <Field label="PSA ref" value={order.psa_reference_no} />
          <Field label="J&T tracking" value={order.jnt_tracking_no} />
        </Section>
      </div>

      {/* payment */}
      <PaymentSection order={order} payments={payments} onRecord={handleRecordPayment} busy={busy} />

      {/* timeline */}
      <Timeline history={history} payments={payments} messages={messages} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      <dl className="flex flex-col gap-2">{children}</dl>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium">{value || "—"}</dd>
    </div>
  );
}

function PaymentSection({
  order,
  payments,
  onRecord,
  busy,
}: {
  order: Order;
  payments: Payment[];
  onRecord: (amount: number, method: string, ref: string) => void;
  busy: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cod");
  const [ref, setRef] = useState("");
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Payment</h2>
        <PaymentBadge status={order.payment_status} />
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-xs text-slate-400">Total</div>
          <div className="font-bold">{peso(order.total_amount)}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-xs text-slate-400">Paid</div>
          <div className="font-bold">{peso(paid)}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-xs text-slate-400">Balance</div>
          <div className="font-bold text-red-600">{peso(order.balance_due)}</div>
        </div>
      </div>

      {Number(order.balance_due) > 0 && (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-500">Amount</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-28 rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-500">Method</span>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
              <option value="cod">COD</option>
              <option value="gcash">GCash</option>
              <option value="bank">Bank</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-500">Reference</span>
            <input value={ref} onChange={(e) => setRef(e.target.value)} className="w-32 rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <button
            onClick={() => {
              const a = Number(amount);
              if (a > 0) {
                onRecord(a, method, ref);
                setAmount("");
                setRef("");
              }
            }}
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Record payment
          </button>
        </div>
      )}
    </div>
  );
}

type TimelineItem = { at: string; label: string; kind: "status" | "payment" | "sms" };

function Timeline({
  history,
  payments,
  messages,
}: {
  history: StatusHistory[];
  payments: Payment[];
  messages: ScheduledMessage[];
}) {
  const items: TimelineItem[] = [
    ...history.map((h) => ({
      at: h.created_at,
      kind: "status" as const,
      label: `Status → ${STAGE_BY_KEY[h.to_status]?.label ?? h.to_status}${h.note ? ` (${h.note})` : ""}`,
    })),
    ...payments.map((p) => ({
      at: p.received_at,
      kind: "payment" as const,
      label: `Payment ${peso(p.amount)} via ${p.method}${p.reference_no ? ` · ${p.reference_no}` : ""}`,
    })),
    ...messages.map((m) => ({
      at: m.sent_at ?? m.send_at,
      kind: "sms" as const,
      label: `SMS ${m.status}: ${m.body.slice(0, 80)}${m.body.length > 80 ? "…" : ""}`,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const dot: Record<TimelineItem["kind"], string> = {
    status: "bg-indigo-500",
    payment: "bg-emerald-500",
    sms: "bg-sky-500",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Activity</h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">No activity yet.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((it, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className={"mt-1.5 h-2 w-2 shrink-0 rounded-full " + dot[it.kind]} />
              <div>
                <div>{it.label}</div>
                <div className="text-xs text-slate-400">
                  {new Date(it.at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
