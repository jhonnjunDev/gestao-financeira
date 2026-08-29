import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";

export async function generatePdf(accountId: string): Promise<Buffer> {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw new Error("Conta não encontrada");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [transactions, prevAgg] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        accountId,
        deletedAt: null,
        status: { not: "CANCELED" },
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      include: { category: true, supplier: true },
      orderBy: { date: "asc" },
    }),
    prisma.transaction.aggregate({
      where: {
        accountId,
        deletedAt: null,
        status: { not: "CANCELED" },
        date: { lt: startOfMonth },
        type: { in: ["INCOME", "EXPENSE"] },
      },
      _sum: { amount: true },
    }),
  ]);

  const income = transactions.filter((t) => t.type === "INCOME");
  const expense = transactions.filter((t) => t.type === "EXPENSE");
  const totalIncome = income.reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = expense.reduce((s, t) => s + Number(t.amount), 0);
  const initialBalance = Number(account.initialBalance || 0) + Number(prevAgg._sum.amount || 0);
  const finalBalance = initialBalance + totalIncome - totalExpense;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const primary: [number, number, number] = [30, 58, 138];
  const dark: [number, number, number] = [17, 24, 39];
  const gray: [number, number, number] = [107, 114, 128];

  const addPageNumber = () => {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pages}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 8, { align: "right" });
      doc.text(new Date().toLocaleDateString("pt-BR"), margin, doc.internal.pageSize.getHeight() - 8);
    }
  };

  // ============ CAPA ============
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageWidth, 297, "F");

  doc.setFillColor(30, 58, 138);
  doc.rect(0, 110, pageWidth, 2.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("PRESTAÇÃO DE CONTAS", pageWidth / 2, 130, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(191, 219, 254);
  doc.text("Relatório financeiro profissional", pageWidth / 2, 140, { align: "center" });

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(account.name, pageWidth / 2, 175, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(156, 163, 175);
  doc.text(`Período: ${startOfMonth.toLocaleDateString("pt-BR")} a ${endOfMonth.toLocaleDateString("pt-BR")}`, pageWidth / 2, 185, { align: "center" });
  doc.text(`Emitido em: ${now.toLocaleDateString("pt-BR")}`, pageWidth / 2, 191, { align: "center" });

  if (account.responsible) {
    doc.text(`Responsável: ${account.responsible}`, pageWidth / 2, 197, { align: "center" });
  }

  // ============ RESUMO EXECUTIVO ============
  doc.addPage();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 297, "F");

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...dark);
  doc.text("Resumo Financeiro", margin, 28);

  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.8);
  doc.line(margin, 32, pageWidth - margin, 32);

  // Cards de resumo
  const cardData = [
    { label: "Saldo Inicial", value: initialBalance },
    { label: "Receitas", value: totalIncome },
    { label: "Despesas", value: totalExpense },
    { label: "Saldo Final", value: finalBalance },
  ];
  const cardW = (pageWidth - 2 * margin - 3 * 5) / 4;
  cardData.forEach((c, i) => {
    const x = margin + i * (cardW + 5);
    doc.setFillColor(i === 0 ? 241 : i === 1 ? 209 : i === 2 ? 254 : 219, i === 0 ? 245 : i === 1 ? 250 : i === 2 ? 226 : 254, i === 0 ? 249 : i === 1 ? 229 : i === 2 ? 226 : 241);
    doc.roundedRect(x, 40, cardW, 26, 2, 2, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...gray);
    doc.text(c.label, x + 3, 47);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(i === 3 && c.value < 0 ? 220 : 30, 38, 38);
    doc.text(formatCurrency(c.value), x + 3, 58);
  });

  // Tabela de identificação
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...dark);
  doc.text("Identificação", margin, 84);

  autoTable(doc, {
    startY: 88,
    margin: { left: margin, right: margin },
    head: [["Campo", "Valor"]],
    body: [
      ["Conta", account.name],
      ["Tipo de conta", account.type],
      ["Responsável", account.responsible || "—"],
      ["Período", `${startOfMonth.toLocaleDateString("pt-BR")} a ${endOfMonth.toLocaleDateString("pt-BR")}`],
      ["Data de emissão", now.toLocaleDateString("pt-BR")],
    ],
    theme: "grid",
    headStyles: { fillColor: primary, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
  });

  // ============ RECEITAS ============
  doc.addPage();
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...dark);
  doc.text("Relação de Receitas", margin, 28);
  doc.setDrawColor(16, 185, 129);
  doc.line(margin, 32, pageWidth - margin, 32);

  autoTable(doc, {
    startY: 38,
    margin: { left: margin, right: margin },
    head: [["Data", "Descrição", "Origem", "Valor"]],
    body: [
      ...income.map((t) => [
        new Date(t.date).toLocaleDateString("pt-BR"),
        t.description,
        t.supplier?.name || "—",
        formatCurrency(Number(t.amount)),
      ]),
      ["", "", "TOTAL DE RECEITAS", formatCurrency(totalIncome)],
    ],
    theme: "striped",
    headStyles: { fillColor: [16, 185, 129], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    footStyles: { fillColor: [209, 250, 229], textColor: [6, 78, 59], fontStyle: "bold", fontSize: 9 },
    columnStyles: { 3: { halign: "right" } },
    didParseCell: (data) => {
      if (data.row.index === income.length) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [209, 250, 229];
        data.cell.styles.textColor = [6, 78, 59];
      }
    },
  });

  // ============ DESPESAS ============
  doc.addPage();
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...dark);
  doc.text("Relação de Despesas", margin, 28);
  doc.setDrawColor(239, 68, 68);
  doc.line(margin, 32, pageWidth - margin, 32);

  autoTable(doc, {
    startY: 38,
    margin: { left: margin, right: margin },
    head: [["Data", "Descrição", "Categoria", "Fornecedor", "Valor"]],
    body: [
      ...expense.map((t) => [
        new Date(t.date).toLocaleDateString("pt-BR"),
        t.description,
        t.category?.name || "—",
        t.supplier?.name || "—",
        formatCurrency(Number(t.amount)),
      ]),
      ["", "", "", "TOTAL DE DESPESAS", formatCurrency(totalExpense)],
    ],
    theme: "striped",
    headStyles: { fillColor: [239, 68, 68], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 4: { halign: "right" } },
    didParseCell: (data) => {
      if (data.row.index === expense.length) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [254, 226, 226];
        data.cell.styles.textColor = [127, 29, 29];
      }
    },
  });

  // ============ SALDO FINAL ============
  doc.addPage();
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...dark);
  doc.text("Saldo Final", margin, 28);
  doc.setDrawColor(30, 58, 138);
  doc.line(margin, 32, pageWidth - margin, 32);

  autoTable(doc, {
    startY: 40,
    margin: { left: margin, right: margin },
    head: [["Item", "Valor"]],
    body: [
      ["Saldo Inicial", formatCurrency(initialBalance)],
      ["Total de Receitas", formatCurrency(totalIncome)],
      ["Total de Despesas", formatCurrency(totalExpense)],
      ["Saldo Final", formatCurrency(finalBalance)],
    ],
    theme: "grid",
    headStyles: { fillColor: primary, fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 }, 1: { halign: "right" } },
    didParseCell: (data) => {
      if (data.row.index === 3) {
        data.cell.styles.fontSize = 11;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // Declaração e assinatura
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text(
    "Declaro que as informações contidas neste relatório refletem fielmente a movimentação financeira da conta no período indicado.",
    margin, 90, { maxWidth: pageWidth - 2 * margin }
  );

  doc.setFontSize(10);
  doc.setTextColor(...dark);
  const signatureY = 150;
  doc.line(margin, signatureY, margin + 70, signatureY);
  doc.text(account.responsible || "____________________", margin, signatureY + 5);
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text("Responsável pela prestação de contas", margin, signatureY + 10);

  doc.line(pageWidth - margin - 70, signatureY, pageWidth - margin, signatureY);
  doc.text(new Date().toLocaleDateString("pt-BR"), pageWidth - margin - 30, signatureY + 5);
  doc.text("Data", pageWidth - margin - 30, signatureY + 10);

  addPageNumber();

  const buffer = Buffer.from(doc.output("arraybuffer"));
  return buffer;
}