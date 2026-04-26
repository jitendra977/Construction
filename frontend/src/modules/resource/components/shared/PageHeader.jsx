export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-lg font-black text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
