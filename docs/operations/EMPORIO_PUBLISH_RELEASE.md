# Publicação enxuta — Empório LeleCute
Data: 2026-11-09 | Projeto Vercel: msolus/emporiolelecute | GitHub: hrq16000-a11y/emporiolelecute-2026

## Diagnóstico
- DNS apex na Vercel: verificado configurado (A 216.198.79.1) e domínio atribuído ao deployment de produção. Não modificar DNS.
- GitHub main recebe atualizações frequentes originadas no Lovable. Preview e produção são ambientes diferentes; uma imagem de Preview não comprova o domínio publicado.
- A loja usa Vite com assets versionados por hash. Uma aba antiga pode continuar executando JS anterior mesmo depois de um deployment novo.

## Atualizações sem custo de build
- /natal lista produtos ativos associados por categoria, ocasião ou tag com slug relacionado a Natal; consulta o catálogo público já existente.
- React Query compartilha cache e atualiza a coleção a cada 5 minutos em tela ativa ou ao retornar à aba. Inclusões, exclusões lógicas e imagens atualizadas não exigem novo deploy.
- A aplicação detecta HTML com novo hash de bundle até a cada 30 minutos com um GET apenas se aba visível, e oferece atualização manual. Não dá reload automático em carrinho, pedido ou admin.
- Em novas publicações, arquivos JS usam nomes hash; não forçar recarregar consumidores em checkout.

## Economia e segurança
- Previews automáticos do projeto Empório desativados na Vercel a pedido; GitHub PRs + testes, Vercel somente para versão liberada em main. Isso não protege contra commits diretos no main vindos do Lovable; exigir disciplina de branches/revisão ou regra de release adicional.
- Retenção: Vercel > Settings > Security > Deployment Retention; preservar a produção atual, o último rollback e deployments com aliases/branches ativos; remover somente o que puder ser descartado.
- Storage de deployment Hobby é acumulado por versões e projetos da equipe; não equivale ao peso de um site individual. A limpeza não necessariamente reduz imediatamente o valor do período medido em GB-mês.
- Não executar exclusão em massa nem apagar projetos/staging. Sem API de exclusão de deployments no conector disponível, fazer limpeza controlada pelo painel ou Work autorizado.
- Preparar uma release apenas após CI, inspeção do Preview quando disponível e verificação do domínio, SEO e fluxo de compra.
