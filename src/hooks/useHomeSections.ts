import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface HomeSection {
  id: string;
  section_key: string;
  component_name: string;
  label: string;
  description: string | null;
  is_visible: boolean;
  position: number;
  editable_props: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HomeSectionAuditEntry {
  id: string;
  section_key: string;
  action: "visibility_changed" | "reordered" | "edited" | "created" | "deleted";
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  changed_by: string | null;
  changed_by_email: string | null;
  created_at: string;
}

const QK = {
  public: ["home_sections", "public"] as const,
  admin: ["home_sections", "admin"] as const,
  audit: ["home_sections", "audit"] as const,
};

/** Seções visíveis, ordenadas — usado na home pública */
export const useHomeSectionsPublic = () =>
  useQuery({
    queryKey: QK.public,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_sections")
        .select("*")
        .eq("is_visible", true)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as HomeSection[];
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

/** Todas as seções (admin) */
export const useAdminHomeSections = () =>
  useQuery({
    queryKey: QK.admin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_sections")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as HomeSection[];
    },
  });

export const useUpdateHomeSection = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (patch: Partial<HomeSection> & { id: string }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase
        .from("home_sections")
        .update(rest as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.public });
      qc.invalidateQueries({ queryKey: QK.admin });
      qc.invalidateQueries({ queryKey: QK.audit });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });
};

/** Persiste novas posições em lote (uma chamada por seção alterada) */
export const useReorderHomeSections = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // posições 10, 20, 30… (mantém folga para inserts futuros)
      const updates = orderedIds.map((id, idx) =>
        supabase
          .from("home_sections")
          .update({ position: (idx + 1) * 10 } as never)
          .eq("id", id)
      );
      const results = await Promise.all(updates);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.public });
      qc.invalidateQueries({ queryKey: QK.admin });
      qc.invalidateQueries({ queryKey: QK.audit });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao reordenar", description: e.message, variant: "destructive" }),
  });
};

export const useHomeSectionAudit = (sectionKey?: string) =>
  useQuery({
    queryKey: [...QK.audit, sectionKey ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("home_section_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (sectionKey) q = q.eq("section_key", sectionKey);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as HomeSectionAuditEntry[];
    },
  });
