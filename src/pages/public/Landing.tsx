import { Link } from "react-router-dom";
import { useDocumentTypes } from "../../hooks/useDocumentTypes";
import { useTestimonials } from "../../hooks/useTestimonials";
import { APP_NAME, peso } from "../../lib/constants";
import type { SVGProps } from "react";
import {
  ShieldCheck, Truck, ChatBubble, MagnifyingGlass, ArrowRight, Bolt,
  Document, Star, Banknotes, Check, ChevronDown,
} from "../../components/icons";
import { VideoTestimonials } from "../../components/VideoTestimonials";

type IconType = (p: SVGProps<SVGSVGElement>) => React.ReactElement;
const CTA_LABEL = "Order My PSA Document";

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

// Ad landing page (route "/"). Clean, blue-on-white professional layout inspired
// by psahelpline.ph, adapted to DocuassistPH's honest COD positioning.
export function Landing() {
  const { docTypes } = useDocumentTypes();
  const { testimonials } = useTestimonials();
  const faq = FAQ.filter((f) => f.a.trim());
  const videoT = testimonials.filter((t) => t.kind === "youtube" || t.kind === "file");
  const textT = testimonials.filter((t) => t.kind === "text");
  const hasTestimonials = testimonials.length > 0;

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* nav */}
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <span className="flex items-center gap-2 font-display text-lg font-bold text-navy">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Document className="h-4 w-4" />
            </span>
            {APP_NAME}
          </span>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#documents" className="hover:text-brand-700">Documents</a>
            <a href="#how" className="hover:text-brand-700">How it works</a>
            <a href="#faq" className="hover:text-brand-700">FAQ</a>
            <Link to="/track" className="hover:text-brand-700">Track order</Link>
          </nav>
          <Link to="/order" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
            Order Now
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700">
              <ShieldCheck className="h-4 w-4" /> Trusted document delivery across Davao
            </span>
            <h1 className="font-display text-4xl font-extrabold leading-[1.1] text-navy sm:text-5xl">
              Get Your PSA Documents Delivered to Your Door.{" "}
              <span className="text-brand-600">Pay Only When It Arrives.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              No lines. No downpayment. No agents to chase. Order your birth certificate, marriage
              certificate, or CENOMAR online and pay cash when it's in your hands.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/order"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700">
                {CTA_LABEL}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link to="/track"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700">
                Check Status
              </Link>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <ShieldCheck className="h-4 w-4 text-brand-600" />
              Processed by a local Davao business — not an anonymous Facebook page.
            </p>
          </div>

          {/* hero visual: a mini "tracker" card, echoing the reference's card feel */}
          <div className="relative hidden lg:block">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-brand-600/5">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display font-bold text-navy">Order ORD-2026-0042</span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">On the way</span>
              </div>
              <ol className="flex flex-col gap-3">
                {[
                  ["Order placed", true],
                  ["Submitted to PSA", true],
                  ["Released", true],
                  ["Out for delivery via J&T", false],
                ].map(([label, done], i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className={"flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold " + (done ? "bg-emerald-500 text-white" : "bg-brand-600 text-white ring-4 ring-brand-100")}>
                      {done ? "✓" : i + 1}
                    </span>
                    <span className={done ? "text-slate-700" : "font-semibold text-brand-700"}>{label}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-5 rounded-xl bg-brand-50 p-3 text-center text-sm font-medium text-brand-700">
                Pay ₱685 cash on delivery
              </div>
            </div>
          </div>
        </div>

        {/* trust strip */}
        <div className="border-t border-slate-100 bg-white">
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 px-5 py-6 sm:grid-cols-4">
            {([
              [ShieldCheck, "Pay on delivery"],
              [ChatBubble, "SMS updates"],
              [MagnifyingGlass, "Track anytime"],
              [Truck, "Nationwide via J&T"],
            ] as [IconType, string][]).map(([Icon, label], i) => (
              <div key={i} className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600">
                <Icon className="h-5 w-5 text-brand-600" /> {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* available documents */}
      <section id="documents" className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-9 text-center">
          <h2 className="font-display text-2xl font-bold text-navy sm:text-3xl">Available PSA documents</h2>
          <p className="mt-1.5 text-sm text-slate-500">All-in pricing — service fee and nationwide delivery included.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {docTypes.map((d) => (
            <div key={d.id} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Document className="h-6 w-6" />
              </span>
              <div className="mt-4 font-semibold text-navy">{d.name}</div>
              <div className="mt-1 font-display text-2xl font-bold text-brand-600 tnum">{peso(d.base_fee)}</div>
              <div className="text-xs text-slate-400">all-in, delivered</div>
              <Link to="/order" className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-white py-2 text-sm font-semibold text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white">
                Order <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* problem → framed briefly, then benefits (adapted from the copy) */}
      <section className="border-y border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-5xl px-5">
          <div className="mb-9 text-center">
            <h2 className="font-display text-2xl font-bold text-navy sm:text-3xl">
              Order online. We process it. You pay when it's delivered.
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
              Getting a PSA document shouldn't take a whole day off work — or a risky upfront payment to a stranger.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {([
              [Banknotes, "No Downpayment, No Risk", "You don't pay a peso until your document is in your hands. If it doesn't show up, you owe nothing."],
              [Bolt, "Skip the Line Completely", "Order from your phone in under 2 minutes. No queueing, no waiting room, no wasted half-day."],
              [Truck, "Delivered to Your Door", "Your PSA document arrives where you are — home, office, or wherever's convenient."],
              [MagnifyingGlass, "Track Your Order", "Know exactly what stage your request is in, instead of wondering if it got lost."],
            ] as [IconType, string, string][]).map(([Icon, title, desc], i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="mt-3 font-semibold text-navy">{title}</div>
                <div className="mt-1 text-sm leading-relaxed text-slate-500">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* how it works — 3 easy steps */}
      <section id="how" className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="mb-10 text-center font-display text-2xl font-bold text-navy sm:text-3xl">How it works</h2>
        <div className="grid gap-6 sm:grid-cols-4">
          {([
            [Document, "Choose Your Document", "Birth, marriage, death certificate, or CENOMAR."],
            [ChatBubble, "Submit Your Details", "Fill out a simple form online — no office visit needed."],
            [ShieldCheck, "We Process It", "We file the request with PSA and keep you updated by SMS."],
            [Banknotes, "Pay When It Arrives", "Cash on delivery. Only pay once you have it in hand."],
          ] as [IconType, string, string][]).map(([Icon, title, desc], i) => (
            <div key={i} className="relative text-center">
              {i < 3 && <span className="absolute left-1/2 top-7 hidden h-0.5 w-full bg-brand-100 sm:block" />}
              <span className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
                <Icon className="h-6 w-6" />
              </span>
              <div className="mt-4 font-semibold text-navy">{i + 1}. {title}</div>
              <div className="mt-1 text-sm text-slate-500">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* trust / we verify */}
      <section className="bg-navy py-16 text-white">
        <div className="mx-auto max-w-5xl px-5">
          <div className="mb-9 text-center">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Your trusted document channel</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-300">
              We handle your request end-to-end and keep you in the loop at every step.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {([
              [ShieldCheck, "Zero-risk COD", "You only pay once the document is physically delivered to you."],
              [ChatBubble, "Updated every step", "Automatic SMS from processing to out-for-delivery."],
              [MagnifyingGlass, "Real-time tracking", "Check your order status anytime with your order number."],
            ] as [IconType, string, string][]).map(([Icon, title, desc], i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <Icon className="h-6 w-6 text-brand-300" />
                <div className="mt-3 font-semibold">{title}</div>
                <div className="mt-1 text-sm leading-relaxed text-slate-300">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* testimonials (admin-managed) */}
      {hasTestimonials && (
        <section className="mx-auto max-w-5xl px-5 py-16">
          <div className="mb-9 text-center">
            <h2 className="font-display text-2xl font-bold text-navy sm:text-3xl">Loved by Filipino families</h2>
            <p className="mt-1.5 text-sm text-slate-500">Real customers, delivered across Davao.</p>
          </div>
          {videoT.length > 0 && (
            <div className="mb-4">
              <VideoTestimonials items={videoT} />
            </div>
          )}
          {textT.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
              {textT.map((t) => (
                <figure key={t.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex text-amber-500" aria-label={`${t.stars} out of 5 stars`}>
                    {Array.from({ length: t.stars }).map((_, s) => <Star key={s} className="h-4 w-4" />)}
                  </div>
                  <blockquote className="flex-1 text-sm leading-relaxed text-slate-700">“{t.quote}”</blockquote>
                  <figcaption className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                      {t.author_name.trim().charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-navy">{t.author_name}</div>
                      {t.location && <div className="text-xs text-slate-400">{t.location}</div>}
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      )}

      {/* FAQ */}
      {faq.length > 0 && (
        <section id="faq" className="border-t border-slate-100 bg-slate-50 py-16">
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
      <section className="px-5 pb-24 pt-16 sm:pb-16">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-brand-600 px-6 py-12 text-center text-white">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            No downpayment. No lines. Just your document, delivered.
          </h2>
          <Link to="/order"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-brand-700 transition hover:bg-brand-50">
            {CTA_LABEL} Now <ArrowRight className="h-5 w-5" />
          </Link>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-brand-100">
            {["Pay on delivery", "SMS updates", "Track anytime"].map((x) => (
              <span key={x} className="flex items-center gap-1"><Check className="h-3.5 w-3.5" /> {x}</span>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-white px-5 py-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {APP_NAME}. Independent document processing service — not affiliated with the Philippine Statistics Authority (PSA).
      </footer>

      {/* sticky mobile CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden">
        <Link to="/order"
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-base font-bold text-white">
          {CTA_LABEL} <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
