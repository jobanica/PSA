import { Link } from "react-router-dom";
import { useDocumentTypes } from "../../hooks/useDocumentTypes";
import { APP_NAME, peso } from "../../lib/constants";

// Ad landing page (route "/"). Conversion-focused, mobile-first — this is the
// Facebook ad destination.
export function Landing() {
  const { docTypes } = useDocumentTypes();

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* nav */}
      <header className="flex items-center justify-between px-5 py-4">
        <span className="text-lg font-bold text-indigo-700">{APP_NAME}</span>
        <Link to="/track" className="text-sm font-medium text-indigo-700">Track my order →</Link>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-2xl px-5 pb-8 pt-6 text-center">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
          Fast PSA documents, delivered nationwide.
        </h1>
        <p className="mt-3 text-slate-500">
          Birth, Marriage, Death certificates & CENOMAR — processed with PSA and shipped to your door via J&amp;T.
          Pay only when it arrives.
        </p>
        <Link
          to="/order"
          className="mt-6 inline-block rounded-xl bg-indigo-600 px-8 py-3.5 text-lg font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          Order Now
        </Link>
        <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-slate-400">
          <span>✓ COD — pay on delivery</span>
          <span>✓ SMS updates</span>
          <span>✓ Self-service tracking</span>
        </div>
      </section>

      {/* pricing */}
      <section className="mx-auto max-w-2xl px-5 py-6">
        <h2 className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-slate-400">
          Documents & prices
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {docTypes.map((d) => (
            <div key={d.id} className="rounded-xl border border-slate-200 p-4 text-center">
              <div className="text-sm font-medium">{d.name}</div>
              <div className="mt-1 text-lg font-bold text-indigo-700">{peso(d.base_fee)}</div>
              <div className="text-xs text-slate-400">all-in, shipping included</div>
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto max-w-2xl px-5 py-6">
        <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-slate-400">
          How it works
        </h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ["1", "Order", "Fill the short form & verify your number"],
            ["2", "We process", "We file your request with PSA"],
            ["3", "J&T delivery", "Shipped to your address"],
            ["4", "Pay on delivery", "Cash on delivery, no upfront payment"],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-xl bg-slate-50 p-4 text-center">
              <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
                {n}
              </div>
              <div className="text-sm font-semibold">{t}</div>
              <div className="text-xs text-slate-500">{d}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-8 text-center">
        <Link
          to="/order"
          className="inline-block rounded-xl bg-indigo-600 px-8 py-3.5 text-lg font-semibold text-white hover:bg-indigo-700"
        >
          Order Now
        </Link>
      </section>

      <footer className="border-t border-slate-100 px-5 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {APP_NAME}. Independent document processing service — not affiliated with PSA.
      </footer>
    </div>
  );
}
