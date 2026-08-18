export function HorizontalScroller({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
      {children}
    </div>
  );
}
