import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SectionHeader({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="flex items-end justify-between px-4">
      <div>
        <h2 className="font-display text-[19px] font-semibold leading-tight text-charcoal">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-charcoal-faint">{subtitle}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-0.5 text-[13px] font-semibold text-fucsia-dark"
        >
          Ver todo
          <ChevronRight size={15} />
        </Link>
      )}
    </div>
  );
}
