# Promo Monitor Bot

Backend Node.js para monitorar preços de produtos no Mercado Livre e enviar alertas via Telegram.

## Visão geral

A aplicação permite:

- cadastrar produtos para monitoramento
- consultar preços automaticamente no Mercado Livre
- salvar histórico de preços
- enviar notificação via Telegram quando o preço atingir a meta desejada
- executar um cron job a cada 30 minutos

## Estrutura do projeto

- `src/config` - carregamento de variáveis de ambiente e configuração do banco de dados
- `src/controllers` - separa o tratamento de requisições HTTP
- `src/services` - regras de negócio e integrações com Mercado Livre e Telegram
- `src/jobs` - agendamento de tarefas recorrentes
- `src/routes` - definição de rotas com `Express Router`
- `src/database` - instância do Prisma Client
- `src/middlewares` - validação de entrada e tratamento global de erros
- `src/utils` - utilitários compartilhados como logger e formatação
- `prisma` - definição do modelo de banco de dados e geração do Prisma Client

## Instalação

1. Clone o repositório:
   ```bash
   git clone <repo-url>
   cd promo-monitor-bot
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Copie o exemplo de variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```
4. Atualize `.env` com as credenciais do PostgreSQL e do Telegram.
5. Gere o client Prisma e execute as migrações:
   ```bash
   npx prisma generate
   npm run prisma:migrate
   ```

## Scripts úteis

- `npm start` - iniciar a aplicação
- `npm run dev` - iniciar em modo de desenvolvimento com nodemon
- `npm run lint` - rodar ESLint
- `npm run lint:fix` - corrigir problemas de lint automaticamente
- `npm run format` - formatar o código com Prettier
- `npm run prisma:studio` - abrir Prisma Studio

## Variáveis de ambiente

Use o arquivo `.env.example` como base:

- `PORT` - porta do servidor
- `DATABASE_URL` - URL de conexão com PostgreSQL
- `TELEGRAM_BOT_TOKEN` - token do bot Telegram
- `TELEGRAM_CHAT_ID` - chat id para receber notificações
- `MERCADO_LIVRE_SITE_ID` - site do Mercado Livre (padrão: `MLB`)
- `CRON_SCHEDULE` - agendamento do job (padrão: `*/30 * * * *`)

## Rotas

- `POST /products` - cadastra um produto para monitoramento
- `GET /products` - lista todos os produtos monitorados
- `DELETE /products/:id` - remove um produto do monitoramento

## Docker

Para rodar via Docker:

```bash
docker compose up --build
```

## Observações

- O cron job executa a cada 30 minutos e verifica produtos não notificados.
- Quando o preço atual atingir ou ficar abaixo da meta, o produto é marcado como `notified`.
- O histórico de preço é gravado no banco de dados a cada consulta.
