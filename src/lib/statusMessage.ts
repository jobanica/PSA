import type { Order } from "./types";
import { APP_NAME, peso } from "./constants";

// Ready-made Taglish status message staff can copy if they ever need to message
// a customer manually (the automatic SMS covers normal updates).
export function statusMessage(order: Order): string {
  const first = order.customers?.full_name?.split(" ")[0] ?? "po";
  const doc = order.document_types?.name ?? "PSA document";
  const track = order.order_code;
  switch (order.status) {
    case "new_order":
      return `Hi ${first}! Nareceive na namin ang order mo para sa ${doc} (${order.order_code}). Ipoproseso na namin ito sa PSA. — ${APP_NAME}`;
    case "submitted":
      return `Hi ${first}! Ang ${doc} request mo (Ref ${order.psa_reference_no ?? "pending"}) ay pinoproseso na sa PSA. Iu-update ka namin pagka-release. — ${APP_NAME}`;
    case "released":
      return `Good news ${first}! Na-release na ang ${doc} mo at ihahanda na para i-ship via J&T. 🎉`;
    case "shipped":
      return `Hi ${first}, na-ship na ang ${doc} mo via J&T! Tracking: ${order.jnt_tracking_no ?? "—"}. Pakihanda ang ${peso(order.balance_due)} para sa COD. Salamat!`;
    case "delivered":
      return `Hi ${first}, na-deliver na ang ${doc} mo. Salamat sa pag-order sa ${APP_NAME}! 🙏`;
    case "paid":
      return `Salamat ${first}! Na-receive na namin ang bayad mo para sa ${doc}. Order code: ${track}.`;
    default:
      return "";
  }
}
