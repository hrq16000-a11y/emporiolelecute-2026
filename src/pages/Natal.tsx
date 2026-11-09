import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Gift, Heart, Leaf, PackageCheck, PencilLine, Sparkles, Star, Truck, Users } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import QuoteFormSection from "@/components/QuoteFormSection";
import BreadcrumbStructuredData from "@/components/BreadcrumbStructuredData";

const products = [
  {
    "id": "lembrancinha-sabonete-natal-presepio-sagrada-familia",
    "title": "Presépio Sagrada Família",
    "summary": "Um símbolo de carinho e celebração, apresentado com delicadeza.",
    "image": "https://xfqffqxqiuqauefrrcxn.supabase.co/storage/v1/object/public/product-images/products/1794003037869-dgml8q.webp",
    "href": "https://emporiolelecute.com.br/produto/lembrancinha-sabonete-natal-presepio-sagrada-familia",
    "alt": "Lembrancinha Sabonete Natal - Presépio Sagrada Família"
  },
  {
    "id": "lembrancinha-natal-mini-vela-perfumada-mimo-natalino",
    "title": "Mini vela perfumada natalina",
    "summary": "Um mimo acolhedor para agradecer e permanecer na memória.",
    "image": "https://xfqffqxqiuqauefrrcxn.supabase.co/storage/v1/object/public/product-images/products/1794158842992-pambq.webp",
    "href": "https://emporiolelecute.com.br/produto/lembrancinha-natal-mini-vela-perfumada-mimo-natalino",
    "alt": "Lembrancinha Natal Mini Vela Perfumada | Mimo Natalino"
  },
  {
    "id": "lembrancinha-sabonete-papai-noel-feliz-natal",
    "title": "Papai Noel em caixinha",
    "summary": "Uma lembrança divertida, delicada e cheia de encanto.",
    "image": "https://xfqffqxqiuqauefrrcxn.supabase.co/storage/v1/object/public/product-images/products/1794002953612-487og.webp",
    "href": "https://emporiolelecute.com.br/produto/lembrancinha-sabonete-papai-noel-feliz-natal",
    "alt": "Lembrancinha Sabonete Papai Noel | Feliz Natal"
  },
  {
    "id": "vela-sagrada-familia-personalizada-caixinha-acetato",
    "title": "Sagrada Família em acetato",
    "summary": "Uma apresentação especial para presentear com significado.",
    "image": "https://xfqffqxqiuqauefrrcxn.supabase.co/storage/v1/object/public/product-images/products/1794168418747-xjx3jx.webp",
    "href": "https://emporiolelecute.com.br/produto/vela-sagrada-familia-personalizada-caixinha-acetato",
    "alt": "Vela Sagrada família Personalizada | Caixinha Acetato"
  },
  {
    "id": "card-com-mini-vela-perfumada-natalina-lembrancinha-de-natal",
    "title": "Mini vela com cartão natalino",
    "summary": "Uma mensagem personalizada transforma um pequeno presente.",
    "image": "https://xfqffqxqiuqauefrrcxn.supabase.co/storage/v1/object/public/product-images/products/1794171524193-s7cblq.webp",
    "href": "https://emporiolelecute.com.br/produto/card-com-mini-vela-perfumada-natalina-lembrancinha-de-natal",
    "alt": "Card com Mini Vela Perfumada Natalina | Lembrancinha de Natal"
  },
  {
    "id": "lembrancinha-de-natal-vela-na-latinha-mimo-natalino",
    "title": "Vela na latinha natalina",
    "summary": "Pequena no tamanho, grande no gesto de gratidão.",
    "image": "https://xfqffqxqiuqauefrrcxn.supabase.co/storage/v1/object/public/product-images/products/1794160125659-wlyxjq.webp",
    "href": "https://emporiolelecute.com.br/produto/lembrancinha-de-natal-vela-na-latinha-mimo-natalino",
    "alt": "Lembrancinha de Natal Vela na Latinha | Mimo Natalino"
  },
  {
    "id": "vela-sagrada-familia-personalizada",
    "title": "Vela Sagrada Família",
    "summary": "Uma lembrança de afeto para celebrar a essência do Natal.",
    "image": "https://xfqffqxqiuqauefrrcxn.supabase.co/storage/v1/object/public/product-images/products/1779838116465-fp2bf.jpg",
    "href": "https://emporiolelecute.com.br/produto/vela-sagrada-familia-personalizada",
    "alt": "Vela Sagrada Família Personalizada"
  }
] as const;

const canonical = "https://emporiolelecute.com.br/natal";
const accents = ["Feito à mão com carinho", "Mensagens personalizadas", "Lembranças para equipes", "Pronto para encantar"];

export default function Natal() {
  return (
    <div className="min-h-screen bg-[#fffaf4] text-[#543e3a]">
      <Helmet>
        <title>Natal 2026 | Lembrancinhas e presentes artesanais | Empório LeleCute</title>
        <meta name="description" content="Encante clientes, colaboradores e pessoas especiais neste Natal com sabonetes e velas artesanais personalizadas do Empório LeleCute. Conheça as opções e solicite seu orçamento." />
        <meta name="robots" content="index,follow,max-image-preview:large" />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Natal Empório LeleCute | Pequenos presentes, grandes afetos" />
        <meta property="og:description" content="Lembrancinhas de Natal artesanais, com personalização e carinho em cada detalhe." />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={products[0].image} />
        <meta property="og:locale" content="pt_BR" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Natal Empório LeleCute — Lembrancinhas e Presentes",
          url: canonical,
          description: "Lembrancinhas natalinas artesanais e personalizadas para presentear clientes, equipes, parceiros e pessoas queridas.",
          isPartOf: { "@type": "WebSite", name: "Empório LeleCute", url: "https://emporiolelecute.com.br" },
          mainEntity: { "@type": "ItemList", itemListElement: products.map((p, i) => ({
            "@type": "ListItem", position: i + 1, name: p.title, url: p.href
          })) }
        })}</script>
      </Helmet>
      <BreadcrumbStructuredData items={[
        { name: "Início", url: "https://emporiolelecute.com.br/" },
        { name: "Natal", url: canonical },
      ]} />
      <Header />
      <main className="pt-20">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#fff7ea] via-[#fff8f3] to-[#f4e9dd]">
          <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[#e7c689]/20 blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-9 px-5 py-12 sm:px-8 md:grid-cols-[.93fr_1.07fr] md:gap-12 md:py-20">
            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#b98b53]/40 bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[.19em] text-[#906236]">
                <Sparkles className="h-4 w-4" /> Coleção especial · Natal 2026
              </span>
              <h1 className="mt-6 font-serif text-[3.6rem] leading-[.95] tracking-tight text-[#812936] sm:text-7xl lg:text-[6.2rem]">
                Natal <span className="mt-2 block font-serif italic text-[#a24b4c]">com afeto.</span>
              </h1>
              <div className="my-7 h-px w-24 bg-[#ca9c5d]" />
              <p className="max-w-lg font-serif text-2xl leading-snug text-[#594c37] sm:text-[1.7rem]">
                Pequenos presentes. Grandes memórias.
              </p>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-[#6f635c] sm:text-lg">
                Surpreenda e encante com sabonetes, velas e lembranças artesanais que transformam gratidão em um gesto inesquecível. Para pessoas especiais, clientes e equipes.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#colecao" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#8d2836] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#8d2836]/15 transition hover:bg-[#6f1e2a]">
                  Descobrir as lembranças <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#pedido" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#8d2836] px-6 py-3 text-sm font-semibold text-[#8d2836] transition hover:bg-[#f8e8e4]">
                  Montar meu pedido
                </a>
              </div>
              <p className="mt-6 flex items-center gap-2 text-sm text-[#7c684d]"><Heart className="h-4 w-4" /> Empório LeleCute • Artesanato com significado</p>
            </div>
            <div className="relative mx-auto grid w-full max-w-[610px] grid-cols-[1fr_.65fr] gap-3 sm:gap-4" aria-label="Fotografias de lembranças natalinas do Empório LeleCute">
              <Link to={products[0].href.replace("https://emporiolelecute.com.br", "")} className="group row-span-2 overflow-hidden rounded-[2rem] bg-[#eee0d2] shadow-2xl shadow-[#684334]/15">
                <img src={products[0].image} alt={products[0].alt} fetchPriority="high" className="h-full min-h-[350px] w-full object-cover transition duration-500 group-hover:scale-105 sm:min-h-[520px]" />
              </Link>
              <Link to={products[1].href.replace("https://emporiolelecute.com.br", "")} className="group overflow-hidden rounded-[1.5rem] bg-[#eee0d2] shadow-xl shadow-[#684334]/10">
                <img src={products[1].image} alt={products[1].alt} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </Link>
              <Link to={products[2].href.replace("https://emporiolelecute.com.br", "")} className="group overflow-hidden rounded-[1.5rem] bg-[#eee0d2] shadow-xl shadow-[#684334]/10">
                <img src={products[2].image} alt={products[2].alt} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </Link>
              <div className="absolute -bottom-4 left-[10%] rounded-xl border border-[#efd5b2] bg-white/95 px-5 py-3 shadow-lg">
                <p className="font-serif text-lg italic text-[#8d2836]">Feito com carinho <span aria-hidden="true">✦</span></p>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Diferenciais da coleção de Natal" className="border-y border-[#e4d3c4] bg-[#fff2e9]">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-5 px-5 py-7 text-center md:grid-cols-4">
            {[Heart, PencilLine, Users, Gift].map((Icon, i) => (
              <div key={accents[i]} className="flex flex-col items-center gap-2 px-2 md:border-r md:border-[#d7b8a4] md:last:border-r-0">
                <Icon className="h-6 w-6 text-[#a05b42]" strokeWidth={1.5} aria-hidden />
                <span className="text-xs font-semibold text-[#684940] sm:text-sm">{accents[i]}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="colecao" className="scroll-mt-24 px-5 py-16 sm:px-8 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-11 max-w-3xl text-center">
              <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[.24em] text-[#ac7c43]"><Star className="h-4 w-4" /> Escolhas que encantam</p>
              <h2 className="mt-4 font-serif text-4xl text-[#802b39] sm:text-5xl">Um Natal para <em>guardar no coração</em></h2>
              <p className="mt-4 text-[#73645b]">Conheça peças reais do nosso ateliê. Clique em cada opção para ver o produto e os detalhes de personalização.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.slice(0,6).map((p,i) => (
                <Link key={p.id} to={p.href.replace("https://emporiolelecute.com.br", "")} className="group overflow-hidden rounded-3xl border border-[#e8d7cc] bg-white shadow-[0_12px_30px_-22px_rgba(76,36,30,.5)] transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#f2e8df]">
                    <img src={p.image} alt={p.alt} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    <span className="absolute left-4 top-4 rounded-full bg-[#fff9f0]/95 px-3 py-1.5 text-[.7rem] font-bold uppercase tracking-wide text-[#883a35]">{i%2 ? "Ideia de presente" : "Natal artesanal"}</span>
                  </div>
                  <div className="p-6">
                    <h3 className="font-serif text-[1.55rem] leading-tight text-[#802b39]">{p.title}</h3>
                    <p className="mt-3 min-h-[3rem] text-sm leading-relaxed text-[#75665f]">{p.summary}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#8f3340]">Conhecer este produto <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-9 text-center">
              <Link to="/ocasiao/natal-e-ano-novo" className="inline-flex items-center gap-2 rounded-full border border-[#8d2836]/35 px-7 py-3 font-semibold text-[#8d2836] hover:bg-[#f6e9e4]">
                Ver outras opções de Natal <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section id="corporativo" className="scroll-mt-24 bg-[#f5eae1] px-5 py-16 sm:px-8 md:py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-10 md:grid-cols-2">
            <div className="grid grid-cols-[1fr_.7fr] gap-3">
              <img src={products[5].image} loading="lazy" alt={products[5].alt} className="aspect-[4/5] w-full rounded-3xl object-cover shadow-lg" />
              <img src={products[4].image} loading="lazy" alt={products[4].alt} className="mt-9 aspect-[4/5] w-full rounded-3xl object-cover shadow-lg" />
            </div>
            <div>
              <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[.16em] text-[#9c713f]"><Users className="h-5 w-5" /> Presentes corporativos</span>
              <h2 className="mt-4 font-serif text-4xl leading-tight text-[#802b39] sm:text-5xl">Brindes afetivos para <em>fortalecer relações.</em></h2>
              <p className="mt-6 max-w-lg leading-relaxed text-[#655953]">Uma forma delicada de agradecer a quem esteve com você durante o ano. Escolha modelos para clientes, colaboradores, parceiros e eventos de fim de ano.</p>
              <div className="mt-6 space-y-3 text-sm text-[#5b5048]">
                <p className="flex items-start gap-3"><PencilLine className="h-5 w-5 shrink-0 text-[#a17d4b]" /> Mensagens, tags e papelaria personalizadas conforme cada pedido.</p>
                <p className="flex items-start gap-3"><Gift className="h-5 w-5 shrink-0 text-[#a17d4b]" /> Apresentações delicadas para presentear.</p>
                <p className="flex items-start gap-3"><Leaf className="h-5 w-5 shrink-0 text-[#a17d4b]" /> Produção artesanal; opções e prazos confirmados no orçamento.</p>
              </div>
              <a href="#pedido" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#8d2836] px-7 py-3 text-sm font-semibold text-white hover:bg-[#6f1e2a]">Solicitar orçamento corporativo <ArrowRight className="h-4 w-4" /></a>
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 md:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center font-serif text-4xl text-[#802b39]">Como a magia acontece</h2>
            <div className="mt-12 grid gap-9 md:grid-cols-3">
              {[
                { icon: Gift, title: "Escolha o carinho", text: "Veja nossos sabonetes, velas e lembranças e encontre o que combina com sua ocasião." },
                { icon: PencilLine, title: "Deixe sua mensagem", text: "Conte o estilo, a quantidade e os detalhes que deseja personalizar." },
                { icon: PackageCheck, title: "Receba seu presente", text: "Combinamos os detalhes, a produção e as condições de entrega no orçamento." },
              ].map((step, i) => (
                <div key={step.title} className="relative text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#dcc4ad] bg-[#f7ede4]">
                    <step.icon className="h-9 w-9 text-[#8c4a40]" strokeWidth={1.5} />
                  </div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-[#b38953]">Passo 0{i+1}</p>
                  <h3 className="mt-2 font-serif text-2xl text-[#7e2b38]">{step.title}</h3>
                  <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[#75645c]">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#61242e] px-5 py-14 text-center text-white sm:px-8 md:py-20">
          <div className="mx-auto max-w-3xl">
            <Sparkles className="mx-auto h-7 w-7 text-[#e7c68c]" />
            <h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Mais do que um presente, <em>uma lembrança com significado.</em></h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#f2dfd7]">O Natal vive nos detalhes. Em uma mensagem escrita com carinho, em um perfume que acolhe, em um gesto de gratidão que continua mesmo depois da festa.</p>
            <a href="#pedido" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#fff1df] px-7 py-3 font-semibold text-[#742a34] hover:bg-white">Quero presentear com afeto <ArrowRight className="h-4 w-4" /></a>
          </div>
        </section>

        <section id="pedido" className="scroll-mt-24" aria-label="Solicite um orçamento para suas lembranças de Natal">
          <div className="bg-[#fff9f1] px-5 pt-14 text-center">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#a67541]">Sua campanha começa aqui</p>
            <h2 className="mx-auto mt-3 max-w-3xl font-serif text-4xl text-[#802b39] sm:text-5xl">Vamos criar um Natal inesquecível?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#6d5b53]">Conte o produto desejado, a quantidade e quando precisa receber. Nossa equipe confirma as opções, o prazo e o orçamento.</p>
          </div>
          <QuoteFormSection />
        </section>
        <div className="border-t border-[#eadbd1] bg-[#fffaf4] py-6 text-center">
          <Link to="/produtos" className="inline-flex items-center gap-2 text-sm font-medium text-[#8d2836] hover:underline">Continuar explorando a loja <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
