import { useState, useEffect, useRef, useMemo, useId } from "react";
import { Search, X, Loader2, Package, Tag, Calendar, FileText } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useDbProducts, useDbCategories, useDbOccasions } from "@/hooks/useProducts";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { optimizeImage } from "@/lib/image";
import { urls } from "@/lib/urls";
import { highlightMatch } from "@/lib/highlightMatch";
import { normalizeSearchText } from "@/lib/searchText";

interface SearchBarProps {
  /** Destino do "ver todos" e do Enter sem seleção. Default: /buscar */
  searchPath?: string;
  /** Nome do query param no submit. Default: q */
  paramKey?: string;
  /** Disparado após selecionar uma sugestão (gancho de fechamento mobile) */
  onResultSelect?: () => void;
  /** Autofocus no input ao montar */
  autoFocus?: boolean;
}

type SuggestionKind = "product" | "category" | "occasion" | "page";
interface Suggestion {
  kind: SuggestionKind;
  id: string;
  label: string;
  sublabel?: string;
  to: string;
  image?: string | null;
}

// Páginas estáticas públicas — sempre buscáveis sem depender de fetch.
const STATIC_PAGES: Array<{ label: string; to: string; keywords?: string[] }> = [
  { label: "Início", to: "/", keywords: ["home", "principal"] },
  { label: "Loja", to: "/loja", keywords: ["produtos", "comprar"] },
  { label: "Sobre", to: "/sobre", keywords: ["historia", "marca"] },
  { label: "Contato", to: "/contato", keywords: ["whatsapp", "email"] },
  { label: "Blog", to: "/blog", keywords: ["artigos", "posts"] },
  { label: "Orçamento", to: "/orcamento", keywords: ["personalizado", "cotacao"] },
  { label: "Rastrear Pedido", to: "/rastrear", keywords: ["pedido", "status"] },
  { label: "Política de Privacidade", to: "/politica-de-privacidade", keywords: ["lgpd", "privacidade"] },
];

const KIND_META: Record<SuggestionKind, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  product: { label: "Produtos", icon: Package },
  category: { label: "Categorias", icon: Tag },
  occasion: { label: "Ocasiões", icon: Calendar },
  page: { label: "Páginas", icon: FileText },
};

const SearchBar = ({
  searchPath = "/buscar",
  paramKey = "q",
  onResultSelect,
  autoFocus = false,
}: SearchBarProps = {}) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const listId = `${useId()}-search-suggestions`;

  // Debounce 300ms — evita re-render por tecla
  const debouncedQuery = useDebounce(query, 300);
  const searchTerm = query.trim();

  const { data: products = [], isLoading: loadingProducts } = useDbProducts();
  const { data: categories = [] } = useDbCategories({ publicOnly: true });
  const { data: occasions = [] } = useDbOccasions({ publicOnly: true });

  // Gera sugestões agrupadas (produtos, categorias, ocasiões, páginas)
  const { suggestions, grouped } = useMemo(() => {
    const empty = { suggestions: [] as Suggestion[], grouped: [] as Array<{ kind: SuggestionKind; items: Suggestion[] }> };
    if (debouncedQuery.trim().length < 2) return empty;

    const term = normalizeSearchText(debouncedQuery);

    const productItems: Suggestion[] = products
      .filter((p) => {
        if (!p.is_active) return false;
        const hay = normalizeSearchText(
          [
            p.name,
            p.description ?? "",
            p.category?.name ?? "",
            ...(p.occasions?.map((o) => o.name) ?? []),
            ...(p.tags?.map((t) => t.name) ?? []),
            ...(p.keywords ?? []),
          ].join(" ")
        );
        return hay.includes(term);
      })
      .slice(0, 5)
      .map((p) => ({
        kind: "product" as const,
        id: p.id,
        label: p.name,
        sublabel: `${p.category?.name ?? ""}${p.category?.name ? " • " : ""}${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.price)}`,
        to: urls.product(p.slug),
        image: p.images?.[0],
      }));

    const categoryItems: Suggestion[] = categories
      .filter((c) => normalizeSearchText(c.name).includes(term))
      .slice(0, 3)
      .map((c) => ({
        kind: "category" as const,
        id: c.id,
        label: c.name,
        sublabel: "Categoria",
        to: `/categoria/${c.slug}`,
      }));

    const occasionItems: Suggestion[] = occasions
      .filter((o) => normalizeSearchText(o.name).includes(term))
      .slice(0, 3)
      .map((o) => ({
        kind: "occasion" as const,
        id: o.id,
        label: o.name,
        sublabel: "Ocasião",
        to: `/ocasiao/${o.slug}`,
      }));

    const pageItems: Suggestion[] = STATIC_PAGES
      .filter((p) => {
        const hay = normalizeSearchText([p.label, ...(p.keywords ?? [])].join(" "));
        return hay.includes(term);
      })
      .slice(0, 3)
      .map((p) => ({
        kind: "page" as const,
        id: p.to,
        label: p.label,
        sublabel: "Página",
        to: p.to,
      }));

    // Ordem dos grupos prioriza produtos (intent comercial)
    const groups: Array<{ kind: SuggestionKind; items: Suggestion[] }> = (
      [
        { kind: "product" as const, items: productItems },
        { kind: "category" as const, items: categoryItems },
        { kind: "occasion" as const, items: occasionItems },
        { kind: "page" as const, items: pageItems },
      ]
    ).filter((g) => g.items.length > 0);

    const flat = groups.flatMap((g) => g.items);
    return { suggestions: flat, grouped: groups };
  }, [debouncedQuery, products, categories, occasions]);

  // Não permita escolher uma sugestão da consulta anterior durante o debounce.
  const isSearching = searchTerm.length >= 2 && query !== debouncedQuery;
  const suggestionsReady = !isSearching && !(loadingProducts && products.length === 0);
  const activeSuggestion = isOpen && suggestionsReady ? suggestions[selectedIndex] : undefined;

  const closeSuggestions = () => {
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  useEffect(() => {
    if (activeSuggestion) {
      document.getElementById(`${listId}-option-${selectedIndex}`)?.scrollIntoView({ block: "nearest" });
    }
  }, [activeSuggestion, listId, selectedIndex]);

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (s: Suggestion) => {
    navigate(s.to);
    setQuery("");
    closeSuggestions();
    onResultSelect?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown" && searchTerm.length >= 2) {
      e.preventDefault();
      setIsOpen(true);
      if (suggestionsReady && suggestions.length > 0) {
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
      }
    } else if (e.key === "ArrowUp" && isOpen && suggestionsReady) {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeSuggestion) {
        handleSelect(activeSuggestion);
      } else if (searchTerm.length >= 2) {
        navigate(`${searchPath}?${paramKey}=${encodeURIComponent(searchTerm)}`);
        closeSuggestions();
        onResultSelect?.();
      }
    } else if (e.key === "Escape") {
      closeSuggestions();
    }
  };

  // Autofocus (mobile open)
  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 60);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const clearSearch = () => {
    setQuery("");
    inputRef.current?.focus();
    closeSuggestions();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-xs"
      onBlur={(e) => {
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) closeSuggestions();
      }}
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Buscar produtos, categorias..."
          aria-label="Buscar produtos, categorias..."
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
            setIsOpen(e.target.value.trim().length >= 2);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => searchTerm.length >= 2 && setIsOpen(true)}
          className="pl-9 pr-8 h-9 rounded-full bg-secondary/50 border-border/50 focus:bg-background"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={isOpen ? listId : undefined}
          aria-activedescendant={activeSuggestion ? `${listId}-option-${selectedIndex}` : undefined}
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Limpar busca"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          className="absolute top-full mt-2 w-full bg-popover text-popover-foreground border border-border rounded-xl shadow-lg overflow-hidden z-50 animate-fade-in max-h-[70vh] overflow-y-auto"
        >
          <div id={listId} role="listbox" aria-label="Sugestões de busca" aria-busy={!suggestionsReady}>
          {!suggestionsReady ? (
            <div className="flex items-center justify-center py-6" role="status" aria-live="polite">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Buscando...</span>
            </div>
          ) : grouped.length > 0 ? (
            <>
              {(() => {
                let flatIdx = -1;
                return grouped.map((group) => {
                  const Meta = KIND_META[group.kind];
                  const Icon = Meta.icon;
                  return (
                    <div key={group.kind} role="group" aria-label={Meta.label} className="py-1">
                      <div className="flex items-center gap-1.5 px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/80">
                        <Icon className="h-3 w-3" />
                        {Meta.label}
                      </div>
                      <ul role="presentation">
                        {group.items.map((s) => {
                          flatIdx += 1;
                          const idx = flatIdx;
                          return (
                            <li key={`${s.kind}-${s.id}`} role="presentation">
                              <Link
                                id={`${listId}-option-${idx}`}
                                role="option"
                                tabIndex={-1}
                                aria-selected={idx === selectedIndex}
                                to={s.to}
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleSelect(s);
                                }}
                                className={`flex items-center gap-3 px-4 py-2 transition-colors ${
                                  idx === selectedIndex ? "bg-primary-light" : "hover:bg-secondary"
                                }`}
                              >
                                {s.kind === "product" ? (
                                  <img
                                    src={optimizeImage(s.image, { width: 96, resize: "contain" })}
                                    alt=""
                                    className="w-10 h-10 rounded-lg object-contain bg-muted p-1 shrink-0"
                                  />
                                ) : (
                                  <span className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                                    <Icon className="h-4 w-4" />
                                  </span>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {highlightMatch(s.label, debouncedQuery)}
                                  </p>
                                  {s.sublabel && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {s.sublabel}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                });
              })()}

            </>
          ) : (
            <div className="p-4" role="status">
              <p className="text-sm text-muted-foreground text-center">
                Nenhuma sugestão imediata para "{debouncedQuery}". Consulte a busca completa.
              </p>
            </div>
          )}
          </div>
          {/* A RPC pode encontrar sinônimos mesmo sem sugestões locais. */}
          {suggestionsReady && (
            <Link
              to={`${searchPath}?${paramKey}=${encodeURIComponent(searchTerm)}`}
              onClick={() => {
                closeSuggestions();
                onResultSelect?.();
              }}
              className="block min-h-[44px] px-4 py-3 text-center text-sm text-primary hover:bg-secondary border-t border-border"
            >
              Ver todos os resultados para "{query}"
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
