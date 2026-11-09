/**
 * Blog do Empório LeleCute (Horizonte 2 — Fase 2).
 *
 * Os posts ficam aqui em código por enquanto. Quando o volume justificar,
 * migrar para tabela `blog_posts` no banco com CMS no admin.
 *
 * Para publicar/despublicar um post, alterar o flag `published`.
 * Cada post deve linkar internamente para pelo menos uma landing
 * /lembrancinhas-* e para /produtos, formando o silo SEO.
 */

export interface BlogFAQ {
  question: string;
  answer: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  /** HTML simples renderizado em <article> (Tailwind `prose`) */
  contentHtml: string;
  coverImage?: string;
  author: string;
  publishedAt: string; // ISO date
  updatedAt?: string;
  /** Tempo estimado de leitura, em minutos */
  readingMinutes: number;
  category: string;
  tags: string[];
  /** SEO */
  seoTitle?: string;
  seoDescription?: string;
  /** Slugs de outros posts relacionados (sugestões de leitura) */
  relatedSlugs?: string[];
  /** FAQs renderizadas no artigo + JSON-LD FAQPage */
  faqs?: BlogFAQ[];
  /** Se false, o post não é renderizado nem incluído no sitemap */
  published: boolean;
}

const AUTHOR = "Empório LeleCute";

export const BLOG_POSTS: BlogPost[] = [
  // ────────────────────────────────────────────────────────────────
  // POST 1 — PILAR / TUTORIAL (suporta todas as 6 landings)
  // ────────────────────────────────────────────────────────────────
  {
    slug: "como-fazer-sabonete-artesanal-para-lembrancinhas",
    title: "Como fazer sabonete artesanal para lembrancinhas: passo a passo para iniciantes",
    excerpt:
      "Aprenda, com calma e cuidado, o passo a passo para produzir sabonetes artesanais delicados para suas lembrancinhas — materiais, técnica, fragrâncias, formas e acabamento de presente.",
    seoTitle: "Como Fazer Sabonete Artesanal para Lembrancinhas (Passo a Passo)",
    seoDescription:
      "Aprenda a fazer sabonete artesanal para lembrancinhas: materiais, passo a passo, aromas e embalagem. Sem tempo? Veja modelos prontos e personalizados.",
    publishedAt: "2026-05-13",
    readingMinutes: 9,
    category: "Tutoriais",
    tags: ["sabonete artesanal", "lembrancinhas", "passo a passo", "feito à mão"],
    author: AUTHOR,
    published: true,
    relatedSlugs: [
      "lembrancinhas-maternidade-ideias-criativas",
      "cha-de-bebe-e-cha-revelacao-lembrancinhas",
      "lembrancinhas-batizado-aniversario-formatura",
    ],
    contentHtml: `
      <p>Fazer sabonete artesanal é, antes de tudo, um exercício de presença. Cada peça que sai das nossas mãos carrega tempo, escolha de fragrância, ajuste de cor e uma intenção — celebrar alguém. Este guia foi escrito para quem quer entrar nesse universo por amor à arte e produzir lembrancinhas com a mesma delicadeza que oferecemos no <strong>Empório LeleCute</strong> há mais de 10 anos.</p>

      <p>Se a sua celebração se aproxima, ele também serve como referência para entender o trabalho por trás de cada sabonete que você verá nas nossas páginas de <a href="/lembrancinhas-maternidade">maternidade</a>, <a href="/lembrancinhas-cha-de-bebe">chá de bebê</a> e <a href="/lembrancinhas-cha-revelacao">chá revelação</a>.</p>

      <h2>Materiais Necessários</h2>
      <p>Trabalhamos com matérias-primas cosméticas hipoalergênicas. Para um lote pequeno (cerca de 10 a 15 sabonetes), você vai precisar de:</p>
      <ul>
        <li><strong>500 g de base de glicerina</strong> de boa procedência (transparente, branca leitosa ou de leite de cabra).</li>
        <li><strong>Essências cosméticas hidrossolúveis</strong> em fragrâncias suaves (lavanda, baunilha, talco, algodão, flor de cerejeira).</li>
        <li><strong>Corantes líquidos</strong> próprios para sabonete — invista em pigmentos de qualidade, eles fazem toda a diferença na elegância da peça.</li>
        <li><strong>Formas de silicone</strong> nos formatos da sua ocasião (coração, ursinho, flor, pezinho, cruz, capelo).</li>
        <li><strong>Álcool 70% em borrifador</strong> para eliminar bolhas da superfície.</li>
        <li><strong>Recipiente de vidro refratário</strong>, colher de inox e luvas.</li>
        <li><strong>Embalagens delicadas</strong>: saquinhos de organza, celofane fosco, caixinhas kraft ou de acrílico.</li>
        <li><strong>Tags personalizadas</strong> com cordão de juta, fita de cetim ou ilhós dourado.</li>
      </ul>

      <h2>Passo a Passo</h2>

      <h3>1. Prepare o ambiente</h3>
      <p>Trabalhe em uma bancada limpa, com boa iluminação e sem correntes de ar. Higienize as formas com álcool 70% e tenha tudo à mão antes de começar a derreter a base — o tempo de manuseio é curto.</p>

      <h3>2. Derreta a base com cuidado</h3>
      <p>Pique a base em cubos pequenos e derreta em banho-maria ou no micro-ondas, em intervalos curtos de 30 segundos, mexendo entre eles. A base não pode ferver — ela perde transparência e a fragrância evapora.</p>

      <h3>3. Adicione cor e aroma</h3>
      <p>Para cada 100 g de base derretida, use:</p>
      <ul>
        <li><strong>1 colher de chá de essência</strong> (3 a 5% do peso). Misture devagar para não criar bolhas.</li>
        <li><strong>2 a 3 gotas de corante</strong> — comece com pouco, é mais fácil intensificar do que clarear.</li>
      </ul>

      <h3>3. Despeje nas formas</h3>
      <p>Verta a base em fio fino, sem pressa. Logo em seguida, borrife álcool 70% sobre a superfície para estourar as bolhas e garantir um acabamento espelhado.</p>

      <h3>4. Espere o tempo necessário</h3>
      <p>O endurecimento leva de 30 a 60 minutos em temperatura ambiente. Resista à tentação de levar à geladeira — o choque térmico pode rachar a peça e deixar marcas brancas.</p>

      <h3>5. Desenforme com delicadeza</h3>
      <p>Com a forma de ponta-cabeça, pressione o silicone com as duas mãos. Se o sabonete resistir, espere mais 10 minutos. Manuseie com luvas para não deixar marcas de dedo na superfície brilhante.</p>

      <h2>Dicas para um Acabamento Profissional</h2>
      <ul>
        <li>Prefira <strong>fragrâncias leves</strong> (talco, algodão, lavanda) para celebrações de bebê — agradam todos os públicos e não disputam atenção com o evento.</li>
        <li>Construa <strong>paletas suaves e harmônicas</strong> (rosa-bebê, azul-céu, off-white, dourado) em vez de cores saturadas — o efeito é instantaneamente mais elegante.</li>
        <li>Use <strong>moldes de silicone com bom relevo</strong>; o detalhe da forma é o que transforma um sabonete em um pequeno objeto de afeto.</li>
        <li>Faça um <strong>teste piloto</strong> de 2 a 3 unidades antes do lote grande, para calibrar quantidade de essência e cor.</li>
        <li>Reserve as peças em local seco, longe da luz direta — sabonete artesanal é sensível a calor e umidade.</li>
      </ul>

      <h2>Dicas de Embalagem</h2>
      <p>A embalagem é a primeira leitura emocional da lembrancinha. Algumas combinações que valorizam o trabalho:</p>
      <ul>
        <li><strong>Organza + tag artesanal</strong> com fio de juta — clima rústico-elegante para chá de bebê e maternidade.</li>
        <li><strong>Caixinha kraft + selo redondo</strong> com nome do bebê — minimalista e contemporâneo.</li>
        <li><strong>Saquinho de celofane fosco + fita de cetim</strong> na cor do tema — leve e delicado.</li>
        <li><strong>Caixa de acrílico transparente</strong> com fundo de papel decorativo — para revelar o formato do sabonete.</li>
      </ul>
      <p>Em todos os casos, a tag personalizada com nome, data e mensagem curta ("Obrigada por celebrar conosco") é o detalhe que faz a peça parar nas mãos do convidado.</p>

      <h2>Inspirações por Ocasião</h2>
      <ul>
        <li><a href="/lembrancinhas-maternidade">Lembrancinhas de Maternidade</a> — kits perfumados com tag para receber as visitas do bebê.</li>
        <li><a href="/lembrancinhas-cha-de-bebe">Chá de Bebê</a> — formatos de ursinho, mamadeira, pezinho e coração.</li>
        <li><a href="/lembrancinhas-cha-revelacao">Chá Revelação</a> — composições rosa e azul que mantêm o suspense.</li>
        <li><a href="/lembrancinhas-batizado">Batizado</a> — cruz, anjo e terço em paleta branca e dourada.</li>
        <li><a href="/lembrancinhas-aniversario-infantil">Aniversário Infantil</a> — temas e personagens favoritos da criança.</li>
        <li><a href="/lembrancinhas-formatura">Formatura</a> — capelo, diploma e cores da turma.</li>
      </ul>

      <h2>Sem tempo para fazer? Nós ajudamos</h2>
      <p>Produzir em casa é um gesto lindo — quando há tempo, espaço e disposição para experimentar. Para quem prefere garantir um <strong>resultado profissional impecável</strong>, com fragrâncias testadas, embalagem refinada e tag artesanal pronta, o Empório LeleCute produz <strong>kits sob encomenda, feitos à mão</strong>, com a personalização do nome do homenageado e da data da celebração.</p>
      <ul>
        <li><strong>Enviamos para todo o Brasil</strong> via Correios ou transportadora, com cálculo de frete pelo CEP.</li>
        <li><strong>Retirada rápida em mãos em São José dos Pinhais e Curitiba</strong> — a opção ideal para quem precisa de uma lembrancinha de última hora com a mesma qualidade de quem encomendou com semanas de antecedência.</li>
        <li>Arte da personalização enviada para sua aprovação antes da produção.</li>
      </ul>
      <p><strong><a href="https://wa.me/5541992214299?text=${encodeURIComponent(
        "Olá! Vim do blog e gostaria de um orçamento de lembrancinhas artesanais.",
      )}" target="_blank" rel="noopener noreferrer">Falar agora com a artesã pelo WhatsApp →</a></strong></p>
      <h3>Modelos prontos para encomendar</h3>
      <ul>
        <li><a href="/produto/lembrancinha-sabonete-coracao-amore">Sabonete Coração Amore</a> — delicado e perfeito para maternidade, casamento e chá de bebê.</li>
        <li><a href="/produto/sabonete-cerejinha-letra">Sabonete Cerejinha + Letra</a> — com a inicial do homenageado.</li>
        <li><a href="/produto/sabonete-cerejinha-letra-mini-coracao">Sabonete Cerejinha + Letra + Mini Coração</a> — versão com detalhe extra.</li>
      </ul>
      <p>Você também pode explorar o <a href="/produtos">catálogo completo</a> ou começar pela página da sua ocasião acima.</p>
    `,
    faqs: [
      {
        question: "Posso usar a base de glicerina vencida para fazer sabonete artesanal?",
        answer:
          "Não recomendamos. A base de glicerina vencida perde transparência, libera odor e pode irritar a pele do convidado. Sempre verifique o lote e use bases dentro do prazo, armazenadas longe da luz solar direta.",
      },
      {
        question: "Quantos sabonetes consigo fazer com 500 g de base de glicerina?",
        answer:
          "Em média, 10 a 15 sabonetes pequenos (35–50 g cada), tamanho ideal para lembrancinha. Para peças menores em forma de coração ou pezinho de bebê, o rendimento sobe para 18–20 unidades.",
      },
      {
        question: "Qual fragrância é mais indicada para lembrancinhas de chá de bebê e maternidade?",
        answer:
          "Aromas suaves como talco, algodão, lavanda, baunilha e leite & mel funcionam melhor para bebês e ambientes da maternidade. Evite fragrâncias amadeiradas ou cítricas fortes nesses contextos.",
      },
      {
        question: "Por quanto tempo o sabonete artesanal dura depois de pronto?",
        answer:
          "Sabonetes em base glicerinada duram em média 6 meses se armazenados em local seco e arejado. Embalagens em celofane ou organza preservam a fragrância por mais tempo.",
      },
      {
        question: "Vale mais a pena fazer em casa ou encomendar lembrancinhas prontas?",
        answer:
          "Para até 10 unidades e quando há tempo de testar, o DIY é prazeroso. Acima disso — e principalmente quando o evento se aproxima — encomendar com uma artesã experiente garante padrão visual, embalagem profissional e prazo cumprido. No Empório LeleCute trabalhamos com produção em 7 dias úteis e entrega para todo o Brasil.",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // POST 2 — MATERNIDADE
  // ────────────────────────────────────────────────────────────────
  {
    slug: "lembrancinhas-maternidade-ideias-criativas",
    title: "Lembrancinhas de Maternidade: 12 ideias criativas e econômicas",
    excerpt:
      "Descubra 12 ideias de lembrancinhas de maternidade que encantam as visitas, cabem no orçamento e podem ser personalizadas com o nome do bebê.",
    seoTitle: "Lembrancinhas de Maternidade: 12 Ideias Criativas e Econômicas",
    seoDescription:
      "12 ideias de lembrancinhas de maternidade lindas e econômicas: sabonetes, velas, sachês e kits personalizados com o nome do bebê.",
    publishedAt: "2026-05-13",
    readingMinutes: 6,
    category: "Inspiração",
    tags: ["maternidade", "lembrancinhas", "bebê"],
    author: AUTHOR,
    published: true,
    relatedSlugs: [
      "como-fazer-sabonete-artesanal-para-lembrancinhas",
      "cha-de-bebe-e-cha-revelacao-lembrancinhas",
    ],
    contentHtml: `
      <p>A chegada do bebê é o momento mais esperado — e oferecer uma <strong>lembrancinha de maternidade</strong> para as visitas é uma forma carinhosa de agradecer quem foi conhecer o pequeno. Reunimos aqui 12 ideias práticas, bonitas e que cabem no bolso.</p>

      <h2>Por que dar lembrancinha na maternidade?</h2>
      <p>Diferente do chá de bebê (planejado com semanas de antecedência), a maternidade exige praticidade: a lembrancinha precisa estar <strong>pronta antes do parto</strong>, ser leve, perfumada de forma suave e fácil de distribuir no quarto.</p>

      <h2>12 ideias de lembrancinhas para encantar as visitas</h2>
      <ol>
        <li><strong>Mini sabonete em formato de ursinho</strong> — clássico, perfumado e econômico.</li>
        <li><strong>Sabonete coração</strong> com tag "Obrigada por nos visitar".</li>
        <li><strong>Vela aromática</strong> em potinho de vidro com nome do bebê.</li>
        <li><strong>Sachê perfumado</strong> para guarda-roupa.</li>
        <li><strong>Mini hidratante</strong> em embalagem personalizada.</li>
        <li><strong>Difusor de ambiente</strong> em mini frasco.</li>
        <li><strong>Kit lavabo</strong> com sabonete líquido + sólido.</li>
        <li><strong>Sabonete em formato de pezinho</strong> de bebê.</li>
        <li><strong>Mini saboneteira</strong> com sabonete dentro.</li>
        <li><strong>Tubete com balas</strong> e tag personalizada.</li>
        <li><strong>Mini álcool em gel</strong> perfumado.</li>
        <li><strong>Caixinha mista</strong> com sabonete + bombom.</li>
      </ol>

      <h2>Quanto custa em média?</h2>
      <p>O preço por unidade varia de <strong>R$ 4 a R$ 12</strong>, dependendo do tamanho, embalagem e personalização. Para 30 a 50 visitas, o investimento médio fica entre R$ 150 e R$ 400 — bem mais acessível que outras lembranças decorativas.</p>

      <h2>Onde encomendar lembrancinhas de maternidade prontas</h2>
      <p>No Empório LeleCute oferecemos kits completos prontos para a maternidade, com personalização do nome do bebê, tag artesanal e embalagem em organza. Veja todos os modelos disponíveis na nossa <a href="/lembrancinhas-maternidade">página de Lembrancinhas de Maternidade</a> ou explore o <a href="/produtos">catálogo completo</a>.</p>

      <p>Quer fazer você mesma? Confira nosso <a href="/blog/como-fazer-sabonete-artesanal-para-lembrancinhas">guia passo a passo de sabonete artesanal</a>.</p>
    `,
  },

  // ────────────────────────────────────────────────────────────────
  // POST 3 — CHÁ DE BEBÊ + CHÁ REVELAÇÃO
  // ────────────────────────────────────────────────────────────────
  {
    slug: "cha-de-bebe-e-cha-revelacao-lembrancinhas",
    title: "Chá de Bebê e Chá Revelação: ideias de lembrancinhas que encantam",
    excerpt:
      "Inspirações de lembrancinhas para chá de bebê e chá revelação: temas, paletas, sabonetes personalizados e dicas para acertar na escolha.",
    seoTitle: "Lembrancinhas para Chá de Bebê e Chá Revelação | Ideias e Dicas",
    seoDescription:
      "Guia com ideias de lembrancinhas para chá de bebê e chá revelação: temas, paletas, sabonetes personalizados e dicas para escolher.",
    publishedAt: "2026-05-13",
    readingMinutes: 7,
    category: "Inspiração",
    tags: ["chá de bebê", "chá revelação", "lembrancinhas"],
    author: AUTHOR,
    published: true,
    relatedSlugs: [
      "lembrancinhas-maternidade-ideias-criativas",
      "como-fazer-sabonete-artesanal-para-lembrancinhas",
    ],
    contentHtml: `
      <p>O <strong>chá de bebê</strong> e o <strong>chá revelação</strong> são dois dos momentos mais aguardados pela família, e a lembrancinha tem papel especial: representa o carinho da anfitriã com cada convidado. Veja como acertar.</p>

      <h2>Chá de bebê: o que considerar</h2>
      <ul>
        <li><strong>Tema da festa</strong> — combine a lembrancinha com a paleta (safari, nuvens, ursinhos, balão).</li>
        <li><strong>Quantidade</strong> — encomende 10–20% a mais para imprevistos.</li>
        <li><strong>Personalização</strong> — tags com nome do bebê e data.</li>
        <li><strong>Praticidade</strong> — itens fáceis de transportar e que não derretam.</li>
      </ul>

      <h2>Top lembrancinhas para chá de bebê</h2>
      <ol>
        <li>Sabonete em formato de ursinho, mamadeira ou pezinho.</li>
        <li>Velinhas em potinhos com tag personalizada.</li>
        <li>Mini hidratante com rótulo customizado.</li>
        <li>Caixinha kraft com sabonete + bala.</li>
        <li>Saquinho de organza com 2 sabonetes mini.</li>
      </ol>
      <p>Veja nossa página dedicada de <a href="/lembrancinhas-cha-de-bebe">Lembrancinhas para Chá de Bebê</a> com todos os modelos disponíveis.</p>

      <h2>Chá revelação: o segredo da paleta dupla</h2>
      <p>No chá revelação, a graça está em <strong>manter o suspense</strong>. A lembrancinha pode entrar em duas estratégias:</p>
      <ul>
        <li><strong>Neutra antes da revelação</strong> — sabonetes brancos ou amarelos com tag "menino ou menina?".</li>
        <li><strong>Personalizada após</strong> — entregue ao final, com a cor já confirmada.</li>
      </ul>

      <h3>Combinações que funcionam</h3>
      <ul>
        <li>Mini sabonete rosa + azul no mesmo saquinho.</li>
        <li>Vela bicolor (metade de cada cor).</li>
        <li>Caixinha "team boy / team girl" para os palpites.</li>
      </ul>
      <p>Confira inspirações específicas na nossa página de <a href="/lembrancinhas-cha-revelacao">Lembrancinhas para Chá Revelação</a>.</p>

      <h2>Personalização: o detalhe que faz a diferença</h2>
      <p>Tags com nome, data e mensagem curta ("Obrigada por compartilhar este momento") elevam qualquer lembrancinha. No Empório LeleCute, todas as lembrancinhas saem com tag artesanal incluída — basta informar os dados na encomenda.</p>

      <p>Quer fazer em casa? Veja o <a href="/blog/como-fazer-sabonete-artesanal-para-lembrancinhas">tutorial completo de sabonete artesanal</a>. Para encomendar prontas, fale com a artesã pelo WhatsApp ou explore o <a href="/produtos">catálogo completo</a>.</p>
    `,
  },

  // ────────────────────────────────────────────────────────────────
  // POST 4 — BATIZADO + ANIVERSÁRIO + FORMATURA
  // ────────────────────────────────────────────────────────────────
  {
    slug: "lembrancinhas-batizado-aniversario-formatura",
    title: "Lembrancinhas para Batizado, Aniversário e Formatura: guia rápido",
    excerpt:
      "Ideias de lembrancinhas artesanais para batizado, aniversário infantil e formatura: símbolos, cores, paletas e dicas de personalização.",
    seoTitle: "Lembrancinhas para Batizado, Aniversário e Formatura | Empório LeleCute",
    seoDescription:
      "Guia rápido com ideias de lembrancinhas para batizado, aniversário infantil e formatura: símbolos, paletas e personalização.",
    publishedAt: "2026-05-13",
    readingMinutes: 6,
    category: "Inspiração",
    tags: ["batizado", "aniversário", "formatura", "lembrancinhas"],
    author: AUTHOR,
    published: true,
    relatedSlugs: [
      "como-fazer-sabonete-artesanal-para-lembrancinhas",
      "lembrancinhas-maternidade-ideias-criativas",
    ],
    contentHtml: `
      <p>Cada celebração pede uma lembrancinha com a sua identidade. Reunimos aqui as ideias que mais funcionam para três momentos muito especiais: <strong>batizado</strong>, <strong>aniversário infantil</strong> e <strong>formatura</strong>.</p>

      <h2>Batizado: delicadeza e significado</h2>
      <p>A lembrancinha de batizado costuma ter <strong>tom religioso suave</strong>, sem exageros. Os formatos mais pedidos são:</p>
      <ul>
        <li>Sabonete em formato de <strong>cruz</strong>, <strong>anjo</strong> ou <strong>terço</strong>.</li>
        <li>Mini terço com tag personalizada.</li>
        <li>Saquinhos brancos com sabonete + tag religiosa.</li>
      </ul>
      <p>Cores ideais: branco, off-white, dourado e tons pastel. Veja modelos prontos na <a href="/lembrancinhas-batizado">página de Lembrancinhas para Batizado</a>.</p>

      <h2>Aniversário infantil: tema é tudo</h2>
      <p>Em festa de criança, a lembrancinha precisa <strong>conversar com o tema</strong>. Algumas combinações que sempre dão certo:</p>
      <ul>
        <li><strong>Safari / Jardim</strong> — sabonetes em formato de animais.</li>
        <li><strong>Princesas</strong> — formatos de coroa, coração e estrela em tons pastel.</li>
        <li><strong>Carrinhos / Dinos</strong> — formatos temáticos em cores vivas.</li>
        <li><strong>Unicórnio</strong> — paleta rosa, lilás e dourado com glitter.</li>
      </ul>
      <p>Confira ideias completas em <a href="/lembrancinhas-aniversario-infantil">Lembrancinhas para Aniversário Infantil</a>.</p>

      <h2>Formatura: elegância e memória afetiva</h2>
      <p>A lembrancinha de formatura marca o fim de um ciclo. Aposte em peças <strong>úteis e elegantes</strong>, na cor da turma:</p>
      <ul>
        <li>Sabonetes em formato de <strong>capelo</strong> ou <strong>diploma</strong>.</li>
        <li>Mini velas perfumadas com tag "Formada(o) [ano]".</li>
        <li>Caixinhas com sabonete + bombom artesanal.</li>
      </ul>
      <p>Veja todas as opções em <a href="/lembrancinhas-formatura">Lembrancinhas para Formatura</a>.</p>

      <h2>Dica final: comece cedo</h2>
      <p>Para encomendas acima de 50 unidades, recomendamos iniciar o pedido com pelo menos <strong>3 semanas de antecedência</strong> — assim sobra tempo para escolher essência, ajustar tags e revisar a embalagem.</p>

      <p>Pronto para encomendar? Fale com a artesã pelo WhatsApp ou explore nosso <a href="/produtos">catálogo completo de sabonetes personalizados</a>. Quer fazer você mesma? Veja o <a href="/blog/como-fazer-sabonete-artesanal-para-lembrancinhas">guia passo a passo</a>.</p>
    `,
  },

  // ────────────────────────────────────────────────────────────────
  // POST 5 — BATIZADO (apoia /lembrancinhas-batizado)
  // ────────────────────────────────────────────────────────────────
  {
    slug: "lembrancinhas-de-batizado-tradicao-e-elegancia",
    title: "Lembrancinhas de Batizado: como escolher com tradição e elegância",
    excerpt:
      "Símbolos cristãos, cores litúrgicas, formatos clássicos e dicas práticas para escolher uma lembrancinha de batizado que emocione padrinhos e convidados.",
    seoTitle: "Lembrancinhas de Batizado: Guia para Escolher com Elegância",
    seoDescription:
      "Como escolher lembrancinhas de batizado: símbolos, cores, quantidade ideal, personalização com nome do bebê e dicas para padrinhos e convidados.",
    publishedAt: "2026-05-14",
    readingMinutes: 7,
    category: "Inspiração",
    tags: ["batizado", "lembrancinhas", "tradição", "padrinhos"],
    author: AUTHOR,
    published: true,
    relatedSlugs: [
      "como-fazer-sabonete-artesanal-para-lembrancinhas",
      "lembrancinhas-maternidade-ideias-criativas",
      "lembrancinhas-de-aniversario-infantil-tematizadas",
    ],
    contentHtml: `
      <p>O batizado é um dos rituais mais delicados da vida em família — celebra fé, pertencimento e o início simbólico de uma jornada espiritual. A lembrancinha entregue aos convidados nesse dia precisa <strong>traduzir reverência sem perder a doçura</strong> que envolve a ocasião. Este guia reúne tudo o que aprendemos atendendo famílias católicas, evangélicas e ecumênicas no <a href="/lembrancinhas-batizado">Empório LeleCute</a>.</p>

      <h2>Símbolos clássicos que nunca saem de moda</h2>
      <ul>
        <li><strong>Cruz</strong> — em formato delicado, fica linda em sabonete branco com tag dourada.</li>
        <li><strong>Anjo de guarda</strong> — perfeito para padrinhos e madrinhas mais próximos.</li>
        <li><strong>Pomba do Espírito Santo</strong> — discreta, branca, simboliza paz.</li>
        <li><strong>Concha</strong> — referência direta ao gesto do batismo, especialmente na tradição católica.</li>
        <li><strong>Terço miniatura</strong> — combina bem com sabonete em forma de coração.</li>
      </ul>

      <h2>Paleta de cores: o que funciona</h2>
      <p>Branco e dourado seguem como a dupla mais elegante e atemporal. Para batizados de meninas, tons pastel de rosa antigo ou lilás suavizam. Para meninos, azul céu ou verde menta evitam o azul royal, que costuma ser pesado em peças pequenas. Beges e off-whites combinam com qualquer paleta da cerimônia.</p>

      <h2>Quantidade ideal</h2>
      <p>Calcule <strong>1 lembrancinha por adulto convidado</strong> + 10% de margem para imprevistos. Para crianças, considere uma lembrancinha extra temática (mini sabonete em formato de bichinho, por exemplo) — costuma ser bem recebida.</p>

      <h2>Personalização que toca</h2>
      <p>Tags com o nome do bebê, data do batizado e um versículo curto (Salmos 91:11 é um clássico) elevam a peça. Evite excesso de informação na tag — três linhas é o ideal para manter a delicadeza visual.</p>

      <h2>Embalagem: o detalhe que faz a diferença</h2>
      <p>Saquinhos de organza branca ou marfim com cordão de cetim funcionam para qualquer estilo. Para batizados mais formais, caixinhas kraft com selo personalizado dão o toque premium. Fitas de juta combinam com decoração rústica ou ao ar livre.</p>

      <h2>Quando encomendar</h2>
      <p>Para batizados com até 50 convidados, encomende com <strong>15 dias de antecedência</strong>. Acima disso, 3 semanas. No Empório LeleCute, produzimos sob encomenda em 7 dias úteis e enviamos para todo o Brasil — você recebe a arte da personalização para aprovar antes da produção.</p>

      <p>Veja modelos prontos com símbolos cristãos na nossa <a href="/lembrancinhas-batizado">página de lembrancinhas de batizado</a> ou explore o <a href="/produtos">catálogo completo</a>. Para entender o processo artesanal, leia nosso <a href="/blog/como-fazer-sabonete-artesanal-para-lembrancinhas">guia de sabonete passo a passo</a>.</p>
    `,
  },

  // ────────────────────────────────────────────────────────────────
  // POST 6 — ANIVERSÁRIO INFANTIL (apoia /lembrancinhas-aniversario-infantil)
  // ────────────────────────────────────────────────────────────────
  {
    slug: "lembrancinhas-de-aniversario-infantil-tematizadas",
    title: "Lembrancinhas de Aniversário Infantil: 10 temas que encantam",
    excerpt:
      "Safari, jardim encantado, fundo do mar, princesas, dinossauros — 10 temas testados de lembrancinhas de aniversário infantil com dicas de personalização.",
    seoTitle: "Lembrancinhas de Aniversário Infantil Tematizadas: 10 Ideias",
    seoDescription:
      "10 temas de lembrancinhas de aniversário infantil personalizadas: safari, jardim, fundo do mar, princesas, dinossauros e mais. Modelos artesanais.",
    publishedAt: "2026-05-14",
    readingMinutes: 6,
    category: "Inspiração",
    tags: ["aniversário", "infantil", "lembrancinhas", "festas"],
    author: AUTHOR,
    published: true,
    relatedSlugs: [
      "lembrancinhas-de-batizado-tradicao-e-elegancia",
      "lembrancinhas-maternidade-ideias-criativas",
      "lembrancinhas-de-formatura-ideias-elegantes",
    ],
    contentHtml: `
      <p>Lembrancinha de aniversário infantil que dá certo é aquela que <strong>conversa com o tema da festa</strong> e cabe na sacolinha sem sobrar nem faltar. Reunimos 10 temas que mais saem no <a href="/lembrancinhas-aniversario-infantil">Empório LeleCute</a> e o que faz cada um funcionar.</p>

      <h2>1. Safári</h2>
      <p>Sabonetes em formato de leão, girafa, elefante e zebra. Tons terrosos com tag em corda de juta. Combina com decoração folhagem.</p>

      <h2>2. Jardim Encantado</h2>
      <p>Borboletas, joaninhas, flores e cogumelos. Cores pastel e tag em cartonagem texturizada. Funciona para meninos e meninas.</p>

      <h2>3. Fundo do Mar</h2>
      <p>Conchas, estrelas-do-mar, peixinhos e cavalos-marinhos. Aromas de algas ou brisa marinha. Embalagem em saquinho azul claro.</p>

      <h2>4. Princesas e Castelos</h2>
      <p>Coroas, varinhas mágicas e sapatinhos. Rosa antigo + dourado. Tag manuscrita com letra cursiva.</p>

      <h2>5. Dinossauros</h2>
      <p>T-rex, brontossauro e ovos. Verde musgo e cinza vulcânico. Embalagem rústica em papel kraft com pegadas estampadas.</p>

      <h2>6. Espacial / Astronauta</h2>
      <p>Foguetes, planetas, estrelas e luas. Glitter discreto na base do sabonete. Tag preta com letras prata.</p>

      <h2>7. Circo</h2>
      <p>Palhacinhos, balões, pipoca e ursinhos. Vermelho e branco listrados. Funciona muito bem para festas de 1 ano.</p>

      <h2>8. Unicórnios</h2>
      <p>Sabonetes em formato de unicórnio com cores degradê (rosa → lilás → azul). Glitter holográfico. Hit absoluto entre 4 e 8 anos.</p>

      <h2>9. Super-Heróis</h2>
      <p>Capa, escudo, raio. Cores primárias vibrantes. Tag em formato de estrela.</p>

      <h2>10. Bichinhos da Fazenda</h2>
      <p>Vaquinha, porquinho, galinha e ovelha. Carinho garantido para festas de 1 e 2 anos. Embalagem em xadrez vichy.</p>

      <h2>Dica de quantidade</h2>
      <p>Para festas infantis, calcule <strong>1 lembrancinha por criança convidada</strong> + 5 a 10 extras. Adultos costumam não levar — mas vale ter algumas peças "para os tios" se a festa for em casa.</p>

      <p>Encontre todos esses modelos na <a href="/lembrancinhas-aniversario-infantil">página de aniversário infantil</a> ou explore o <a href="/produtos">catálogo completo</a> do Empório LeleCute. Cada peça é personalizada com o nome e idade do aniversariante.</p>
    `,
  },

  // ────────────────────────────────────────────────────────────────
  // POST 7 — FORMATURA (apoia /lembrancinhas-formatura)
  // ────────────────────────────────────────────────────────────────
  {
    slug: "lembrancinhas-de-formatura-ideias-elegantes",
    title: "Lembrancinhas de Formatura: ideias elegantes para celebrar a conquista",
    excerpt:
      "Capelos, diplomas, cores institucionais e personalização com o nome do formando — guia completo para escolher lembrancinhas de formatura memoráveis.",
    seoTitle: "Lembrancinhas de Formatura: Ideias Elegantes e Personalizadas",
    seoDescription:
      "Lembrancinhas de formatura artesanais: capelos, diplomas, cores institucionais e dicas de personalização para celebrar a conquista do formando.",
    publishedAt: "2026-05-14",
    readingMinutes: 5,
    category: "Inspiração",
    tags: ["formatura", "lembrancinhas", "graduação"],
    author: AUTHOR,
    published: true,
    relatedSlugs: [
      "lembrancinhas-de-aniversario-infantil-tematizadas",
      "lembrancinhas-de-batizado-tradicao-e-elegancia",
      "como-fazer-sabonete-artesanal-para-lembrancinhas",
    ],
    contentHtml: `
      <p>Formatura marca o fim de um ciclo — cinco, sete, dez anos de dedicação. A lembrancinha desse dia precisa <strong>celebrar a conquista com a sobriedade que ela merece</strong>, mas sem perder o carinho de quem entrega. No <a href="/lembrancinhas-formatura">Empório LeleCute</a> atendemos turmas de medicina, direito, pedagogia, infantil ao ensino médio — cada uma com sua linguagem visual.</p>

      <h2>Símbolos clássicos da formatura</h2>
      <ul>
        <li><strong>Capelo</strong> (chapéu acadêmico) — o ícone universal, funciona em qualquer curso.</li>
        <li><strong>Diploma enrolado</strong> com fita — elegante, combina com cores institucionais.</li>
        <li><strong>Símbolos do curso</strong> — caduceu (medicina), balança (direito), engrenagem (engenharia), pincel (artes).</li>
        <li><strong>Letra inicial</strong> da turma ou do nome do formando.</li>
      </ul>

      <h2>Cores institucionais</h2>
      <p>Quase todo curso tem uma cor oficial. Vale conferir com a comissão de formatura antes de fechar a paleta. Combinações tradicionais: preto + dourado (formatura clássica), bordô + cinza (medicina), azul marinho + prata (engenharia), verde + dourado (farmácia), roxo + dourado (matemática).</p>

      <h2>Personalização</h2>
      <p>Tag com nome do formando, ano de formatura e instituição funciona melhor que frases longas. Para turmas grandes, algumas comissões pedem versão "genérica" com nome da turma ("Turma 2026 — Direito UFPR") + nome individual em cada peça.</p>

      <h2>Quantidade e quem recebe</h2>
      <p>Pais, irmãos, padrinhos da formatura, professores homenageados, paraninfo, colegas de turma e familiares próximos. Em média, formandos pedem entre <strong>30 e 80 lembrancinhas</strong>. Vale combinar com a turma uma compra coletiva — diluindo o custo e padronizando o visual.</p>

      <h2>Quando encomendar</h2>
      <p>Para entregas individuais, 2 semanas antes da colação de grau. Para compra coletiva da turma (acima de 200 unidades), planeje com 4 semanas. Produzimos em 7 dias úteis e enviamos para todo o Brasil.</p>

      <p>Conheça nossos modelos para formandos na <a href="/lembrancinhas-formatura">página de formatura</a> ou explore o <a href="/produtos">catálogo completo</a>. Quer entender como fazemos cada peça? Leia o <a href="/blog/como-fazer-sabonete-artesanal-para-lembrancinhas">guia do processo artesanal</a>.</p>
    `,
  },
];

export const getPublishedPosts = () =>
  BLOG_POSTS.filter((p) => p.published).sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );

export const getPostBySlug = (slug: string) =>
  BLOG_POSTS.find((p) => p.slug === slug && p.published);

export const getRelatedPosts = (slug: string, limit = 3) => {
  const current = BLOG_POSTS.find((p) => p.slug === slug);
  if (!current) return [];
  const explicit = (current.relatedSlugs || [])
    .map((s) => BLOG_POSTS.find((p) => p.slug === s && p.published))
    .filter((p): p is BlogPost => Boolean(p));
  if (explicit.length >= limit) return explicit.slice(0, limit);
  const fillers = getPublishedPosts().filter(
    (p) => p.slug !== slug && !explicit.find((e) => e.slug === p.slug),
  );
  return [...explicit, ...fillers].slice(0, limit);
};
