import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import FacetSearch from "@/components/FacetSearch";
export interface FacetItem { id: string; name: string; slug: string; count?: number }

export type SpeedKey = "rapido" | "normal" | "longo";

export interface CatalogFilterValues {
  priceMin?: number;
  priceMax?: number;
  occasionSlugs: string[];
  categorySlugs: string[];
  tagSlugs: string[];
  segmentSlugs: string[];
  speeds: SpeedKey[];
  personalizable: boolean | null; // null = any
  onlyActive: boolean;
}

export const EMPTY_FILTERS: CatalogFilterValues = {
  occasionSlugs: [],
  categorySlugs: [],
  tagSlugs: [],
  segmentSlugs: [],
  speeds: [],
  personalizable: null,
  onlyActive: true,
};

export interface CatalogFiltersProps {
  values: CatalogFilterValues;
  onChange: (v: CatalogFilterValues) => void;
  occasions?: FacetItem[];
  categories?: FacetItem[];
  tags?: FacetItem[];
  segments?: FacetItem[];
  priceBounds: { min: number; max: number };
  /** Hide a facet because the page is already scoped to it */
  hide?: { category?: boolean; occasion?: boolean; segment?: boolean };
  totalCount?: number;
}

const SPEED_OPTIONS: { key: SpeedKey; label: string }[] = [
  { key: "rapido", label: "Pronta entrega" },
  { key: "normal", label: "Prazo normal" },
  { key: "longo",  label: "Sob encomenda" },
];

function toggleArr<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function FilterBody({ values, onChange, occasions, categories, tags, segments, priceBounds, hide }: CatalogFiltersProps) {
  const min = Math.floor(priceBounds.min);
  const max = Math.ceil(priceBounds.max);
  const current = [values.priceMin ?? min, values.priceMax ?? max] as [number, number];

  const updatePrice = (v: number[]) => {
    onChange({ ...values, priceMin: v[0], priceMax: v[1] });
  };

  return (
    <div className="space-y-6">
      {/* Preço */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-3">Faixa de preço</h3>
        <Slider
          min={min}
          max={Math.max(min + 1, max)}
          step={1}
          value={current}
          onValueChange={updatePrice}
          className="my-4"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>R$ {current[0]}</span>
          <span>R$ {current[1]}</span>
        </div>
      </section>

      {/* Personalização */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-2">Personalização</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { val: null as boolean | null, lbl: "Qualquer" },
            { val: true, lbl: "Personalizável" },
            { val: false, lbl: "Sem personalização" },
          ].map((opt) => (
            <button
              key={String(opt.val)}
              type="button"
              onClick={() => onChange({ ...values, personalizable: opt.val })}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                values.personalizable === opt.val
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {opt.lbl}
            </button>
          ))}
        </div>
      </section>

      {/* Prazo */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-2">Prazo de produção</h3>
        <div className="space-y-2">
          {SPEED_OPTIONS.map((o) => (
            <label key={o.key} className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Checkbox
                checked={values.speeds.includes(o.key)}
                onCheckedChange={() => onChange({ ...values, speeds: toggleArr(values.speeds, o.key) })}
              />
              {o.label}
            </label>
          ))}
        </div>
      </section>

      {/* Ocasião */}
      {!hide?.occasion && occasions && occasions.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-2">Ocasião</h3>
          <FacetSearch items={occasions} selected={values.occasionSlugs} label="Buscar ocasiões">
            {visible => (
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {visible.map((o) => (
                  <label key={o.id} className="flex min-h-[44px] items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <Checkbox
                      checked={values.occasionSlugs.includes(o.slug)}
                      onCheckedChange={() => onChange({ ...values, occasionSlugs: toggleArr(values.occasionSlugs, o.slug) })}
                    />
                    {o.name}
                  </label>
                ))}
              </div>
            )}
          </FacetSearch>
        </section>
      )}

      {/* Categoria */}
      {!hide?.category && categories && categories.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-2">Categoria</h3>
          <FacetSearch items={categories} selected={values.categorySlugs} label="Buscar categorias">
            {visible => (
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {visible.map((c) => (
                  <label key={c.id} className="flex min-h-[44px] items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <Checkbox
                      checked={values.categorySlugs.includes(c.slug)}
                      onCheckedChange={() => onChange({ ...values, categorySlugs: toggleArr(values.categorySlugs, c.slug) })}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            )}
          </FacetSearch>
        </section>
      )}

      {/* Segmento */}
      {!hide?.segment && segments && segments.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-2">Segmento</h3>
          <FacetSearch items={segments} selected={values.segmentSlugs} label="Buscar segmentos">
            {visible => (
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {visible.map((s) => (
                  <label key={s.id} className="flex min-h-[44px] items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <Checkbox
                      checked={values.segmentSlugs.includes(s.slug)}
                      onCheckedChange={() => onChange({ ...values, segmentSlugs: toggleArr(values.segmentSlugs, s.slug) })}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            )}
          </FacetSearch>
        </section>
      )}

      {/* Tags */}
      {tags && tags.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-2">Tags</h3>
          <FacetSearch items={tags} selected={values.tagSlugs} label="Buscar tags">
            {visible => (
          <div className="flex flex-wrap gap-1.5">
            {visible.map((t) => {
              const active = values.tagSlugs.includes(t.slug);
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ ...values, tagSlugs: toggleArr(values.tagSlugs, t.slug) })}
                  className={`min-h-[44px] px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  #{t.name}
                </button>
              );
            })}
          </div>
            )}
          </FacetSearch>
        </section>
      )}

      <Separator />

      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={() => onChange({ ...EMPTY_FILTERS, onlyActive: values.onlyActive })}
      >
        Limpar filtros
      </Button>
    </div>
  );
}

export default function CatalogFilters(props: CatalogFiltersProps) {
  const [open, setOpen] = useState(false);
  const activeCount =
    props.values.occasionSlugs.length +
    props.values.categorySlugs.length +
    props.values.tagSlugs.length +
    props.values.segmentSlugs.length +
    props.values.speeds.length +
    (props.values.personalizable !== null ? 1 : 0) +
    (props.values.priceMin != null || props.values.priceMax != null ? 1 : 0);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-foreground">Filtros</h2>
          {activeCount > 0 && (
            <span className="text-xs text-primary font-medium">{activeCount} ativo{activeCount > 1 ? "s" : ""}</span>
          )}
        </div>
        <FilterBody {...props} />
      </aside>

      {/* Mobile drawer trigger */}
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-full">
              <Filter className="h-4 w-4 mr-2" />
              Filtros {activeCount > 0 && <span className="ml-1 text-primary">({activeCount})</span>}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <FilterBody {...props} />
            <div className="mt-6">
              <Button className="w-full rounded-full" onClick={() => setOpen(false)}>
                Ver {props.totalCount ?? ""} resultado{(props.totalCount ?? 0) === 1 ? "" : "s"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

// ----- URL sync helpers -----

export function readFiltersFromParams(sp: URLSearchParams): CatalogFilterValues {
  const csv = (k: string) => (sp.get(k) || "").split(",").map((s) => s.trim()).filter(Boolean);
  const num = (k: string) => {
    const v = sp.get(k);
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const pers = sp.get("pers");
  return {
    priceMin: num("preco_min"),
    priceMax: num("preco_max"),
    occasionSlugs: csv("ocasioes"),
    categorySlugs: csv("categorias"),
    tagSlugs: csv("tags"),
    segmentSlugs: csv("segmentos"),
    speeds: csv("prazo") as SpeedKey[],
    personalizable: pers === "1" ? true : pers === "0" ? false : null,
    onlyActive: true,
  };
}

export function writeFiltersToParams(v: CatalogFilterValues, base: URLSearchParams): URLSearchParams {
  const sp = new URLSearchParams(base);
  const setOrDel = (k: string, val: string | undefined | null) => {
    if (val == null || val === "") sp.delete(k);
    else sp.set(k, val);
  };
  setOrDel("preco_min", v.priceMin != null ? String(v.priceMin) : undefined);
  setOrDel("preco_max", v.priceMax != null ? String(v.priceMax) : undefined);
  setOrDel("ocasioes", v.occasionSlugs.length ? v.occasionSlugs.join(",") : undefined);
  setOrDel("categorias", v.categorySlugs.length ? v.categorySlugs.join(",") : undefined);
  setOrDel("tags", v.tagSlugs.length ? v.tagSlugs.join(",") : undefined);
  setOrDel("segmentos", v.segmentSlugs.length ? v.segmentSlugs.join(",") : undefined);
  setOrDel("prazo", v.speeds.length ? v.speeds.join(",") : undefined);
  setOrDel("pers", v.personalizable === true ? "1" : v.personalizable === false ? "0" : undefined);
  return sp;
}

/** Convenience hook to keep filter state synced with URL on a route. */
export function useCatalogFiltersFromUrl(): [CatalogFilterValues, (next: CatalogFilterValues) => void] {
  const [sp, setSp] = useSearchParams();
  const values = useMemo(() => readFiltersFromParams(sp), [sp]);
  const set = (next: CatalogFilterValues) => {
    const updated = writeFiltersToParams(next, sp);
    // remove pagination param when filters change
    updated.delete("pagina");
    setSp(updated, { replace: true });
  };
  return [values, set];
}

// Re-export for storybook-like consumers
export { useEffect };
