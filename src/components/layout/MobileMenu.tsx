"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, X, LayoutDashboard, ArrowLeftRight, TrendingUp, TrendingDown,
  AlertCircle, Wallet, ArrowUpRight, PiggyBank, Tags, FolderKanban,
  Truck, FileCheck, BarChart3, FolderOpen, ScrollText, Settings, Layers,
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

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button onClick={() => setOpen(true)} className="lg:hidden btn-ghost p-2 -ml-2" aria-label="Abrir menu">
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col animate-slide-in">
            <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">Menu</span>
              </div>
              <button onClick={() => setOpen(false)} className="btn-ghost p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {menuItems.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`sidebar-link ${active ? "sidebar-link-active" : "sidebar-link-inactive"}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}