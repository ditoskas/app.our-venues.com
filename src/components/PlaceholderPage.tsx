export default function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-10 border-b border-border pb-6">
        <p className="mb-2 text-xs font-medium tracking-[0.18em] text-accent-dark uppercase">
          O Gamos Mas Admin
        </p>
        <h1 className="font-serif text-4xl text-foreground">{title}</h1>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-8 py-24 text-center">
        <span className="mb-4 h-px w-12 bg-accent" />
        <h2 className="font-serif text-2xl text-foreground">Coming soon</h2>
        <p className="mt-3 max-w-md text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}
