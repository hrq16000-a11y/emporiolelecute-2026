import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Gift, Heart, Sparkles, X } from "lucide-react";

const PRESEPIO_IMAGE = "https://xfqffqxqiuqauefrrcxn.supabase.co/storage/v1/object/public/product-images/products/1794003037869-dgml8q.webp";
const MINI_VELA_IMAGE = "https://xfqffqxqiuqauefrrcxn.supabase.co/storage/v1/object/public/product-images/products/1794158842992-pambq.webp";
const PAPAI_NOEL_IMAGE = "https://xfqffqxqiuqauefrrcxn.supabase.co/storage/v1/object/public/product-images/products/1794002953612-487og.webp";
const INVITE_SEEN_KEY = "lelecute_natal_2026_invite_seen";

/**
 * Destaque editorial de Natal: a loja continua gerenciando o hero e os demais
 * blocos da home. Este convite só leva às páginas existentes da campanha.
 */
export function NatalHomeSpotlight() {
  return (
    <section aria-labelledby="home-natal-heading" className="relative isolate overflow-hidden bg-[#fbf3e8] py-12 sm:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-32 h-80 w-80 rounded-full bg-[#e5bc83]/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-[#d4aeb0]/25 blur-3xl" />
      <div className="container relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-9 overflow-hidden rounded-[2rem] border border-[#e6d5bf] bg-gradient-to-br from-[#fffaf2] to-[#f4e4d7] p-6 shadow-[0_18px_60px_-35px_rgba(92,36,44,.45)] sm:p-9 lg:grid-cols-[1.08fr_.92fr] lg:gap-12 lg:p-12">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#cdae80]/50 bg-white/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.18em] text-[#9b623b]">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> Coleção especial de Natal
            </p>
            <h2 id="home-natal-heading" className="mt-5 font-serif text-[2.65rem] leading-[1.06] tracking-tight text-[#852d3b] sm:text-5xl lg:text-[3.65rem]">
              Pequenos mimos,<br />
              <em className="font-serif font-normal">grandes encantos.</em>
            </h2>
            <div aria-hidden="true" className="my-5 h-px w-20 bg-[#cb9a5a]" />
            <p className="max-w-xl text-base leading-relaxed text-[#64534b] sm:text-lg">
              O Natal tem um jeito especial de dizer <strong>“você é importante”</strong>. Descubra nossas velas, sabonetes e lembranças artesanais para surpreender quem faz parte da sua história.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/natal"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#872c3b] px-6 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#68212e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#872c3b]"
              >
                Visitar nosso Natal encantado <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/ocasiao/natal-e-ano-novo" className="inline-flex min-h-12 items-center gap-2 px-3 text-sm font-semibold text-[#872c3b] underline-offset-4 hover:underline">
                Ver lembrancinhas <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <p className="mt-6 inline-flex items-center gap-2 text-xs text-[#816b59]">
              <Heart className="h-4 w-4 text-[#b25d64]" aria-hidden="true" /> Personalização e carinho em cada detalhe
            </p>
          </div>
          <div className="relative grid h-[295px] grid-cols-[1.15fr_.85fr] gap-3 sm:h-[390px] sm:gap-4" aria-label="Produtos natalinos artesanais do Empório LeleCute">
            <Link to="/natal" aria-label="Conhecer a coleção de Natal com presépios artesanais" className="group relative row-span-2 overflow-hidden rounded-3xl bg-[#ecdfd3] shadow-xl">
              <img src={PRESEPIO_IMAGE} loading="lazy" alt="Lembrancinha de Natal com presépio da Sagrada Família" className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105" />
            </Link>
            <Link to="/natal" aria-label="Conhecer as mini velas natalinas" className="group overflow-hidden rounded-2xl bg-[#ecdfd3] shadow-lg">
              <img src={MINI_VELA_IMAGE} loading="lazy" alt="Mini vela natalina artesanal personalizada" className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105" />
            </Link>
            <Link to="/natal" aria-label="Conhecer os sabonetes de Papai Noel" className="group overflow-hidden rounded-2xl bg-[#ecdfd3] shadow-lg">
              <img src={PAPAI_NOEL_IMAGE} loading="lazy" alt="Sabonete natalino em formato de Papai Noel" className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105" />
            </Link>
            <div className="pointer-events-none absolute -bottom-3 left-4 rounded-full border border-[#ecd7af] bg-[#fffaf0] px-4 py-2 shadow-md">
              <span className="flex items-center gap-2 font-serif text-sm italic text-[#8b3942]">
                <Gift className="h-4 w-4" aria-hidden="true" /> Feito para emocionar
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Pequeno convite não modal: aparece só na home após alguns segundos,
 * uma única vez por sessão. Fica no alto para não cobrir WhatsApp,
 * carrinho, cookie banner ou os avisos de avaliação na base da página.
 */
export function NatalWelcomeInvite() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(INVITE_SEEN_KEY) === "1") return;
    } catch {
      // Armazenamento indisponível não deve impedir o convite.
    }

    const timer = window.setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      setVisible(true);
      try {
        window.sessionStorage.setItem(INVITE_SEEN_KEY, "1");
      } catch {
        // A experiência funciona mesmo sem armazenamento.
      }
    }, 8000);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVisible(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [visible]);

  if (!visible) return null;

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="natal-invite-title"
      aria-describedby="natal-invite-description"
      className="fixed right-4 top-24 z-[60] w-[calc(100vw-2rem)] max-w-[355px] overflow-hidden rounded-[1.5rem] border border-[#e8cfb1] bg-[#fff9f0] text-[#59443c] shadow-[0_22px_70px_-22px_rgba(75,32,40,.45)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-3 motion-safe:duration-500"
    >
      <button
        type="button"
        aria-label="Fechar convite de Natal"
        onClick={() => setVisible(false)}
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#73323c] shadow-sm transition-colors hover:bg-[#f8e5dd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8d2836]"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <div className="grid grid-cols-[108px_1fr]">
        <div className="relative bg-[#e5d5c8]">
          <img src={MINI_VELA_IMAGE} loading="lazy" alt="Mini vela natalina artesanal" className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <div className="min-w-0 px-4 pb-4 pt-5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#9f653f]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Uma surpresa chegou!
          </p>
          <h2 id="natal-invite-title" className="mt-2 pr-5 font-serif text-xl leading-tight text-[#832c3a]">
            O Natal já floresceu por aqui.
          </h2>
          <p id="natal-invite-description" className="mt-2 text-xs leading-relaxed text-[#67584e]">
            Venha descobrir lembranças especiais para presentear com afeto.
          </p>
          <Link
            to="/natal"
            onClick={() => setVisible(false)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#862c3b] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#65202c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#862c3b]"
          >
            Conhecer a coleção <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
