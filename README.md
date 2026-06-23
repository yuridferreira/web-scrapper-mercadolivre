# Promo Monitor Bot

Backend Node.js para monitorar preços de produtos no Mercado Livre e enviar alertas via Telegram.

## Visão geral

O sistema permite:

- cadastrar produtos para monitoramento
- consultar preços automaticamente a partir da URL do produto do Mercado Livre
- salvar histórico de preços no banco
- enviar notificação via Telegram quando o preço atingir ou ficar abaixo da meta
- executar um cron job a cada hora

## Estrutura do projeto

- `src/config` - leitura de variáveis de ambiente e configuração da aplicação
- `src/controllers` - tratamento de requisições HTTP e respostas
- `src/services` - regras de negócio, scraping e integrações externas
- `src/jobs` - agendamento do monitoramento periódico
- `src/routes` - definição das rotas REST
- `src/database` - instância do Prisma Client
- `src/middlewares` - validação de entrada e tratamento global de erros
- `src/utils` - utilitários compartilhados e classes de erro
- `prisma` - definição dos modelos de dados e migrações

## Instalação

1. Clone o repositório:
   ```bash
   git clone <repo-url>
   cd web-scrapper-mercadolivre
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Copie o arquivo de ambiente:
   ```bash
   cp .env.example .env
   ```
4. Atualize `.env` com as credenciais do PostgreSQL e do Telegram.
5. Gere o client Prisma e execute as migrações:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

## Scripts úteis

- `npm start` - inicia a aplicação em produção
- `npm run dev` - inicia em modo de desenvolvimento com nodemon
- `npm run prisma` - executa o Prisma CLI local
- `npm run studio` - abre Prisma Studio
- `npm run lint` - valida o código com ESLint
- `npm run lint:fix` - corrige problemas de lint automaticamente
- `npm run format` - formata o código com Prettier

## Variáveis de ambiente

Use o arquivo `.env.example` como base:

- `PORT` - porta do servidor
- `DATABASE_URL` - conexão com PostgreSQL
- `TELEGRAM_BOT_TOKEN` - token do bot Telegram
- `TELEGRAM_CHAT_ID` - id do chat ou grupo do Telegram
- `CRON_SCHEDULE` - agendamento do job (padrão: `0 * * * *`, a cada hora — intervalos menores aumentam o risco de bloqueio anti-bot do Mercado Livre)

## Rotas

- `POST /products` - cadastra um produto para monitoramento
- `GET /products` - lista todos os produtos monitorados
- `GET /products/:id` - consulta um produto específico
- `PUT /products/:id` - atualiza dados do produto
- `DELETE /products/:id` - remove um produto do monitoramento

### Exemplo de criação de produto

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TV 55 OLED",
    "targetPrice": 2999.90,
    "productUrl": "https://produto.mercadolivre.com.br/..."
  }'
```

### Exemplo de atualização de produto

```bash
curl -X PUT http://localhost:3000/products/1 \
  -H "Content-Type: application/json" \
  -d '{
    "targetPrice": 2899.90
  }'
```

### Exemplo de listagem

```bash
curl http://localhost:3000/products
```

## Como iniciar

1. Configure o `.env` com as variáveis necessárias.
2. Execute as migrações do Prisma.
3. Inicie o servidor:
   ```bash
   npm run dev
   ```

## Testando o sistema

- Crie produtos com `POST /products`.
- Verifique todos com `GET /products`.
- Consulte um produto com `GET /products/:id`.
- Atualize com `PUT /products/:id`.
- Apague com `DELETE /products/:id`.

> O cron job será executado automaticamente a cada hora e enviará alertas via Telegram quando o preço atual estiver igual ou abaixo do target.

## Bot Telegram

Além da API REST, o sistema inclui um bot do Telegram para facilitar o cadastro e gerenciamento de produtos diretamente pelo chat.

### Como usar o Bot

1. **Inicie uma conversa** com o bot no Telegram (use o token configurado)
2. **Use os comandos disponíveis:**
   - `/start` - Iniciar conversa e ver boas-vindas
   - `/cadastrar` - Cadastrar novo produto (fluxo passo-a-passo)
   - `/listar` - Ver todos os produtos monitorados
   - `/deletar` - Remover produto do monitoramento
   - `/ajuda` - Ver lista de comandos

### Exemplo de Cadastro via Bot

1. Envie `/cadastrar`
2. Bot pergunta: "Qual o nome do produto?"
3. Responda: "iPhone 15 Pro"
4. Bot pergunta: "Qual o preço alvo?"
5. Responda: "8000.00"
6. Bot pergunta: "Cole a URL do produto no Mercado Livre"
7. Responda: "https://produto.mercadolivre.com.br/MLB123456789-..."
8. Bot confirma o cadastro e começa o monitoramento

### Recebendo Notificações

Quando o preço do produto atingir ou ficar abaixo da meta, você recebe uma notificação automática no Telegram com:
- Nome do produto
- Preço atual
- Preço alvo
- Link direto para o produto

### Gerenciamento via Bot

- **Listar produtos**: Veja todos os produtos com status atual
- **Deletar produtos**: Remova produtos que não quer mais monitorar
- **Status em tempo real**: Veja se já foi notificado sobre promoções

> 💡 **Dica**: O bot funciona 24/7 e você pode gerenciar tudo pelo celular!
