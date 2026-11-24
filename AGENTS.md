# Architecture rules

- Motion preferences use one subscribed browser store across the header and global controller; effect setup and cleanup follow preference changes to prevent stale tilt and hidden content.

- Resolve checkout postal addresses through `src/lib/postal-address.ts`; centralizing provider fallback keeps automatic and manual CEP input consistent.
- Editorial packaging uses a shared story rendered through the PDP registry; the admin synchronizes its institutional page to keep the two surfaces aligned.
- After-sales rules live outside product-save payloads, keyed by product ID or global scope; follow-ups remain blocked until sending prerequisites exist, preventing accidental customer emails.
- Search boost previews use an admin-only, read-only ranking RPC derived from the public search function; keep both rankers aligned when search semantics change, and require a fresh draft preview before UI publication.
- Global SEO uses existing seo_config and robots_config records; sitemap counts parse page URL nodes from actual XML and distinguish generated XML from published static artifacts.
- Operational policy is admin-only; unresolved high regressions remain blocked across repeated scans until approval or verified resolution, and scheduled workers authenticate with private database credentials.
- Image retries use a role-checked RPC; service-only leased claims fence completion and reclaim interrupted work, while clients cannot directly update job state.
- Support threads are route-derived and account-scoped; server-owned messages, authenticated order email checks, mandatory help retrieval and a human inbox prevent cross-customer exposure and unsupported answers; resolved threads reject further messages.

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
