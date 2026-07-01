import type { OrderStatus, PaymentStatus } from "../lib/types";
import { STAGE_BY_KEY } from "../lib/constants";

export function StatusBadge({ status }: { status: OrderStatus }) {
  const s = STAGE_BY_KEY[status];
  return (
    <span className={"inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium " + s.badge}>
      <span className={"h-1.5 w-1.5 rounded-full " + s.dot} />
      {s.label}
    </span>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const map: Record<PaymentStatus, string> = {
    unpaid: "bg-red-100 text-red-700",
    partial: "bg-amber-100 text-amber-800",
    paid: "bg-green-100 text-green-700",
  };
  return (
    <span className={"inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize " + map[status]}>
      {status}
    </span>
  );
}
