import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { APP_NAME } from "../../lib/constants";

const nav = [
  { to: "/staff", label: "Dashboard", end: true, icon: "▦" },
  { to: "/staff/orders", label: "Orders", icon: "▤" },
  { to: "/staff/new", label: "New Order", icon: "＋" },
  { to: "/staff/customers", label: "Customers", icon: "◍" },
  { to: "/staff/reports", label: "Reports", icon: "▲" },
  { to: "/staff/settings", label: "Settings", icon: "⚙" },
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
        <span className="font-bold text-indigo-700">{APP_NAME}</span>
        <button onClick={() => setOpen((o) => !o)} className="rounded p-2 text-slate-600" aria-label="Menu">
          ☰
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
          <div className="hidden px-5 py-4 sm:block">
            <span className="text-lg font-bold text-indigo-700">{APP_NAME}</span>
            <p className="text-xs text-slate-400">Operations</p>
          </div>
          <nav className="flex flex-col gap-1 p-3">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium " +
                  (isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100")
                }
              >
                <span className="w-4 text-center">{n.icon}</span>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="p-3">
            <button
              onClick={handleSignOut}
              className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              Sign out
            </button>
          </div>
        </aside>

        {open && (
          <div className="fixed inset-0 z-30 bg-black/20 sm:hidden" onClick={() => setOpen(false)} />
        )}

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
