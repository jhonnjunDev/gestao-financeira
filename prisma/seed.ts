import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const Role = {
  ADMIN: "ADMIN",
  GESTOR: "GESTOR",
  FINANCEIRO: "FINANCEIRO",
  CONSULTA: "CONSULTA",
  AUDITOR: "AUDITOR",
} as const;

const SEED_DEMO = process.env.SEED_DEMO !== "false";

const DESPESA_CATEGORIES = [
  "Alimentação", "Transporte", "Funcionários", "Energia", "Água", "Internet",
  "Material", "Serviços", "Equipamentos", "Impostos", "Manutenção", "Outros",
];

const RECEITA_CATEGORIES = [
  "Venda", "Repasse", "Convênio", "Doação", "Serviço", "Investimento", "Outros",
];

const COST_CENTERS = [
  "Administrativo", "Marketing", "Operacional", "Projeto A", "Projeto B", "Evento",
];

const SUPPLIERS = [
  { name: "Supermercado Bom Preço", document: "12.345.678/0001-90" },
  { name: "Energia Elétrica S.A.", document: "98.765.432/0001-10" },
  { name: "Companhia de Água", document: "11.222.333/0001-44" },
  { name: "Provedor Internet TurboNet", document: "55.666.777/0001-88" },
  { name: "Material de Escritório Papelaria", document: "44.555.666/0001-77" },
  { name: "Prefeitura Municipal (Taxas)", document: "33.444.555/0001-66" },
  { name: "Fornecedor de Equipamentos Tech", document: "22.333.444/0001-55" },
];

const ACCOUNTS = [
  {
    name: "Conta Principal",
    type: "Geral",
    color: "#2563eb",
    icon: "🏢",
    initialBalance: 10000,
    responsible: "João Silva",
    description: "Conta principal para movimentações gerais",
  },
  {
    name: "Projeto Social 2026",
    type: "Projeto",
    color: "#8b5cf6",
    icon: "🎯",
    initialBalance: 5000,
    responsible: "Maria Oliveira",
    description: "Conta dedicada ao projeto social do ano",
  },
  {
    name: "Loja",
    type: "Loja",
    color: "#f59e0b",
    icon: "🛍️",
    initialBalance: 3000,
    responsible: "João Silva",
    description: "Vendas e despesas da loja",
  },
];

async function main() {
  console.log("🌱 Iniciando seed...");

  // Usuário admin
  const adminPassword = await hashPassword("admin123");
  let admin = await prisma.user.findUnique({ where: { email: "admin@gestao.com.br" } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        name: "João Silva",
        email: "admin@gestao.com.br",
        passwordHash: adminPassword,
        role: Role.ADMIN,
      },
    });
    console.log("✅ Admin criado: admin@gestao.com.br / admin123");
  } else {
    console.log("ℹ️ Admin já existe");
  }

  // Segundos usuários (se não for demo, cria apenas o admin)
  if (SEED_DEMO) {
    const maria = await prisma.user.upsert({
      where: { email: "maria@gestao.com.br" },
      update: {},
      create: {
        name: "Maria Oliveira",
        email: "maria@gestao.com.br",
        passwordHash: await hashPassword("maria123"),
        role: Role.GESTOR,
      },
    });

    // Contas
    for (const accData of ACCOUNTS) {
      const existing = await prisma.account.findFirst({ where: { name: accData.name } });
      if (existing) continue;

      const acc = await prisma.account.create({ data: accData });
      await prisma.userAccount.create({
        data: { userId: admin!.id, accountId: acc.id, role: Role.ADMIN },
      });
      await prisma.userAccount.create({
        data: { userId: maria.id, accountId: acc.id, role: Role.GESTOR },
      });
      console.log(`✅ Conta criada: ${acc.name}`);
    }
  }

  // Vincular admin a todas as contas existentes
  const allAccounts = await prisma.account.findMany();
  for (const acc of allAccounts) {
    const link = await prisma.userAccount.findFirst({
      where: { userId: admin!.id, accountId: acc.id },
    });
    if (!link) {
      await prisma.userAccount.create({
        data: { userId: admin!.id, accountId: acc.id, role: Role.ADMIN },
      });
    }
  }

  // Categorias e estrutura (se demo)
  if (SEED_DEMO) {
    for (const acc of allAccounts) {
      // Categorias de despesa
      for (const name of DESPESA_CATEGORIES) {
        const exists = await prisma.category.findFirst({
          where: { accountId: acc.id, name, type: "EXPENSE" },
        });
        if (!exists) {
          await prisma.category.create({
            data: { accountId: acc.id, name, type: "EXPENSE", color: "#ef4444" },
          });
        }
      }
      // Categorias de receita
      for (const name of RECEITA_CATEGORIES) {
        const exists = await prisma.category.findFirst({
          where: { accountId: acc.id, name, type: "INCOME" },
        });
        if (!exists) {
          await prisma.category.create({
            data: { accountId: acc.id, name, type: "INCOME", color: "#10b981" },
          });
        }
      }
      // Centros de custo
      for (const name of COST_CENTERS) {
        const exists = await prisma.costCenter.findFirst({
          where: { accountId: acc.id, name },
        });
        if (!exists) {
          await prisma.costCenter.create({
            data: { accountId: acc.id, name, color: "#64748b" },
          });
        }
      }
      // Fornecedores
      for (const s of SUPPLIERS) {
        const exists = await prisma.supplier.findFirst({
          where: { accountId: acc.id, name: s.name },
        });
        if (!exists) {
          await prisma.supplier.create({
            data: { accountId: acc.id, ...s },
          });
        }
      }
    }
    console.log("✅ Categorias, centros de custo e fornecedores criados");
  }

  // Movimentações demo
  if (SEED_DEMO) {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    for (const acc of allAccounts) {
      const txs = await prisma.transaction.count({ where: { accountId: acc.id } });
      if (txs > 0) continue;

      const categories = await prisma.category.findMany({ where: { accountId: acc.id } });
      const centers = await prisma.costCenter.findMany({ where: { accountId: acc.id } });
      const suppliers = await prisma.supplier.findMany({ where: { accountId: acc.id } });

      const expCats = categories.filter((c) => c.type === "EXPENSE");
      const incCats = categories.filter((c) => c.type === "INCOME");

      // Receitas (últimos 3 meses)
      const receitaSeed = [
        { desc: "Venda de produtos", cat: "Venda", min: 3000, max: 9000 },
        { desc: "Repasse institucional", cat: "Repasse", min: 4000, max: 8000 },
        { desc: "Doação de parceiros", cat: "Doação", min: 1000, max: 5000 },
        { desc: "Prestação de serviços", cat: "Serviço", min: 1500, max: 4500 },
      ];

      for (let m = 2; m >= 0; m--) {
        for (const r of receitaSeed) {
          const d = new Date(year, month - m, 1 + Math.floor(Math.random() * 25));
          if (d > now) continue;
          const amount = r.min + Math.floor(Math.random() * (r.max - r.min));
          const cat = incCats.find((c) => c.name === r.cat) || incCats[0];
          await prisma.transaction.create({
            data: {
              accountId: acc.id,
              type: "INCOME",
              description: r.desc,
              amount,
              date: d,
              dueDate: d,
              paymentDate: d,
              categoryId: cat?.id || null,
              supplierId: null,
              status: "RECEIVED",
              createdById: admin!.id,
            },
          });
        }
      }

      // Despesas (últimos 3 meses)
      const despesaSeed = [
        { desc: "Compra de supermercado", cat: "Alimentação", sup: "Supermercado Bom Preço", min: 500, max: 2000 },
        { desc: "Conta de energia", cat: "Energia", sup: "Energia Elétrica S.A.", min: 300, max: 1200 },
        { desc: "Conta de água", cat: "Água", sup: "Companhia de Água", min: 100, max: 600 },
        { desc: "Internet corporativa", cat: "Internet", sup: "Provedor Internet TurboNet", min: 100, max: 300 },
        { desc: "Material de escritório", cat: "Material", sup: "Material de Escritório Papelaria", min: 100, max: 800 },
        { desc: "Taxas municipais", cat: "Impostos", sup: "Prefeitura Municipal (Taxas)", min: 200, max: 1500 },
        { desc: "Compra de equipamento", cat: "Equipamentos", sup: "Fornecedor de Equipamentos Tech", min: 500, max: 4000 },
        { desc: "Serviços de manutenção", cat: "Manutenção", sup: "Fornecedor de Equipamentos Tech", min: 200, max: 1500 },
      ];

      for (let m = 2; m >= 0; m--) {
        for (const d of despesaSeed) {
          const day = 1 + Math.floor(Math.random() * 27);
          const dt = new Date(year, month - m, day);
          if (dt > now) continue;
          const amount = d.min + Math.floor(Math.random() * (d.max - d.min));
          const cat = expCats.find((c) => c.name === d.cat) || expCats[0];
          const sup = suppliers.find((s) => s.name === d.sup);
          const center = centers[Math.floor(Math.random() * centers.length)];
          const paid = Math.random() > 0.2;
          await prisma.transaction.create({
            data: {
              accountId: acc.id,
              type: "EXPENSE",
              description: d.desc,
              amount,
              date: dt,
              dueDate: dt,
              paymentDate: paid ? dt : null,
              categoryId: cat?.id || null,
              costCenterId: center?.id || null,
              supplierId: sup?.id || null,
              paymentMethod: ["Pix", "Cartão", "Boleto", "Dinheiro"][Math.floor(Math.random() * 4)],
              documentNumber: `NF-${1000 + Math.floor(Math.random() * 9000)}`,
              status: paid ? "PAID" : Math.random() > 0.5 ? "PENDING" : "LATE",
              createdById: admin!.id,
            },
          });
        }
      }

      console.log(`✅ ${acc.name}: movimentações demo criadas`);
    }
  }

  // Orçamentos demo
  if (SEED_DEMO) {
    const now = new Date();
    for (const acc of allAccounts) {
      const budgetCount = await prisma.budget.count({ where: { accountId: acc.id } });
      if (budgetCount > 0) continue;

      const expCats = await prisma.category.findMany({
        where: { accountId: acc.id, type: "EXPENSE" },
      });
      for (const cat of expCats) {
        await prisma.budget.create({
          data: {
            accountId: acc.id,
            periodType: "MONTHLY",
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            amount: 500 + Math.floor(Math.random() * 4000),
            categoryId: cat.id,
          },
        });
      }
    }
    console.log("✅ Orçamentos demo criados");
  }

  console.log("🎉 Seed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });