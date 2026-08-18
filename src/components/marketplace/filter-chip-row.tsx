import { t } from "@/lib/i18n";

interface ChipOption<T extends string> {
  value: T;
  label: string;
}

export function FilterChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ChipOption<T>[];
  value: T | undefined;
  onChange: (next: T | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="px-4 text-[11px] font-semibold uppercase tracking-wide text-charcoal-faint">
        {label}
      </p>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={value === undefined} onClick={() => onChange(undefined)}>
          {t.filters.all}
        </Chip>
        {options.map((option) => (
          <Chip
            key={option.value}
            active={value === option.value}
            onClick={() => onChange(value === option.value ? undefined : option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-none whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition ${
        active ? "bg-fucsia text-white" : "bg-cream-soft text-charcoal-soft active:bg-charcoal/5"
      }`}
    >
      {children}
    </button>
  );
}
