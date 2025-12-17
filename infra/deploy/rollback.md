# Rollback Guide

Este guia descreve rollback seguro em caso de incidente após deploy.

## Princípios

- Rollback deve ser rápido e previsível
- Evite rollback de migração destrutiva (preferir migrações compatíveis/forward-only)
- Preserve evidências (logs/métricas) antes de reiniciar tudo

## Estratégia

### 1) Rollback de serviço (código)

Se o incidente for em um serviço específico:
- voltar para a imagem/tag anterior do serviço afetado
- reiniciar apenas o serviço afetado
- validar healthchecks e fluxo dependente

Serviços:
- `backoffice-api`
- `agent-runtime`
- `evolution-manager`
- `autentique-service`
- `facebook-capi`
- `backoffice-web`

### 2) Rollback de configuração

Se a falha for por env:
- reverter variáveis alteradas (principalmente URLs/keys)
- reiniciar o serviço

### 3) Migrações

Evitar rollback automático. Preferir:
- aplicar migração corretiva (forward)
- se absolutamente necessário: restaurar snapshot do banco + re-deploy (incidente P0)

## Checklist pós-rollback

- [ ] Healthchecks 200 em todos os serviços críticos
- [ ] `/ready` ok no agent-runtime
- [ ] Pipeline de eventos funcionando (Redis)
- [ ] UI operacional (login + navegação)
- [ ] Incidente registrado com timeline e evidências

