"use client";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "danger" | "success";
  glow?: boolean;
  style?: React.CSSProperties;
}

const variants = {
  default: "glass",
  danger: "glass-danger",
  success: "glass-success",
};

export function Card({ children, className, variant = "default", glow, style }: CardProps) {
  return (
    <div
      style={style}
      className={cn(
        "rounded-2xl p-4",
        variants[variant],
        glow && variant === "default" && "glow-accent",
        glow && variant === "danger" && "glow-danger",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex items-center justify-between mb-4", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn("text-xs font-semibold text-[#AEB9E1] uppercase tracking-widest flex items-center gap-2", className)}>
      {children}
    </h3>
  );
}
