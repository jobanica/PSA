import { useState } from "react";
import { Play, Star } from "./icons";
import type { Testimonial } from "../lib/types";

// Renders video testimonials (kind 'youtube' | 'file') from the DB as vertical
// phone-clip cards. The heavy player only loads after the user taps play (perf).
export function VideoTestimonials({ items }: { items: Testimonial[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((t) => (
        <VideoCard key={t.id} t={t} />
      ))}
    </div>
  );
}

function VideoCard({ t }: { t: Testimonial }) {
  const [playing, setPlaying] = useState(false);
  const poster =
    t.kind === "youtube" && t.youtube_id
      ? `https://i.ytimg.com/vi/${t.youtube_id}/hqdefault.jpg`
      : t.poster_url ?? "";

  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[9/16] bg-navy">
        {!playing ? (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play video testimonial from ${t.author_name}`}
            className="group absolute inset-0 h-full w-full"
          >
            {poster ? (
              <img src={poster} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-navy text-white/40">Video</span>
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent" />
            <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy shadow-lg transition group-hover:scale-105 group-hover:bg-white">
              <Play className="ml-1 h-7 w-7" />
            </span>
          </button>
        ) : t.kind === "youtube" ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${t.youtube_id}?autoplay=1&rel=0&modestbranding=1`}
            title={`Video testimonial from ${t.author_name}`}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            className="absolute inset-0 h-full w-full bg-black object-contain"
            src={t.video_url ?? ""}
            poster={t.poster_url ?? undefined}
            controls
            autoPlay
            playsInline
          />
        )}
      </div>
      <figcaption className="flex items-center justify-between gap-2 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-navy">{t.author_name}</div>
          {t.location && <div className="text-xs text-slate-400">{t.location}</div>}
        </div>
        {t.stars ? (
          <div className="flex text-amber-500" aria-label={`${t.stars} out of 5 stars`}>
            {Array.from({ length: t.stars }).map((_, s) => <Star key={s} className="h-3.5 w-3.5" />)}
          </div>
        ) : null}
      </figcaption>
    </figure>
  );
}
