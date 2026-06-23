# TODO: migrar scraper para browser headless (Playwright)

## Contexto

Confirmado em produção (ciclos reais do cron, não só testes manuais): o
`MercadoLivreScraperService.js` atual (axios + cheerio, requisição HTTP crua)
é bloqueado pelo Mercado Livre, que redireciona para a página de
"verificação de tráfego suspeito" em vez de devolver a página do produto.
Resultado: `fetchProductData` sempre falha com "Não foi possível extrair o
nome do produto", e o monitoramento nunca detecta queda de preço. Reduzir a
frequência do cron (30min → 1h) não resolveu — o bloqueio é por requisição
parecer não-browser, não por volume.

Decisão tomada: migrar para um browser headless de verdade (Playwright), que
executa JS e se parece muito mais com um navegador real.

## 0. Spike de validação — fazer ANTES de tocar no código do projeto

Não vale a pena refatorar tudo sem confirmar que isso resolve o problema.

- [ ] Script isolado (fora do projeto, ou em `/scripts/spike-playwright.js`)
      que abre Playwright (chromium, headless) e acessa uma URL real de
      produto do ML.
- [ ] Confirmar se ainda cai na página de "verificação de tráfego suspeito"
      ou se chega na página real do produto.
- [ ] Se ainda bloquear: testar com `playwright-extra` +
      `puppeteer-extra-plugin-stealth` (funciona com playwright-extra também).
- [ ] Se MESMO COM stealth continuar bloqueando: este plano não resolve.
      Voltar a considerar a API oficial do Mercado Livre (ver seção "Plano B"
      abaixo) ou proxy residencial.
- [ ] Só seguir para os passos abaixo se o spike confirmar que dá pra
      acessar a página do produto de forma consistente (testar uns 5-10
      produtos diferentes, não só um).

## 1. Decisões a tomar antes de implementar

- [ ] Playwright puro vs `playwright-extra` + stealth plugin (decidir com
      base no resultado do spike).
- [ ] Parsear o HTML renderizado com cheerio (reaproveitando os seletores
      atuais) ou usar `page.locator()`/`page.$eval()` direto do Playwright
      (recomendado: direto do Playwright, evita parsear duas vezes e lida
      melhor com conteúdo carregado via JS).
- [ ] Browser único (singleton) reaproveitado entre checagens, com uma
      `BrowserContext` nova por produto (isolamento de cookies/sessão), ou
      `browser.newPage()` direto. Não dar `launch()` a cada produto — é caro
      (~1-2s de overhead cada vez).
- [ ] Timeout por página (ex: 20-30s) e o que fazer se expirar.

## 2. Infraestrutura / Docker

- [ ] Trocar a imagem base do `Dockerfile` — Playwright não funciona bem em
      Alpine (`node:20-alpine` atual). Usar imagem oficial
      `mcr.microsoft.com/playwright:v1.x-jammy` ou Debian
      (`node:20-bookworm-slim` + `npx playwright install --with-deps chromium`).
- [ ] Adicionar `shm_size: '1gb'` (ou similar) no serviço `app` do
      `docker-compose.yml` — Chromium costuma crashar em containers com
      `/dev/shm` pequeno (padrão Docker é 64MB).
- [ ] Reavaliar limites de memória/CPU do container — Chromium headless
      consome bem mais recursos que requisições HTTP simples via axios.
- [ ] Imagem final vai ficar bem maior (HTTP+cheerio ~150MB → com Chromium
      pode passar de 1GB). Avaliar se isso é aceitável pro ambiente de
      deploy planejado.

## 3. Mudanças de código

- [ ] `package.json`: adicionar `playwright` (e `playwright-extra` +
      `puppeteer-extra-plugin-stealth` se o spike indicar necessidade).
      Remover `axios` e `cheerio` se não sobrar nenhum outro uso deles no
      projeto (hoje só são usados em `MercadoLivreScraperService.js`).
- [ ] Reescrever `src/services/MercadoLivreScraperService.js`:
  - Gerenciar ciclo de vida do browser (abrir uma vez, reaproveitar).
  - Trocar `axios.get` + `cheerio.load` por `page.goto()` +
    extração via Playwright.
  - Manter a mesma assinatura pública (`fetchProductData(productUrl)` →
    `{ name, price, availability, productUrl }`) para não precisar tocar em
    `monitorService.js` além do necessário.
  - Tratar timeout / página travada / contexto fechado com try/catch e
    mensagens de erro claras (mesmo padrão de hoje, que já é capturado por
    produto em `monitorService.js` sem derrubar o job inteiro).
- [ ] `src/services/monitorService.js`: hoje dispara
      `Promise.all(products.map(...))` sem limite de concorrência. Com
      requisições HTTP isso era tolerável; com browser headless, abrir N
      páginas simultâneas pode estourar memória rápido. Adicionar limite de
      concorrência (ex: processar em lotes de 2-3 produtos por vez, ou usar
      uma lib leve como `p-limit`).
- [ ] `src/server.js`: adicionar fechamento do browser Playwright na função
      `shutdown()` (hoje já fecha prisma e telegram; falta fechar o
      browser pra não deixar processo Chromium órfão).
- [ ] Conferir se os seletores CSS atuais (`.price-tag-fraction`,
      `.price-tag-cents`, `meta[itemprop="price"]`, `h1.ui-pdp-title`, texto
      de disponibilidade) ainda batem com o DOM renderizado via browser —
      pode precisar ajustar, já que hoje eles foram validados contra HTML
      estático (que nem chegava a ser a página real, por causa do bloqueio).

## 4. Validação depois de implementado

- [ ] Rodar localmente contra produtos reais (os mesmos que já estão
      cadastrados: Ps5 etc.) e confirmar extração de nome/preço/disponibilidade
      com sucesso.
- [ ] Rodar um ciclo completo do cron real (não só teste manual) e confirmar
      nos logs do `docker compose logs app` que aparece "Produto avaliado"
      com preço, não mais "Não foi possível extrair...".
- [ ] Testar o caminho de notificação de novo (preço abaixo da meta dispara
      Telegram) com dado real do scraper, não mockado.
- [ ] Deixar rodando por pelo menos algumas horas/ciclos pra ver se o
      bloqueio anti-bot volta a aparecer de forma intermitente.

## Plano B (se o spike do Playwright falhar)

- API oficial do Mercado Livre (`api.mercadolibre.com`) com OAuth — hoje o
  endpoint público de busca retorna 403 sem autenticação. Envolve cadastrar
  uma aplicação no Mercado Livre Developers, implementar OAuth (client
  credentials ou autorização), e usar os endpoints oficiais de item/preço.
  Mais trabalho de integração, mas não tem problema de anti-bot porque é uso
  legítimo da API.
- Proxy residencial/rotativo — mitiga bloqueio por reputação de IP, mas não
  resolve bloqueio por fingerprint de browser/comportamento.
