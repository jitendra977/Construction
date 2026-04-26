/**
 * shared/ui/EmptyState — centered empty-list placeholder.
 *
 * Props:
 *   icon        {string}           — emoji or icon character  (default '📭')
 *   title       {string}           — short heading
 *   description {string}           — optional sub-text
 *   action      {object|ReactNode} — { label, onClick } OR a JSX element
 */
export default function EmptyState({ icon = '📭', title, description, action }) {
    const actionEl = action
        ? typeof action === 'object' && action.label
            ? (
                <button
                    onClick={action.onClick}
                    className="mt-2 px-4 py-2 text-white text-xs font-black rounded-xl transition-colors"
                    style={{ background: '#6366f1' }}
                >
                    {action.label}
                </button>
            )
            : action
        : null;

    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4 opacity-30">{icon}</div>
            <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--t-text3)' }}>{title}</h3>
            {description && (
                <p className="text-xs mb-4 max-w-xs" style={{ color: 'var(--t-text3)', opacity: 0.7 }}>
                    {description}
                </p>
            )}
            {actionEl}
        </div>
    );
}
