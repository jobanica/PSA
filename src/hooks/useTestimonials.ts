import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Testimonial } from "../lib/types";

// Public: fetch active testimonials (anon read via RLS) for the landing page.
export function useTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("testimonials")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setTestimonials((data as Testimonial[]) ?? []);
        setLoading(false);
      });
  }, []);

  return { testimonials, loading };
}
