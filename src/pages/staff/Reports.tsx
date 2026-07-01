import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Order } from "../../lib/types";
import { peso } from "../../lib/constants";
import { useSettings, num } from "../../hooks/useSettings";

export function Reports() {
  const { settings } = useSettings();
  const shippingCost = num(settings.shipping_cost, 105);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // default range: current month
  const today = new Date();
  const [from, setFrom] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  useEffect(() => {
    supabase
      .from("orders")
      .select("*, document_types(name, psa_cost)")
      .then(({ data }) => {
        setOrders((data as Order[]) ?? []);
        setLoading(false);
      });
  }, []);

  const inRange = useMemo(() => {
    const f = new Date(from).getTime();
    const t = new Date(to).getTime() + 24 * 60 * 60 * 1000; // inclusive
    return orders.filter((o) => {
      const created = new Date(o.created_at).getTime();
      return created >= f && created < t;
    });
  }, [orders, from, to]);

  // Revenue collected: paid orders in range (by paid_at)
  const collected = useMemo(() => {
    const f = new Date(from).getTime();
    const t = new Date(to).getTime() + 24 * 60 * 60 * 1000;
    return orders
      .filter((o) => o.paid_at && new Date(o.paid_at).getTime() >= f && new Date(o.paid_at).getTime() < t)
      .reduce((s, o) => s + Number(o.total_amount), 0);
  }, [orders, from, to]);

  // Order count by document type (in range, by created_at)
  const byDoc = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    inRange.forEach((o) => {
      const name = o.document_types?.name ?? "Unknown";
      const cur = map.get(name) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += Number(o.total_amount);
      map.set(name, cur);
    });
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [inRange]);

  // Margin across PAID orders in range: total - psa_cost - shipping_cost (per copy)
  const margin = useMemo(() => {
    const f = new Date(from).getTime();
    const t = new Date(to).getTime() + 24 * 60 * 60 * 1000;
    return orders
      .filter((o) => o.payment_status === "paid" && o.paid_at &&
        new Date(o.paid_at).getTime() >= f && new Date(o.paid_at).getTime() < t)
      .reduce((s, o) => {
        const psa = Number(o.document_types?.psa_cost ?? 0) * o.copies;
        const ship = shippingCost * o.copies;
        return s + (Number(o.total_amount) - psa - ship);
      }, 0);
  }, [orders, from, to, shippingCost]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Reports</h1>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card label="Revenue collected" value={peso(collected)} hint="paid in range" />
            <Card label="Orders placed" value={String(inRange.length)} hint="created in range" />
            <Card label="Margin (paid)" value={peso(margin)} hint={`less PSA cost + ₱${shippingCost} shipping`} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Orders by document type</h2>
            {byDoc.length === 0 ? (
              <p className="text-sm text-slate-400">No orders in range.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-400">
                  <tr><th className="py-2">Document</th><th className="py-2">Count</th><th className="py-2">Revenue</th></tr>
                </thead>
                <tbody>
                  {byDoc.map(([name, v]) => (
                    <tr key={name} className="border-t border-slate-100">
                      <td className="py-2">{name}</td>
                      <td className="py-2">{v.count}</td>
                      <td className="py-2">{peso(v.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-400">{hint}</div>
    </div>
  );
}
