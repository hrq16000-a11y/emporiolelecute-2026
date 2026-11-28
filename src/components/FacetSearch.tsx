import { useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { normalizeSearchText } from "@/lib/searchText";

interface FacetSearchProps<T> {
  items: readonly T[];
  selected: readonly string[];
  label: string;
  children: (visible: readonly T[]) => ReactNode;
}

/** Pesquisar a lista não altera os filtros aplicados nem os slugs persistidos. */
export default function FacetSearch<T extends { name: string; slug: string }>({
  items, selected, label, children,
}: FacetSearchProps<T>) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  if (items.length <= 8) return <>{children(items)}</>;

  const term = normalizeSearchText(query);
  const matches = items.filter(item => normalizeSearchText(item.name).includes(term));
  const matchSlugs = new Set(matches.map(item => item.slug));
  const selectedSlugs = new Set(selected);
  const displayedSlugs = new Set((showAll ? matches : matches.slice(0, 12)).map(item => item.slug));
  const visible = items.filter(item => displayedSlugs.has(item.slug) || selectedSlugs.has(item.slug));
  const kept = items.some(item => selectedSlugs.has(item.slug) && !matchSlugs.has(item.slug));

  return (
    <div className="space-y-2">
      <Input
        type="search"
        inputMode="search"
        autoComplete="off"
        aria-label={label}
        placeholder={label}
        value={query}
        onChange={e => { setQuery(e.target.value); setShowAll(false); }}
        className="min-h-[44px]"
      />
      {term && (
        <p role="status" className="text-xs text-muted-foreground">
          {matches.length ? `${matches.length} ${matches.length === 1 ? "opção encontrada" : "opções encontradas"}.` : "Nenhuma opção encontrada."}
          {kept && " Seleções atuais preservadas."}
        </p>
      )}
      {children(visible)}
      {matches.length > 12 && (
        <button type="button" className="min-h-[44px] text-sm text-primary underline-offset-4 hover:underline" onClick={() => setShowAll(previous => !previous)}>
          {showAll ? "Mostrar menos opções" : `Ver todas as ${matches.length} opções`}
        </button>
      )}
    </div>
  );
}
