import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { APP_NAME } from "../../lib/constants";
import { Grid, Inbox, Plus, Users, ChartBar, Cog, Menu, Logout, Document, Star } from "../icons";

const nav = [
  { to: "/staff", label: "Dashboard", end: true, Icon: Grid },
  { to: "/staff/orders", label: "Orders", Icon: Inbox },
  { to: "/staff/new", label: "New Order", Icon: Plus },
  { to: "/staff/customers", label: "Customers", Icon: Users },
  { to: "/staff/reports", label: "Reports", Icon: ChartBar },
  { to: "/staff/testimonials", label: "Testimonials", Icon: Star },
  { to: "/staff/settings", label: "Settings", Icon: Cog },
];

export function StaffLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate("/staff/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* top bar (mobile) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:hidden">
        <span className="flex items-center gap-2 font-display font-bold text-navy">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-white">
            <Document className="h-3.5 w-3.5" />
          </span>
          {APP_NAME}
        </span>
        <button onClick={() => setOpen((o) => !o)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Menu">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <div className="flex">
        {/* sidebar */}
        <aside
          className={
            "fixed inset-y-0 left-0 z-40 w-60 transform border-r border-slate-200 bg-white transition-transform sm:static sm:translate-x-0 " +
            (open ? "translate-x-0" : "-translate-x-full")
          }
        >
          <div className="hidden items-center gap-2.5 px-5 py-5 sm:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Document className="h-5 w-5" />
            </span>
            <div>
              <div className="font-display text-base font-bold leading-tight text-navy">{APP_NAME}</div>
              <div className="text-xs text-slate-400">Operations</div>
            </div>
          </div>
          <nav className="flex flex-col gap-1 p-3">
            {nav.map(({ to, label, end, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition " +
                  (isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100")
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="p-3">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              <Logout className="h-5 w-5" /> Sign out
            </button>
          </div>
        </aside>

        {open && (
          <div className="fixed inset-0 z-30 bg-navy/30 sm:hidden" onClick={() => setOpen(false)} />
        )}

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
