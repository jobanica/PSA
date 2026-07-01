import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Settings are stored as key/jsonb rows. This returns a plain object map.
export function useSettings() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("settings")
      .select("key, value")
      .then(({ data }) => {
        const map: Record<string, unknown> = {};
        (data ?? []).forEach((r) => (map[r.key] = r.value));
        setSettings(map);
        setLoading(false);
      });
  }, []);

  return { settings, loading };
}

export function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
