/** Status / role badge pill. */
export default function Badge({ label, color = '#6b7280', bg }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 8px', borderRadius: 6,
            fontSize: 9, fontWeight: 900, letterSpacing: '0.06em',
            textTransform: 'uppercase', whiteSpace: 'nowrap',
            color, background: bg || `${color}18`,
            border: `1px solid ${color}30`,
        }}>
            {label}
        </span>
    );
}
