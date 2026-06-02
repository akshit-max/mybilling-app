import React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  trendColor?: "red" | "green" | "blue" | "gray" | "neutral";
  icon?: React.ReactNode;
  subtitle?: string;
  className?: string;
}

export function StatCard({ title, value, trend, trendColor, icon, subtitle, className = "" }: StatCardProps) {
  const getTrendColorClass = () => {
    switch (trendColor) {
      case "red": return "text-red-500 bg-red-50 border-red-100";
      case "green": return "text-brand-tertiary bg-green-50 border-green-100";
      case "blue": return "text-brand-primary bg-blue-50 border-blue-100";
      default: return "text-gray-600 bg-gray-50 border-gray-100";
    }
  };

  return (
    <div className={`p-4 rounded-lg border shadow-sm flex flex-col justify-between h-24 ${getTrendColorClass()} ${className}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {trend === "down" && <ArrowDownRight size={16} className="opacity-70" />}
          {trend === "up" && <ArrowUpRight size={16} className="opacity-70" />}
          <p className="text-sm font-medium opacity-90">{title}</p>
        </div>
        {icon && <div className="text-gray-400 opacity-60">{icon}</div>}
      </div>
      <div className="flex items-end justify-between mt-2">
        <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
        {subtitle && <span className="text-xs opacity-70 mb-1">{subtitle}</span>}
      </div>
    </div>
  );
}
