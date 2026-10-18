# Brasileirão 2026

Probabilidades, tabela e simulador da Série A 2026. Site estático (Vite + TypeScript), publicado no GitHub Pages e atualizado sozinho por um GitHub Action.

## Pastas

| Pasta | O quê |
| --- | --- |
| `config/` | `temporada.ts` (faixas, parâmetros do modelo) e `clubes.ts` (nomes, siglas, slugs, nomes da API) |
| `data/` | JSON gerados pelo script. `pessoas.json` também aceita edição manual |
| `scripts/` | `update-data.ts` busca e valida os dados; `deve-rodar.ts` decide se é dia de jogo |
| `src/modelo/` | Código puro: classificação, forças, Poisson, simulação, histórico, validação, análise |
| `src/telas/` | Uma tela por arquivo |
| `src/worker/` | A simulação roda num Web Worker |
| `tests/` | Vitest |

## Comandos

```bash
npm install
npm run dev          # site local em http://localhost:5173
npm test             # testes
npm run build        # gera dist/
FOOTBALL_DATA_KEY=sua-chave npm run update-data
```

## Atualização automática

`.github/workflows/atualizar.yml`:

- a cada 30 minutos, só em dia de jogo (jogo marcado para hoje no horário de Brasília, ou em andamento);
- de 6 em 6 horas, sempre;
- a cada push na `main`, e manualmente pela aba Actions ("Run workflow").

Se a validação falhar (pontos diferentes de 3V+E, time sem 38 jogos, clube desconhecido, jogo sumido etc.), o Action fica vermelho e os dados no repositório não mudam. O GitHub manda e-mail avisando.

## Copas e vagas

`data/copas.json` guarda a situação da Copa do Brasil, da Libertadores e da Sul-Americana (fase atual, saldo de cada confronto e o que falta). A cada atualização ele é refeito pela API pública da ESPN (`scripts/lib/copas-espn.ts`, sem chave). Se a ESPN falhar, o arquivo anterior fica. Para ver o que a ESPN está mandando sem gravar nada: `npm run copas`.

Em cada simulação, o que falta das copas é sorteado e as vagas são distribuídas pela regra de 2026 (`src/modelo/copas.ts`): 5 pela tabela, 2 da Copa do Brasil e uma para cada campeão continental brasileiro; vaga de quem já está classificado desce na tabela.

## Edição manual

Artilharia, assistências, técnicos, trocas e destaques ficam em `data/pessoas.json`. Cada bloco tem `atualizado` (aparece na tela) e `fonte`. Quando a API traz artilheiros, eles substituem a lista manual. Técnicos: o nome exibido é o manual; o script só registra uma troca quando o técnico informado pela API muda.

## Mudanças de regra

- Faixas (Libertadores, Sul-Americana, rebaixamento): `config/temporada.ts`.
- Mudou o modelo? Aumente `modelo.versao` no mesmo arquivo para recalcular todo o histórico.
- Clube novo ou nome diferente na API: `config/clubes.ts`.
