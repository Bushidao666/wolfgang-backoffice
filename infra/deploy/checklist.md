# Deploy Checklist (Staging/Prod)

## Antes do deploy

- [ ] Branch/tag correto (versão aprovada)
- [ ] CI verde (unit/integration/rls/e2e)
- [ ] Secrets e envs revisados (sem valores faltando)
- [ ] Janela de mudança comunicada (se necessário)
- [ ] Backup/restore plan validado (DB)
- [ ] Observabilidade disponível (logs/métricas)

## Migrações (DB)

- [ ] Migrações aplicadas com sucesso
- [ ] Drift verificado (ambiente-alvo)
- [ ] RLS tests executados (quando aplicável)

## Deploy dos serviços

- [ ] Redis/infra estável
- [ ] `backoffice-api` atualizado e saudável (`/health`)
- [ ] `agent-runtime` atualizado e pronto (`/ready`)
- [ ] `evolution-manager` atualizado e saudável (`/health`)
- [ ] `autentique-service` atualizado e saudável (`/health`)
- [ ] `facebook-capi` atualizado e saudável (`/health`)
- [ ] `backoffice-web` atualizado e renderizando

## Smoke tests

- [ ] Login no backoffice-web
- [ ] Criar empresa + provisionar schema
- [ ] Listar leads (sem 400)
- [ ] Testar centurion playground
- [ ] Validar evento `message.received` → `message.sent`

## Pós-deploy (monitoramento)

- [ ] Erros 5xx/p95 dentro do esperado
- [ ] Filas/eventos fluindo (Redis)
- [ ] Nenhum alerta crítico

