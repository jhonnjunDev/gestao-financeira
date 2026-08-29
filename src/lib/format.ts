import { format, parse, isValid, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatCurrency(value: number | string | null | undefined | { toNumber: () => number }): string {
  if (value == null) return "R$ 0,00";
  const num = typeof value === "object" ? value.toNumber() : typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "0%";
  return `${value.toFixed(1)}%`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return "-";
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return "-";
  return format(d, "dd/MM", { locale: ptBR });
}

export function formatMonthYear(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMMM 'de' yyyy", { locale: ptBR });
}

export function formatDateISO(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "yyyy-MM-dd");
}

export function parseDateBR(str: string): Date | null {
  const d = parse(str, "dd/MM/yyyy", new Date());
  return isValid(d) ? d : null;
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
}

export function daysUntil(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho", "Agosto",
  "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const TRANSACTION_TYPES = {
  INCOME: { label: "Receita", color: "text-emerald-600", bg: "bg-emerald-50" },
  EXPENSE: { label: "Despesa", color: "text-red-600", bg: "bg-red-50" },
  TRANSFER: { label: "Transferência", color: "text-blue-600", bg: "bg-blue-50" },
} as const;

export const STATUS_MAP = {
  PAID: { label: "Pago", color: "text-emerald-600", bg: "bg-emerald-50" },
  RECEIVED: { label: "Recebido", color: "text-emerald-600", bg: "bg-emerald-50" },
  PENDING: { label: "Pendente", color: "text-amber-600", bg: "bg-amber-50" },
  LATE: { label: "Atrasado", color: "text-red-600", bg: "bg-red-50" },
  CANCELED: { label: "Cancelado", color: "text-gray-600", bg: "bg-gray-50" },
} as const;