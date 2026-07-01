import type { OrderStatus, Order } from "../lib/types";
import { STAGES, STAGE_TS, stageIndex } from "../lib/constants";

// Visual centerpiece of the order-detail page: the 6 stages with timestamps.
export function StatusStepper({ order }: { order: Order }) {
  const current = stageIndex(order.status);

  function tsFor(key: OrderStatus): string | null {
    const col = STAGE_TS[key];
    if (!col) return null;
    const v = order[col] as string | null;
    return v ? new Date(v).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : null;
  }

  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:gap-0">
      {STAGES.map((stage, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={stage.key} className="relative flex flex-1 items-start sm:flex-col sm:items-center">
            {/* connector */}
            {i > 0 && (
              <span
                className={
                  "absolute left-3 -top-4 h-4 w-0.5 sm:left-auto sm:top-3 sm:-ml-[50%] sm:h-0.5 sm:w-full " +
                  (i <= current ? "bg-emerald-500" : "bg-slate-200")
                }
              />
            )}
            <div className="flex items-center gap-3 sm:flex-col sm:gap-1">
              <span
                className={
                  "z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold " +
                  (done
                    ? "bg-emerald-500 text-white"
                    : active
                    ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                    : "bg-slate-200 text-slate-500")
                }
              >
                {done ? "✓" : i + 1}
              </span>
              <div className="pb-3 sm:pb-0 sm:text-center">
                <div className={"text-sm font-medium " + (active ? "text-indigo-700" : done ? "text-slate-700" : "text-slate-400")}>
                  {stage.short}
                </div>
                <div className="text-xs text-slate-400">{tsFor(stage.key) ?? "—"}</div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
