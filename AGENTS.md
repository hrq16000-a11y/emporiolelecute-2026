# Architecture rules

- Public order tracking exposes an explicit status/delivery/payment-summary allowlist, never internal IDs, purchased items or personal data; details require a verified matching account or server-verified admin. New LC capabilities use eighteen cryptographically sampled symbols, while historical codes retain the same public privacy boundary.
- Both tracking endpoints apply bounded per-worker attempt limits (not a global quota); SSE capabilities travel in POST bodies, not URLs. Diagnostic and analytics sinks use shared recursive redaction and skip advertising events on tracking routes to reduce token exposure.
- Notification preferences verify a confirmed matching account before scoped order queries; uniform authorization denials prevent third-party order discovery. Subscription insertion ignores endpoint conflicts and updates are email-owner-scoped so endpoint ownership cannot transfer.
- Public shipping quotes resolve only active catalog items and reject mixed unavailable carts; diagnostics and shipping audits omit destination postcodes to avoid retaining delivery data outside the quote flow.

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
- Visitor tracking accepts only random UUID visitor ids and an allowlist of device fields; tracking/lead routines run only through the tracking service.
