import type { BoostPreviewResult } from '@/lib/search-boost-preview';

interface PreviewProduct { id: string; name: string; images?: string[] | null }
const SearchBoostPreview = ({ result, products }: { result: BoostPreviewResult; products: PreviewProduct[] }) => (
  <section aria-label="Comparação dos resultados" className="space-y-4 border-t border-border pt-5">
    <h2 className="font-display text-xl">Impacto na busca agora</h2>
    <div className="grid gap-6 md:grid-cols-2">
      {(['before', 'after'] as const).map(side => <div key={side}>
        <h3 className="font-medium">{side === 'before' ? 'Publicado' : 'Com este ajuste'} · {result[side].total} resultados</h3>
        <ol className="mt-3 divide-y divide-border">
          {result[side].ids.map((id, index) => {
            const product = products.find(p => p.id === id);
            const previous = result.before.ids.indexOf(id);
            return <li key={id} className="flex min-h-16 items-center gap-3 py-3 text-sm">
              <span className="w-6 shrink-0 text-muted-foreground">{index + 1}.</span>
              {product?.images?.[0] && <img src={product.images[0]} alt="" className="h-12 w-12 shrink-0 rounded object-cover" loading="lazy" />}
              <span className="min-w-0 flex-1">{product?.name ?? id}</span>
              {side === 'after' && previous !== index && <span className="shrink-0 text-xs text-primary">{previous < 0 ? 'Novo no topo' : `${previous + 1} → ${index + 1}`}</span>}
            </li>;
          })}
        </ol>
        {!result[side].ids.length && <p className="py-4 text-sm text-muted-foreground">Nenhum resultado.</p>}
      </div>)}
    </div>
  </section>
);
export default SearchBoostPreview;