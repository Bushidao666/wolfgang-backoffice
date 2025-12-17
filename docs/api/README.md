# API Docs — Wolfgang Backoffice API

## Swagger UI

Quando o `backoffice-api` está rodando, acesse:

- `http://localhost:4000/api/docs`

## OpenAPI (JSON)

O snapshot do OpenAPI é gerado em:

- `docs/api/openapi.json`

### Gerar/atualizar

```bash
npm -w @wolfgang/backoffice-api run openapi:generate
```

Notas:
- O script desabilita tracing/Prometheus durante a geração para evitar side-effects.
- Se sua configuração exigir envs específicas, exporte-as antes de rodar o comando.

