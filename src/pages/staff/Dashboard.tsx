import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import type { Order } from "../../lib/types";
import { STAGES, STAGE_BY_KEY, STAGE_TS, peso, daysBetween } from "../../lib/constants";
import { useSettings, num } from "../../hooks/useSettings";
import { StatusBadge } from "../../components/StatusBadge";

export function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useSettings();

  useEffect(() => {
    supabase
      .from("orders")
      .select("*, customers(full_name, phone), document_types(name)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders((data as Order[]) ?? []);
        setLoading(false);
      });
  }, []);

  const slaSubmitted = num(settings.sla_submitted_days, 9);
  const slaShipped = num(settings.sla_shipped_days, 8);

  // Pipeline: count + value per stage
  const pipeline = STAGES.map((s) => {
    const inStage = orders.filter((o) => o.status === s.key);
    return {
      ...s,
      count: inStage.length,
      value: inStage.reduce((sum, o) => sum + Number(o.total_amount), 0),
    };
  });

  // Needs attention: stuck past SLA
  const needsAttention = orders.filter((o) => {
    if (o.status === "submitted") return daysBetween(o.submitted_at) > slaSubmitted;
    if (o.status === "shipped") return daysBetween(o.shipped_at) > slaShipped;
    return false;
  });

  // Today's snapshot
  const isToday = (ts: string | null) => {
    if (!ts) return false;
    const d = new Date(ts);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  };
  const snapshot = {
    newToday: orders.filter((o) => isToday(o.created_at)).length,
    shippedToday: orders.filter((o) => isToday(o.shipped_at)).length,
    deliveredToday: orders.filter((o) => isToday(o.delivered_at)).length,
    collectedToday: orders
      .filter((o) => isToday(o.paid_at))
      .reduce((s, o) => s + Number(o.total_amount), 0),
  };

  if (loading) return <div className="text-slate-400">Loading dashboard…</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          to="/staff/new"
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Order
        </Link>
      </div>

      {/* Today's snapshot */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Snapshot label="New today" value={String(snapshot.newToday)} />
        <Snapshot label="Shipped today" value={String(snapshot.shippedToday)} />
        <Snapshot label="Delivered today" value={String(snapshot.deliveredToday)} />
        <Snapshot label="Collected today" value={peso(snapshot.collectedToday)} />
      </div>

      {/* Pipeline */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Pipeline</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {pipeline.map((s) => (
            <Link
              key={s.key}
              to={`/staff/orders?status=${s.key}`}
              className="rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className={"h-2 w-2 rounded-full " + s.dot} />
                <span className="text-xs font-medium text-slate-500">{s.short}</span>
              </div>
              <div className="mt-2 text-2xl font-bold">{s.count}</div>
              <div className="text-xs text-slate-400">{peso(s.value)}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Needs attention */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Needs attention {needsAttention.length > 0 && `(${needsAttention.length})`}
        </h2>
        {needsAttention.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
            Nothing stuck past SLA. 🎉
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {needsAttention.map((o) => {
              const stageTs = o[STAGE_TS[o.status]!] as string | null;
              return (
                <Link
                  key={o.id}
                  to={`/staff/orders/${o.id}`}
                  className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50"
                >
                  <div>
                    <div className="font-medium">{o.order_code}</div>
                    <div className="text-xs text-slate-500">
                      {o.customers?.full_name} · {o.document_types?.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-red-600">
                      {daysBetween(stageTs)}d in {STAGE_BY_KEY[o.status].short}
                    </span>
                    <StatusBadge status={o.status} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Snapshot({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}
