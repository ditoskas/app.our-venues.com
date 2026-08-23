export default function PageHeader({
  title,
  middle,
  action,
}: {
  title: string;
  middle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex items-center gap-4 border-b border-border pb-6">
      <h1 className="shrink-0 font-serif text-4xl text-foreground">{title}</h1>
      {middle && <div className="flex-1">{middle}</div>}
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </div>
  );
}
