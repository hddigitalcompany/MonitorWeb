export default function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h1 className="font-serif text-2xl text-ink">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
