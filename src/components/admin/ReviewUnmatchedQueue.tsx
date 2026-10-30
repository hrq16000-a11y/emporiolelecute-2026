// Audit screen for Elo7 reviews not yet imported: shows the Elo7 name, why it
// didn't match, and the top catalog suggestions for one-click manual approval.
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateReviewAudit, type ReviewAuditRow } from '@/hooks/useReviewImportAudit';
import { useDbProducts } from '@/hooks/useProducts';
import { findBestMatches, type MatchResult } from '@/lib/fuzzyMatch';
import { matchClassFor, matchClassReason } from '@/lib/reviewAuditSummary';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, Loader2, Inbox } from 'lucide-react';
import { toast } from 'sonner';

const THRESHOLD = 0.45;
const PAGE_SIZE = 20;
const QUICK_REASONS = ['Foto confere', 'Nome do produto confere', 'Mesmo modelo, outra cor', 'Produto descontinuado'];

interface ProductLite { id: string; name: string }

const useNotImported = () =>
  useQuery({
    queryKey: ['review-import-audit', 'not-imported'],
    staleTime: 15_000,
    queryFn: async (): Promise<ReviewAuditRow[]> => {
      const { data, error } = await supabase
        .from('review_import_audit' as never)
        .select('*')
        .in('manual_status', ['pending', 'doubtful', 'no_match'])
        .is('imported_review_id', null)
        .is('manual_product_id', null)
        .order('elo7_review_date', { ascending: false, nullsFirst: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as unknown as ReviewAuditRow[];
    },
  });

/** Human reason why the review has no confident product match. */
export const noMatchReason = (best: MatchResult<ProductLite> | undefined): string => {
  if (!best) return 'Nenhum produto do catálogo tem palavras em comum com o nome do Elo7';
  const s = best.explanation.score;
  const base = matchClassReason(matchClassFor(s, THRESHOLD), s, THRESHOLD);
  const missing = best.explanation.missingTokens.slice(0, 5);
  return missing.length ? `${base} · sem correspondência para: ${missing.join(', ')}` : base;
};

const ReviewUnmatchedQueue = () => {
  const { data, isLoading, error } = useNotImported();
  const { data: products } = useDbProducts();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const candidates = useMemo(
    () => ((products ?? []) as ProductLite[]).map((p) => ({ item: { id: p.id, name: p.name }, label: p.name })),
    [products],
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (data ?? []).filter((r) =>
      !s || r.elo7_product_name?.toLowerCase().includes(s) || r.elo7_comment?.toLowerCase().includes(s) || r.elo7_buyer_name?.toLowerCase().includes(s),
    );
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (isLoading)
    return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 w-full" />)}</div>;
  if (error) return <p className="text-sm text-destructive">Não foi possível carregar a auditoria. Tente recarregar a página.</p>;
  if (!data?.length)
    return (
      <Card><CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
        <Inbox className="h-8 w-8" /> Todas as avaliações do Elo7 já foram revisadas.
      </CardContent></Card>
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-center gap-2 justify-between">
        <p className="text-sm text-muted-foreground"><strong className="text-foreground">{data.length}</strong> avaliações do Elo7 não importadas aguardando aprovação.</p>
        <Input className="md:max-w-xs" placeholder="Buscar nome Elo7, cliente, comentário…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
      </div>
      {pageRows.map((row) => <AuditCard key={row.id} row={row} candidates={candidates} products={(products ?? []) as ProductLite[]} />)}
      <div className="flex items-center justify-between pt-2">
        <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
        </div>
      </div>
    </div>
  );
};

const AuditCard = ({ row, candidates, products }: {
  row: ReviewAuditRow;
  candidates: { item: ProductLite; label: string }[];
  products: ProductLite[];
}) => {
  const update = useUpdateReviewAudit();
  const [reason, setReason] = useState('');
  const [otherId, setOtherId] = useState('');

  const suggestions = useMemo(
    () => findBestMatches(row.elo7_product_name ?? '', candidates, { threshold: 0.05, limit: 3 }),
    [row.elo7_product_name, candidates],
  );

  const decide = async (productId: string | null, status: 'confirmed' | 'rejected', label?: string) => {
    if (!reason.trim()) { toast.error('Informe o motivo da decisão antes de aprovar.'); return; }
    try {
      await update.mutateAsync({
        id: row.id,
        manual_product_id: productId,
        manual_status: status,
        decision_reason: reason.trim(),
        ...(label ? { suggested_product_id: productId, suggested_product_name: label } : {}),
      });
      toast.success(status === 'confirmed' ? `Aprovada para "${label ?? 'produto escolhido'}".` : 'Marcada como sem produto.');
    } catch (e) {
      toast.error('Erro ao salvar decisão', { description: (e as Error).message });
    }
  };

  return (
    <Card>
      <CardContent className="p-4 grid gap-4 md:grid-cols-[96px_1fr]">
        {row.elo7_image_url ? (
          <img src={row.elo7_image_url} alt="" loading="lazy" className="w-24 h-24 rounded-md object-cover bg-muted" />
        ) : <div className="w-24 h-24 rounded-md bg-muted" />}
        <div className="space-y-3 min-w-0">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Nome no Elo7</p>
            <p className="font-medium break-words">{row.elo7_product_name ?? '(sem nome)'}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">“{row.elo7_comment ?? ''}” — {row.elo7_buyer_name ?? 'anônimo'}</p>
          </div>
          <p className="text-sm rounded-md bg-muted px-3 py-2"><strong>Motivo do não match:</strong> {noMatchReason(suggestions[0])}</p>

          <Input aria-label="Motivo da decisão" placeholder="Motivo da decisão (obrigatório)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex flex-wrap gap-1">
            {QUICK_REASONS.map((r) => (
              <Button key={r} type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setReason(r)}>{r}</Button>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Produtos mais parecidos</p>
            {suggestions.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma sugestão — escolha manualmente abaixo.</p>}
            {suggestions.map((s) => (
              <div key={s.item.id} className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between border rounded-md p-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium break-words">{s.label} <Badge variant="outline" className="ml-1">{Math.round(s.explanation.score * 100)}%</Badge></p>
                  <p className="text-xs text-muted-foreground">{s.explanation.reason}</p>
                </div>
                <Button size="sm" className="min-h-11 shrink-0" disabled={update.isPending} onClick={() => decide(s.item.id, 'confirmed', s.label)}>
                  {update.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />} Aprovar
                </Button>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2 flex-1 min-w-0">
              <Select value={otherId} onValueChange={setOtherId}>
                <SelectTrigger className="min-h-11"><SelectValue placeholder="Outro produto…" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" className="min-h-11" disabled={!otherId || update.isPending}
                onClick={() => decide(otherId, 'confirmed', products.find((p) => p.id === otherId)?.name)}>Vincular</Button>
            </div>
            <Button variant="ghost" className="min-h-11" disabled={update.isPending} onClick={() => decide(null, 'rejected')}>
              <X className="h-4 w-4 mr-2" /> Sem produto
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewUnmatchedQueue;
