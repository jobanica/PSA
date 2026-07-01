import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import type { Customer, Order } from "../../lib/types";
import { peso } from "../../lib/constants";
import { StatusBadge } from "../../components/StatusBadge";
import { useToast } from "../../context/ToastContext";

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!id) return;
    const [c, o] = await Promise.all([
      supabase.from("customers").select("*").eq("id", id).single(),
      supabase.from("orders").select("*, document_types(name)").eq("customer_id", id).order("created_at", { ascending: false }),
    ]);
    setCustomer(c.data as Customer);
    setOrders((o.data as Order[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function toggleOptOut() {
    if (!customer) return;
    const { error } = await supabase
      .from("customers")
      .update({ sms_opt_out: !customer.sms_opt_out })
      .eq("id", customer.id);
    if (error) toast(error.message, "error");
    else {
      toast(customer.sms_opt_out ? "SMS re-enabled" : "SMS opted out");
      load();
    }
  }

  if (loading || !customer) return <div className="text-slate-400">Loading…</div>;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link to="/staff/customers" className="text-sm text-slate-400 hover:text-slate-600">← Customers</Link>
        <h1 className="text-2xl font-bold">{customer.full_name}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Contact</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <Row k="Phone" v={customer.phone} />
            <Row k="Address" v={customer.shipping_address} />
            <Row k="City / Province" v={[customer.city, customer.province].filter(Boolean).join(", ")} />
            <Row k="Postal" v={customer.postal_code} />
          </dl>
          <button
            onClick={toggleOptOut}
            className={"mt-4 rounded-lg px-3 py-2 text-sm font-medium " + (customer.sms_opt_out ? "bg-amber-100 text-amber-800" : "border border-slate-300 text-slate-600")}
          >
            {customer.sms_opt_out ? "SMS opted out — click to re-enable" : "Opt out of SMS"}
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Orders ({orders.length})</h2>
          <div className="flex flex-col gap-2">
            {orders.map((o) => (
              <Link key={o.id} to={`/staff/orders/${o.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50">
                <div>
                  <div className="text-sm font-medium text-indigo-700">{o.order_code}</div>
                  <div className="text-xs text-slate-400">{o.document_types?.name} · {peso(o.total_amount)}</div>
                </div>
                <StatusBadge status={o.status} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-400">{k}</dt>
      <dd className="text-right font-medium">{v || "—"}</dd>
    </div>
  );
}
