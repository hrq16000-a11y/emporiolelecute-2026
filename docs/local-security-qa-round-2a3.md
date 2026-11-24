# Rodada 2A.3 — QA local descartável

O workflow dedicado é opt-in: acionamento manual quando disponível na branch padrão ou label `qa-local-approved` em PR da branch exata, no mesmo repositório. Não abrir PR nem aplicar label sem conferir a franquia do GitHub Actions. Job único, runner padrão, timeout 15 minutos. Nenhum deploy, link remoto ou secret de produção.

Reutiliza `supabase/config.toml`, migrations e `supabase/seed.sql` em runner descartável; remove configuração de ambiente remota e troca o project_id somente no workspace. Antes de iniciar, bloqueia saída externa dos containers Docker e restringe o usuário de testes ao loopback. Edge runtime não é iniciado. A instalação da CLI e o download de imagens ainda requerem rede do runner. Se o isolamento, o seed ou as migrations falharem, a execução deve falhar, não recorrer à nuvem.

Cobertura inicial: projeção de privacidade pura; sessões GoTrue de admin e dois clientes sintéticos; tentativa de promoção administrativa; checkout válido como controle positivo; leitura de pedidos e itens por anônimo e outro cliente; alteração de preço/subtotal/total no checkout; persistência conferida pelo admin local. Sem homologação ainda de pagamentos, cupons, frete, todos os RPCs ou Edge Functions em execução. Os 72 achados históricos continuam sem inventário individual recuperado.

Os testes não foram executados ao gravar esta rodada. Falhas no ambiente ou nos gates são NO-GO para homologação. Não considerar a mera presença do workflow como aprovação.

## Rodada 2A.5 — bloqueio de bootstrap

Run [45312276220](https://github.com/hrq16000-a11y/emporiolelecute-2026/actions/runs/45312276220): checkout, CLI, isolamento e limpeza concluídos; bootstrap falhou com SQLSTATE XX000 durante `cron.unschedule` na migration histórica de 20260814154716. Testes de segurança não executados. O workflow adapta exclusivamente no workspace descartável as três chamadas de remoção de jobs antigos para usar IDs existentes; não altera a migration versionada, não fabrica jobs e não ignora outras falhas. O ambiente resultante é uma homologação adaptada, não prova de replay integral das migrations originais. Exceção temporária do CI convencional permanece até revisão segura antes de merge.
