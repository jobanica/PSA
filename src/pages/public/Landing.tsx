import { Link } from "react-router-dom";
import { useDocumentTypes } from "../../hooks/useDocumentTypes";
import { APP_NAME, peso } from "../../lib/constants";
import type { SVGProps } from "react";
import {
  ShieldCheck, Truck, ChatBubble, MagnifyingGlass, ArrowRight, Bolt,
  Document, Star, Banknotes, Check, ChevronDown,
} from "../../components/icons";

type IconType = (p: SVGProps<SVGSVGElement>) => React.ReactElement;

const CTA_LABEL = "Order My PSA Document";

// TESTIMONIALS — section auto-hides while empty. Drop real ones in here, e.g.:
//   { quote: "Ang bilis, dumating agad sa bahay!", name: "Maria S.", location: "Davao City", stars: 5 },
// (Kept empty so no placeholder text goes live until the owner provides real quotes.)
const TESTIMONIALS: { quote: string; name: string; location: string; stars: number }[] = [];

// FAQ — items with an empty `answer` are hidden until the real copy is provided.
// TODO(owner): fill in turnaround time, coverage area, and corrections policy.
const FAQ: { q: string; a: string }[] = [
  {
    q: "Is this legit? How do I know I won't get scammed?",
    a: "You pay nothing upfront. We only get paid once your actual document is delivered to you — that's the whole point of COD. If we don't deliver, you don't pay.",
  },
  { q: "How long does it take?", a: "" },
  { q: "What areas do you deliver to?", a: "" },
  { q: "What if my document has errors or issues (late registration, corrections, etc.)?", a: "" },
];

// Ad landing page (route "/"). Conversion-focused, mobile-first — the Facebook
// ad destination. Copy: outcome + COD risk-reversal, pains mapped to benefits.
export function Landing() {
  const { docTypes } = useDocumentTypes();
  const faq = FAQ.filter((f) => f.a.trim());

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
            <Truck className="h-4 w-4" /> Delivered across Davao
          </span>
          <h1 className="font-display text-3xl font-extrabold leading-[1.1] sm:text-5xl">
            Get Your PSA Documents Delivered to Your Door.{" "}
            <span className="text-amber-400">Pay Only When It Arrives.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            No lines. No downpayment. No agents to chase. Order your birth certificate, marriage
            certificate, or CENOMAR online and pay cash when it's in your hands.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/order"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-7 py-3.5 text-base font-bold text-navy shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 sm:w-auto">
              {CTA_LABEL}
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

      {/* founder credibility (in place of unverified stats) */}
      <section className="border-b border-slate-100 bg-white">
        <p className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-5 py-4 text-center text-sm font-medium text-slate-600">
          <ShieldCheck className="h-4 w-4 text-brand-600" />
          Processed by a local Davao business — not an anonymous Facebook page.
        </p>
      </section>

      {/* problem */}
      <section className="mx-auto max-w-3xl px-5 py-14">
        <h2 className="text-center font-display text-2xl font-bold text-navy sm:text-3xl">
          Getting a PSA document shouldn't take a whole day off work.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
          You need a birth certificate for school enrollment. A marriage certificate for a visa
          application. A CENOMAR for your wedding. And the only way to get it is:
        </p>
        <ul className="mx-auto mt-6 flex max-w-xl flex-col gap-3">
          {[
            "Falling in line at the PSA office, sometimes for hours",
            "Trusting a stranger online who asks for full payment upfront",
            "Waiting weeks with zero updates on where your document even is",
          ].map((p, i) => (
            <li key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <span className="h-0.5 w-2.5 rounded bg-current" />
              </span>
              {p}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-base font-semibold text-navy">There had to be a better way.</p>
      </section>

      {/* solution / benefits */}
      <section className="border-y border-slate-100 bg-slate-50 py-14">
        <div className="mx-auto max-w-4xl px-5">
          <div className="mb-9 text-center">
            <h2 className="font-display text-2xl font-bold text-navy sm:text-3xl">
              Order online. We process it. You pay when it's delivered.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              [Banknotes, "No Downpayment, No Risk", "You don't pay a single peso until your document is in your hands. If it doesn't show up, you owe nothing."],
              [Bolt, "Skip the Line Completely", "Order from your phone in under 2 minutes. No queueing, no waiting room, no wasted half-day."],
              [Truck, "Delivered to Your Door", "Your PSA document arrives where you are — home, office, or wherever's convenient."],
              [MagnifyingGlass, "Track Your Order", "Know exactly what stage your request is in, instead of wondering if it got lost somewhere."],
            ] as [IconType, string, string][]).map(([Icon, title, desc], i) => {
              const I = Icon;
              return (
                <div key={i} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <I className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="font-semibold text-navy">{title}</div>
                    <div className="mt-1 text-sm leading-relaxed text-slate-500">{desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto max-w-4xl px-5 py-14">
        <h2 className="mb-9 text-center font-display text-2xl font-bold text-navy sm:text-3xl">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          {([
            [Document, "Choose Your Document", "Birth certificate, marriage certificate, CENOMAR, or other PSA records."],
            [ChatBubble, "Submit Your Details Online", "Fill out a simple form — no office visit needed."],
            [ShieldCheck, "We Process It", "We handle the request and keep you updated."],
            [Banknotes, "Pay When It Arrives", "Cash on delivery. Only pay once you have your document in hand."],
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
      </section>

      {/* pricing */}
      <section className="border-y border-slate-100 bg-slate-50 py-14">
        <div className="mx-auto max-w-4xl px-5">
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
                <div className="font-display text-xl font-bold text-navy tnum">{peso(d.base_fee)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* testimonials */}
      {TESTIMONIALS.length > 0 && (
        <section className="mx-auto max-w-4xl px-5 py-14">
          <div className="mb-9 text-center">
            <h2 className="font-display text-2xl font-bold text-navy sm:text-3xl">Loved by Filipino families</h2>
            <p className="mt-1.5 text-sm text-slate-500">Real orders, delivered nationwide.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <figure key={i} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex text-amber-500" aria-label={`${t.stars} out of 5 stars`}>
                  {Array.from({ length: t.stars }).map((_, s) => <Star key={s} className="h-4 w-4" />)}
                </div>
                <blockquote className="flex-1 text-sm leading-relaxed text-slate-700">“{t.quote}”</blockquote>
                <figcaption className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                    {t.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-navy">{t.name}</div>
                    <div className="text-xs text-slate-400">{t.location}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {faq.length > 0 && (
        <section className="border-t border-slate-100 bg-slate-50 py-14">
          <div className="mx-auto max-w-2xl px-5">
            <h2 className="mb-8 text-center font-display text-2xl font-bold text-navy sm:text-3xl">Frequently asked</h2>
            <div className="flex flex-col gap-3">
              {faq.map((f, i) => (
                <details key={i} className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 [&_summary]:cursor-pointer">
                  <summary className="flex items-center justify-between gap-3 font-semibold text-navy marker:content-none">
                    {f.q}
                    <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* final CTA */}
      <section className="px-5 pb-24 pt-14 sm:pb-14">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-navy px-6 py-12 text-center text-white">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            No downpayment. No lines. Just your document, delivered.
          </h2>
          <Link to="/order"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-8 py-3.5 text-base font-bold text-navy transition hover:bg-amber-400">
            {CTA_LABEL} Now <ArrowRight className="h-5 w-5" />
          </Link>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate-400">
            {["Pay on delivery", "SMS updates", "Track anytime"].map((x) => (
              <span key={x} className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-brand-300" /> {x}</span>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 px-5 py-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {APP_NAME}. Independent document processing service — not affiliated with PSA.
      </footer>

      {/* sticky mobile CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:hidden">
        <Link to="/order"
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-base font-bold text-navy">
          {CTA_LABEL} <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
