# Architecture rules

- Selected-security homologation uses an opt-in QA branch, disposable local Auth/PostgREST and an explicit minimal schema with loopback-only egress; execute actual handlers with memory-only mail and never replay this fixture against shared Cloud or conflate it with full migration/RLS homologation.
- Vercel's ignored-build command exits 0 for production and 1 for previews; previews stay disabled, so Git sync cannot silently publish.

- Public order tracking exposes an explicit status/delivery/payment-summary allowlist, never internal IDs, purchased items or personal data; details require a verified matching account or server-verified admin. New LC capabilities use eighteen cryptographically sampled symbols, while historical codes retain the same public privacy boundary.
- Both tracking endpoints apply bounded per-worker attempt limits (not a global quota); SSE capabilities travel in POST bodies, not URLs. Diagnostic and analytics sinks use shared recursive redaction and skip advertising events on tracking routes to reduce token exposure.
- Notification preferences verify a confirmed matching account before scoped order queries; uniform authorization denials prevent third-party order discovery. Subscription insertion ignores endpoint conflicts and updates are email-owner-scoped so endpoint ownership cannot transfer.
- Shipping quotes authenticate a non-anonymous account before provider/cache/audit access, resolve only active catalog items and reject mixed unavailable carts; guests use WhatsApp and diagnostics omit destination postcodes to protect carrier credentials and delivery privacy.

- Motion preferences use one subscribed browser store across controllers; public pages ignore legacy device preferences and private account preference is loaded only inside the authorized panel, cleared on exit, and persisted in user_preferences; system reduction always wins.
- Hero slides share a static grid stage with responsive banner aspect ratios; only internal images and opacity animate, so image loading and slide changes cannot resize the document stage.
- Floating WhatsApp controls render through a body portal to stay viewport-fixed outside transformed route containers; cart clicks still delegate to the validated checkout action.
- Home section loading and lazy Hero mounting share the banner loading shell; admin previews share a fixed outer stage and stop their timers for either reduced-motion preference, preventing layout changes during device cycling.

- Resolve checkout postal addresses through `src/lib/postal-address.ts`; centralizing provider fallback keeps automatic and manual CEP input consistent.
- Editorial packaging uses a shared story rendered through the PDP registry; the admin synchronizes its institutional page to keep the two surfaces aligned.
- After-sales rules live outside product-save payloads, keyed by product ID or global scope; follow-ups remain blocked until sending prerequisites exist, preventing accidental customer emails.
- Search boost previews use an admin-only, read-only ranking RPC derived from the public search function; keep both rankers aligned when search semantics change, and require a fresh draft preview before UI publication.
- Global SEO uses existing seo_config and robots_config records; sitemap counts parse page URL nodes from actual XML and distinguish generated XML from published static artifacts.
- Operational policy is admin-only; unresolved high regressions remain blocked across repeated scans until approval or verified resolution, and scheduled workers authenticate with private database credentials.
- Image retries use a role-checked RPC; service-only leased claims fence completion and reclaim interrupted work, while clients cannot directly update job state.
- Support threads are route-derived and account-scoped; server-owned messages, authenticated order email checks, mandatory help retrieval and a human inbox prevent cross-customer exposure and unsupported answers; resolved threads reject further messages.
- Search print reports insert visitor-provided values with textContent; status emails require a verified admin and use saved order fields, preventing stored script execution and forged notifications.
- Code-based order sends require a server-verified confirmed non-anonymous owner or database-verified admin, with owner-scoped lookup and uniform denials; customer confirmations still require mailbox matching, while guest checkout/WhatsApp and fixed-inbox quote forms remain independent to prevent discovery and unsolicited sends.
- Indexation monitoring requires admin or private worker credentials and a fixed HTTPS store-origin allowlist for requested and sitemap URLs, with redirects disabled to prevent private-service access.
- Administrative SEO and media workers share server-verified admin or exact private worker authentication before any effects; public crawler rendering filters unpublished pages.
- Business schema is a route-owned script with a stable public logo and sorted configured profiles to avoid asynchronous head duplication; product and crawler schemas omit unsupported stock, review counts and invalid offers.

## Skills locais — Empório LeleCute (separado da 0WEB)

Leia .agents/skills/lelecute-commerce-experience/SKILL.md para vitrine, campanhas e conversão.
Leia .agents/skills/lelecute-storefront-qa/SKILL.md antes de concluir mudanças.
Leia .agents/skills/lelecute-safe-research/SKILL.md para benchmarking externo.
Critérios de adoção: docs/skills/COMPATIBILITY_0WEB.md.
Não importar identidade, preços, credenciais, funis ou ferramentas pagas da 0WEB; não executar scripts de terceiros sem revisão e autorização específicas.

## Adoção visual de referências externas (17/11/2026)

- **TasteSkill** (https://www.tasteskill.dev/): usar como referência crítica de direção de arte, identidade, hierarquia e layout; preservar a marca e criar composição original.
- **Transitions.dev** (https://transitions.dev/): adotar microtransições CSS pontuais em menus, filtros, modais e feedback; respeitar teclado, foco, contraste e `prefers-reduced-motion`. Evitar `transition: all`.
- **React Bits** (https://reactbits.dev/): avaliar componentes React gratuitos individualmente e verificar licença MIT + Commons Clause, dependências e custo de hidratação. Sem instalação em massa ou uso de Pro não licenciado.
- **RiseClub** (https://riseclub.tech/): somente benchmark de comunidade, trilhas, notícias e engajamento; nunca copiar conteúdo, interface, imagens ou dados.
- Aplicação específica: Vitrine artesanal, PDP, personalização, orçamento e checkout existentes; fotos reais, hierarquia do produto, touch 44px, estados loading/empty/error. Preservar CEP, carrinho e identidade coral/creme; seguir os skills locais da LeleCute.
- Implementar em micro-PR própria, medir 390/1440 e preservar SEO, SSR (se houver), LCP, segurança, privacidade, funis e conteúdo factual. Nenhuma regra aqui autoriza mexer em produção, banco, RLS, DNS ou pagamentos.
- Checkout order prices are recomputed in the database from catalog products; client-sent prices, status and shipping are ignored so totals cannot be forged.
- Checkout performs a fresh active-catalog display preflight before submission and stops for customer review after changes; this never replaces atomic server price authorization.
- Optional visitor and advertising analytics share a fail-closed browser consent store; revocation discards queued events and reloads to stop already-executed third-party scripts.
- Visitor mutations require a 256-bit browser secret deriving the UUID through domain-separated SHA-256; share the pure capability helper between browser and edge, never reattach legacy IDs, and ignore caller pageview IDs to prevent profile/history forgery without schema changes. Device fields remain allowlisted and tracking/lead routines service-only.

## Padrão anti-site genérico — R8/10
- Para trabalho visual autorizado, ler `docs/skills/ANTI_GENERIC_EXPERIENCE.md` antes do código. TasteSkill, Transitions.dev, React Bits e Emil Kowalski são referências de princípios; as regras específicas do projeto prevalecem.

## Design engineering premium — Emil Kowalski (27/11/2026)

- Para qualquer trabalho visual autorizado, ler `docs/skills/EMIL_DESIGN_ENGINEERING.md` antes de editar runtime. Aplicar diagnóstico, direção de arte autoral, decisão de motion por frequência/propósito, performance, reduced motion e QA 390/768/1440; reaproveitar tokens e bibliotecas existentes.
- Referência oficial: https://github.com/emilkowalski/skills. As regras específicas deste repositório permanecem prioritárias. Esta documentação não autoriza execução automática de scripts, instalações, mudanças de código ou deploy.

## Padrão universal de contato e seleção contextual (27/11/2026)

- **Privacidade e identidade:** não publicar faixas decorativas de “Informações de contato” com e-mail operacional, cidade/endereço da operação, nome institucional antigo (Ping Soluções) ou cartões redundantes. Usar a marca própria do projeto e o canal/funil oficial existente. Não substituir a razão social por um nome inventado: aguardar a nova identidade confirmada. Distinguir informação promocional de identificação legal obrigatória, requisitos do comércio, privacidade/LGPD, endereço de cliente/loja autorizado e área geográfica de atendimento/SEO; preservar contratos e dados privados, sem alterar CNPJ, termos, integrações ou dados de terceiros por inferência.
- **Funil contextual em popup:** em CTAs de atendimento, orçamento, suporte, indicação ou cadastro, abrir o fluxo canônico sobre a página de origem (dialog/modal acessível, sheet no mobile quando adequado). Não navegar para uma página de contato como caminho comum. Preservar a rota e posição de scroll e capturar origem/posicionamento, especialidade, problema, objetivo, cidade/UF/bairro, modalidade/urgência apenas quando realmente conhecidos pela rota/ação ou selecionados pelo visitante. Reaproveitar contexto existente; não perguntar novamente nem obrigar a selecionar o que já foi confirmado. Permitir revisar/corrigir antes do envio. Manter link direto existente como fallback SSR/sem JS ou entrada deliberada, sem duplicar funil. Foco inicial e retorno ao gatilho, Escape, scroll interno, acessibilidade/teclado e reduced-motion; não perder rascunho por fechamento acidental.
- **Seleção inteligente universal:** para campos de escolha pesquisáveis (objetivo, especialidade, categoria, município, UF/bairro, serviço/produto, filtros e seletores administrativos compatíveis), permitir digitação + sugestões/autocomplete + seleção; não exigir percorrer catálogos extensos. Preferir componente combobox acessível já existente ou nativo comprovado; busca tolerante a caixa/acentos e sinônimos do catálogo, resultados priorizados e limitados, grupos quando úteis, estados vazio/loading/erro, navegação ↑/↓/Enter/Escape, toque e foco. Escolha automática somente quando correspondência inequívoca e confirmável, sem fingir decisão do visitante; guardar IDs canônicos, texto livre apenas onde permitido, e opção “Outro”/manual. Para escolhas pequenas, priorizar clareza e interação simples; quando compatível, permitir digitar. Preservar validação no servidor, catálogos, permissões, consentimento e contratos de checkout.
- **Contexto e dados:** prioridade = escolha explícita do visitante > contexto inequívoco da página/gatilho > defaults seguros; nunca sobrescrever edição ou inferir cidade/especialidade desconhecida. Origem imutável da abertura, UTM/atribuição sanitizadas; não incluir respostas, endereço, e-mail, telefone, dados privados, tokens ou texto livre em URL, analytics ou logs. Não armazenar ou enviar automaticamente; preservar as regras locais existentes de persistência autorizada, preços, revisão, consentimento e canal oficial.
- **QA/GO:** 390/768/1440 + teclado, reduced-motion, texto longo, lista de 100+ itens, pesquisa com/sem acento, vazio, seleção/auto-preenchimento explícito, edição/retorno, abrir/fechar na origem, contexto de serviço/cidade/problema e quatro intenções aplicáveis; nenhum envio real em QA. Preservar SSR, canonical, sitemap, SEO, LCP, acessibilidade, segurança, regras comerciais e isolamento por marca.
- **Execução:** norma permanente, não implementação estrutural automática. Inventariar os seletores/CTAs existentes, reutilizar a triagem/modal/combobox realmente compatível, integrar em micro-PR própria por projeto na futura rodada dedicada e publicar só com gates locais e confirmação. Não instalar dependências nem rodar agente/fila/Max do Lovable para esta documentação.

## Contrato de evolução do motor de atendimento e CRM (28/11/2026)

- Norma permanente e plano pós-ciclo visual: [docs/CONTRATO_MOTOR_ATENDIMENTO_E_CRM.md](docs/CONTRATO_MOTOR_ATENDIMENTO_E_CRM.md). Regras de cidade/bairro/UF contextual, classificação de modalidade, evidência necessária, persistência privada antes do WhatsApp, Google Sheets/CRM e CTA acessível. Respeitar o perfil local e os contratos vigentes. Registro documental; execução somente após concluir o ciclo visual atual.
