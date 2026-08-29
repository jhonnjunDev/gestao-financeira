import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

const COLORS = {
  primary: "2563EB",
  primaryLight: "DBE6FE",
  success: "10B981",
  successLight: "D1FAE5",
  danger: "EF4444",
  dangerLight: "FEE2E2",
  warning: "F59E0B",
  warningLight: "FEF3C7",
  gray: "6B7280",
  grayLight: "F3F4F6",
  border: "E5E7EB",
  white: "FFFFFF",
  header: "1E3A8A",
};

export async function generateProfessionalExcel(accountId: string, startDate: string, endDate: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema Gestão Financeira";
  workbook.created = new Date();

  // Carregar dados
  const [account, transactions, budgetsWithMeta] = await Promise.all([
    prisma.account.findUnique({ where: { id: accountId } }),
    prisma.transaction.findMany({
      where: {
        accountId,
        deletedAt: null,
        status: { not: "CANCELED" },
        date: { gte: new Date(startDate), lte: new Date(endDate + "T23:59:59") },
      },
      include: { category: true, subcategory: true, costCenter: true, supplier: true },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.budget.findMany({
      where: { accountId, year: new Date().getFullYear() },
      include: { category: true },
    }),
  ]);

  // Calcular totais
  const income = transactions.filter((t) => t.type === "INCOME");
  const expense = transactions.filter((t) => t.type === "EXPENSE");
  const totalIncome = income.reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = expense.reduce((s, t) => s + Number(t.amount), 0);
  const initialBalance = Number(account?.initialBalance || 0);
  const balance = initialBalance + totalIncome - totalExpense;

  // Estilos
  const titleStyle: Partial<ExcelJS.Style> = {
    font: { name: "Calibri", size: 20, bold: true, color: { argb: COLORS.header } },
    alignment: { horizontal: "left" },
  };
  const subtitleStyle: Partial<ExcelJS.Style> = {
    font: { name: "Calibri", size: 12, color: { argb: COLORS.gray } },
  };
  const headerStyle: Partial<ExcelJS.Style> = {
    font: { name: "Calibri", size: 10, bold: true, color: { argb: COLORS.white } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.header } },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: {
      top: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.border } },
      left: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } },
    },
  };
  const cellStyle: Partial<ExcelJS.Style> = {
    font: { name: "Calibri", size: 10, color: { argb: "333333" } },
    alignment: { vertical: "middle" },
    border: {
      top: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.border } },
      left: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } },
    },
  };
  const currencyStyle: Partial<ExcelJS.Style> = {
    ...cellStyle,
    alignment: { horizontal: "right", vertical: "middle" },
    numFmt: 'R$ #,##0.00',
  };
  const pctStyle: Partial<ExcelJS.Style> = {
    ...cellStyle,
    alignment: { horizontal: "center", vertical: "middle" },
    numFmt: '0.0%',
  };
  const totalRowStyle: Partial<ExcelJS.Style> = {
    font: { name: "Calibri", size: 10, bold: true, color: { argb: COLORS.white } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.primary } },
    border: {
      top: { style: "medium", color: { argb: COLORS.primary } },
      bottom: { style: "medium", color: { argb: COLORS.primary } },
      left: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } },
    },
  };

  // ============================================================
  // ABA 1 — DASHBOARD EXECUTIVO
  // ============================================================
  const ws1 = workbook.addWorksheet("Dashboard Executivo", {
    properties: { tabColor: { argb: COLORS.primary } },
  });

  ws1.mergeCells("A1:F1");
  ws1.getCell("A1").value = "RELATÓRIO FINANCEIRO";
  ws1.getCell("A1").font = { name: "Calibri", size: 24, bold: true, color: { argb: COLORS.header } };

  ws1.mergeCells("A2:F2");
  ws1.getCell("A2").value = `${account?.name || "Conta"} · ${startDate} a ${endDate}`;
  ws1.getCell("A2").font = subtitleStyle.font!;

  ws1.mergeCells("A3:F3");
  ws1.getCell("A3").value = `Emitido em ${new Date().toLocaleDateString("pt-BR")}`;
  ws1.getCell("A3").font = { name: "Calibri", size: 10, italic: true, color: { argb: COLORS.gray } };

  // Cards resumo
  ws1.getRow(5).height = 40;
  const cardData = [
    { label: "Saldo Inicial", value: initialBalance, color: COLORS.grayLight },
    { label: "Receitas", value: totalIncome, color: COLORS.successLight },
    { label: "Despesas", value: totalExpense, color: COLORS.dangerLight },
    { label: "Resultado", value: totalIncome - totalExpense, color: COLORS.primaryLight },
    { label: "Saldo Final", value: balance, color: COLORS.primaryLight },
  ];

  cardData.forEach((card, i) => {
    const col = i * 3 + 1;
    ws1.mergeCells(5, col, 5, col + 1);
    const cell = ws1.getCell(5, col);
    cell.value = card.label;
    cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: COLORS.gray } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: card.color } };
    cell.alignment = { horizontal: "center", vertical: "middle" };

    ws1.mergeCells(6, col, 6, col + 1);
    const valCell = ws1.getCell(6, col);
    valCell.value = card.value;
    valCell.numFmt = 'R$ #,##0.00';
    valCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: card.value >= 0 ? COLORS.primary : COLORS.danger } };
    valCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: card.color } };
    valCell.alignment = { horizontal: "center", vertical: "middle" };
  });

  // Gráfico de receitas x despesas mensais
  ws1.getCell("A8").value = "Receitas x Despesas (Mensal)";
  ws1.getCell("A8").font = { name: "Calibri", size: 12, bold: true, color: { argb: COLORS.header } };

  // Agrupar dados mensais
  const monthlyData = getMonthlyData(transactions, startDate, endDate);
  const chartStartRow = 9;
  ws1.getCell(`A${chartStartRow}`).value = "Mês";
  ws1.getCell(`B${chartStartRow}`).value = "Receitas";
  ws1.getCell(`C${chartStartRow}`).value = "Despesas";
  Object.assign(ws1.getCell(`A${chartStartRow}`), headerStyle);
  Object.assign(ws1.getCell(`B${chartStartRow}`), headerStyle);
  Object.assign(ws1.getCell(`C${chartStartRow}`), headerStyle);

  monthlyData.forEach((m, i) => {
    const row = chartStartRow + 1 + i;
    ws1.getCell(`A${row}`).value = m.label;
    ws1.getCell(`A${row}`).font = cellStyle.font!;
    ws1.getCell(`B${row}`).value = m.income;
    ws1.getCell(`B${row}`).numFmt = 'R$ #,##0.00';
    ws1.getCell(`B${row}`).font = { ...cellStyle.font, color: { argb: COLORS.success } };
    ws1.getCell(`C${row}`).value = m.expense;
    ws1.getCell(`C${row}`).numFmt = 'R$ #,##0.00';
    ws1.getCell(`C${row}`).font = { ...cellStyle.font, color: { argb: COLORS.danger } };
  });

  // Gráficos nativos são injetados após a escrita do buffer (excel-charts.ts)

  // Despesas por categoria
  const catRow = chartStartRow + monthlyData.length + 3;
  ws1.getCell(`A${catRow}`).value = "Despesas por Categoria";
  ws1.getCell(`A${catRow}`).font = { name: "Calibri", size: 12, bold: true, color: { argb: COLORS.header } };

  const catData = getExpensesByCategory(expense);
  const catStart = catRow + 1;
  ws1.getCell(`A${catStart}`).value = "Categoria";
  ws1.getCell(`B${catStart}`).value = "Valor";
  Object.assign(ws1.getCell(`A${catStart}`), headerStyle);
  Object.assign(ws1.getCell(`B${catStart}`), headerStyle);

  catData.forEach((c, i) => {
    const row = catStart + 1 + i;
    ws1.getCell(`A${row}`).value = c.name;
    ws1.getCell(`A${row}`).font = cellStyle.font!;
    ws1.getCell(`B${row}`).value = c.amount;
    ws1.getCell(`B${row}`).numFmt = 'R$ #,##0.00';
    ws1.getCell(`B${row}`).font = cellStyle.font!;
  });

  ws1.columns = [{ width: 25 }, { width: 20 }, { width: 20 }, { width: 15 }, { width: 15 }, { width: 15 }];

  // ============================================================
  // ABA 2 — RESUMO FINANCEIRO
  // ============================================================
  const ws2 = workbook.addWorksheet("Resumo Financeiro");
  ws2.properties.tabColor = { argb: COLORS.success };

  ws2.mergeCells("A1:E1");
  ws2.getCell("A1").value = "Resumo Financeiro";
  ws2.getCell("A1").font = titleStyle.font!;

  ws2.getCell("A3").value = "Categoria";
  ws2.getCell("B3").value = "Receitas";
  ws2.getCell("C3").value = "Despesas";
  ws2.getCell("D3").value = "Resultado";
  ws2.getCell("E3").value = "% do Total";
  [3, 4, 5].forEach((r) => {
    ["A", "B", "C", "D", "E"].forEach((col) => Object.assign(ws2.getCell(`${col}${r}`), headerStyle));
  });

  // Agrupar por categoria
  const allCategories = [...new Set(transactions.filter((t) => t.category).map((t) => t.category!.name))];
  allCategories.forEach((catName, i) => {
    const row = 4 + i;
    const catTx = transactions.filter((t) => t.category?.name === catName);
    const catInc = catTx.filter((t) => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
    const catExp = catTx.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);

    ws2.getCell(`A${row}`).value = catName;
    ws2.getCell(`A${row}`).font = cellStyle.font!;
    ws2.getCell(`B${row}`).value = catInc;
    ws2.getCell(`B${row}`).numFmt = 'R$ #,##0.00';
    ws2.getCell(`B${row}`).font = { ...cellStyle.font, color: { argb: COLORS.success } };
    ws2.getCell(`C${row}`).value = catExp;
    ws2.getCell(`C${row}`).numFmt = 'R$ #,##0.00';
    ws2.getCell(`C${row}`).font = { ...cellStyle.font, color: { argb: COLORS.danger } };
    ws2.getCell(`D${row}`).value = catInc - catExp;
    ws2.getCell(`D${row}`).numFmt = 'R$ #,##0.00';
    ws2.getCell(`D${row}`).font = { ...cellStyle.font, bold: true, color: { argb: catInc - catExp >= 0 ? COLORS.success : COLORS.danger } };
    ws2.getCell(`E${row}`).value = totalIncome + totalExpense > 0 ? (catInc + catExp) / (totalIncome + totalExpense) : 0;
    ws2.getCell(`E${row}`).numFmt = '0.0%';
    ws2.getCell(`E${row}`).font = cellStyle.font!;
    ws2.getCell(`E${row}`).alignment = { horizontal: "center" };
  });

  const totalRow = 4 + allCategories.length;
  ws2.getCell(`A${totalRow}`).value = "TOTAL";
  ws2.getCell(`B${totalRow}`).value = totalIncome;
  ws2.getCell(`B${totalRow}`).numFmt = 'R$ #,##0.00';
  ws2.getCell(`C${totalRow}`).value = totalExpense;
  ws2.getCell(`C${totalRow}`).numFmt = 'R$ #,##0.00';
  ws2.getCell(`D${totalRow}`).value = totalIncome - totalExpense;
  ws2.getCell(`D${totalRow}`).numFmt = 'R$ #,##0.00';
  ws2.getCell(`E${totalRow}`).value = 1;
  ws2.getCell(`E${totalRow}`).numFmt = '0.0%';
  [5, 6, 7, 8, 9].forEach((c) => {
    Object.assign(ws2.getCell(`${String.fromCharCode(64 + c)}${totalRow}`), totalRowStyle);
  });

  ws2.columns = [{ width: 25 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 14 }];

  // ============================================================
  // ABA 3 — LANÇAMENTOS
  // ============================================================
  const ws3 = workbook.addWorksheet("Lançamentos");
  ws3.properties.tabColor = { argb: COLORS.primary };

  ws3.mergeCells("A1:N1");
  ws3.getCell("A1").value = "Relação de Lançamentos";
  ws3.getCell("A1").font = titleStyle.font!;

  const headers = [
    "ID", "Data", "Tipo", "Descrição", "Categoria", "Subcategoria",
    "Centro de Custo", "Fornecedor", "Documento", "Receita", "Despesa",
    "Saldo", "Status", "Forma Pagamento", "Observações",
  ];

  headers.forEach((h, i) => {
    const cell = ws3.getCell(3, i + 1);
    cell.value = h;
    Object.assign(cell, headerStyle);
  });

  let runningBalance = initialBalance;
  transactions.forEach((t, i) => {
    const row = 4 + i;
    const isIncome = t.type === "INCOME";
    const isExpense = t.type === "EXPENSE";
    if (isIncome) runningBalance += Number(t.amount);
    if (isExpense) runningBalance -= Number(t.amount);

    const vals = [
      t.id.slice(0, 8),
      new Date(t.date).toLocaleDateString("pt-BR"),
      t.type === "INCOME" ? "Receita" : t.type === "EXPENSE" ? "Despesa" : "Transferência",
      t.description,
      t.category?.name || "",
      t.subcategory?.name || "",
      t.costCenter?.name || "",
      t.supplier?.name || "",
      t.documentNumber || "",
      isIncome ? Number(t.amount) : null,
      isExpense ? Number(t.amount) : null,
      runningBalance,
      t.status === "PAID" ? "Pago" : t.status === "RECEIVED" ? "Recebido" : t.status === "PENDING" ? "Pendente" : "Atrasado",
      t.paymentMethod || "",
      t.notes || "",
    ];

    vals.forEach((val, j) => {
      const cell = ws3.getCell(row, j + 1);
      if (j === 9 && val !== null) {
        cell.value = val;
        cell.numFmt = 'R$ #,##0.00';
        cell.font = { ...cellStyle.font, color: { argb: COLORS.success } };
      } else if (j === 10 && val !== null) {
        cell.value = val;
        cell.numFmt = 'R$ #,##0.00';
        cell.font = { ...cellStyle.font, color: { argb: COLORS.danger } };
      } else if (j === 11) {
        cell.value = val;
        cell.numFmt = 'R$ #,##0.00';
        cell.font = { ...cellStyle.font, bold: true };
      } else {
        cell.value = val;
        Object.assign(cell, cellStyle);
      }
    });
  });

  // Criar tabela oficial do Excel
  const tableEnd = 3 + transactions.length;
  if (transactions.length > 0) {
    ws3.addTable({
      name: "TabelaLancamentos",
      ref: `A3:O${tableEnd}`,
      headerRow: true,
      style: { theme: "TableStyleMedium9" },
      columns: headers.map((h) => ({ name: h, filterButton: true })),
      rows: transactions.map((t) => {
        const isIncome = t.type === "INCOME";
        const isExpense = t.type === "EXPENSE";
        return [
          t.id.slice(0, 8), new Date(t.date).toLocaleDateString("pt-BR"),
          t.type === "INCOME" ? "Receita" : t.type === "EXPENSE" ? "Despesa" : "Transferência",
          t.description, t.category?.name || "", t.subcategory?.name || "",
          t.costCenter?.name || "", t.supplier?.name || "", t.documentNumber || "",
          isIncome ? Number(t.amount) : 0, isExpense ? Number(t.amount) : 0,
          0, t.status, t.paymentMethod || "", t.notes || "",
        ];
      }),
    });
  }

  ws3.columns = [
    { width: 10 }, { width: 13 }, { width: 12 }, { width: 30 }, { width: 15 },
    { width: 15 }, { width: 15 }, { width: 20 }, { width: 12 },
    { width: 15 }, { width: 15 }, { width: 15 }, { width: 12 }, { width: 15 }, { width: 25 },
  ];

  // ============================================================
  // ABA 4 — RECEITAS
  // ============================================================
  const ws4 = workbook.addWorksheet("Receitas");
  ws4.properties.tabColor = { argb: COLORS.success };

  ws4.mergeCells("A1:G1");
  ws4.getCell("A1").value = `Receitas · Total: R$ ${totalIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  ws4.getCell("A1").font = titleStyle.font!;

  ["Data", "Descrição", "Categoria", "Origem", "Situação", "Valor"].forEach((h, i) => {
    const cell = ws4.getCell(3, i + 1);
    cell.value = h;
    Object.assign(cell, headerStyle);
  });

  income.forEach((t, i) => {
    const row = 4 + i;
    ws4.getCell(`A${row}`).value = new Date(t.date).toLocaleDateString("pt-BR");
    ws4.getCell(`B${row}`).value = t.description;
    ws4.getCell(`C${row}`).value = t.category?.name || "";
    ws4.getCell(`D${row}`).value = t.supplier?.name || "";
    ws4.getCell(`E${row}`).value = t.status === "RECEIVED" ? "Recebido" : t.status;
    ws4.getCell(`F${row}`).value = Number(t.amount);
    ws4.getCell(`F${row}`).numFmt = 'R$ #,##0.00';
    [5, 6, 7, 8, 9, 10].forEach((c) => Object.assign(ws4.getCell(`${String.fromCharCode(64 + c)}${row}`), cellStyle));
  });

  ws4.columns = [{ width: 13 }, { width: 30 }, { width: 15 }, { width: 20 }, { width: 12 }, { width: 15 }];

  // ============================================================
  // ABA 5 — DESPESAS
  // ============================================================
  const ws5 = workbook.addWorksheet("Despesas");
  ws5.properties.tabColor = { argb: COLORS.danger };

  ws5.mergeCells("A1:G1");
  ws5.getCell("A1").value = `Despesas · Total: R$ ${totalExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  ws5.getCell("A1").font = titleStyle.font!;

  ["Data", "Descrição", "Categoria", "Fornecedor", "Situação", "Valor"].forEach((h, i) => {
    const cell = ws5.getCell(3, i + 1);
    cell.value = h;
    Object.assign(cell, headerStyle);
  });

  expense.forEach((t, i) => {
    const row = 4 + i;
    ws5.getCell(`A${row}`).value = new Date(t.date).toLocaleDateString("pt-BR");
    ws5.getCell(`B${row}`).value = t.description;
    ws5.getCell(`C${row}`).value = t.category?.name || "";
    ws5.getCell(`D${row}`).value = t.supplier?.name || "";
    ws5.getCell(`E${row}`).value = t.status === "PAID" ? "Pago" : t.status;
    ws5.getCell(`F${row}`).value = Number(t.amount);
    ws5.getCell(`F${row}`).numFmt = 'R$ #,##0.00';
    [5, 6, 7, 8, 9, 10].forEach((c) => Object.assign(ws5.getCell(`${String.fromCharCode(64 + c)}${row}`), cellStyle));
  });

  ws5.columns = [{ width: 13 }, { width: 30 }, { width: 15 }, { width: 20 }, { width: 12 }, { width: 15 }];

  // ============================================================
  // ABA 6 — CATEGORIAS
  // ============================================================
  const ws6 = workbook.addWorksheet("Categorias");
  ws6.properties.tabColor = { argb: COLORS.warning };

  ws6.mergeCells("A1:D1");
  ws6.getCell("A1").value = "Análise por Categoria";
  ws6.getCell("A1").font = titleStyle.font!;

  ["Categoria", "Qtd. Lançamentos", "Total", "% do Total"].forEach((h, i) => {
    const cell = ws6.getCell(3, i + 1);
    cell.value = h;
    Object.assign(cell, headerStyle);
  });

  catData.forEach((c, i) => {
    const row = 4 + i;
    ws6.getCell(`A${row}`).value = c.name;
    ws6.getCell(`B${row}`).value = c.count;
    ws6.getCell(`C${row}`).value = c.amount;
    ws6.getCell(`C${row}`).numFmt = 'R$ #,##0.00';
    ws6.getCell(`D${row}`).value = c.amount / (totalIncome + totalExpense || 1);
    ws6.getCell(`D${row}`).numFmt = '0.0%';
    [5, 6, 7, 8].forEach((col) => Object.assign(ws6.getCell(`${String.fromCharCode(64 + col)}${row}`), cellStyle));
  });

  ws6.columns = [{ width: 25 }, { width: 18 }, { width: 18 }, { width: 14 }];

  // ============================================================
  // ABA 7 — FORNECEDORES
  // ============================================================
  const ws7 = workbook.addWorksheet("Fornecedores");
  ws7.properties.tabColor = { argb: COLORS.primaryLight };

  ws7.mergeCells("A1:D1");
  ws7.getCell("A1").value = "Ranking de Fornecedores";
  ws7.getCell("A1").font = titleStyle.font!;

  ["Fornecedor", "Qtd. Transações", "Valor Total", "% das Despesas"].forEach((h, i) => {
    const cell = ws7.getCell(3, i + 1);
    cell.value = h;
    Object.assign(cell, headerStyle);
  });

  const supplierData = getSupplierRanking(expense);
  supplierData.forEach((s, i) => {
    const row = 4 + i;
    ws7.getCell(`A${row}`).value = s.name;
    ws7.getCell(`B${row}`).value = s.count;
    ws7.getCell(`C${row}`).value = s.amount;
    ws7.getCell(`C${row}`).numFmt = 'R$ #,##0.00';
    ws7.getCell(`D${row}`).value = totalExpense > 0 ? s.amount / totalExpense : 0;
    ws7.getCell(`D${row}`).numFmt = '0.0%';
    [5, 6, 7, 8].forEach((col) => Object.assign(ws7.getCell(`${String.fromCharCode(64 + col)}${row}`), cellStyle));
  });

  ws7.columns = [{ width: 25 }, { width: 18 }, { width: 18 }, { width: 14 }];

  // ============================================================
  // ABA 8 — ORÇAMENTO
  // ============================================================
  const ws8 = workbook.addWorksheet("Orçamento");
  ws8.properties.tabColor = { argb: COLORS.warning };

  ws8.mergeCells("A1:E1");
  ws8.getCell("A1").value = "Orçamento Planejado x Realizado";
  ws8.getCell("A1").font = titleStyle.font!;

  ["Categoria", "Planejado", "Realizado", "Diferença", "% Executado"].forEach((h, i) => {
    const cell = ws8.getCell(3, i + 1);
    cell.value = h;
    Object.assign(cell, headerStyle);
  });

  budgetsWithMeta.forEach((b, i) => {
    const row = 4 + i;
    const realized = b.categoryId
      ? (b.category?.type === "INCOME" ? income : expense)
          .filter((t) => t.categoryId === b.categoryId)
          .reduce((s, t) => s + Number(t.amount), 0)
      : 0;
    const pct = Number(b.amount) > 0 ? realized / Number(b.amount) : 0;

    ws8.getCell(`A${row}`).value = b.category?.name || "Geral";
    ws8.getCell(`B${row}`).value = Number(b.amount);
    ws8.getCell(`B${row}`).numFmt = 'R$ #,##0.00';
    ws8.getCell(`C${row}`).value = realized;
    ws8.getCell(`C${row}`).numFmt = 'R$ #,##0.00';
    ws8.getCell(`D${row}`).value = Number(b.amount) - realized;
    ws8.getCell(`D${row}`).numFmt = 'R$ #,##0.00';
    ws8.getCell(`E${row}`).value = pct;
    ws8.getCell(`E${row}`).numFmt = '0.0%';

    // Formatação condicional
    if (pct > 1) {
      ws8.getCell(`E${row}`).font = { color: { argb: COLORS.white }, bold: true };
      ws8.getCell(`E${row}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.danger } };
    } else if (pct > 0.9) {
      ws8.getCell(`E${row}`).font = { color: { argb: COLORS.danger }, bold: true };
    } else if (pct > 0.7) {
      ws8.getCell(`E${row}`).font = { color: { argb: COLORS.warning }, bold: true };
    } else {
      ws8.getCell(`E${row}`).font = { color: { argb: COLORS.success }, bold: true };
    }

    [5, 6, 7, 8, 9].forEach((col) => {
      const c = ws8.getCell(`${String.fromCharCode(64 + col)}${row}`);
      if (!c.fill) Object.assign(c, cellStyle);
      c.alignment = { horizontal: col === 1 ? "left" : "right", vertical: "middle" };
    });
  });

  ws8.columns = [{ width: 25 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 14 }];

  // ============================================================
  // ABA 9 — FLUXO DE CAIXA
  // ============================================================
  const ws9 = workbook.addWorksheet("Fluxo de Caixa");
  ws9.properties.tabColor = { argb: COLORS.primary };

  ws9.mergeCells("A1:F1");
  ws9.getCell("A1").value = "Fluxo de Caixa";
  ws9.getCell("A1").font = titleStyle.font!;

  ["Mês", "Saldo Inicial", "Entradas", "Saídas", "Resultado", "Saldo Final"].forEach((h, i) => {
    const cell = ws9.getCell(3, i + 1);
    cell.value = h;
    Object.assign(cell, headerStyle);
  });

  let running = initialBalance;
  monthlyData.forEach((m, i) => {
    const row = 4 + i;
    const result = m.income - m.expense;
    ws9.getCell(`A${row}`).value = m.label;
    ws9.getCell(`B${row}`).value = running;
    ws9.getCell(`B${row}`).numFmt = 'R$ #,##0.00';
    ws9.getCell(`C${row}`).value = m.income;
    ws9.getCell(`C${row}`).numFmt = 'R$ #,##0.00';
    ws9.getCell(`D${row}`).value = m.expense;
    ws9.getCell(`D${row}`).numFmt = 'R$ #,##0.00';
    ws9.getCell(`E${row}`).value = result;
    ws9.getCell(`E${row}`).numFmt = 'R$ #,##0.00';
    ws9.getCell(`F${row}`).value = running + result;
    ws9.getCell(`F${row}`).numFmt = 'R$ #,##0.00';
    running += result;
    [5, 6, 7, 8, 9, 10].forEach((col) => Object.assign(ws9.getCell(`${String.fromCharCode(64 + col)}${row}`), cellStyle));
  });

  ws9.columns = [{ width: 15 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }];

  // ============================================================
  // ABA 10 — PRESTAÇÃO DE CONTAS
  // ============================================================
  const ws10 = workbook.addWorksheet("Prestação de Contas");
  ws10.properties.tabColor = { argb: COLORS.primary };

  ws10.mergeCells("A1:F1");
  ws10.getCell("A1").value = "PRESTAÇÃO DE CONTAS";
  ws10.getCell("A1").font = { name: "Calibri", size: 22, bold: true, color: { argb: COLORS.header } };
  ws10.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  ws10.getRow(1).height = 50;

  const infoData = [
    ["Conta:", account?.name || ""],
    ["Responsável:", account?.responsible || ""],
    ["Período:", `${startDate} a ${endDate}`],
    ["Data de emissão:", new Date().toLocaleDateString("pt-BR")],
  ];

  infoData.forEach(([label, value], i) => {
    const row = 3 + i;
    ws10.getCell(`A${row}`).value = label;
    ws10.getCell(`A${row}`).font = { name: "Calibri", size: 11, bold: true, color: { argb: COLORS.gray } };
    ws10.getCell(`B${row}`).value = value;
    ws10.getCell(`B${row}`).font = { name: "Calibri", size: 11, color: { argb: "333333" } };
  });

  ws10.getCell("A8").value = "Resumo Financeiro";
  ws10.getCell("A8").font = { name: "Calibri", size: 14, bold: true, color: { argb: COLORS.header } };

  const summaryRows = [
    ["Saldo Inicial", initialBalance],
    ["Total de Receitas", totalIncome],
    ["Total de Despesas", totalExpense],
    ["Saldo Final", balance],
  ];

  summaryRows.forEach(([label, value], i) => {
    const row = 9 + i;
    ws10.getCell(`A${row}`).value = label;
    ws10.getCell(`A${row}`).font = { name: "Calibri", size: 11, bold: i === 3 };
    ws10.getCell(`B${row}`).value = value;
    ws10.getCell(`B${row}`).numFmt = 'R$ #,##0.00';
    ws10.getCell(`B${row}`).font = { name: "Calibri", size: 11, bold: i === 3, color: { argb: i === 3 ? (balance >= 0 ? COLORS.success : COLORS.danger) : "333333" } };
  });

  ws10.getCell("A14").value = "Assinatura";
  ws10.getCell("A14").font = { name: "Calibri", size: 12, bold: true, color: { argb: COLORS.gray } };
  ws10.mergeCells("A15:C15");
  ws10.getCell("A15").value = "____________________________________";
  ws10.getCell("A15").font = { name: "Calibri", size: 12, color: { argb: COLORS.gray } };
  ws10.getCell("A16").value = "Responsável";
  ws10.getCell("A16").font = { name: "Calibri", size: 10, color: { argb: COLORS.gray } };

  ws10.columns = [{ width: 25 }, { width: 25 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }];

  // Page setup para impressão
  ws10.pageSetup = { orientation: "landscape", paperSize: 9, margins: { top: 1, right: 1, bottom: 1, left: 1, header: 0.3, footer: 0.3 } };

  // ============================================================
  // PLANILHA OCULTA DE DADOS DOS GRÁFICOS
  // ============================================================
  const dataWs = workbook.addWorksheet("DadosGraficos", {
    properties: { tabColor: { argb: COLORS.primary } },
    state: "hidden",
  });

  // Bloco 1: Receitas x Despesas mensais + evolução do saldo
  // Linhas 1..n: Mês | Receitas | Despesas | Saldo
  dataWs.getCell("A1").value = "Mês";
  dataWs.getCell("B1").value = "Receitas";
  dataWs.getCell("C1").value = "Despesas";
  dataWs.getCell("D1").value = "Saldo";
  let bal = initialBalance;
  monthlyData.forEach((m, i) => {
    const row = 2 + i;
    dataWs.getCell(`A${row}`).value = m.label;
    dataWs.getCell(`B${row}`).value = m.income;
    dataWs.getCell(`C${row}`).value = m.expense;
    bal += m.income - m.expense;
    dataWs.getCell(`D${row}`).value = bal;
  });

  // Bloco 2: Despesas por categoria (colunas F,G)
  const incByCat = getExpensesByCategory(income);
  dataWs.getCell("F1").value = "Categoria";
  dataWs.getCell("G1").value = "Valor";
  catData.forEach((c, i) => {
    const row = 2 + i;
    dataWs.getCell(`F${row}`).value = c.name;
    dataWs.getCell(`G${row}`).value = c.amount;
  });

  // Bloco 3: Receitas por categoria (colunas I,J)
  dataWs.getCell("I1").value = "Categoria";
  dataWs.getCell("J1").value = "Valor";
  incByCat.forEach((c, i) => {
    const row = 2 + i;
    dataWs.getCell(`I${row}`).value = c.name;
    dataWs.getCell(`J${row}`).value = c.amount;
  });

  // Bloco 4: Orçamento planejado x realizado (colunas L,M,N)
  dataWs.getCell("L1").value = "Categoria";
  dataWs.getCell("M1").value = "Planejado";
  dataWs.getCell("N1").value = "Realizado";
  const budgetRows: { name: string; planned: number; realized: number }[] = [];
  for (const b of budgetsWithMeta) {
    const realized = b.categoryId
      ? (b.category?.type === "INCOME" ? income : expense)
          .filter((t) => t.categoryId === b.categoryId)
          .reduce((s, t) => s + Number(t.amount), 0)
      : 0;
    budgetRows.push({ name: b.category?.name || "Geral", planned: Number(b.amount), realized });
  }
  budgetRows.forEach((b, i) => {
    const row = 2 + i;
    dataWs.getCell(`L${row}`).value = b.name;
    dataWs.getCell(`M${row}`).value = b.planned;
    dataWs.getCell(`N${row}`).value = b.realized;
  });

  // Congelamento de painéis em todas as abas
  [ws2, ws3, ws4, ws5, ws6, ws7, ws8, ws9].forEach((ws) => {
    ws.views = [{ state: "frozen", ySplit: 3 }];
  });

  const buffer = await workbook.xlsx.writeBuffer();

  // Injeta gráficos nativos editáveis do Excel
  const { injectCharts, CHART_POS } = await import("./excel-charts");
  const mCount = monthlyData.length;
  const catCount = catData.length;
  const incCount = incByCat.length;
  const bCount = budgetRows.length;

  const charts = [
    {
      id: 1,
      type: "bar" as const,
      title: "Receitas x Despesas",
      categories: monthlyData.map((m) => m.label),
      series: [
        { name: "Receitas", values: monthlyData.map((m) => m.income) },
        { name: "Despesas", values: monthlyData.map((m) => m.expense) },
      ],
      dataSheet: "DadosGraficos",
      catStartRow: 2,
      catStartCol: 1,
      serStartCol: 2,
      pos: { x: 200000, y: 250000, cx: 5000000, cy: 2900000 },
    },
    {
      id: 2,
      type: "line" as const,
      title: "Evolução do Saldo",
      categories: monthlyData.map((m) => m.label),
      series: [{ name: "Saldo", values: monthlyData.map((_, i) => {
        let s = initialBalance;
        for (let j = 0; j <= i; j++) s += monthlyData[j].income - monthlyData[j].expense;
        return s;
      }) }],
      dataSheet: "DadosGraficos",
      catStartRow: 2,
      catStartCol: 1,
      serStartCol: 4, // coluna D
      pos: { x: 5400000, y: 250000, cx: 4200000, cy: 2900000 },
    },
    {
      id: 3,
      type: "pie" as const,
      title: "Despesas por Categoria",
      categories: catData.map((c) => c.name),
      series: [{ name: "Valor", values: catData.map((c) => c.amount) }],
      dataSheet: "DadosGraficos",
      catStartRow: 2,
      catStartCol: 6, // coluna F (categorias)
      serStartCol: 7, // coluna G (valores)
      pos: { x: 200000, y: 3500000, cx: 2800000, cy: 2600000 },
    },
    {
      id: 4,
      type: "pie" as const,
      title: "Receitas por Categoria",
      categories: incByCat.map((c) => c.name),
      series: [{ name: "Valor", values: incByCat.map((c) => c.amount) }],
      dataSheet: "DadosGraficos",
      catStartRow: 2,
      catStartCol: 9, // coluna I (categorias)
      serStartCol: 10, // coluna J (valores)
      pos: { x: 3200000, y: 3500000, cx: 2800000, cy: 2600000 },
    },
    {
      id: 5,
      type: "bar" as const,
      title: "Orçamento Planejado x Realizado",
      categories: budgetRows.map((b) => b.name),
      series: [
        { name: "Planejado", values: budgetRows.map((b) => b.planned) },
        { name: "Realizado", values: budgetRows.map((b) => b.realized) },
      ],
      dataSheet: "DadosGraficos",
      catStartRow: 2,
      catStartCol: 12, // coluna L (categorias)
      serStartCol: 13, // colunas M,N (séries)
      pos: { x: 200000, y: 6500000, cx: 6000000, cy: 2600000 },
    },
  ];

  return await injectCharts(Buffer.from(buffer), charts as any);
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function getMonthlyData(transactions: any[], startDate: string, endDate: string) {
  const months: Record<string, { label: string; income: number; expense: number }> = {};
  const start = new Date(startDate);
  const end = new Date(endDate + "T23:59:59");
  let d = new Date(start.getFullYear(), start.getMonth(), 1);
  while (d <= end) {
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    months[key] = { label: `${d.toLocaleString("pt-BR", { month: "short" })}/${d.getFullYear()}`, income: 0, expense: 0 };
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  transactions.forEach((t) => {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    if (months[key]) {
      if (t.type === "INCOME") months[key].income += Number(t.amount);
      else if (t.type === "EXPENSE") months[key].expense += Number(t.amount);
    }
  });
  return Object.values(months);
}

function getExpensesByCategory(expenses: any[]) {
  const map: Record<string, { name: string; amount: number; count: number }> = {};
  expenses.forEach((t) => {
    const name = t.category?.name || "Sem categoria";
    if (!map[name]) map[name] = { name, amount: 0, count: 0 };
    map[name].amount += Number(t.amount);
    map[name].count++;
  });
  return Object.values(map).sort((a, b) => b.amount - a.amount);
}

function getSupplierRanking(expenses: any[]) {
  const map: Record<string, { name: string; amount: number; count: number }> = {};
  expenses.forEach((t) => {
    if (!t.supplier) return;
    const name = t.supplier.name;
    if (!map[name]) map[name] = { name, amount: 0, count: 0 };
    map[name].amount += Number(t.amount);
    map[name].count++;
  });
  return Object.values(map).sort((a, b) => b.amount - a.amount);
}