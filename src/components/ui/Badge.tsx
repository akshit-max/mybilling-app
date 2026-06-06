import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "primary" | "secondary" | "success" | "danger" | "warning";
  icon?: React.ReactNode;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = "", variant = "primary", icon, children, ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-widest font-mono transition-colors";
    
    const variantStyles = {
      primary: "bg-[#1F2937] text-white border border-[#1F2937]",
      secondary: "bg-[#FFF7ED] text-[#1F2937] border border-[#1F2937]/10",
      success: "bg-[#22C55E] text-white border border-[#22C55E]",
      danger: "bg-red-600 text-white border border-red-600",
      warning: "bg-[#F97316] text-white border border-[#F97316]",
    };

    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${className}`;

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        {icon && <span className="shrink-0">{icon}</span>}
        {children}
      </div>
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
