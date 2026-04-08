"use client";
import { cn } from "@/lib/utils";

interface BadgeProps {
  variant?: "default" | "success" | "danger" | "warning" | "muted";
  children: React.ReactNode;
  className?: string;
}

const variants = {
  default: "bg-[#CB3CFF]/20 text-[#CB3CFF] border border-[#CB3CFF]/25",
  success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  danger: "bg-red-500/15 text-red-400 border border-red-500/20",
  warning: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  muted: "bg-[#0A1330] text-[#AEB9E1] border border-[#343B4F]",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
}
