"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Wallet,
  ArrowUpRight,
  PiggyBank,
  Tags,
  FolderKanban,
  Truck,
  FileCheck,
  BarChart3,
  FolderOpen,
  ScrollText,
  Settings,
  Layers,
  Building2,
} from "lucide-react";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/movimentacoes", label: "Movimentações", icon: ArrowLeftRight },
  { href: "/receitas", label: "Receitas", icon: TrendingUp },
  { href: "/despesas", label: "Despesas", icon: TrendingDown },
  { href: "/contas-a-pagar", label: "Contas a pagar", icon: AlertCircle },
  { href: "/contas-a-receber", label: "Contas a receber", icon: Wallet },
  { href: "/transferencias", label: "Transferências", icon: ArrowUpRight },
  { href: "/orcamento", label: "Orçamento", icon: PiggyBank },
  { href: "/categorias", label: "Categorias", icon: Tags },
  { href: "/centros-de-custo", label: "Centros de custos", icon: FolderKanban },
  { href: "/fornecedores", label: "Fornecedores", icon: Truck },
  { href: "/prestacao-de-contas", label: "Prestação de Contas", icon: FileCheck },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/documentos", label: "Documentos", icon: FolderOpen },
  { href: "/consolidado", label: "Visão Consolidada", icon: Layers },
  { href: "/auditoria", label: "Auditoria", icon: ScrollText },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-40">
      <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-gray-900 text-sm leading-tight">Gestão Financeira</h1>
          <p className="text-[11px] text-gray-400">Sistema profissional</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {menuItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${active ? "sidebar-link-active" : "sidebar-link-inactive"}`}
            >
              <Icon className="w-4.5 h-4.5 w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 p-4 text-white">
          <p className="text-xs text-gray-300 mb-1">Sistema seguro</p>
          <p className="text-xs text-gray-400">Todas as ações são auditadas</p>
        </div>
      </div>
    </aside>
  );
}