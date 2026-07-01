import { useState } from "react";
import { Play, Star } from "./icons";

// A video testimonial is either a YouTube video (by id) or a self-hosted file
// (mp4/webm URL + a poster image). Both render as a vertical phone-clip card
// that only loads the heavy player after the user taps play (perf: lazy).
export type VideoTestimonial =
  | { type: "youtube"; id: string; name: string; location?: string; stars?: number }
  | { type: "file"; src: string; poster: string; name: string; location?: string; stars?: number };

export function VideoTestimonials({ items }: { items: VideoTestimonial[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((v, i) => (
        <VideoCard key={i} v={v} />
      ))}
    </div>
  );
}

function VideoCard({ v }: { v: VideoTestimonial }) {
  const [playing, setPlaying] = useState(false);
  const poster =
    v.type === "youtube" ? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg` : v.poster;

  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="relative aspect-[9/16] bg-navy">
        {!playing ? (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play video testimonial from ${v.name}`}
            className="group absolute inset-0 h-full w-full"
          >
            <img
              src={poster}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent" />
            <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy shadow-lg transition group-hover:scale-105 group-hover:bg-white">
              <Play className="ml-1 h-7 w-7" />
            </span>
          </button>
        ) : v.type === "youtube" ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&modestbranding=1`}
            title={`Video testimonial from ${v.name}`}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            className="absolute inset-0 h-full w-full bg-black object-contain"
            src={v.src}
            poster={v.poster}
            controls
            autoPlay
            playsInline
          />
        )}
      </div>
      <figcaption className="flex items-center justify-between gap-2 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-navy">{v.name}</div>
          {v.location && <div className="text-xs text-slate-400">{v.location}</div>}
        </div>
        {v.stars ? (
          <div className="flex text-amber-500" aria-label={`${v.stars} out of 5 stars`}>
            {Array.from({ length: v.stars }).map((_, s) => <Star key={s} className="h-3.5 w-3.5" />)}
          </div>
        ) : null}
      </figcaption>
    </figure>
  );
}
