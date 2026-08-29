import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: boolean;
}

export function Card({ children, className = "", hover = false, padding = true }: CardProps) {
  return (
    <div className={`card ${hover ? "card-hover" : ""} ${padding ? "p-6" : ""} ${className}`}>
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon?: ReactNode;
  trend?: { value: string; positive: boolean };
  color?: string;
  subtitle?: string;
}

export function StatCard({ title, value, icon, trend, color = "brand", subtitle }: StatCardProps) {
  const colorMap: Record<string, string> = {
    brand: "from-brand-500 to-brand-600",
    emerald: "from-emerald-500 to-emerald-600",
    red: "from-red-500 to-red-600",
    amber: "from-amber-500 to-amber-600",
    violet: "from-violet-500 to-violet-600",
    blue: "from-blue-500 to-blue-600",
  };
  const bgMap: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    emerald: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    blue: "bg-blue-50 text-blue-600",
  };

  return (
    <Card className="relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={`text-xs font-medium flex items-center gap-1 ${trend.positive ? "text-emerald-600" : "text-red-600"}`}>
              <span>{trend.positive ? "↑" : "↓"}</span>
              {trend.value} em relação ao período anterior
            </p>
          )}
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`p-3 rounded-xl ${bgMap[color] || "bg-brand-50 text-brand-600"}`}>
            {icon}
          </div>
        )}
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${colorMap[color] || "from-brand-500 to-brand-600"} opacity-40`} />
    </Card>
  );
}