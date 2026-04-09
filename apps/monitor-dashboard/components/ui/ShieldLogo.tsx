 import Image from "next/image";

export function ShieldLogo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/icon.svg"
      alt="Dash VPS"
      width={size}
      height={size}
      className={className}
      style={{ display: "block", flexShrink: 0 }}
    />
  );
}
