import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import type { Customer } from "../../lib/types";

export function Customers() {
  const [customers, setCustomers] = useState<(Customer & { order_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase
      .from("customers")
      .select("*, orders(count)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []).map((c: Customer & { orders?: { count: number }[] }) => ({
          ...c,
          order_count: c.orders?.[0]?.count ?? 0,
        }));
        setCustomers(rows);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter((c) =>
      [c.full_name, c.phone, c.city, c.province].join(" ").toLowerCase().includes(s),
    );
  }, [customers, q]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Customers</h1>
      <input
        placeholder="Search name, phone, city…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
      />
      {loading ? (
        <div className="text-slate-400">Loading…</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to={`/staff/customers/${c.id}`}
              className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50"
            >
              <div>
                <div className="font-medium">{c.full_name}</div>
                <div className="text-xs text-slate-400">
                  {c.phone} · {[c.city, c.province].filter(Boolean).join(", ")}
                </div>
              </div>
              <span className="text-xs text-slate-500">{c.order_count} order(s)</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
