import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  // Surfaced in the console during setup so misconfiguration is obvious.
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. See .env.example.",
  );
}

export const supabase = createClient(url, anonKey);

// Base URL for calling Edge Functions from the browser.
export const functionsUrl = `${url}/functions/v1`;
