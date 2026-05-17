import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
}

export function Badge({ children, variant = "neutral", className = "" }: BadgeProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "success": return "bg-green-100 text-green-700 border-green-200";
      case "warning": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "danger": return "bg-red-100 text-red-700 border-red-200";
      case "info": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getVariantStyles()} ${className}`}>
      {children}
    </span>
  );
}
