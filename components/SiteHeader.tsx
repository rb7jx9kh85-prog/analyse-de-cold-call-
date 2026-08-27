export function SiteHeader() {
  return (
    <header className="flex items-start justify-between border-b border-hair pb-4">
      <div className="flex items-baseline gap-2">
        <span className="text-mute">+</span>
        <span className="text-sm font-medium uppercase tracking-label text-ink">Alpinia®</span>
      </div>
      <div className="flex items-start gap-6">
        <div className="hidden text-right leading-relaxed sm:block">
          <span className="label block">Valais — Switzerland</span>
          <span className="label block text-hair">46°13′N / 7°21′E</span>
        </div>
      </div>
    </header>
  );
}
