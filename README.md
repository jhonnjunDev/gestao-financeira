# 💼 Gestão Financeira — Sistema Profissional Multicontas

Sistema web completo, moderno e profissional para **Gestão Financeira, Gerenciamento de Contas e Prestação de Contas**, permitindo cadastrar e administrar várias contas separadamente, com aparência de software empresarial/SaaS premium.

---

## ✨ Funcionalidades

### Contas multicontas
- Seletor de conta no topo (troca com 1 clique)
- Criar, editar, arquivar e duplicar contas
- Cor, ícone, saldo inicial, responsável, descrição e tipo por conta
- **Isolamento total:** dados de uma conta nunca se misturam com outra

### Dashboard executivo
- Cards: Saldo Atual, Receitas, Despesas, Resultado, Orçamento, a receber, a pagar
- Comparação com período anterior (↑↓ %)
- Gráficos interativos (Recharts): Receitas x Despesas, Evolução do saldo, Donuts por categoria, Ranking de despesas e fornecedores
- Filtro por mês / trimestre / semestre / ano / personalizado

### Lançamentos financeiros
- Tipo: Receita / Despesa / Transferência
- Campos: descrição, valor, data, vencimento, pagamento, categoria, subcategoria, centro de custo, fornecedor, forma de pagamento, nº documento, observações, status, recorrência
- Status: Pago, Recebido, Pendente, Atrasado, Cancelado
- **Lançamento rápido** em modal (2 segundos para registrar)
- Soft delete (lixeira) + restauração

### Módulos
- Categorias e subcategorias (receitas e despesas)
- Centros de custos com análise de gastos
- Fornecedores/beneficiários com histórico e ranking
- Contas a pagar (destaque para atrasadas, marcar pago com 1 clique)
- Contas a receber
- Transferências entre contas (saída + entrada automáticas, sem duplicar saldo)
- Orçamento mensal/anual com barras de progresso e alertas
- **Prestação de Contas** pronta para impressão
- **Visão Consolidada** (múltiplas contas)
- Central de Relatórios com filtros avançados
- Pesquisa global
- Auditoria completa (imutável)
- Backup do banco
- Importação de lançamentos via XLSX/CSV
- Usuários com perfis (Admin, Gestor, Financeiro, Consulta, Auditor) e permissão por conta

### 📊 Excel profissional (ExcelJS)
Workbook com **10 abas** com acabamento executivo:
1. **Dashboard Executivo** — capa visual com indicadores e **gráficos nativos editáveis**
2. **Resumo Financeiro** — categoria | receitas | despesas | resultado | %
3. **Lançamentos** — tabela oficial do Excel (autofiltro, congelamento, formatação)
4. **Receitas** — com análise mensal
5. **Despesas** — por categoria/fornecedor/centro de custo/mês
6. **Categorias** — qtd | total | % do total
7. **Fornecedores** — ranking com %
8. **Orçamento** — planejado x realizado com **formatação condicional** (70% atenção, 90% alerta, 100% ultrapassado)
9. **Fluxo de Caixa** — saldo inicial | entradas | saídas | resultado | saldo final
10. **Prestação de Contas** — página pronta para impressão com assinatura

Padrões: moeda `R$ 1.234,56`, datas brasileiras, fórmulas `SOMA/SUBTOTAL`, congelamento de painéis, colunas ajustadas, impressão configurada. Funciona no Microsoft Excel e LibreOffice.

### 📄 PDF profissional (jsPDF)
Prestação de contas com capa escura, resumo executivo, tabelas de receitas/despesas, saldo final, declaração e assinatura — páginas numeradas.

---

## 🚀 Instalação local (desenvolvimento)

### Pré-requisitos
- Node.js 18+ (recomendado 20)
- npm ou bun

### Passos

```bash
# 1. Clonar / entrar na pasta
cd "projeto novo"

# 2. Instalar dependências
npm install

# 3. Configurar ambiente
cp .env.example .env

# 4. Criar o banco e gerar o client Prisma
npx prisma generate

# 5. Criar as tabelas no banco (SQLite local)
npx prisma db push

# 6. Popular com dados de demonstração (3 contas, 50+ movimentações)
npx prisma db seed
# ou tudo de uma vez:
npm run db:setup

# 7. Iniciar o servidor
npm run dev
```

Acesse: **http://localhost:3000**

### Credenciais de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | `admin@gestao.com.br` | `admin123` |
| Gestor | `maria@gestao.com.br` | `maria123` |

---

## 🐘 Migração para PostgreSQL (produção)

O schema é compatível com PostgreSQL. Para produção em servidor Ubuntu:

```bash
# 1. Instalar PostgreSQL
sudo apt update && sudo apt install -y postgresql postgresql-contrib

# 2. Criar banco e usuário
sudo -u postgres psql -c "CREATE USER gestao WITH PASSWORD 'senha-forte';"
sudo -u postgres psql -c "CREATE DATABASE gestao_financeira OWNER gestao;"

# 3. Ajustar o .env
# DATABASE_URL="postgresql://gestao:senha-forte@localhost:5432/gestao_financeira?schema=public"

# 4. Trocar o provider no prisma/schema.prisma
# datasource db { provider = "postgresql" ... }

# 5. Aplicar
npx prisma generate
npx prisma db push
npx prisma db seed
```

---

## 🌐 Deploy em servidor Ubuntu (Nginx + HTTPS)

### 1. Build de produção

```bash
npm run build
```

### 2. PM2 (gerenciador de processos)

```bash
npm install -g pm2
pm2 start npm --name "gestao-financeira" -- start
pm2 save && pm2 startup
```

### 3. Nginx

```nginx
server {
    listen 80;
    server_name gestao.exemplo.com.br;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. HTTPS com Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d gestao.exemplo.com.br
```

### 5. Segurança no .env de produção

```bash
# Gerar um segredo forte:
openssl rand -hex 32
# Colar em JWT_SECRET no .env
# Definir NEXTAUTH_URL com o domínio real
```

---

## 🔒 Segurança implementada

- Senhas com hash bcrypt (12 rounds)
- JWT assinado (HS256) em cookie `HttpOnly`, `SameSite=Lax`, `Secure` em produção
- Middleware de proteção de rotas e APIs
- **Autorização no backend** (roles e permissão por conta verificadas no servidor)
- Queries parametrizadas via Prisma (proteção SQL Injection)
- Validação de entrada no frontend e backend
- Audit log de todas as ações (imutável por usuário comum)
- Rate limiting recomendado via Nginx em produção
- Exclusão lógica (soft delete) com lixeira

---

## 🗄️ Estrutura do banco (Prisma)

```
users, accounts, user_accounts, transactions, categories,
cost_centers, suppliers, budgets, attachments, transfers,
audit_logs, settings, reports
```

Todas as movimentações possuem referência obrigatória à conta correspondente, com chaves estrangeiras e índices.

---

## 🛠️ Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Servidor de produção |
| `npm run db:setup` | Gera client + cria banco + seed |
| `npm run db:reset` | Recria o banco do zero |
| `npx prisma studio` | Interface visual do banco |

---

## 📁 Estrutura do projeto

```
├── prisma/
│   ├── schema.prisma        # Modelo de dados completo
│   └── seed.ts              # Dados de demonstração
├── src/
│   ├── app/                 # Páginas e rotas API (Next.js App Router)
│   │   ├── (app)/           # Área autenticada (dashboard, módulos)
│   │   └── api/             # Backend completo
│   ├── components/          # UI (cards, modais, gráficos, formulários)
│   ├── lib/                 # Prisma, JWT, auth, formatadores,
│   │                        # excel.ts (Excel profissional),
│   │                        # excel-charts.ts (gráficos nativos),
│   │                        # pdf.ts (PDF prestação de contas)
│   └── middleware.ts        # Proteção de rotas/APIs
├── .env.example
└── README.md
```

---

## ✅ Prioridades atendidas

1. Confiabilidade dos cálculos (agregações no servidor, saldo por conta)
2. Separação correta entre contas
3. Segurança (auth, autorização por conta, auditoria)
4. Facilidade de uso (lançamento rápido, troca de conta em 1 clique)
5. Qualidade da prestação de contas (web + Excel + PDF)
6. Excel extremamente profissional (10 abas, gráficos nativos, formatação condicional)
7. Aparência premium (SaaS moderno, responsivo, microanimações)
