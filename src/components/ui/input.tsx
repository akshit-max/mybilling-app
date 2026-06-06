import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", icon, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {icon && (
          <div className="absolute left-3.5 text-gray-400 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`flex h-11 w-full rounded-2xl border border-gray-200 bg-[#FFF7ED] px-4 py-2 text-sm text-gray-800 font-medium ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all ${
            icon ? "pl-10" : ""
          } ${className}`}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
