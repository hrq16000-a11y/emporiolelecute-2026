# Homologação isolada dos três achados e controle de promoção

**Resultado:** GO para a homologação isolada destes três handlers. Nenhuma publicação, implantação de função, alteração no banco compartilhado, mensagem externa, cotação externa ou pedido real executado nesta rodada. A homologação não autoriza publicação automática nem encerra os gates gerais de preços atômicos, migrações históricas, RLS e SSE.

## 1. Escopo e baseline

- Correções funcionais: `970fcc114bf2c77f6aaf36f20bf7497b8e953e1a`, confirmado no GitHub.
- Somente `lov_finding_0c91c63b1e3dbad1`, `lov_finding_96f54a0807f4fb32` e `lov_finding_d763c38cd05f0709`.
- Os dois achados de preços por editores foram preservados ativos, sem alteração de permissões, funções de produto ou dados.
- PR #9 permaneceu sem alteração ou merge. Seus arquivos foram lidos para conhecer o isolamento existente; a última execução consultada estava com falha e não foi apresentada como aprovação.

## 2. Promoção automática: causa e correção comprovada

A Vercel tinha o comando de Ignored Build Step invertido:

```sh
if [ "$VERCEL_ENV" == "production" ]; then exit 1; else exit 0; fi
```

Nesse mecanismo, **0 cancela/ignora o build; 1 permite executar**. Assim, o comando anterior liberava produção e bloqueava previews, contrariando o NO-GO documental.

Foi alterado exclusivamente `commandForIgnoringBuildStep` do projeto oficial, com autorização desta rodada:

```sh
if [ "$VERCEL_ENV" = "production" ]; then exit 0; else exit 1; fi
```

Leitura posterior confirmou o comando salvo. `previewDeploymentsDisabled` continua `true`; branch de produção, aliases, domínios, build/install commands e outros controles não foram alterados. Nenhum botão de publicação, redeployment, rollback ou promoção foi acionado.

**Evidência de um evento real, não apenas teste do comando:** o checkpoint `956646d7b50dc790ed174a549824a19b5014d4c6`, salvo durante a reconexão necessária do GitHub, gerou o deployment `dpl_EfZPUP6Z2kC8QDCtCm7PjCj1xafd` com estado **CANCELED**, sem alias oficial. A produção READY `dpl_3yxzBXHLuzgB2vhuUctvVjeMdrSs`, SHA `970fcc11`, mantém `emporiolelecute.com.br` na leitura da Vercel às 06:48 UTC. O campo `targets.production` pode apontar para a tentativa cancelada; ele sozinho não comprova promoção. Foram conferidos estado e alias dos deployments.

Dois testes executaram o comando efetivamente lido da Vercel: produção retorna 0; preview retorna 1. Ambos PASS. O comando controla disparos Git, não impede alguém autorizado de deliberadamente ignorar esse gate ou promover uma versão manualmente. Qualquer publicação futura exige autorização separada.

## 3. Ambiente realmente isolado

- Branch exclusiva: `qa/selected-security-20261124`, criada a partir de `970fcc11`; nenhum merge em main ou na PR #9.
- Runner Ubuntu descartável do GitHub, em repositório público, sem infraestrutura paga provisionada.
- Autenticação real local, API de dados real e PostgreSQL descartável, iniciados em `http://127.0.0.1:54321`.
- Schema mínimo de teste, explicitamente separado das migrações históricas da aplicação. Não foi feita cópia de clientes, pedidos, credenciais ou dados de produção.
- Handlers originais executados após transformação TypeScript, com cliente real local; verificações de identidade e consultas não foram substituídas por mocks. Isso não comprova empacotamento/implantação no runtime remoto.
- Adaptador de e-mail somente em memória; transportadora somente em um servidor de teste na interface loopback. Nenhuma mensagem ou chamada a transportadora real.
- Contêineres impedidos de sair da rede descartável; processo de teste com usuário próprio e acesso de rede somente a loopback. Validação adicional de destinos no cliente de testes e redirecionamentos proibidos.
- Ambiente do processo limpo (`env -i`), sem secrets compartilhados; nenhum secret da aplicação foi solicitado ou utilizado. Configuração local criada fora de `supabase/config.toml` do projeto.
- Contas confirmadas sintéticas criadas via administração local, sem disparo de e-mail, com login real por senha e validação real de sessão.
- Testes leram de volta registros persistidos exclusivamente no banco descartável. Teardown e remoção dos arquivos locais de credenciais confirmados como sucesso.

## 4. Resultado por achado

| Achado | Evidência isolada | Resultado |
|---|---|---|
| Reenvio/descoberta por código | Convidado, chave pública, sessão inválida e conta alheia negados; negativas uniformes; titular confirmado e administrador autorizados; destinatário e conteúdo salvos, total `37,50` lido de volta | PASS |
| Cotação anônima com credenciais | Sem login não há acesso a provedores/cache/auditorias; carrinho misto com produto indisponível é rejeitado; login real autoriza uma cotação exclusivamente no sink local, retornando `21,00` | PASS |
| Alteração de histórico alheio | Todos os seis eventos negam UUID legado sem credencial antes de qualquer consulta; titular grava seu histórico; credencial alheia é negada; pageview externo ignorado; histórico próprio relido com 1 pageview, 10 segundos, consentimento e lead; segredo não persistido | PASS |

**Execução comprovada:** [GitHub Actions — run 45342839589](https://github.com/hrq16000-a11y/emporiolelecute-2026/actions/runs/45342839589), QA SHA `fa3efaa8a751dc80dc4b1f645c921a2929437c78`, conclusão **success**. Etapas de isolamento, inicialização, testes e destruição: todas **success**. Logs das três baterias PASS às 06:47:27 UTC; parada do ambiente às 06:47:37 UTC.

As duas primeiras execuções não foram mascaradas: a instalação do CLI substituiu Bun por uma versão incompatível com o lockfile; depois o usuário isolado não podia executar o binário na pasta privada do runner. Corrigido o runner para restaurar Bun `1.4.4` após o CLI e copiar binário/fontes/dependências necessários para um diretório temporário acessível, sem abrir a pasta privada. Nenhum gate foi removido.

## 5. Regressões e alterações

- 89 testes direcionados de segurança, consentimento, catálogo, totais e diagnósticos: PASS.
- 5 testes do guard da vitrine e guard estático: PASS.
- 2 testes do comando de bloqueio de promoção: PASS.
- Lint dos novos scripts: PASS. Compilação automática mais recente conferida: `build OK` às 06:48:15 UTC. Nenhum build manual.
- Handlers corrigidos, carrinho, preços e consentimento idênticos ao checkpoint funcional `970fcc11` nesta homologação.
- Arquivos desta rodada: `.github/workflows/selected-security-homologation.yml`, `scripts/selected-security-fixture.sql`, `scripts/selected-security-homologation.mjs`, `scripts/production-promotion-guard.test.mjs`, `AGENTS.md`, `roadmap.md` e este relatório.

O gerenciador foi chamado **somente** para os três IDs autorizados: retornou que eles já não estavam ativos, sem necessidade de alteração adicional. Os dois achados de editores continuam ativos e não foram corrigidos nem ignorados.

## 6. Pendências objetivas

- Implantação e comportamento dos handlers no backend compartilhado não foram verificados nem alterados, conforme a restrição desta rodada.
- Replay integral das migrações históricas, RLS de toda a aplicação, SSE e contrato atômico comercial continuam fora desta homologação mínima; o resultado não substitui essas evidências.
- PR #9 segue isolada; reconciliação e eliminação de sobreposição futura exigem rodada própria, sem dispensar seus gates.
- A publicação funcional futura permanece controlada e depende de autorização explícita; nenhum próximo trabalho inicia automaticamente.