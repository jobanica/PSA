import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import type { Order } from "../../lib/types";
import { STAGES, STAGE_BY_KEY, STAGE_TS, peso, daysBetween } from "../../lib/constants";
import { useSettings, num } from "../../hooks/useSettings";
import { StatusBadge } from "../../components/StatusBadge";
import { Plus, Sun, Truck, PackageCheck, Banknotes, AlertTriangle, ArrowRight, Clock } from "../../components/icons";

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

  const pipeline = STAGES.map((s) => {
    const inStage = orders.filter((o) => o.status === s.key);
    return { ...s, count: inStage.length, value: inStage.reduce((sum, o) => sum + Number(o.total_amount), 0) };
  });
  const maxCount = Math.max(1, ...pipeline.map((p) => p.count));

  const needsAttention = orders.filter((o) => {
    if (o.status === "submitted") return daysBetween(o.submitted_at) > slaSubmitted;
    if (o.status === "shipped") return daysBetween(o.shipped_at) > slaShipped;
    return false;
  });

  const isToday = (ts: string | null) => {
    if (!ts) return false;
    return new Date(ts).toDateString() === new Date().toDateString();
  };
  const snapshot = {
    newToday: orders.filter((o) => isToday(o.created_at)).length,
    shippedToday: orders.filter((o) => isToday(o.shipped_at)).length,
    deliveredToday: orders.filter((o) => isToday(o.delivered_at)).length,
    collectedToday: orders.filter((o) => isToday(o.paid_at)).reduce((s, o) => s + Number(o.total_amount), 0),
  };

  if (loading) return <div className="text-slate-400">Loading dashboard…</div>;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Dashboard</h1>
          <p className="text-sm text-slate-500">Live view of every order in the pipeline.</p>
        </div>
        <Link
          to="/staff/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> New Order
        </Link>
      </div>

      {/* Today's snapshot */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Snapshot Icon={Sun} tint="text-amber-600 bg-amber-50" label="New today" value={String(snapshot.newToday)} />
        <Snapshot Icon={Truck} tint="text-brand-600 bg-brand-50" label="Shipped today" value={String(snapshot.shippedToday)} />
        <Snapshot Icon={PackageCheck} tint="text-emerald-600 bg-emerald-50" label="Delivered today" value={String(snapshot.deliveredToday)} />
        <Snapshot Icon={Banknotes} tint="text-emerald-700 bg-emerald-50" label="Collected today" value={peso(snapshot.collectedToday)} />
      </div>

      {/* Pipeline */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Pipeline</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {pipeline.map((s) => (
            <Link
              key={s.key}
              to={`/staff/orders?status=${s.key}`}
              className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <span className={"h-2.5 w-2.5 rounded-full " + s.dot} />
                <span className="text-xs font-semibold text-slate-500">{s.short}</span>
              </div>
              <div className="mt-2 font-display text-3xl font-bold text-navy tnum">{s.count}</div>
              <div className="text-xs text-slate-400 tnum">{peso(s.value)}</div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={"h-full rounded-full " + s.dot} style={{ width: `${Math.max(6, (s.count / maxCount) * 100)}%` }} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Needs attention */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Needs attention</h2>
          {needsAttention.length > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 tnum">{needsAttention.length}</span>
          )}
        </div>
        {needsAttention.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <PackageCheck className="h-5 w-5" />
            </span>
            <p className="text-sm text-slate-500">Nothing stuck past SLA. All caught up.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {needsAttention.map((o) => {
              const stageTs = o[STAGE_TS[o.status]!] as string | null;
              return (
                <Link
                  key={o.id}
                  to={`/staff/orders/${o.id}`}
                  className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 last:border-0 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="font-semibold text-navy tnum">{o.order_code}</div>
                      <div className="text-xs text-slate-500">{o.customers?.full_name} · {o.document_types?.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden items-center gap-1 text-xs font-semibold text-red-600 sm:flex">
                      <Clock className="h-3.5 w-3.5" />
                      {daysBetween(stageTs)}d in {STAGE_BY_KEY[o.status].short}
                    </span>
                    <StatusBadge status={o.status} />
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Snapshot({
  Icon, tint, label, value,
}: {
  Icon: typeof Sun; tint: string; label: string; value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <span className={"flex h-9 w-9 items-center justify-center rounded-lg " + tint}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="mt-3 text-xs font-medium text-slate-400">{label}</div>
      <div className="mt-0.5 font-display text-xl font-bold text-navy tnum">{value}</div>
    </div>
  );
}
