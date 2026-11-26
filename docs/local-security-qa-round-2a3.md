# Rodada 2A.3 — QA local descartável

O workflow dedicado roda somente em push na branch exata `fix/round-2a-local-rls-test-isolation`, acionamento manual dessa branch ou label `qa-local-approved` em PR da mesma branch e repositório. Job único, runner padrão, timeout 15 minutos. Nenhum deploy, link remoto ou secret de produção.

Reutiliza `supabase/config.toml`, migrations e `supabase/seed.sql` em runner descartável; remove configuração de ambiente remota e troca o project_id somente no workspace. Antes de iniciar, bloqueia saída externa dos containers Docker e restringe o usuário de testes ao loopback. Edge runtime não é iniciado. A instalação da CLI e o download de imagens ainda requerem rede do runner. Se o isolamento, o seed ou as migrations falharem, a execução deve falhar, não recorrer à nuvem.

Cobertura inicial: projeção de privacidade pura; sessões GoTrue de admin e dois clientes sintéticos; tentativa de promoção administrativa; checkout válido como controle positivo; leitura de pedidos e itens por anônimo e outro cliente; alteração de preço/subtotal/total no checkout; persistência conferida pelo admin local. Sem homologação ainda de pagamentos, cupons, frete, todos os RPCs ou Edge Functions em execução. Os 72 achados históricos continuam sem inventário individual recuperado.

Os testes não foram executados ao gravar esta rodada. Falhas no ambiente ou nos gates são NO-GO para homologação. Não considerar a mera presença do workflow como aprovação.

## Rodada 2A.5 — bloqueio de bootstrap

Run [45312276220](https://github.com/hrq16000-a11y/emporiolelecute-2026/actions/runs/45312276220): checkout, CLI, isolamento e limpeza concluídos; bootstrap falhou com SQLSTATE XX000 durante `cron.unschedule` na migration histórica de 20260814154716. Testes de segurança não executados. O workflow adapta exclusivamente no workspace descartável as três chamadas de remoção de jobs antigos para usar IDs existentes; não altera a migration versionada, não fabrica jobs e não ignora outras falhas. O ambiente resultante é uma homologação adaptada, não prova de replay integral das migrations originais. Exceção temporária do CI convencional permanece até revisão segura antes de merge.

## Rodada 2A.6 — segundo bloqueio de bootstrap

Run [45315103719](https://github.com/hrq16000-a11y/emporiolelecute-2026/actions/runs/45315103719): adaptação anterior executou; replay avançou até alteração de agendamento ausente na mesma migration, com `job_id can not be NULL (SQLSTATE XX000)`. Adaptadas no workspace as quatro chamadas de `cron.alter_job` de padrão idêntico, preservando os horários de jobs existentes. Verificados os 13 arquivos de migration a partir desse ponto: a única chamada posterior encontrada de alter_job já filtra por linha existente. Nenhuma migration versionada, RLS, RPC ou política alterada. Testes funcionais continuam não executados até novo run. CI convencional permanece restrito a esta branch até homologação segura antes do merge.

## Rodada 2A.7 — replay integral alcança o seed

Run [45315880759](https://github.com/hrq16000-a11y/emporiolelecute-2026/actions/runs/45315880759): logs registram 199 migrations distintas aplicadas, exatamente o total versionado; a última foi 20261109024000_operational_controls_parity.sql. A execução então falhou no seed: peso obrigatório positivo (SQLSTATE 23514). Corrigido exclusivamente o seed local com peso sintético de 0,30 kg nos dois produtos. Nenhum trigger, constraint, RLS ou RPC foi modificado. A reconstrução adaptada passou da etapa de migrations; não há evidência de outro bloqueio estrutural de replay nesse run. Próxima execução deve comprovar seed, Auth, RLS, privacidade e checkout. CI normal deve voltar com ambiente isolado antes de merge; os E2E existentes incluem catálogo e PDP e precisam de fixtures representativas, não acesso à produção. Inventário dos 72 achados segue pendente.


## Rodada 2A.8 — correção do campo de peso do seed

Run [45316707355](https://github.com/hrq16000-a11y/emporiolelecute-2026/actions/runs/45316707355) confirmou que o replay das 199 migrations chega ao seed, mas a validação de produto ainda falha. A primeira correção havia preenchido apenas `weight_kg`; a implementação administrativa (`AdminProductForm.tsx`) e a RPC canônica `save_product_full` usam o campo `weight`. O seed local passa a preencher ambos com 0,30 kg, sem alterar triggers, constraints, dados de produção ou migrations. Próxima execução deve validar o seed e então executar os testes de Auth/RLS/privacidade/checkout. A homologação permanece NO-GO até o workflow completo passar.


## Rodada 2A.9 — execução do processo de teste isolado

Run [45864871288](https://github.com/hrq16000-a11y/emporiolelecute-2026/actions/runs/45864871288): o stack descartável completou o replay das migrations e o seed corrigido; o passo de segurança iniciou, mas o usuário sem privilégios não conseguiu executar o binário em `/usr/local/bin/node` (`spawn EACCES`). O workflow agora copia o binário Node resolvido para o diretório temporário compartilhado e executa essa cópia como `leleqa`, preservando o bloqueio de rede externa do usuário. Os testes de Auth/RLS/checkout ainda não foram executados; a homologação continua NO-GO até o próximo run completo.
