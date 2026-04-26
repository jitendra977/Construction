/**
 * shared/ui/PageHeader — consistent page title + optional actions row.
 *
 * Props:
 *   title    {string}    — main heading
 *   subtitle {string}    — optional sub-text
 *   actions  {ReactNode} — buttons / controls placed on the right
 *   back     {function}  — if provided, renders a ← back button
 */
export default function PageHeader({ title, subtitle, actions, back }) {
    return (
        <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
                {back && (
                    <button
                        onClick={back}
                        className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-sm"
                        style={{ color: 'var(--t-text3)', background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--t-text)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--t-text3)'}
                    >
                        ←
                    </button>
                )}
                <div>
                    <h2 className="text-lg font-black" style={{ color: 'var(--t-text)' }}>{title}</h2>
                    {subtitle && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--t-text3)' }}>{subtitle}</p>
                    )}
                </div>
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
}
