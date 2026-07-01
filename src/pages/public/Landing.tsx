import { Link } from "react-router-dom";
import { useDocumentTypes } from "../../hooks/useDocumentTypes";
import { APP_NAME, peso } from "../../lib/constants";
import type { SVGProps } from "react";
import {
  ShieldCheck, Truck, ChatBubble, MagnifyingGlass, ArrowRight,
  Document, Star, Banknotes,
} from "../../components/icons";

type IconType = (p: SVGProps<SVGSVGElement>) => React.ReactElement;

// Ad landing page (route "/"). Conversion-focused, mobile-first — the Facebook
// ad destination. Navy hero + amber CTA, block sections, SVG icons.
export function Landing() {
  const { docTypes } = useDocumentTypes();

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* nav */}
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <span className="flex items-center gap-2 font-display text-lg font-bold text-navy">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Document className="h-4 w-4" />
            </span>
            {APP_NAME}
          </span>
          <Link to="/track" className="flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-600">
            <MagnifyingGlass className="h-4 w-4" /> Track order
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.15]"
             style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #3b82f6 0, transparent 45%), radial-gradient(circle at 85% 30%, #f59e0b 0, transparent 40%)" }} />
        <div className="relative mx-auto max-w-3xl px-5 pb-14 pt-12 text-center sm:pt-16">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-brand-100">
            <Truck className="h-4 w-4" /> Nationwide delivery via J&amp;T
          </span>
          <h1 className="font-display text-4xl font-extrabold leading-[1.08] sm:text-5xl">
            PSA documents,<br />
            <span className="text-amber-400">delivered to your door.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Birth, Marriage, Death certificates &amp; CENOMAR — we process them with PSA and ship
            straight to you. Pay only when it arrives.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/order"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-7 py-3.5 text-base font-bold text-navy shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 sm:w-auto">
              Order Now
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link to="/track"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-white/10 sm:w-auto">
              Track my order
            </Link>
          </div>
        </div>
        {/* trust bar */}
        <div className="relative border-t border-white/10 bg-white/5">
          <div className="mx-auto grid max-w-3xl grid-cols-3 divide-x divide-white/10 px-5 py-4 text-center">
            {([
              [ShieldCheck, "Pay on delivery"],
              [ChatBubble, "SMS updates"],
              [MagnifyingGlass, "Self-service tracking"],
            ] as [IconType, string][]).map(([Icon, label], i) => {
              const I = Icon;
              return (
                <div key={i} className="flex flex-col items-center gap-1.5 px-2 text-xs font-medium text-slate-300">
                  <I className="h-5 w-5 text-brand-200" />
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* pricing */}
      <section className="mx-auto max-w-4xl px-5 py-14">
        <div className="mb-8 text-center">
          <h2 className="font-display text-2xl font-bold text-navy sm:text-3xl">Simple, all-in pricing</h2>
          <p className="mt-1.5 text-sm text-slate-500">Shipping included. No hidden fees.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {docTypes.map((d) => (
            <div key={d.id} className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-md">
              <div className="flex items-center gap-3.5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Document className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-semibold text-navy">{d.name}</div>
                  <div className="text-xs text-slate-400">all-in, shipping included</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-xl font-bold text-navy tnum">{peso(d.base_fee)}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-center gap-1.5 text-sm text-slate-500">
          <span className="flex text-amber-500">
            {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-4 w-4" />)}
          </span>
          Trusted by thousands of Filipino families
        </div>
      </section>

      {/* how it works */}
      <section className="border-y border-slate-100 bg-slate-50 py-14">
        <div className="mx-auto max-w-4xl px-5">
          <h2 className="mb-9 text-center font-display text-2xl font-bold text-navy sm:text-3xl">How it works</h2>
          <div className="grid gap-4 sm:grid-cols-4">
            {([
              [Document, "Order", "Fill the short form & verify your number"],
              [ShieldCheck, "We process", "We file your request with PSA"],
              [Truck, "J&T delivery", "Shipped straight to your address"],
              [Banknotes, "Pay on delivery", "Cash on delivery — nothing upfront"],
            ] as [IconType, string, string][]).map(([Icon, title, desc], i) => {
              const I = Icon;
              return (
                <div key={i} className="relative rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-white">
                      <I className="h-5 w-5" />
                    </span>
                    <span className="font-display text-2xl font-bold text-slate-200">{i + 1}</span>
                  </div>
                  <div className="font-semibold text-navy">{title}</div>
                  <div className="mt-0.5 text-sm text-slate-500">{desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* why us */}
      <section className="mx-auto max-w-4xl px-5 py-14">
        <div className="grid gap-3 sm:grid-cols-3">
          {([
            [ShieldCheck, "Zero risk", "COD means you only pay once the document is in your hands."],
            [ChatBubble, "Always in the loop", "Automatic SMS at every stage — no need to follow up."],
            [MagnifyingGlass, "Check anytime", "Track your order yourself with your order number."],
          ] as [IconType, string, string][]).map(([Icon, title, desc], i) => {
            const I = Icon;
            return (
              <div key={i} className="rounded-2xl border border-slate-200 p-5">
                <I className="h-6 w-6 text-brand-600" />
                <div className="mt-3 font-semibold text-navy">{title}</div>
                <div className="mt-1 text-sm leading-relaxed text-slate-500">{desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* final CTA */}
      <section className="px-5 pb-24 sm:pb-14">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-navy px-6 py-12 text-center text-white">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Ready to get your PSA document?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">Takes 2 minutes. Verify your number, and we handle the rest.</p>
          <Link to="/order"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-8 py-3.5 text-base font-bold text-navy transition hover:bg-amber-400">
            Order Now <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 px-5 py-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {APP_NAME}. Independent document processing service — not affiliated with PSA.
      </footer>

      {/* sticky mobile CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:hidden">
        <Link to="/order"
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-base font-bold text-navy">
          Order Now <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
