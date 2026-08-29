import { type ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const variants = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return <span className={`badge ${variants[variant]} ${className}`}>{children}</span>;
}

interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ProgressBar({ value, max = 100, showLabel = true, size = "md", className = "" }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const colors =
    pct <= 70 ? "bg-emerald-500" :
    pct <= 90 ? "bg-amber-500" :
    pct <= 100 ? "bg-red-500" : "bg-red-700";
  const heights = { sm: "h-1.5", md: "h-2.5", lg: "h-4" };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-xs font-medium text-gray-600">{pct.toFixed(0)}%</span>
          <span className="text-xs text-gray-500">{value.toFixed(0)} / {max.toFixed(0)}</span>
        </div>
      )}
      <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className={`${colors} ${heights[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}