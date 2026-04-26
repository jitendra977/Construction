/**
 * shared/ui/Spinner — loading indicator.
 *
 * Props:
 *   size    {number}  — pixel size (default 32)
 *   color   {string}  — border colour (default '#6366f1')
 *   center  {boolean} — wrap in a full-height flex-center div
 */
export default function Spinner({ size = 32, color = '#6366f1', center = false }) {
    const el = (
        <div
            style={{
                width:        size,
                height:       size,
                borderRadius: '50%',
                border:       `3px solid ${color}30`,
                borderTop:    `3px solid ${color}`,
                animation:    'spin 0.7s linear infinite',
            }}
        />
    );

    if (center) {
        return (
            <div className="flex items-center justify-center w-full" style={{ minHeight: 200 }}>
                {el}
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <>
            {el}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
}
