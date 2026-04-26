/**
 * shared/ui/Badge — coloured pill label.
 *
 * Props:
 *   label   {string}  — text to display
 *   color   {string}  — hex colour for text + border (background auto-faded)
 *   size    {string}  — 'sm' | 'md' (default 'sm')
 *   dot     {boolean} — prepend a coloured dot (default false)
 */
export default function Badge({ label, color = '#6b7280', size = 'sm', dot = false }) {
    const fontSize  = size === 'md' ? 12 : 10;
    const padding   = size === 'md' ? '4px 10px' : '2px 8px';

    return (
        <span style={{
            display:      'inline-flex',
            alignItems:   'center',
            gap:          4,
            padding,
            borderRadius: 999,
            fontSize,
            fontWeight:   700,
            letterSpacing: '0.04em',
            color,
            background:   `${color}18`,
            border:       `1px solid ${color}35`,
            whiteSpace:   'nowrap',
        }}>
            {dot && (
                <span style={{
                    width: 5, height: 5,
                    borderRadius: '50%',
                    background: color,
                    flexShrink: 0,
                }} />
            )}
            {label}
        </span>
    );
}
