import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { DocumentType } from "../lib/types";

export function useDocumentTypes(activeOnly = true) {
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = supabase.from("document_types").select("*").order("sort_order");
    if (activeOnly) q = q.eq("active", true);
    q.then(({ data }) => {
      setDocTypes(data ?? []);
      setLoading(false);
    });
  }, [activeOnly]);

  return { docTypes, loading };
}

// Which detail fields to show for a given document type, keyed by name substring.
export function fieldsForDocType(name: string): {
  showParents: boolean;
  showSpouse: boolean;
  eventLabel: string;
} {
  const n = name.toLowerCase();
  if (n.includes("birth") || n.includes("cenomar") || n.includes("nor")) {
    return { showParents: true, showSpouse: false, eventLabel: "Date of birth" };
  }
  if (n.includes("marriage")) {
    return { showParents: false, showSpouse: true, eventLabel: "Date of marriage" };
  }
  if (n.includes("death")) {
    return { showParents: false, showSpouse: false, eventLabel: "Date of death" };
  }
  return { showParents: true, showSpouse: false, eventLabel: "Date of event" };
}
