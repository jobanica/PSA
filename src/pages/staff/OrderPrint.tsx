import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import type { Order, OrderDetail } from "../../lib/types";
import { APP_NAME } from "../../lib/constants";

// Print-optimized A4 request sheet. Field positions are clean and labeled so it
// can be printed standalone or overlaid on the actual PSA form.
export function OrderPrint() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("orders").select("*, customers(*), document_types(*)").eq("id", id).single(),
      supabase.from("order_details").select("*").eq("order_id", id).maybeSingle(),
    ]).then(([o, d]) => {
      setOrder(o.data as Order);
      setDetail(d.data as OrderDetail);
    });
  }, [id]);

  if (!order) return <div className="p-6 text-slate-400">Loading…</div>;
  const c = order.customers;

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Toolbar — hidden on print */}
      <div className="no-print flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <span className="text-sm text-slate-500">Print preview · {order.order_code}</span>
        <button onClick={() => window.print()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
          Print
        </button>
      </div>

      <div className="print-page mx-auto max-w-[210mm] p-8">
        <div className="mb-6 flex items-start justify-between border-b-2 border-black pb-4">
          <div>
            <h1 className="text-xl font-bold">{APP_NAME}</h1>
            <p className="text-sm">PSA Document Request Form</p>
          </div>
          <div className="text-right text-sm">
            <div><b>{order.order_code}</b></div>
            <div>{new Date().toLocaleDateString("en-PH", { dateStyle: "long" })}</div>
          </div>
        </div>

        <Row label="Document requested" value={`${order.document_types?.name}  ×${order.copies}`} />
        <Row label="PSA reference no." value={order.psa_reference_no} />

        <SectionTitle>Subject of the Certificate</SectionTitle>
        <div className="grid grid-cols-3 gap-x-6">
          <PField label="First name" value={detail?.first_name} />
          <PField label="Middle name" value={detail?.middle_name} />
          <PField label="Last name" value={detail?.last_name} />
          <PField label="Sex" value={detail?.sex} />
          <PField label="Date of event" value={detail?.date_of_birth || detail?.date_of_event} />
          <PField label="Place of event" value={detail?.place_of_birth || detail?.place_of_event} />
          <PField label="Father's full name" value={detail?.fathers_full_name} />
          <PField label="Mother's maiden name" value={detail?.mothers_full_name} />
          {detail?.spouse_name && <PField label="Spouse name" value={detail.spouse_name} />}
          <PField label="Purpose" value={detail?.purpose} />
        </div>

        <SectionTitle>Delivery</SectionTitle>
        <div className="grid grid-cols-2 gap-x-6">
          <PField label="Recipient" value={c?.full_name} />
          <PField label="Phone" value={c?.phone} />
          <PField label="Address" value={c?.shipping_address} wide />
          <PField label="City" value={c?.city} />
          <PField label="Province" value={c?.province} />
          <PField label="Postal code" value={c?.postal_code} />
          <PField label="J&T tracking" value={order.jnt_tracking_no} />
        </div>

        <div className="mt-10 grid grid-cols-2 gap-8 text-sm">
          <SignLine label="Prepared by" />
          <SignLine label="Verified by" />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 mt-6 border-b border-black pb-1 text-sm font-bold uppercase">{children}</h2>;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="mb-1 flex gap-2 text-sm">
      <span className="w-44 font-semibold">{label}:</span>
      <span>{value || "—"}</span>
    </div>
  );
}

function PField({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <div className={"mb-3 " + (wide ? "col-span-2" : "")}>
      <div className="text-xs text-neutral-600">{label}</div>
      <div className="min-h-[1.4rem] border-b border-neutral-400 pb-0.5 font-medium">{value || " "}</div>
    </div>
  );
}

function SignLine({ label }: { label: string }) {
  return (
    <div>
      <div className="mt-8 border-b border-black" />
      <div className="mt-1 text-center text-xs">{label}</div>
    </div>
  );
}
