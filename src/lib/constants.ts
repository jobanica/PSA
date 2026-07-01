import type { OrderStatus } from "./types";

export const APP_NAME = "DocuassistPH";

// The 6 fixed pipeline stages, in order.
export const STAGES: {
  key: OrderStatus;
  label: string;
  short: string;
  // tailwind classes for badges
  badge: string;
  dot: string;
}[] = [
  { key: "new_order", label: "New Order", short: "New", badge: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  { key: "submitted", label: "Submitted to PSA", short: "Submitted", badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  { key: "released", label: "Released", short: "Released", badge: "bg-sky-100 text-sky-800", dot: "bg-sky-500" },
  { key: "shipped", label: "Shipped", short: "Shipped", badge: "bg-indigo-100 text-indigo-800", dot: "bg-indigo-500" },
  { key: "delivered", label: "Delivered", short: "Delivered", badge: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  { key: "paid", label: "Paid", short: "Paid", badge: "bg-green-100 text-green-800", dot: "bg-green-600" },
];

export const STAGE_BY_KEY = Object.fromEntries(STAGES.map((s) => [s.key, s]));

export function stageIndex(status: OrderStatus): number {
  return STAGES.findIndex((s) => s.key === status);
}

export function nextStage(status: OrderStatus): OrderStatus | null {
  const i = stageIndex(status);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1].key : null;
}

// Which stage timestamp column corresponds to a status.
export const STAGE_TS: Record<OrderStatus, keyof import("./types").Order | null> = {
  new_order: "created_at",
  submitted: "submitted_at",
  released: "released_at",
  shipped: "shipped_at",
  delivered: "delivered_at",
  paid: "paid_at",
};

export function peso(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return "₱" + v.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function daysBetween(from: string | null, to: Date = new Date()): number {
  if (!from) return 0;
  const ms = to.getTime() - new Date(from).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
