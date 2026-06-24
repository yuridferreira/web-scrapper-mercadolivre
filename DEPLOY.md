# Plano: hospedar o bot em um servidor sempre ligado

## Contexto

Hoje o projeto roda via `docker-compose` localmente. Funciona, mas só
enquanto o notebook estiver ligado e com o Docker ativo — se o notebook
dormir/fechar, o cron para de disparar e o bot do Telegram para de
responder. Este documento é o plano para, quando fizer sentido, hospedar a
mesma stack (`app` + `db`) num servidor que fique sempre ligado.

Não é urgente — está rodando local por enquanto. Isso aqui é o roteiro pra
quando decidir migrar.

## 1. Escolher onde hospedar

Recomendado: uma **VPS simples com Docker** (não um PaaS serverless) — a
stack já é só `docker-compose`, então uma VPS tradicional dá pra reaproveitar
quase tudo como está, sem reescrever nada. PaaS serverless costuma ter
problemas com processos longos (cron) e disco não-persistente entre deploys
(ruim pro volume do Postgres).

Opções de VPS (mais barato → mais generoso):
- **Oracle Cloud Free Tier** — instância ARM "Always Free" (até 4 OCPU /
  24GB RAM), de graça permanentemente. Setup inicial um pouco mais
  burocrático (cadastro pede cartão, ARM exige imagem compatível), mas vale
  a pena pelo custo zero.
- **Hetzner Cloud** — VPS x86 mais barata do mercado (~€4/mês pro menor
  plano), 2-4GB RAM já sobra.
- **DigitalOcean / Vultr / Linode** — ~$6/mês, bem documentados, droplet
  Ubuntu com Docker pré-instalado ou instalação manual em 2 comandos.

Especificação mínima necessária: **1 vCPU, 1-2GB RAM, ~10GB de disco** —
suficiente pro Chromium headless rodar com `SCRAPER_CONCURRENCY=2`, a imagem
da app (~1.4GB) e o crescimento do histórico de preços no Postgres (linhas
pequenas, cresce devagar).

## 2. Ajustes no projeto antes de hospedar

- [ ] Trocar `command: npm run dev` por `npm start` no serviço `app` do
      `docker-compose.yml` (ou usar um `docker-compose.prod.yml` separado) —
      `nodemon` + bind mount de código (`.:/usr/src/app`) é só pra
      desenvolvimento local; em produção quer a imagem buildada rodando
      sozinha, sem watch de arquivo.
- [ ] Adicionar `restart: always` no serviço `app` (hoje só o `db` tem) —
      sem isso, se o servidor reiniciar, o `db` volta automaticamente mas o
      `app` não.
- [ ] Configurar rotação de log do Docker (`logging.options.max-size` /
      `max-file` no `docker-compose.yml`) — o logger hoje escreve JSON sem
      limite nenhum; sem rotação, os logs crescem pra sempre no disco do
      servidor.
- [ ] Decidir se a porta 3000 (API REST) precisa ficar exposta pra fora —
      se for usar só o bot do Telegram (polling, não precisa de porta
      aberta) e o cron, pode deixar a porta 3000 fechada no firewall do
      servidor e usar a API só via SSH tunnel quando precisar.

## 3. Provisionar o servidor

- [ ] Criar a VPS (qualquer provedor da seção 1), Ubuntu LTS é a escolha
      mais simples.
- [ ] Instalar Docker + Docker Compose plugin (`curl -fsSL
      https://get.docker.com | sh`, depois `apt install
      docker-compose-plugin`).
- [ ] Configurar firewall: liberar só SSH (22); manter 5432/5434 (Postgres)
      e 3000 (API) fechados pra internet pública, a menos que decidido o
      contrário no passo 2.
- [ ] Confirmar que o Docker inicia automaticamente no boot
      (`systemctl enable docker`, já vem assim na maioria das distros).

## 4. Deploy

- [ ] Clonar o repositório no servidor (`git clone ...`).
- [ ] Criar o `.env` real no servidor (a partir do `.env.example`) — **nunca
      commitar isso**, copiar manualmente ou via secret do provedor.
- [ ] `docker compose up -d --build` (com os ajustes da seção 2 já feitos).
- [ ] Confirmar nos logs (`docker compose logs -f app`) que o servidor
      iniciou, o bot conectou e o cron foi agendado.
- [ ] Testar pelo Telegram: `/listar`, cadastrar um produto de teste,
      apagar depois.
- [ ] Deixar rodando um ciclo completo do cron (1h) e confirmar notificação
      real.

## 5. Operação contínua (depois de no ar)

- [ ] Backup periódico do Postgres — um cron simples de `pg_dump` pro
      volume ou pra fora do servidor já resolve (dado é pequeno, não
      precisa de nada sofisticado).
- [ ] Definir como atualizar o código depois do deploy inicial: pelo porte
      do projeto, `git pull && docker compose up -d --build` manual no
      servidor é suficiente por agora — CI/CD automatizado (GitHub Actions
      fazendo build/push/deploy) é um "nice to have" futuro, não bloqueia
      nada.
- [ ] Acompanhar uso de memória/CPU do container `app` periodicamente
      (`docker stats`) nas primeiras semanas, já que Chromium headless é o
      maior consumidor de recursos do projeto — ajustar
      `SCRAPER_CONCURRENCY` pra baixo se a VPS escolhida for muito pequena.

## Custo estimado

- Oracle Cloud Free Tier: R$ 0/mês (com as ressalvas de setup).
- Hetzner / DigitalOcean / Vultr: ~R$ 25-35/mês (US$ 5-7).
