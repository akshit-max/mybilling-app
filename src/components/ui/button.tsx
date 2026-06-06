import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "inverted" | "outlined" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "default", ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";
    
    const variantStyles = {
      primary: "bg-[#1F2937] text-white hover:bg-[#1F2937]/90 shadow-sm",
      secondary: "bg-[#FFF7ED] text-[#1F2937] hover:bg-[#FFF7ED]/80 border border-[#1F2937]/5 shadow-sm",
      inverted: "bg-[#423C35] text-white hover:bg-[#423C35]/90 shadow-sm",
      outlined: "border-[1.5px] border-[#1F2937] text-[#1F2937] bg-transparent hover:bg-[#1F2937]/5",
      ghost: "hover:bg-[#1F2937]/5 text-[#1F2937]",
      link: "text-[#1F2937] underline-offset-4 hover:underline",
    };

    const sizeStyles = {
      default: "h-11 px-6 py-2",
      sm: "h-9 rounded-xl px-4",
      lg: "h-14 rounded-2xl px-8 text-base",
      icon: "h-11 w-11",
    };

    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

    return (
      <button
        ref={ref}
        className={combinedClassName}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
