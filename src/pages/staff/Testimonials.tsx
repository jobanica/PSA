import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Testimonial } from "../../lib/types";
import { useToast } from "../../context/ToastContext";
import { Star, Play, Plus } from "../../components/icons";

type Kind = "text" | "youtube" | "file";

// Extract a YouTube video id from a full URL or accept a bare id.
function ytId(input: string): string {
  const s = input.trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : s;
}

export function Testimonials() {
  const toast = useToast();
  const [rows, setRows] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("testimonials")
      .select("*")
      .order("sort_order")
      .order("created_at", { ascending: false });
    setRows((data as Testimonial[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(t: Testimonial) {
    const { error } = await supabase.from("testimonials").update({ active: !t.active }).eq("id", t.id);
    if (error) toast(error.message, "error");
    else load();
  }
  async function move(t: Testimonial, dir: -1 | 1) {
    const { error } = await supabase.from("testimonials").update({ sort_order: t.sort_order + dir }).eq("id", t.id);
    if (error) toast(error.message, "error");
    else load();
  }
  async function remove(t: Testimonial) {
    if (!confirm(`Delete testimonial from ${t.author_name}?`)) return;
    const { error } = await supabase.from("testimonials").delete().eq("id", t.id);
    if (error) toast(error.message, "error");
    else { toast("Deleted"); load(); }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Testimonials</h1>
          <p className="text-sm text-slate-500">These appear on the public landing page. Only active ones show.</p>
        </div>
        <button onClick={() => setAdding((a) => !a)} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {adding && <AddForm onDone={() => { setAdding(false); load(); }} />}

      {loading ? (
        <div className="text-slate-400">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-400">
          No testimonials yet. Add your first one — the section stays hidden on the landing page until you do.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((t) => (
            <div key={t.id} className={"flex items-start gap-3 rounded-2xl border bg-white p-4 " + (t.active ? "border-slate-200" : "border-slate-200 opacity-60")}>
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                {t.kind === "text" ? <Star className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-navy">{t.author_name}</span>
                  {t.location && <span className="text-xs text-slate-400">· {t.location}</span>}
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500">{t.kind}</span>
                </div>
                {t.kind === "text" ? (
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">“{t.quote}”</p>
                ) : (
                  <p className="mt-0.5 truncate text-xs text-slate-400">{t.kind === "youtube" ? `youtube: ${t.youtube_id}` : t.video_url}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => move(t, -1)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100" title="Move up">↑</button>
                <button onClick={() => move(t, 1)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100" title="Move down">↓</button>
                <button onClick={() => toggleActive(t)} className={"rounded px-2 py-1 text-xs font-medium " + (t.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                  {t.active ? "Active" : "Hidden"}
                </button>
                <button onClick={() => remove(t)} className="rounded p-1.5 text-red-500 hover:bg-red-50" title="Delete">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddForm({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [kind, setKind] = useState<Kind>("text");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ author_name: "", location: "", stars: 5, quote: "", youtube: "" });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);

  async function uploadToBucket(file: File): Promise<string> {
    const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("testimonials").upload(path, file, { upsert: false });
    if (error) throw new Error(error.message);
    return supabase.storage.from("testimonials").getPublicUrl(path).data.publicUrl;
  }

  async function save() {
    if (!f.author_name.trim()) return toast("Name is required", "error");
    setBusy(true);
    try {
      const row: Partial<Testimonial> = {
        kind, author_name: f.author_name, location: f.location || null, stars: f.stars, active: true,
      };
      if (kind === "text") {
        if (!f.quote.trim()) throw new Error("Quote is required");
        row.quote = f.quote;
      } else if (kind === "youtube") {
        if (!f.youtube.trim()) throw new Error("YouTube link/ID is required");
        row.youtube_id = ytId(f.youtube);
      } else {
        if (!videoFile) throw new Error("Choose a video file");
        row.video_url = await uploadToBucket(videoFile);
        if (posterFile) row.poster_url = await uploadToBucket(posterFile);
      }
      const { error } = await supabase.from("testimonials").insert(row);
      if (error) throw new Error(error.message);
      toast("Testimonial added");
      onDone();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex gap-2">
        {(["text", "youtube", "file"] as Kind[]).map((k) => (
          <button key={k} onClick={() => setKind(k)}
            className={"rounded-lg px-3 py-1.5 text-sm font-medium capitalize " + (kind === k ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600")}>
            {k === "file" ? "Upload video" : k}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Name *</span>
          <input value={f.author_name} onChange={(e) => setF({ ...f, author_name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Maria S." />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Location</span>
          <input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Davao City" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Stars</span>
          <select value={f.stars} onChange={(e) => setF({ ...f, stars: Number(e.target.value) })} className="w-full rounded-lg border border-slate-300 px-3 py-2">
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      {kind === "text" && (
        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-slate-600">Quote *</span>
          <textarea value={f.quote} onChange={(e) => setF({ ...f, quote: e.target.value })} rows={3} className="w-full rounded-lg border border-slate-300 p-2" placeholder="Ang bilis, dumating agad sa bahay!" />
        </label>
      )}
      {kind === "youtube" && (
        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-slate-600">YouTube link or video ID *</span>
          <input value={f.youtube} onChange={(e) => setF({ ...f, youtube: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="https://youtube.com/watch?v=..." />
        </label>
      )}
      {kind === "file" && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Video file (mp4) *</span>
            <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Poster image (optional)</span>
            <input type="file" accept="image/*" onChange={(e) => setPosterFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
          </label>
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onDone} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
        <button onClick={save} disabled={busy} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
