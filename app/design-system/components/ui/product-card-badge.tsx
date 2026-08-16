type ProductCardBadgeProps = {
  label?: string | null;
};

export function ProductCardBadge({ label }: ProductCardBadgeProps) {
  const text = String(label ?? "").trim();
  if (!text) return null;

  return (
    <div className="pointer-events-none absolute -right-9 top-3 z-20 flex w-28 rotate-45 items-center justify-center bg-primary py-1 shadow-md">
      <span className="max-w-20 truncate text-[10px] font-bold leading-4 text-[var(--primary-contrast)]">
        {text}
      </span>
    </div>
  );
}
