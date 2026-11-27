import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/** Shared, visible store proposition even when the managed hero is a photo banner. */
export default function HeroEditorialCaption() {
  return (
    <div className="atelier-hero-caption container mx-auto grid gap-4 px-5 py-6 md:grid-cols-[1fr_auto] md:items-end md:py-8">
      <div>
        <p className="atelier-kicker">Ateliê criativo · feito à mão</p>
        <h1 className="mt-2 max-w-3xl font-display text-2xl leading-tight text-foreground sm:text-3xl md:text-4xl">Lembrancinhas que guardam <em className="text-primary not-italic">o seu momento.</em></h1>
        <p className="mt-2 text-sm text-muted-foreground">Sabonetes, velas e presentes artesanais personalizados.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/produtos" className="atelier-primary-cta inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Explorar produtos <ArrowRight className="size-4" aria-hidden="true" /></Link>
        <Link to="/orcamento" className="inline-flex min-h-11 items-center border-b border-foreground/25 px-2 text-sm font-semibold text-foreground hover:border-primary">Pedir orçamento</Link>
      </div>
    </div>
  );
}
