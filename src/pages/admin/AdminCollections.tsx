import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Eye, EyeOff, Home, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Collection } from "@/hooks/useCollections";

export default function AdminCollections() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: async (): Promise<Collection[]> => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, collection_products(product_id)")
        .order("position", { ascending: true });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((r: any) => ({
        ...r,
        product_count: Array.isArray(r.collection_products) ? r.collection_products.length : 0,
      })) as Collection[];
    },
  });

  const toggleField = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: "is_active" | "show_on_home"; value: boolean }) => {
      const { error } = await supabase.from("collections").update({ [field]: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-collections"] }),
    onError: (e: Error) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
  });

  const removeCol = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-collections"] });
      toast({ title: "Coleção removida" });
    },
    onError: (e: Error) => toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-semibold">Coleções curadas</h1>
          <p className="text-sm text-muted-foreground">Agrupe produtos em coleções editoriais para vitrines e campanhas.</p>
        </div>
        <Button asChild>
          <Link to="/admin/colecoes/nova"><Plus className="h-4 w-4 mr-2" />Nova coleção</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma coleção criada. Comece pela primeira!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base font-display flex items-center gap-2 flex-wrap">
                      {c.name}
                      <Badge variant="secondary" className="text-[10px]">/{c.slug}</Badge>
                      {!c.is_active && <Badge variant="outline" className="text-[10px]">Rascunho</Badge>}
                      {c.show_on_home && <Badge className="text-[10px]"><Home className="h-3 w-3 mr-1" />Home</Badge>}
                    </CardTitle>
                    {c.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {c.product_count ?? 0} produto{(c.product_count ?? 0) === 1 ? "" : "s"} • posição {c.position}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/admin/colecoes/${c.id}`}><Edit className="h-4 w-4" /></Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover coleção?</AlertDialogTitle>
                          <AlertDialogDescription>
                            A coleção "{c.name}" será removida. Os produtos não são apagados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeCol.mutate(c.id)}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex items-center gap-6 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={c.is_active}
                    onCheckedChange={(v) => toggleField.mutate({ id: c.id, field: "is_active", value: v })}
                  />
                  {c.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  <span className="text-muted-foreground">Ativa</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={c.show_on_home}
                    onCheckedChange={(v) => toggleField.mutate({ id: c.id, field: "show_on_home", value: v })}
                  />
                  <Home className="h-3.5 w-3.5" />
                  <span className="text-muted-foreground">Exibir na home</span>
                </label>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
