"use client";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

const variants = {
  default: "btn-gradient text-white font-semibold",
  danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors",
  ghost: "bg-transparent hover:bg-[#0A1330] text-[#AEB9E1] hover:text-white border border-[#343B4F] transition-colors",
  outline: "btn-outline-pill text-[#AEB9E1] hover:text-white",
};

const sizes = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "md", className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = "Button";
