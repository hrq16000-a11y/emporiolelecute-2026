// Queue of imported reviews without a confident product match.
// One-click "use suggestion" + mandatory decision reason, persisted on the audit row.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateReviewAudit, type ReviewAuditRow } from '@/hooks/useReviewImportAudit';
import { useDbProducts } from '@/hooks/useProducts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, Loader2, Inbox } from 'lucide-react';
import { toast } from 'sonner';

const THRESHOLD = 0.45;
const QUICK_REASONS = ['Foto confere', 'Nome do produto confere', 'Mesmo modelo, outra cor', 'Produto descontinuado'];

const useUnmatched = () =>
  useQuery({
    queryKey: ['review-import-audit', 'unmatched'],
    staleTime: 15_000,
    queryFn: async (): Promise<ReviewAuditRow[]> => {
      const { data, error } = await supabase
        .from('review_import_audit' as never)
        .select('*')
        .in('manual_status', ['pending', 'doubtful', 'no_match'])
        .is('imported_review_id', null)
        .is('manual_product_id', null)
        .or(`suggested_confidence.is.null,suggested_confidence.lt.${THRESHOLD}`)
        .order('suggested_confidence', { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as ReviewAuditRow[];
    },
  });

const ReviewUnmatchedQueue = () => {
  const { data, isLoading, error } = useUnmatched();

  if (isLoading)
    return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full" />)}</div>;
  if (error) return <p className="text-sm text-destructive">Não foi possível carregar a fila. Tente recarregar a página.</p>;
  if (!data?.length)
    return (
      <Card><CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
        <Inbox className="h-8 w-8" /> Nenhuma avaliação sem match para revisar.
      </CardContent></Card>
    );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{data.length} avaliação(ões) aguardando decisão.</p>
      {data.map((row) => <UnmatchedCard key={row.id} row={row} />)}
    </div>
  );
};

const UnmatchedCard = ({ row }: { row: ReviewAuditRow }) => {
  const update = useUpdateReviewAudit();
  const { data: products } = useDbProducts();
  const [reason, setReason] = useState('');
  const [otherId, setOtherId] = useState<string>('');
  const pct = row.suggested_confidence != null ? Math.round(Number(row.suggested_confidence) * 100) : null;

  const decide = async (productId: string | null, status: 'confirmed' | 'rejected') => {
    if (!reason.trim()) { toast.error('Informe o motivo da decisão.'); return; }
    try {
      await update.mutateAsync({
        id: row.id,
        manual_product_id: productId,
        manual_status: status,
        decision_reason: reason.trim(),
      });
      toast.success(status === 'confirmed' ? 'Produto vinculado.' : 'Marcada como sem produto.');
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
            <p className="font-medium break-words">{row.elo7_product_name ?? '(sem nome no Elo7)'}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">“{row.elo7_comment ?? ''}” — {row.elo7_buyer_name ?? 'anônimo'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Sugerido:</span>
            <span className="font-medium">{row.suggested_product_name ?? 'nenhum'}</span>
            {pct != null && <Badge variant="outline">{pct}% similar</Badge>}
          </div>
          <div className="space-y-2">
            <Input aria-label="Motivo da decisão" placeholder="Motivo da decisão (obrigatório)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex flex-wrap gap-1">
              {QUICK_REASONS.map((r) => (
                <Button key={r} type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setReason(r)}>{r}</Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <Button className="min-h-11" disabled={!row.suggested_product_id || update.isPending} onClick={() => decide(row.suggested_product_id, 'confirmed')}>
              {update.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Usar produto sugerido
            </Button>
            <div className="flex gap-2 flex-1 min-w-0">
              <Select value={otherId} onValueChange={setOtherId}>
                <SelectTrigger className="min-h-11"><SelectValue placeholder="Outro produto…" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {products?.map((p: { id: string; name: string }) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" className="min-h-11" disabled={!otherId || update.isPending} onClick={() => decide(otherId, 'confirmed')}>Vincular</Button>
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
