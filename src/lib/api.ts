import { supabase } from "./supabaseClient";
import type { OrderStatus } from "./types";

// Advance an order to a new stage via the server-side RPC, which also writes
// status_history and drives the SMS scheduling / cancellation.
export async function advanceOrderStatus(
  orderId: string,
  toStatus: OrderStatus,
  opts: { note?: string; psaRef?: string; jntTracking?: string } = {},
) {
  const { data, error } = await supabase.rpc("advance_order_status", {
    p_order_id: orderId,
    p_to_status: toStatus,
    p_note: opts.note ?? null,
    p_psa_reference_no: opts.psaRef ?? null,
    p_jnt_tracking_no: opts.jntTracking ?? null,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function recordPayment(
  orderId: string,
  amount: number,
  method: string,
  referenceNo: string | null,
) {
  const { error } = await supabase.from("payments").insert({
    order_id: orderId,
    amount,
    method,
    reference_no: referenceNo,
  });
  if (error) throw new Error(error.message);
}
