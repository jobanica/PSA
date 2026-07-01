import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import type { Order } from "../../lib/types";
import { STAGES, STAGE_TS, peso, daysBetween } from "../../lib/constants";
import { StatusBadge, PaymentBadge } from "../../components/StatusBadge";
import { useDocumentTypes } from "../../hooks/useDocumentTypes";

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const { docTypes } = useDocumentTypes(false);

  const status = params.get("status") ?? "";
  const docType = params.get("doc") ?? "";
  const payment = params.get("pay") ?? "";
  const search = params.get("q") ?? "";

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

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (status && o.status !== status) return false;
      if (docType && o.document_type_id !== docType) return false;
      if (payment && o.payment_status !== payment) return false;
      if (q) {
        const hay = [
          o.order_code,
          o.customers?.full_name,
          o.customers?.phone,
          o.jnt_tracking_no,
          o.psa_reference_no,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, status, docType, payment, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Link
          to="/staff/new"
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          placeholder="Search name, phone, code, tracking, PSA ref…"
          value={search}
          onChange={(e) => setParam("q", e.target.value)}
          className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => setParam("status", e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        <select
          value={docType}
          onChange={(e) => setParam("doc", e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All documents</option>
          {docTypes.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          value={payment}
          onChange={(e) => setParam("pay", e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All payments</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading…</div>
      ) : (
        <>
          <p className="text-xs text-slate-400">{filtered.length} order(s)</p>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white sm:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Days</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/staff/orders/${o.id}`} className="font-medium text-indigo-700">
                        {o.order_code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div>{o.customers?.full_name}</div>
                      <div className="text-xs text-slate-400">{o.customers?.phone}</div>
                    </td>
                    <td className="px-4 py-3">{o.document_types?.name}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3">{peso(o.total_amount)}</td>
                    <td className="px-4 py-3">
                      {Number(o.balance_due) > 0 ? (
                        <span className="text-red-600">{peso(o.balance_due)}</span>
                      ) : (
                        <PaymentBadge status={o.payment_status} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {daysBetween(o[STAGE_TS[o.status]!] as string | null)}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-2 sm:hidden">
            {filtered.map((o) => (
              <Link
                key={o.id}
                to={`/staff/orders/${o.id}`}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-700">{o.order_code}</span>
                  <StatusBadge status={o.status} />
                </div>
                <div className="mt-1 text-sm">{o.customers?.full_name}</div>
                <div className="text-xs text-slate-400">{o.document_types?.name}</div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span>{peso(o.total_amount)}</span>
                  {Number(o.balance_due) > 0 ? (
                    <span className="text-red-600">Bal {peso(o.balance_due)}</span>
                  ) : (
                    <PaymentBadge status={o.payment_status} />
                  )}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
